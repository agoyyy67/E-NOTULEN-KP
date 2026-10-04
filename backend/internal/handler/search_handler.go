package handler

import (
	"net/http"
	"strconv"

	"e-notulen/backend/internal/middleware"
	"e-notulen/backend/internal/model"
	"e-notulen/backend/internal/service"
	"e-notulen/backend/pkg/response"
)

type SearchHandler struct {
	notulenService service.NotulenService
}

func NewSearchHandler(notulenService service.NotulenService) *SearchHandler {
	return &SearchHandler{notulenService: notulenService}
}

func (h *SearchHandler) Search(w http.ResponseWriter, r *http.Request) {
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
		SortBy:    "meeting_date",
		SortOrder: "DESC",
	}

	results, meta, err := h.notulenService.ListNotulen(r.Context(), userCtx, filter)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Search failed", "SEARCH_FAILED", []string{err.Error()})
		return
	}

	response.Success(w, http.StatusOK, "Search results retrieved", results, meta)
}
