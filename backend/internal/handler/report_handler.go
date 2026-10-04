package handler

import (
	"net/http"
	"strconv"

	"e-notulen/backend/internal/middleware"
	"e-notulen/backend/internal/model"
	"e-notulen/backend/internal/service"
	"e-notulen/backend/pkg/response"
)

type ReportHandler struct {
	reportService  service.ReportService
	notulenService service.NotulenService
}

func NewReportHandler(reportService service.ReportService, notulenService service.NotulenService) *ReportHandler {
	return &ReportHandler{reportService: reportService, notulenService: notulenService}
}

func (h *ReportHandler) Summary(w http.ResponseWriter, r *http.Request) {
	userCtx, _ := middleware.GetUserContext(r.Context())
	summary, err := h.reportService.GetDashboardSummary(r.Context(), userCtx)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to fetch dashboard summary", "REPORT_FETCH_FAILED", []string{err.Error()})
		return
	}

	response.Success(w, http.StatusOK, "Dashboard summary retrieved", summary, nil)
}

func (h *ReportHandler) Activities(w http.ResponseWriter, r *http.Request) {
	userCtx, _ := middleware.GetUserContext(r.Context())
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 {
		limit = 10
	}

	filter := model.NotulenFilter{
		Query:     r.URL.Query().Get("q"),
		OPDCode:   r.URL.Query().Get("opd_code"),
		Status:    r.URL.Query().Get("status"),
		DateFrom:  r.URL.Query().Get("date_from"),
		DateTo:    r.URL.Query().Get("date_to"),
		UserRole:  userCtx.Role,
		UserSub:   userCtx.Sub,
		Page:      page,
		PerPage:   limit,
		SortBy:    "created_at",
		SortOrder: "DESC",
	}

	if filter.OPDCode == "" && userCtx.Role == "operator" {
		filter.OPDCode = userCtx.OPDCode
	}

	items, meta, err := h.notulenService.ListNotulen(r.Context(), userCtx, filter)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to fetch activities", "ACTIVITIES_FETCH_FAILED", []string{err.Error()})
		return
	}

	response.Success(w, http.StatusOK, "Activities retrieved", items, meta)
}
