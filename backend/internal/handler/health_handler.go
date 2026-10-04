package handler

import (
	"context"
	"net/http"
	"time"

	"e-notulen/backend/pkg/response"

	"github.com/jackc/pgx/v5/pgxpool"
)

type HealthHandler struct {
	db *pgxpool.Pool
}

func NewHealthHandler(db *pgxpool.Pool) *HealthHandler {
	return &HealthHandler{db: db}
}

func (h *HealthHandler) Health(w http.ResponseWriter, r *http.Request) {
	response.Success(w, http.StatusOK, "Service is healthy", map[string]string{
		"status": "UP",
		"time":   time.Now().Format(time.RFC3339),
	}, nil)
}

func (h *HealthHandler) HealthDB(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	if err := h.db.Ping(ctx); err != nil {
		response.Error(w, http.StatusServiceUnavailable, "Database connection failed", "DATABASE_UNAVAILABLE", []string{err.Error()})
		return
	}

	response.Success(w, http.StatusOK, "Database connection healthy", map[string]string{
		"status": "UP",
		"db":     "postgresql",
	}, nil)
}
