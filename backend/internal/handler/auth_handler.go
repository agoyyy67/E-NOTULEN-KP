package handler

import (
	"net/http"

	"e-notulen/backend/internal/middleware"
	"e-notulen/backend/pkg/response"
)

type AuthHandler struct{}

func NewAuthHandler() *AuthHandler {
	return &AuthHandler{}
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userCtx, ok := middleware.GetUserContext(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "User context not found", "UNAUTHORIZED", nil)
		return
	}
	response.Success(w, http.StatusOK, "User profile retrieved successfully", userCtx, nil)
}
