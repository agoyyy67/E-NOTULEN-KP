package model

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Notulen struct {
	ID               uuid.UUID        `json:"id"`
	Title            string           `json:"title"`
	MeetingDate      string           `json:"meeting_date"` // YYYY-MM-DD
	StartTime        *string          `json:"start_time"`   // HH:MM
	EndTime          *string          `json:"end_time"`     // HH:MM
	Location         string           `json:"location"`
	LedBy            string           `json:"led_by"`
	LedByPosition    string           `json:"led_by_position"`
	LedByNIP         string           `json:"led_by_nip"`
	SignedBy         string           `json:"signed_by"`
	SignedByPosition string           `json:"signed_by_position"`
	SignedByNIP      string           `json:"signed_by_nip"`
	NotulistName     string           `json:"notulist_name"`
	NotulistPosition string           `json:"notulist_position"`
	NotulistNIP      string           `json:"notulist_nip"`
	InputType        string           `json:"input_type"` // 'editor' | 'upload'
	Content          json.RawMessage  `json:"content"`
	FileURL          string           `json:"file_url"`
	FileName         string           `json:"file_name"`
	Summary          string           `json:"summary"`
	OPDCode          string           `json:"opd_code"`
	OPDName          string           `json:"opd_name"`
	CreatedBySub     uuid.UUID        `json:"created_by_sub"`
	CreatedByName    string           `json:"created_by_name"`
	Status           string           `json:"status"` // 'draft' | 'final'
	CreatedAt        time.Time        `json:"created_at"`
	UpdatedAt        time.Time        `json:"updated_at"`
	DeletedAt        *time.Time       `json:"deleted_at,omitempty"`
	AttendeeCount    int              `json:"attendee_count"`
	AttachmentCount  int              `json:"attachment_count"`
	Attendees        []Attendee       `json:"attendees,omitempty"`
	Attachments      []Attachment     `json:"attachments,omitempty"`
	OPDSettings      *OPDSettings     `json:"opd_settings,omitempty"`
}

type Attendee struct {
	ID          uuid.UUID `json:"id"`
	NotulenID   uuid.UUID `json:"notulen_id"`
	Name        string    `json:"name"`
	Institution string    `json:"institution"`
	Position    string    `json:"position"`
	SortOrder   int       `json:"sort_order"`
	CreatedAt   time.Time `json:"created_at"`
}

type Attachment struct {
	ID        uuid.UUID `json:"id"`
	NotulenID uuid.UUID `json:"notulen_id"`
	FileName  string    `json:"file_name"`
	FileURL   string    `json:"file_url"`
	FileSize  int64     `json:"file_size"`
	MimeType  string    `json:"mime_type"`
	SortOrder int       `json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
}

type AutoSave struct {
	ID          uuid.UUID       `json:"id"`
	NotulenID   uuid.UUID       `json:"notulen_id"`
	Content     json.RawMessage `json:"content"`
	SavedBySub  uuid.UUID       `json:"saved_by_sub"`
	SavedByName string          `json:"saved_by_name"`
	CreatedAt   time.Time       `json:"created_at"`
}

type CreateNotulenRequest struct {
	Title            string          `json:"title" validate:"required"`
	MeetingDate      string          `json:"meeting_date" validate:"required"`
	StartTime        *string         `json:"start_time"`
	EndTime          *string         `json:"end_time"`
	Location         string          `json:"location"`
	LedBy            string          `json:"led_by"`
	LedByPosition    string          `json:"led_by_position"`
	LedByNIP         string          `json:"led_by_nip"`
	SignedBy         string          `json:"signed_by"`
	SignedByPosition string          `json:"signed_by_position"`
	SignedByNIP      string          `json:"signed_by_nip"`
	NotulistName     string          `json:"notulist_name"`
	NotulistPosition string          `json:"notulist_position"`
	NotulistNIP      string          `json:"notulist_nip"`
	InputType        string          `json:"input_type" validate:"required,oneof=editor upload"`
	Content          json.RawMessage `json:"content"`
	FileURL          string          `json:"file_url"`
	FileName         string          `json:"file_name"`
	Summary          string          `json:"summary"`
	OPDCode          string          `json:"opd_code"`
	OPDName          string          `json:"opd_name"`
	Status           string          `json:"status" validate:"omitempty,oneof=draft final"`
	Attendees        []AttendeeInput `json:"attendees"`
}

type UpdateNotulenRequest struct {
	Title            string          `json:"title"`
	MeetingDate      string          `json:"meeting_date"`
	StartTime        *string         `json:"start_time"`
	EndTime          *string         `json:"end_time"`
	Location         string          `json:"location"`
	LedBy            string          `json:"led_by"`
	LedByPosition    string          `json:"led_by_position"`
	LedByNIP         string          `json:"led_by_nip"`
	SignedBy         string          `json:"signed_by"`
	SignedByPosition string          `json:"signed_by_position"`
	SignedByNIP      string          `json:"signed_by_nip"`
	NotulistName     string          `json:"notulist_name"`
	NotulistPosition string          `json:"notulist_position"`
	NotulistNIP      string          `json:"notulist_nip"`
	OPDCode          string          `json:"opd_code"`
	OPDName          string          `json:"opd_name"`
	InputType        string          `json:"input_type"`
	Content          json.RawMessage `json:"content"`
	FileURL          string          `json:"file_url"`
	FileName         string          `json:"file_name"`
	Summary          string          `json:"summary"`
	Status           string          `json:"status"`
	Attendees        []AttendeeInput `json:"attendees"` // nil = tidak diubah, [] = hapus semua
}

type AttendeeInput struct {
	Name        string `json:"name" validate:"required"`
	Institution string `json:"institution"`
	Position    string `json:"position"`
	SortOrder   int    `json:"sort_order"`
}

type AutoSaveRequest struct {
	Content json.RawMessage `json:"content" validate:"required"`
}

type NotulenFilter struct {
	Query     string
	OPDCode   string
	Status    string
	DateFrom  string
	DateTo    string
	UserSub   string
	UserRole  string
	Page      int
	PerPage   int
	SortBy    string
	SortOrder string
}

type PublicNotulenInfo struct {
	ID          uuid.UUID `json:"id"`
	Title       string    `json:"title"`
	MeetingDate string    `json:"meeting_date"`
	StartTime   *string   `json:"start_time"`
	EndTime     *string   `json:"end_time"`
	Location    string    `json:"location"`
	OPDName     string    `json:"opd_name"`
}
