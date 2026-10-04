package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"e-notulen/backend/internal/model"
	"e-notulen/backend/internal/service"
	"e-notulen/backend/pkg/response"
	"e-notulen/backend/pkg/storage"
	"e-notulen/backend/pkg/validator"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type OPDHandler struct {
	opdService service.OPDService
	storage    *storage.MinioStorage
	validator  *validator.CustomValidator
}

func NewOPDHandler(opdService service.OPDService, minioStorage *storage.MinioStorage, val *validator.CustomValidator) *OPDHandler {
	return &OPDHandler{
		opdService: opdService,
		storage:    minioStorage,
		validator:  val,
	}
}

func (h *OPDHandler) ListSKPD(w http.ResponseWriter, r *http.Request) {
	list, err := h.opdService.GetSKPDList(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to retrieve SKPD list", "SKPD_FETCH_FAILED", []string{err.Error()})
		return
	}
	response.Success(w, http.StatusOK, "SKPD list retrieved successfully", list, nil)
}

func (h *OPDHandler) GetSettings(w http.ResponseWriter, r *http.Request) {
	kodeUnit := chi.URLParam(r, "kodeUnit")
	if kodeUnit == "" {
		response.Error(w, http.StatusBadRequest, "kodeUnit is required", "BAD_REQUEST", nil)
		return
	}

	settings, err := h.opdService.GetOPDSettings(r.Context(), kodeUnit)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to retrieve OPD settings", "SETTINGS_FETCH_FAILED", []string{err.Error()})
		return
	}

	response.Success(w, http.StatusOK, "OPD settings retrieved successfully", settings, nil)
}

func (h *OPDHandler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	kodeUnit := chi.URLParam(r, "kodeUnit")
	if kodeUnit == "" {
		response.Error(w, http.StatusBadRequest, "kodeUnit is required", "BAD_REQUEST", nil)
		return
	}

	var req model.UpdateOPDSettingsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid JSON payload", "BAD_REQUEST", []string{err.Error()})
		return
	}

	if errs := h.validator.Validate(req); len(errs) > 0 {
		response.Error(w, http.StatusBadRequest, "Validation error", "VALIDATION_FAILED", errs)
		return
	}

	settings, err := h.opdService.UpdateOPDSettings(r.Context(), kodeUnit, req)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to update OPD settings", "SETTINGS_UPDATE_FAILED", []string{err.Error()})
		return
	}

	response.Success(w, http.StatusOK, "OPD settings updated successfully", settings, nil)
}

func (h *OPDHandler) UploadLogo(w http.ResponseWriter, r *http.Request) {
	kodeUnit := chi.URLParam(r, "kodeUnit")
	if kodeUnit == "" {
		response.Error(w, http.StatusBadRequest, "kodeUnit is required", "BAD_REQUEST", nil)
		return
	}

	// Parse 2MB max
	if err := r.ParseMultipartForm(2 << 20); err != nil {
		response.Error(w, http.StatusBadRequest, "File size exceeds limit or invalid form", "BAD_REQUEST", []string{err.Error()})
		return
	}

	file, header, err := r.FormFile("logo")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Logo file is required in 'logo' field", "BAD_REQUEST", []string{err.Error()})
		return
	}
	defer file.Close()

	ext := ".png"
	if strings.HasSuffix(strings.ToLower(header.Filename), ".jpg") || strings.HasSuffix(strings.ToLower(header.Filename), ".jpeg") {
		ext = ".jpg"
	}

	objectName := fmt.Sprintf("opd/%s/logo/logo_%s%s", kodeUnit, uuid.New().String()[:8], ext)
	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		if ext == ".jpg" {
			contentType = "image/jpeg"
		} else {
			contentType = "image/png"
		}
	}

	if h.storage == nil {
		response.Error(w, http.StatusServiceUnavailable, "Storage tidak tersedia", "STORAGE_UNAVAILABLE", nil)
		return
	}

	// Upload file ke MinIO
	_, err = h.storage.UploadFile(r.Context(), objectName, file, header.Size, contentType)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Gagal mengunggah logo ke storage", "STORAGE_UPLOAD_FAILED", []string{err.Error()})
		return
	}

	// Gunakan URL publik langsung (bucket sudah bersifat public read)
	logoURL := h.storage.GetPublicURL(objectName)

	if err := h.opdService.UpdateLogoURL(r.Context(), kodeUnit, logoURL); err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to update logo URL in database", "DB_UPDATE_FAILED", []string{err.Error()})
		return
	}

	response.Success(w, http.StatusOK, "OPD logo uploaded successfully", map[string]string{
		"logo_url": logoURL,
	}, nil)
}
