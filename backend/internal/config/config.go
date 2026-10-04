package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	AppName            string
	AppEnv             string
	AppPort            string
	AppURL             string
	DatabaseURL        string
	KeycloakIssuerURL  string
	KeycloakClientID   string
	KeycloakSecret     string
	KeycloakJwksURL    string
	MinioEndpoint      string
	MinioPublicURL     string // URL accessible dari browser (beda dengan internal docker endpoint)
	MinioAccessKey     string
	MinioSecretKey     string
	MinioBucketName    string
	MinioUseSSL        bool
	SkpdAPIURL         string
	SkpdAPICacheTTL    int
	CORSAllowedOrigins string
	MaxUploadSizeMB    int64
}

func LoadConfig() (*Config, error) {
	// Try loading .env from current directory or parent directory
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../.env")

	useSSL, _ := strconv.ParseBool(getEnv("MINIO_USE_SSL", "false"))
	cacheTTL, _ := strconv.Atoi(getEnv("SKPD_API_CACHE_TTL", "3600"))
	maxUploadMB, _ := strconv.ParseInt(getEnv("MAX_UPLOAD_SIZE_MB", "10"), 10, 64)

	dbURL := getEnv("DATABASE_URL", "postgres://enotulen:enotulen_dev@localhost:5432/enotulen?sslmode=disable")

	return &Config{
		AppName:            getEnv("APP_NAME", "e-notulen"),
		AppEnv:             getEnv("APP_ENV", "development"),
		AppPort:            getEnv("APP_PORT", "8080"),
		AppURL:             getEnv("APP_URL", "http://localhost:8080"),
		DatabaseURL:        dbURL,
		KeycloakIssuerURL:  getEnv("KEYCLOAK_ISSUER_URL", "https://accounts.purbalinggakab.go.id/auth/realms/apps"),
		KeycloakClientID:   getEnv("KEYCLOAK_CLIENT_ID", "e-notulen"),
		KeycloakSecret:     getEnv("KEYCLOAK_CLIENT_SECRET", ""),
		KeycloakJwksURL:    getEnv("KEYCLOAK_JWKS_URL", "https://accounts.purbalinggakab.go.id/auth/realms/apps/protocol/openid-connect/certs"),
		MinioEndpoint:      getEnv("MINIO_ENDPOINT", "localhost:9000"),
		MinioPublicURL:     getEnv("MINIO_PUBLIC_URL", "http://localhost:9000"),
		MinioAccessKey:     getEnv("MINIO_ACCESS_KEY", "minioadmin"),
		MinioSecretKey:     getEnv("MINIO_SECRET_KEY", "minioadmin"),
		MinioBucketName:    getEnv("MINIO_BUCKET_NAME", "e-notulen"),
		MinioUseSSL:        useSSL,
		SkpdAPIURL:         getEnv("SKPD_API_URL", "https://api.pegawai.e-kinerja.purbalinggakab.go.id/v2/skpd/list?filter_pesona=true"),
		SkpdAPICacheTTL:    cacheTTL,
		CORSAllowedOrigins: getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3004,http://localhost:3000,http://localhost:8080"),
		MaxUploadSizeMB:    maxUploadMB,
	}, nil
}

func getEnv(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok && val != "" {
		return val
	}
	return fallback
}
