package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"e-notulen/backend/internal/config"
	"e-notulen/backend/internal/handler"
	"e-notulen/backend/internal/middleware"
	"e-notulen/backend/internal/repository"
	"e-notulen/backend/internal/service"
	"e-notulen/backend/pkg/database"
	"e-notulen/backend/pkg/keycloak"
	"e-notulen/backend/pkg/pdf"
	"e-notulen/backend/pkg/storage"
	"e-notulen/backend/pkg/validator"
	"e-notulen/backend/pkg/word"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
)

func main() {
	log.Println("Starting e-Notulen Backend API Server...")

	// 1. Load Config
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 2. Database Connection
	dbPool, err := database.NewPostgresPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Database connection failed: %v", err)
	}
	defer dbPool.Close()
	log.Println("✅ Connected to PostgreSQL database")

	// Run auto migrations
	migrationPath := "migrations/000001_init_schema.up.sql"
	if err := database.RunMigrations(ctx, dbPool, migrationPath); err != nil {
		log.Printf("⚠️ Migration warning (may already exist): %v", err)
	} else {
		log.Println("✅ Database schema migrations applied successfully")
	}


	// 3. MinIO Storage
	minioStorage, err := storage.NewMinioStorage(
		cfg.MinioEndpoint,
		cfg.MinioAccessKey,
		cfg.MinioSecretKey,
		cfg.MinioBucketName,
		cfg.MinioPublicURL,
		cfg.MinioUseSSL,
	)
	if err != nil {
		log.Printf("⚠️ MinIO initialization warning: %v", err)
	} else {
		if err := minioStorage.EnsureBucket(context.Background()); err != nil {
			log.Printf("⚠️ MinIO bucket check warning: %v", err)
		} else {
			log.Printf("✅ MinIO connected, bucket '%s' ready", cfg.MinioBucketName)
		}
	}

	// 4. Keycloak Validator
	kcValidator := keycloak.NewKeycloakValidator(
		cfg.KeycloakJwksURL,
		cfg.KeycloakIssuerURL,
		cfg.KeycloakClientID,
	)

	// 5. Shared Tools
	customValidator := validator.NewValidator()
	pdfGenerator := pdf.NewPDFGenerator()
	wordGenerator := word.NewWordGenerator()

	// 6. Repositories
	opdRepo := repository.NewOPDRepository(dbPool, cfg.SkpdAPIURL, cfg.SkpdAPICacheTTL)
	notulenRepo := repository.NewNotulenRepository(dbPool)
	attendeeRepo := repository.NewAttendeeRepository(dbPool)
	attachmentRepo := repository.NewAttachmentRepository(dbPool)
	autoSaveRepo := repository.NewAutoSaveRepository(dbPool)

	// 7. Services
	opdService := service.NewOPDService(opdRepo)
	notulenService := service.NewNotulenService(
		notulenRepo,
		attendeeRepo,
		attachmentRepo,
		autoSaveRepo,
		opdRepo,
		pdfGenerator,
		wordGenerator,
		minioStorage,
	)
	reportService := service.NewReportService(notulenRepo)

	// 8. Handlers
	healthHandler := handler.NewHealthHandler(dbPool)
	authHandler := handler.NewAuthHandler()
	opdHandler := handler.NewOPDHandler(opdService, minioStorage, customValidator)
	notulenHandler := handler.NewNotulenHandler(notulenService, minioStorage, customValidator)
	reportHandler := handler.NewReportHandler(reportService, notulenService)
	searchHandler := handler.NewSearchHandler(notulenService)

	// 9. Middlewares
	authMw := middleware.NewAuthMiddleware(kcValidator)
	corsMw := middleware.NewCORSMiddleware(cfg.CORSAllowedOrigins)

	// 10. Router Setup
	r := chi.NewRouter()
	r.Use(chiMiddleware.Recoverer)
	r.Use(middleware.Logger)
	r.Use(corsMw)

	// Public Endpoints
	r.Get("/api/v1/health", healthHandler.Health)
	r.Get("/api/v1/health/db", healthHandler.HealthDB)
	
	// Public Endpoint untuk Form Absensi QR Code
	r.Get("/api/v1/public/absensi/{id}", notulenHandler.GetPublicInfo)
	r.Post("/api/v1/public/absensi/{id}", notulenHandler.SubmitAttendance)
	r.Get("/api/v1/public/opd", opdHandler.ListSKPD)

	// Public Endpoint untuk Verifikasi Dokumen QR Code
	r.Get("/api/v1/public/notulen/{id}/verify", notulenHandler.GetVerificationInfo)
	r.Get("/api/v1/public/notulen/{id}/pdf", notulenHandler.DownloadPublicPDF)

	// Public Storage File Proxy (bypasses S3 CORS & AccessDenied for images/PDFs)
	storageHandlerFunc := func(w http.ResponseWriter, r *http.Request) {
		objectPath := chi.URLParam(r, "*")
		if objectPath == "" {
			objectPath = strings.TrimPrefix(r.URL.Path, "/api/v1/storage/")
		}
		if objectPath == "" {
			objectPath = r.URL.Query().Get("key")
		}
		minioStorage.ServeObject(w, r, objectPath)
	}
	r.Get("/api/v1/storage/*", storageHandlerFunc)
	r.Head("/api/v1/storage/*", storageHandlerFunc)

	// Authenticated Endpoints
	r.Group(func(r chi.Router) {
		r.Use(authMw.Authenticate)

		// User Info
		r.Get("/api/v1/auth/me", authHandler.Me)

		// OPD List Proxy
		r.Get("/api/v1/opd", opdHandler.ListSKPD)

		// OPD Settings — Read access for all authenticated roles (admin, operator, officer)
		r.With(middleware.RequireRoles("admin", "operator", "officer")).Get("/api/v1/opd/{kodeUnit}/settings", opdHandler.GetSettings)
		// OPD Settings — Write access (Admin & Operator only)
		r.With(middleware.RequireRoles("admin", "operator")).Put("/api/v1/opd/{kodeUnit}/settings", opdHandler.UpdateSettings)
		r.With(middleware.RequireRoles("admin", "operator")).Post("/api/v1/opd/{kodeUnit}/logo", opdHandler.UploadLogo)

		// OPD Settings — aliases used by frontend (/settings/opd/{code})
		r.With(middleware.RequireRoles("admin", "operator", "officer")).Get("/api/v1/settings/opd/{kodeUnit}", opdHandler.GetSettings)
		r.With(middleware.RequireRoles("admin", "operator")).Put("/api/v1/settings/opd/{kodeUnit}", opdHandler.UpdateSettings)
		r.With(middleware.RequireRoles("admin", "operator")).Patch("/api/v1/settings/opd/{kodeUnit}", opdHandler.UpdateSettings)

		// Notulen CRUD
		r.Get("/api/v1/notulen", notulenHandler.List)
		r.Post("/api/v1/notulen", notulenHandler.Create)
		r.Get("/api/v1/notulen/{id}", notulenHandler.GetByID)
		r.Put("/api/v1/notulen/{id}", notulenHandler.Update)
		r.Patch("/api/v1/notulen/{id}", notulenHandler.Update)
		r.Delete("/api/v1/notulen/{id}", notulenHandler.Delete)
		r.Patch("/api/v1/notulen/{id}/status", notulenHandler.UpdateStatus)

		// Restore & Duplicate
		r.Post("/api/v1/notulen/{id}/restore", notulenHandler.Restore)
		r.Post("/api/v1/notulen/{id}/duplicate", notulenHandler.Duplicate)

		// Auto-Save
		r.Post("/api/v1/notulen/{id}/auto-save", notulenHandler.AutoSave)
		r.Get("/api/v1/notulen/{id}/auto-saves", notulenHandler.GetAutoSaveHistory)

		// PDF & Word Download + File Upload
		r.Get("/api/v1/notulen/{id}/download", notulenHandler.DownloadPDF)
		r.Get("/api/v1/notulen/{id}/pdf", notulenHandler.DownloadPDF) // alias
		r.Get("/api/v1/notulen/{id}/word", notulenHandler.DownloadWord) // Word DOCX
		r.Post("/api/v1/notulen/{id}/presigned-upload", notulenHandler.GeneratePresignedUploadURL)
		r.Post("/api/v1/notulen/{id}/upload-url", notulenHandler.GeneratePresignedUploadURL) // alias
		r.Post("/api/v1/notulen/{id}/upload-doc", notulenHandler.UploadDocument) // Direct proxy upload

		// Attachments (Foto Dokumentasi Rapat)
		r.Post("/api/v1/notulen/{id}/attachments", notulenHandler.UploadAttachment)
		r.Delete("/api/v1/notulen/{id}/attachments/{attId}", notulenHandler.DeleteAttachment)

		// Search
		r.Get("/api/v1/search", searchHandler.Search)

		// Dashboard Stats (alias — frontend calls /dashboard/stats)
		r.Get("/api/v1/dashboard/stats", reportHandler.Summary)

		// Reports
		r.Get("/api/v1/reports/summary", reportHandler.Summary)
		r.Get("/api/v1/reports/activities", reportHandler.Activities)
	})

	// 11. Start Server
	serverAddr := fmt.Sprintf(":%s", cfg.AppPort)
	srv := &http.Server{
		Addr:         serverAddr,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("🚀 e-Notulen Backend API Server running on port %s", cfg.AppPort)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to listen: %v", err)
		}
	}()

	// Graceful Shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down e-Notulen Backend API Server...")
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server gracefully stopped.")
}
