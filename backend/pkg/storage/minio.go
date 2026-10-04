package storage

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"path/filepath"
	"strings"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type MinioStorage struct {
	Client     *minio.Client
	BucketName string
	PublicURL  string // URL yang accessible dari browser (contoh: http://localhost:9000)
}

func NewMinioStorage(endpoint, accessKey, secretKey, bucketName, publicURL string, useSSL bool) (*MinioStorage, error) {
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to initialize minio client: %w", err)
	}

	if publicURL == "" {
		scheme := "http"
		if useSSL {
			scheme = "https"
		}
		publicURL = fmt.Sprintf("%s://%s", scheme, endpoint)
	}

	storage := &MinioStorage{
		Client:     client,
		BucketName: bucketName,
		PublicURL:  publicURL,
	}

	return storage, nil
}

// GetPublicURL mengembalikan URL publik yang bisa diakses browser langsung
func (s *MinioStorage) GetPublicURL(objectName string) string {
	return fmt.Sprintf("%s/%s/%s", s.PublicURL, s.BucketName, objectName)
}

func (s *MinioStorage) EnsureBucket(ctx context.Context) error {
	ctxTimeout, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	bucketsToEnsure := []string{s.BucketName, "notulen", "e-notulen"}
	for _, bName := range bucketsToEnsure {
		if bName == "" {
			continue
		}
		exists, err := s.Client.BucketExists(ctxTimeout, bName)
		if err == nil && !exists {
			_ = s.Client.MakeBucket(ctxTimeout, bName, minio.MakeBucketOptions{})
		}

		// Set public read policy for attachment images and pdf files
		policy := fmt.Sprintf(`{
			"Version": "2012-10-17",
			"Statement": [
				{
					"Effect": "Allow",
					"Principal": "*",
					"Action": ["s3:GetObject"],
					"Resource": ["arn:aws:s3:::%s/*"]
				}
			]
		}`, bName)
		if err := s.Client.SetBucketPolicy(ctxTimeout, bName, policy); err != nil {
			fmt.Printf("⚠️ MinIO SetBucketPolicy warning for '%s': %v\n", bName, err)
		}
	}

	return nil
}

func (s *MinioStorage) GeneratePresignedPutURL(ctx context.Context, objectName string, expiry time.Duration) (string, error) {
	presignedURL, err := s.Client.PresignedPutObject(ctx, s.BucketName, objectName, expiry)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned put url: %w", err)
	}
	return presignedURL.String(), nil
}

func (s *MinioStorage) GeneratePresignedGetURL(ctx context.Context, objectName string, expiry time.Duration) (string, error) {
	reqParams := make(url.Values)
	presignedURL, err := s.Client.PresignedGetObject(ctx, s.BucketName, objectName, expiry, reqParams)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned get url: %w", err)
	}
	return presignedURL.String(), nil
}

func (s *MinioStorage) UploadFile(ctx context.Context, objectName string, reader io.Reader, objectSize int64, contentType string) (string, error) {
	_, err := s.Client.PutObject(ctx, s.BucketName, objectName, reader, objectSize, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload object %s: %w", objectName, err)
	}
	return fmt.Sprintf("%s/%s", s.BucketName, objectName), nil
}

func (s *MinioStorage) DeleteFile(ctx context.Context, objectName string) error {
	err := s.Client.RemoveObject(ctx, s.BucketName, objectName, minio.RemoveObjectOptions{})
	if err != nil {
		return fmt.Errorf("failed to remove object %s: %w", objectName, err)
	}
	return nil
}

func (s *MinioStorage) ServeObject(w http.ResponseWriter, r *http.Request, rawPath string) {
	rawPath = strings.TrimPrefix(rawPath, "/")

	// Collect candidate keys (both raw and URL unescaped)
	candidateKeys := []string{rawPath}
	if unescaped, err := url.PathUnescape(rawPath); err == nil && unescaped != rawPath {
		candidateKeys = append(candidateKeys, unescaped)
	}

	var keysToTry []string
	for _, k := range candidateKeys {
		keysToTry = append(keysToTry, k)
		if strings.HasPrefix(k, "e-notulen/") {
			keysToTry = append(keysToTry, strings.TrimPrefix(k, "e-notulen/"))
		}
		if strings.HasPrefix(k, "notulen/") {
			keysToTry = append(keysToTry, strings.TrimPrefix(k, "notulen/"))
		}
	}

	bucketsToTry := []string{"e-notulen", "notulen"}
	if s.BucketName != "" && s.BucketName != "e-notulen" && s.BucketName != "notulen" {
		bucketsToTry = append(bucketsToTry, s.BucketName)
	}

	clientsToTry := []*minio.Client{s.Client}

	// Fallback Remote S3 if different
	if remoteClient, err := minio.New("s3.purbalinggakab.go.id:9000", &minio.Options{
		Creds:  credentials.NewStaticV4("e-notulen", "RapliGanteng123", ""),
		Secure: false,
	}); err == nil && s.PublicURL != "http://s3.purbalinggakab.go.id:9000" {
		clientsToTry = append(clientsToTry, remoteClient)
	}

	for _, client := range clientsToTry {
		for _, bName := range bucketsToTry {
			for _, key := range keysToTry {
				if bName == "" || key == "" {
					continue
				}
				obj, err := client.GetObject(r.Context(), bName, key, minio.GetObjectOptions{})
				if err != nil {
					continue
				}
				stat, err := obj.Stat()
				if err == nil && stat.Size > 0 {
					log.Printf("✅ [ServeObject] Found object (bucket=%s, key=%s, size=%d)", bName, key, stat.Size)
					defer obj.Close()

					contentType := stat.ContentType
					if contentType == "" || contentType == "application/octet-stream" {
						ext := strings.ToLower(filepath.Ext(stat.Key))
						switch ext {
						case ".pdf":
							contentType = "application/pdf"
						case ".jpg", ".jpeg":
							contentType = "image/jpeg"
						case ".png":
							contentType = "image/png"
						case ".webp":
							contentType = "image/webp"
						}
					}

					w.Header().Set("Content-Type", contentType)
					w.Header().Set("Content-Length", fmt.Sprintf("%d", stat.Size))
					w.Header().Set("Cache-Control", "public, max-age=86400")
					_, _ = io.Copy(w, obj)
					return
				}
				_ = obj.Close()
			}
		}
	}

	// Robust Fallback: List objects in buckets and match by key suffix / basename / unescaped filename
	baseName := filepath.Base(rawPath)
	if unescaped, err := url.PathUnescape(baseName); err == nil {
		baseName = unescaped
	}

	for _, client := range clientsToTry {
		for _, bName := range bucketsToTry {
			for obj := range client.ListObjects(r.Context(), bName, minio.ListObjectsOptions{Recursive: true}) {
				if obj.Key == "" || strings.HasSuffix(obj.Key, "/") {
					continue
				}

				objBase := filepath.Base(obj.Key)
				if unescaped, err := url.PathUnescape(objBase); err == nil {
					objBase = unescaped
				}

				if strings.EqualFold(objBase, baseName) || (len(obj.Key) > 0 && strings.HasSuffix(rawPath, obj.Key)) || strings.HasSuffix(obj.Key, baseName) {
					log.Printf("💡 [ServeObject] Fuzzy matched object in bucket '%s': key='%s' for rawPath='%s'", bName, obj.Key, rawPath)
					matchedObj, err := client.GetObject(r.Context(), bName, obj.Key, minio.GetObjectOptions{})
					if err == nil {
						stat, statErr := matchedObj.Stat()
						if statErr == nil && stat.Size > 0 {
							defer matchedObj.Close()
							contentType := stat.ContentType
							if contentType == "" || contentType == "application/octet-stream" {
								ext := strings.ToLower(filepath.Ext(stat.Key))
								switch ext {
								case ".pdf":
									contentType = "application/pdf"
								case ".jpg", ".jpeg":
									contentType = "image/jpeg"
								case ".png":
									contentType = "image/png"
								case ".webp":
									contentType = "image/webp"
								}
							}
							w.Header().Set("Content-Type", contentType)
							w.Header().Set("Content-Length", fmt.Sprintf("%d", stat.Size))
							w.Header().Set("Cache-Control", "public, max-age=86400")
							_, _ = io.Copy(w, matchedObj)
							return
						}
						_ = matchedObj.Close()
					}
				}
			}
		}
	}

	log.Printf("❌ [ServeObject] File not found for rawPath=%s", rawPath)
	http.Error(w, "File not found", http.StatusNotFound)
}
