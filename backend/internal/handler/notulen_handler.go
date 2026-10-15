package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"path/filepath"
	"strconv"
	"time"

	"e-notulen/backend/internal/middleware"
	"e-notulen/backend/internal/model"
	"e-notulen/backend/internal/service"
	"e-notulen/backend/pkg/response"
	"e-notulen/backend/pkg/storage"
	"e-notulen/backend/pkg/validator"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// resolveHTTPError memetakan error dari service ke HTTP status code yang sesuai.
// - pgx.ErrNoRows           → 404 Not Found
// - service.ErrNotFound     → 404 Not Found
// - service.ErrForbidden    → 403 Forbidden
// - lainnya                 → 500 Internal Server Error
func resolveHTTPError(w http.ResponseWriter, err error, resourceName string) {
	switch {
	case errors.Is(err, pgx.ErrNoRows) || errors.Is(err, service.ErrNotFound):
		response.Error(w, http.StatusNotFound,
			resourceName+" tidak ditemukan", "NOT_FOUND", []string{err.Error()})
	case errors.Is(err, service.ErrForbidden):
		response.Error(w, http.StatusForbidden,
			"Akses ditolak", "FORBIDDEN", []string{err.Error()})
	default:
		log.Printf("[ERROR] NotulenHandler resolveHTTPError: %v", err)
		response.Error(w, http.StatusInternalServerError,
			"Terjadi kesalahan server", "INTERNAL_ERROR", []string{err.Error()})
	}
}


type NotulenHandler struct {
	notulenService service.NotulenService
	storage        *storage.MinioStorage
	validator      *validator.CustomValidator
}

func NewNotulenHandler(notulenService service.NotulenService, storage *storage.MinioStorage, val *validator.CustomValidator) *NotulenHandler {
	return &NotulenHandler{
		notulenService: notulenService,
		storage:        storage,
		validator:      val,
	}
}

func (h *NotulenHandler) Create(w http.ResponseWriter, r *http.Request) {
	userCtx, _ := middleware.GetUserContext(r.Context())

	var req model.CreateNotulenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid JSON payload", "BAD_REQUEST", []string{err.Error()})
		return
	}

	if errs := h.validator.Validate(req); len(errs) > 0 {
		response.Error(w, http.StatusBadRequest, "Validation error", "VALIDATION_FAILED", errs)
		return
	}

	notulen, err := h.notulenService.CreateNotulen(r.Context(), userCtx, req)
	if err != nil {
		resolveHTTPError(w, err, "Notulen")
		return
	}

	response.Success(w, http.StatusCreated, "Notulen berhasil dibuat", notulen, nil)
}

func (h *NotulenHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	userCtx, _ := middleware.GetUserContext(r.Context())
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid UUID format", "BAD_REQUEST", nil)
		return
	}

	notulen, err := h.notulenService.GetNotulenByID(r.Context(), userCtx, id)
	if err != nil {
		resolveHTTPError(w, err, "Notulen")
		return
	}

	response.Success(w, http.StatusOK, "Notulen detail retrieved", notulen, nil)
}

func (h *NotulenHandler) Update(w http.ResponseWriter, r *http.Request) {
	userCtx, _ := middleware.GetUserContext(r.Context())
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid UUID format", "BAD_REQUEST", nil)
		return
	}

	var req model.UpdateNotulenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid JSON payload", "BAD_REQUEST", []string{err.Error()})
		return
	}

	notulen, err := h.notulenService.UpdateNotulen(r.Context(), userCtx, id, req)
	if err != nil {
		resolveHTTPError(w, err, "Notulen")
		return
	}

	response.Success(w, http.StatusOK, "Notulen berhasil diperbarui", notulen, nil)
}

func (h *NotulenHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userCtx, _ := middleware.GetUserContext(r.Context())
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid UUID format", "BAD_REQUEST", nil)
		return
	}

	err = h.notulenService.DeleteNotulen(r.Context(), userCtx, id)
	if err != nil {
		resolveHTTPError(w, err, "Notulen")
		return
	}

	response.Success(w, http.StatusOK, "Notulen berhasil dihapus", nil, nil)
}

func (h *NotulenHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	userCtx, _ := middleware.GetUserContext(r.Context())
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid UUID format", "BAD_REQUEST", nil)
		return
	}

	var req struct {
		Status string `json:"status" validate:"required,oneof=draft final"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid JSON payload", "BAD_REQUEST", nil)
		return
	}

	err = h.notulenService.UpdateNotulenStatus(r.Context(), userCtx, id, req.Status)
	if err != nil {
		resolveHTTPError(w, err, "Notulen")
		return
	}

	response.Success(w, http.StatusOK, "Status notulen berhasil diperbarui", map[string]string{"status": req.Status}, nil)
}

func (h *NotulenHandler) List(w http.ResponseWriter, r *http.Request) {
	userCtx, _ := middleware.GetUserContext(r.Context())

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	perPage, _ := strconv.Atoi(r.URL.Query().Get("per_page"))

	filter := model.NotulenFilter{
		Query:     r.URL.Query().Get("q"),
		OPDCode:   r.URL.Query().Get("opd_code"),
		Status:    r.URL.Query().Get("status"),
		DateFrom:  r.URL.Query().Get("date_from"),
		DateTo:    r.URL.Query().Get("date_to"),
		Page:      page,
		PerPage:   perPage,
		SortBy:    r.URL.Query().Get("sort_by"),
		SortOrder: r.URL.Query().Get("sort_order"),
	}

	list, meta, err := h.notulenService.ListNotulen(r.Context(), userCtx, filter)
	if err != nil {
		resolveHTTPError(w, err, "Daftar notulen")
		return
	}

	response.Success(w, http.StatusOK, "Daftar notulen berhasil diambil", list, meta)
}

func (h *NotulenHandler) AutoSave(w http.ResponseWriter, r *http.Request) {
	userCtx, _ := middleware.GetUserContext(r.Context())
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid UUID format", "BAD_REQUEST", nil)
		return
	}

	var req model.AutoSaveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid JSON payload", "BAD_REQUEST", nil)
		return
	}

	err = h.notulenService.AutoSaveNotulen(r.Context(), userCtx, id, req)
	if err != nil {
		resolveHTTPError(w, err, "Auto-save notulen")
		return
	}

	response.Success(w, http.StatusOK, "Notulen otomatis tersimpan", nil, nil)
}

func (h *NotulenHandler) GetAutoSaveHistory(w http.ResponseWriter, r *http.Request) {
	userCtx, _ := middleware.GetUserContext(r.Context())
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid UUID format", "BAD_REQUEST", nil)
		return
	}

	history, err := h.notulenService.GetAutoSaveHistory(r.Context(), userCtx, id)
	if err != nil {
		resolveHTTPError(w, err, "Riwayat auto-save")
		return
	}

	response.Success(w, http.StatusOK, "Auto-save history retrieved", history, nil)
}

func (h *NotulenHandler) DownloadPDF(w http.ResponseWriter, r *http.Request) {
	userCtx, _ := middleware.GetUserContext(r.Context())
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid UUID format", "BAD_REQUEST", nil)
		return
	}

	pdfBytes, fileName, err := h.notulenService.GenerateNotulenPDF(r.Context(), userCtx, id)
	if err != nil {
		resolveHTTPError(w, err, "PDF notulen")
		return
	}

	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", fileName))
	w.Header().Set("Content-Length", strconv.Itoa(len(pdfBytes)))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(pdfBytes)
}

func (h *NotulenHandler) DownloadWord(w http.ResponseWriter, r *http.Request) {
	userCtx, _ := middleware.GetUserContext(r.Context())
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid UUID format", "BAD_REQUEST", nil)
		return
	}

	docxBytes, fileName, err := h.notulenService.GenerateNotulenWord(r.Context(), userCtx, id)
	if err != nil {
		resolveHTTPError(w, err, "Word notulen")
		return
	}

	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", fileName))
	w.Header().Set("Content-Length", strconv.Itoa(len(docxBytes)))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(docxBytes)
}

func (h *NotulenHandler) GeneratePresignedUploadURL(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")

	var req struct {
		FileName string `json:"file_name" validate:"required"`
		FileType string `json:"file_type" validate:"required"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid JSON payload", "BAD_REQUEST", nil)
		return
	}

	objectName := fmt.Sprintf("notulen/%s/attachments/%s_%s", idStr, uuid.New().String()[:8], filepath.Base(req.FileName))
	uploadURL, err := h.storage.GeneratePresignedPutURL(r.Context(), objectName, 15*time.Minute)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to generate presigned upload URL", "STORAGE_ERROR", []string{err.Error()})
		return
	}

	response.Success(w, http.StatusOK, "Presigned upload URL generated", map[string]string{
		"upload_url":  uploadURL,
		"object_name": objectName,
	}, nil)
}

func (h *NotulenHandler) UploadDocument(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")

	if err := r.ParseMultipartForm(20 << 20); err != nil {
		response.Error(w, http.StatusBadRequest, "File size too large or invalid form", "BAD_REQUEST", nil)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "File parameter missing", "BAD_REQUEST", nil)
		return
	}
	defer file.Close()

	objectName := fmt.Sprintf("notulen/%s/attachments/%s_%s", idStr, uuid.New().String()[:8], filepath.Base(header.Filename))
	fileURL, err := h.storage.UploadFile(r.Context(), objectName, file, header.Size, header.Header.Get("Content-Type"))
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to upload document to storage", "STORAGE_ERROR", []string{err.Error()})
		return
	}

	response.Success(w, http.StatusOK, "Dokumen berhasil diunggah", map[string]string{
		"file_name": header.Filename,
		"file_url":  fileURL,
	}, nil)
}

func (h *NotulenHandler) Restore(w http.ResponseWriter, r *http.Request) {
	userCtx, _ := middleware.GetUserContext(r.Context())
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid UUID format", "BAD_REQUEST", nil)
		return
	}

	notulen, err := h.notulenService.RestoreNotulen(r.Context(), userCtx, id)
	if err != nil {
		resolveHTTPError(w, err, "Notulen")
		return
	}

	response.Success(w, http.StatusOK, "Notulen berhasil dipulihkan", notulen, nil)
}

func (h *NotulenHandler) ForceDelete(w http.ResponseWriter, r *http.Request) {
	userCtx, _ := middleware.GetUserContext(r.Context())
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid UUID format", "BAD_REQUEST", nil)
		return
	}

	err = h.notulenService.ForceDeleteNotulen(r.Context(), userCtx, id)
	if err != nil {
		resolveHTTPError(w, err, "Force delete notulen")
		return
	}

	response.Success(w, http.StatusOK, "Notulen berhasil dimusnahkan secara permanen", nil, nil)
}

func (h *NotulenHandler) Duplicate(w http.ResponseWriter, r *http.Request) {
	userCtx, _ := middleware.GetUserContext(r.Context())
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid UUID format", "BAD_REQUEST", nil)
		return
	}

	notulen, err := h.notulenService.DuplicateNotulen(r.Context(), userCtx, id)
	if err != nil {
		resolveHTTPError(w, err, "Notulen")
		return
	}

	response.Success(w, http.StatusCreated, "Notulen berhasil diduplikasi", notulen, nil)
}

func (h *NotulenHandler) UploadAttachment(w http.ResponseWriter, r *http.Request) {
	userCtx, _ := middleware.GetUserContext(r.Context())
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid UUID format", "BAD_REQUEST", nil)
		return
	}

	// Parse multipart form (max 10MB per file)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		response.Error(w, http.StatusBadRequest, "Failed to parse form data or file too large", "BAD_REQUEST", nil)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "File parameter missing", "BAD_REQUEST", nil)
		return
	}
	defer file.Close()

	// Upload file to MinIO
	objectName := fmt.Sprintf("notulen/%s/attachments/%s_%s", idStr, uuid.New().String()[:8], filepath.Base(header.Filename))
	fileURL, err := h.storage.UploadFile(r.Context(), objectName, file, header.Size, header.Header.Get("Content-Type"))
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to upload file to storage", "STORAGE_ERROR", []string{err.Error()})
		return
	}

	att, err := h.notulenService.AddAttachment(r.Context(), userCtx, id, header.Filename, fileURL, header.Size, header.Header.Get("Content-Type"))
	if err != nil {
		resolveHTTPError(w, err, "Attachment")
		return
	}

	response.Success(w, http.StatusCreated, "Foto dokumentasi berhasil diunggah", att, nil)
}

func (h *NotulenHandler) DeleteAttachment(w http.ResponseWriter, r *http.Request) {
	userCtx, _ := middleware.GetUserContext(r.Context())
	idStr := chi.URLParam(r, "id")
	notulenID, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid Notulen UUID", "BAD_REQUEST", nil)
		return
	}

	attIDStr := chi.URLParam(r, "attId")
	attID, err := uuid.Parse(attIDStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid Attachment UUID", "BAD_REQUEST", nil)
		return
	}

	err = h.notulenService.DeleteAttachment(r.Context(), userCtx, notulenID, attID)
	if err != nil {
		resolveHTTPError(w, err, "Attachment")
		return
	}

	response.Success(w, http.StatusOK, "Foto dokumentasi berhasil dihapus", nil, nil)
}

func (h *NotulenHandler) GetPublicInfo(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "ID notulen tidak valid", "INVALID_ID", nil)
		return
	}

	info, err := h.notulenService.GetPublicNotulenInfo(r.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			response.Error(w, http.StatusNotFound, "Notulen tidak ditemukan", "NOT_FOUND", nil)
			return
		}
		log.Printf("[GetPublicInfo] error fetching notulen: %v", err)
		response.Error(w, http.StatusInternalServerError, "Gagal mengambil data notulen", "INTERNAL_ERROR", nil)
		return
	}

	response.Success(w, http.StatusOK, "Berhasil mengambil info rapat", info, nil)
}

func (h *NotulenHandler) SubmitAttendance(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "ID notulen tidak valid", "INVALID_ID", nil)
		return
	}

	var req model.AttendeeInput
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Format request tidak valid", "INVALID_REQUEST", nil)
		return
	}

	if errs := h.validator.Validate(req); len(errs) > 0 {
		response.Error(w, http.StatusBadRequest, "Validasi gagal", "VALIDATION_ERROR", errs)
		return
	}

	err = h.notulenService.AddPublicAttendee(r.Context(), id, req)
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			response.Error(w, http.StatusNotFound, "Rapat tidak ditemukan", "NOT_FOUND", nil)
			return
		}
		response.Error(w, http.StatusInternalServerError, "Gagal menyimpan absensi", "INTERNAL_ERROR", nil)
		return
	}

	response.Success(w, http.StatusOK, "Berhasil menyimpan absensi", nil, nil)
}

func (h *NotulenHandler) GetVerificationInfo(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "ID notulen tidak valid", "INVALID_ID", nil)
		return
	}

	info, err := h.notulenService.GetPublicNotulenInfo(r.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			response.Error(w, http.StatusNotFound, "Dokumen tidak ditemukan pada arsip sistem", "NOT_FOUND", nil)
			return
		}
		log.Printf("[GetVerificationInfo] error fetching notulen: %v", err)
		response.Error(w, http.StatusInternalServerError, "Gagal mengambil data verifikasi dokumen", "INTERNAL_ERROR", nil)
		return
	}

	response.Success(w, http.StatusOK, "Berhasil mengambil data verifikasi dokumen", info, nil)
}

func (h *NotulenHandler) DownloadPublicPDF(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "ID notulen tidak valid", "INVALID_ID", nil)
		return
	}

	pdfBytes, fileName, err := h.notulenService.GeneratePublicNotulenPDF(r.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			response.Error(w, http.StatusNotFound, "Dokumen tidak ditemukan", "NOT_FOUND", nil)
			return
		}
		if errors.Is(err, service.ErrForbidden) {
			response.Error(w, http.StatusForbidden, "Salinan resmi hanya tersedia untuk dokumen berstatus final", "FORBIDDEN", nil)
			return
		}
		log.Printf("[DownloadPublicPDF] error generating PDF: %v", err)
		response.Error(w, http.StatusInternalServerError, "Gagal menghasilkan dokumen PDF", "INTERNAL_ERROR", nil)
		return
	}

	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", fileName))
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(pdfBytes)))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(pdfBytes)
}
