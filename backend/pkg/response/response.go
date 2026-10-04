package response

import (
	"encoding/json"
	"net/http"
)

type Meta struct {
	Page       int   `json:"page,omitempty"`
	PerPage    int   `json:"per_page,omitempty"`
	Total      int64 `json:"total,omitempty"`
	TotalPages int   `json:"total_pages,omitempty"`
}

type JSONResponse struct {
	Success   bool        `json:"success"`
	Message   string      `json:"message"`
	Data      interface{} `json:"data,omitempty"`
	Meta      *Meta       `json:"meta,omitempty"`
	ErrorCode string      `json:"error_code,omitempty"`
	Errors    interface{} `json:"errors,omitempty"`
}

func JSON(w http.ResponseWriter, statusCode int, payload JSONResponse) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(payload)
}

func Success(w http.ResponseWriter, statusCode int, message string, data interface{}, meta *Meta) {
	JSON(w, statusCode, JSONResponse{
		Success: true,
		Message: message,
		Data:    data,
		Meta:    meta,
	})
}

func Error(w http.ResponseWriter, statusCode int, message string, errorCode string, errs interface{}) {
	if errs == nil {
		errs = []string{}
	}
	JSON(w, statusCode, JSONResponse{
		Success:   false,
		Message:   message,
		ErrorCode: errorCode,
		Errors:    errs,
	})
}
