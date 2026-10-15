package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"time"

	"e-notulen/backend/internal/model"
	"e-notulen/backend/pkg/response"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type NotulenRepository interface {
	Create(ctx context.Context, n *model.Notulen) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.Notulen, error)
	GetByIDIncludeDeleted(ctx context.Context, id uuid.UUID) (*model.Notulen, error)
	Update(ctx context.Context, n *model.Notulen) error
	SoftDelete(ctx context.Context, id uuid.UUID, deletedByName string, deletedBySub string) error
	Restore(ctx context.Context, id uuid.UUID) error
	ForceDelete(ctx context.Context, id uuid.UUID) error
	UpdateStatus(ctx context.Context, id uuid.UUID, status string) error
	List(ctx context.Context, filter model.NotulenFilter) ([]model.Notulen, *response.Meta, error)
	GetDashboardSummary(ctx context.Context, userRole, opdCode, userSub string) (*model.DashboardSummary, error)
}

type notulenRepository struct {
	db *pgxpool.Pool
}

func NewNotulenRepository(db *pgxpool.Pool) NotulenRepository {
	return &notulenRepository{db: db}
}

func (r *notulenRepository) Create(ctx context.Context, n *model.Notulen) error {
	query := `
		INSERT INTO notulen (
			id, title, meeting_date, start_time, end_time, location,
			led_by, led_by_position, led_by_nip,
			signed_by, signed_by_position, signed_by_nip,
			notulist_name, notulist_position, notulist_nip,
			input_type, content, file_url, file_name, summary,
			opd_code, opd_name, created_by_sub, created_by_name, status,
			created_at, updated_at
		) VALUES (
			$1, $2, $3::date, NULLIF($4, '')::time, NULLIF($5, '')::time, $6,
			$7, $8, $9,
			$10, $11, $12,
			$13, $14, $15,
			$16, $17, $18, $19, $20,
			$21, $22, $23, $24, $25,
			NOW(), NOW()
		)
	`
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}

	contentBytes := []byte("{}")
	if len(n.Content) > 0 {
		contentBytes = n.Content
	}

	_, err := r.db.Exec(ctx, query,
		n.ID, n.Title, n.MeetingDate, n.StartTime, n.EndTime, n.Location,
		n.LedBy, n.LedByPosition, n.LedByNIP,
		n.SignedBy, n.SignedByPosition, n.SignedByNIP,
		n.NotulistName, n.NotulistPosition, n.NotulistNIP,
		n.InputType, contentBytes, n.FileURL, n.FileName, n.Summary,
		n.OPDCode, n.OPDName, n.CreatedBySub, n.CreatedByName, n.Status,
	)
	return err
}

func (r *notulenRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Notulen, error) {
	query := `
		SELECT 
			id, title, meeting_date::text, start_time::text, end_time::text, location,
			led_by, led_by_position, led_by_nip,
			COALESCE(signed_by, ''), COALESCE(signed_by_position, ''), COALESCE(signed_by_nip, ''),
			notulist_name, notulist_position, notulist_nip,
			input_type, content, COALESCE(file_url, ''), COALESCE(file_name, ''), COALESCE(summary, ''),
			opd_code, opd_name, created_by_sub, created_by_name, status,
			created_at, updated_at, deleted_at
		FROM notulen
		WHERE id = $1 AND deleted_at IS NULL
	`

	var n model.Notulen
	var rawContent []byte
	var startTime, endTime sql.NullString

	err := r.db.QueryRow(ctx, query, id).Scan(
		&n.ID, &n.Title, &n.MeetingDate, &startTime, &endTime, &n.Location,
		&n.LedBy, &n.LedByPosition, &n.LedByNIP,
		&n.SignedBy, &n.SignedByPosition, &n.SignedByNIP,
		&n.NotulistName, &n.NotulistPosition, &n.NotulistNIP,
		&n.InputType, &rawContent, &n.FileURL, &n.FileName, &n.Summary,
		&n.OPDCode, &n.OPDName, &n.CreatedBySub, &n.CreatedByName, &n.Status,
		&n.CreatedAt, &n.UpdatedAt, &n.DeletedAt,
	)
	if err != nil {
		return nil, err
	}

	if startTime.Valid {
		n.StartTime = &startTime.String
	}
	if endTime.Valid {
		n.EndTime = &endTime.String
	}

	if len(rawContent) > 0 {
		n.Content = json.RawMessage(rawContent)
	}

	return &n, nil
}

func (r *notulenRepository) Update(ctx context.Context, n *model.Notulen) error {
	query := `
		UPDATE notulen SET
			title = $1, meeting_date = $2::date, start_time = NULLIF($3, '')::time, end_time = NULLIF($4, '')::time, location = $5,
			led_by = $6, led_by_position = $7, led_by_nip = $8,
			signed_by = $9, signed_by_position = $10, signed_by_nip = $11,
			notulist_name = $12, notulist_position = $13, notulist_nip = $14,
			input_type = $15, content = $16, file_url = $17, file_name = $18, summary = $19,
			opd_code = $20, opd_name = $21, status = $22, updated_at = NOW()
		WHERE id = $23 AND deleted_at IS NULL
	`
	contentBytes := []byte("{}")
	if len(n.Content) > 0 {
		contentBytes = n.Content
	}

	_, err := r.db.Exec(ctx, query,
		n.Title, n.MeetingDate, n.StartTime, n.EndTime, n.Location,
		n.LedBy, n.LedByPosition, n.LedByNIP,
		n.SignedBy, n.SignedByPosition, n.SignedByNIP,
		n.NotulistName, n.NotulistPosition, n.NotulistNIP,
		n.InputType, contentBytes, n.FileURL, n.FileName, n.Summary,
		n.OPDCode, n.OPDName, n.Status, n.ID,
	)
	return err
}

func (r *notulenRepository) SoftDelete(ctx context.Context, id uuid.UUID, deletedByName string, deletedBySub string) error {
	query := `UPDATE notulen SET deleted_at = NOW(), deleted_by_name = $2, deleted_by_sub = NULLIF($3, '')::uuid WHERE id = $1 AND deleted_at IS NULL`
	_, err := r.db.Exec(ctx, query, id, deletedByName, deletedBySub)
	return err
}

func (r *notulenRepository) GetByIDIncludeDeleted(ctx context.Context, id uuid.UUID) (*model.Notulen, error) {
	query := `
		SELECT 
			id, title, meeting_date::text, start_time::text, end_time::text, location,
			led_by, led_by_position, led_by_nip,
			COALESCE(signed_by, ''), COALESCE(signed_by_position, ''), COALESCE(signed_by_nip, ''),
			notulist_name, notulist_position, notulist_nip,
			input_type, content, COALESCE(file_url, ''), COALESCE(file_name, ''), COALESCE(summary, ''),
			opd_code, opd_name, created_by_sub, created_by_name,
			CASE WHEN deleted_at IS NOT NULL THEN 'deleted' ELSE status END AS status,
			created_at, updated_at, deleted_at,
			COALESCE(deleted_by_name, created_by_name)
		FROM notulen
		WHERE id = $1
	`

	var n model.Notulen
	var rawContent []byte
	var startTime, endTime sql.NullString
	var deletedByNameStr string

	err := r.db.QueryRow(ctx, query, id).Scan(
		&n.ID, &n.Title, &n.MeetingDate, &startTime, &endTime, &n.Location,
		&n.LedBy, &n.LedByPosition, &n.LedByNIP,
		&n.SignedBy, &n.SignedByPosition, &n.SignedByNIP,
		&n.NotulistName, &n.NotulistPosition, &n.NotulistNIP,
		&n.InputType, &rawContent, &n.FileURL, &n.FileName, &n.Summary,
		&n.OPDCode, &n.OPDName, &n.CreatedBySub, &n.CreatedByName, &n.Status,
		&n.CreatedAt, &n.UpdatedAt, &n.DeletedAt,
		&deletedByNameStr,
	)
	if err != nil {
		return nil, err
	}

	if startTime.Valid {
		n.StartTime = &startTime.String
	}
	if endTime.Valid {
		n.EndTime = &endTime.String
	}

	if len(rawContent) > 0 {
		n.Content = json.RawMessage(rawContent)
	}

	if deletedByNameStr != "" {
		n.DeletedByName = &deletedByNameStr
	}

	return &n, nil
}

func (r *notulenRepository) Restore(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE notulen SET deleted_at = NULL, deleted_by_name = NULL, deleted_by_sub = NULL, status = 'draft', updated_at = NOW() WHERE id = $1 AND deleted_at IS NOT NULL`
	_, err := r.db.Exec(ctx, query, id)
	return err
}

func (r *notulenRepository) ForceDelete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM notulen WHERE id = $1 AND deleted_at IS NOT NULL`
	_, err := r.db.Exec(ctx, query, id)
	return err
}

func (r *notulenRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	query := `UPDATE notulen SET status = $1, updated_at = NOW() WHERE id = $2 AND deleted_at IS NULL`
	_, err := r.db.Exec(ctx, query, status, id)
	return err
}

func (r *notulenRepository) List(ctx context.Context, f model.NotulenFilter) ([]model.Notulen, *response.Meta, error) {
	if f.Page <= 0 {
		f.Page = 1
	}
	if f.PerPage <= 0 {
		f.PerPage = 10
	}
	offset := (f.Page - 1) * f.PerPage

	var conditions []string
	var args []interface{}
	argIdx := 1

	if f.Status == "deleted" {
		conditions = append(conditions, "n.deleted_at IS NOT NULL")
	} else {
		conditions = append(conditions, "n.deleted_at IS NULL")
		if f.Status != "" {
			conditions = append(conditions, fmt.Sprintf("n.status = $%d", argIdx))
			args = append(args, f.Status)
			argIdx++
		}
	}

	// Role-based scope filter
	switch f.UserRole {
	case "admin":
		if f.OPDCode != "" {
			conditions = append(conditions, fmt.Sprintf("n.opd_code = $%d", argIdx))
			args = append(args, f.OPDCode)
			argIdx++
		}
	case "operator":
		conditions = append(conditions, fmt.Sprintf("n.opd_code = $%d", argIdx))
		args = append(args, f.OPDCode)
		argIdx++
	case "officer":
		conditions = append(conditions, fmt.Sprintf("n.created_by_sub = $%d", argIdx))
		args = append(args, f.UserSub)
		argIdx++
	}

	if f.DateFrom != "" {
		conditions = append(conditions, fmt.Sprintf("n.meeting_date >= $%d", argIdx))
		args = append(args, f.DateFrom)
		argIdx++
	}

	if f.DateTo != "" {
		conditions = append(conditions, fmt.Sprintf("n.meeting_date <= $%d", argIdx))
		args = append(args, f.DateTo)
		argIdx++
	}

	// Search: ILIKE pada judul, tempat, OPD, ringkasan (partial match) + FTS pada content_search.
	if f.Query != "" {
		likeParam := "%" + f.Query + "%"
		p1 := argIdx
		p2 := argIdx + 1
		p3 := argIdx + 2
		p4 := argIdx + 3
		p5 := argIdx + 4
		conditions = append(conditions, fmt.Sprintf(
			"(n.title ILIKE $%d OR n.location ILIKE $%d OR n.opd_name ILIKE $%d OR COALESCE(n.summary, '') ILIKE $%d OR n.content_search @@ plainto_tsquery('simple', $%d))",
			p1, p2, p3, p4, p5,
		))
		args = append(args, likeParam, likeParam, likeParam, likeParam, f.Query)
		argIdx += 5
	}

	whereClause := strings.Join(conditions, " AND ")

	// Count Total
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM notulen n WHERE %s", whereClause)
	var total int64
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, nil, fmt.Errorf("count query failed: %w", err)
	}

	// Order & Pagination — whitelist sort columns to prevent SQL injection
	allowedSortBy := map[string]bool{
		"meeting_date": true,
		"created_at":   true,
		"updated_at":   true,
		"title":        true,
		"status":       true,
	}
	sortBy := "n.meeting_date"
	if f.SortBy != "" && allowedSortBy[f.SortBy] {
		sortBy = "n." + f.SortBy
	}
	sortOrder := "DESC"
	if strings.ToUpper(f.SortOrder) == "ASC" {
		sortOrder = "ASC"
	}

	query := fmt.Sprintf(`
		SELECT 
			n.id, n.title, n.meeting_date::text, n.start_time::text, n.end_time::text, n.location,
			n.led_by, n.led_by_position, n.led_by_nip,
			COALESCE(n.signed_by, ''), COALESCE(n.signed_by_position, ''), COALESCE(n.signed_by_nip, ''),
			n.notulist_name, n.notulist_position, n.notulist_nip,
			n.input_type, COALESCE(n.file_url, ''), COALESCE(n.file_name, ''), COALESCE(n.summary, ''),
			n.opd_code, n.opd_name, n.created_by_sub, n.created_by_name,
			CASE WHEN n.deleted_at IS NOT NULL THEN 'deleted' ELSE n.status END AS status,
			n.created_at, n.updated_at, n.deleted_at,
			COALESCE(n.deleted_by_name, n.created_by_name) AS deleted_by_name,
			(SELECT COUNT(*) FROM notulen_attendees na WHERE na.notulen_id = n.id) AS attendee_count,
			(SELECT COUNT(*) FROM notulen_attachments nat WHERE nat.notulen_id = n.id) AS attachment_count
		FROM notulen n
		WHERE %s
		ORDER BY %s %s, n.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, sortBy, sortOrder, argIdx, argIdx+1)

	args = append(args, f.PerPage, offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, nil, fmt.Errorf("list query failed: %w", err)
	}
	defer rows.Close()

	result := []model.Notulen{}
	for rows.Next() {
		var n model.Notulen
		var startTime, endTime sql.NullString
		var deletedAt *time.Time
		var deletedByName sql.NullString

		err := rows.Scan(
			&n.ID, &n.Title, &n.MeetingDate, &startTime, &endTime, &n.Location,
			&n.LedBy, &n.LedByPosition, &n.LedByNIP,
			&n.SignedBy, &n.SignedByPosition, &n.SignedByNIP,
			&n.NotulistName, &n.NotulistPosition, &n.NotulistNIP,
			&n.InputType, &n.FileURL, &n.FileName, &n.Summary,
			&n.OPDCode, &n.OPDName, &n.CreatedBySub, &n.CreatedByName, &n.Status,
			&n.CreatedAt, &n.UpdatedAt, &deletedAt, &deletedByName,
			&n.AttendeeCount, &n.AttachmentCount,
		)
		if err != nil {
			return nil, nil, err
		}
		if startTime.Valid {
			n.StartTime = &startTime.String
		}
		if endTime.Valid {
			n.EndTime = &endTime.String
		}
		if deletedAt != nil {
			n.DeletedAt = deletedAt
		}
		if deletedByName.Valid && deletedByName.String != "" {
			n.DeletedByName = &deletedByName.String
		}
		result = append(result, n)
	}

	totalPages := int(math.Ceil(float64(total) / float64(f.PerPage)))
	meta := &response.Meta{
		Page:       f.Page,
		PerPage:    f.PerPage,
		Total:      total,
		TotalPages: totalPages,
	}

	return result, meta, nil
}

func (r *notulenRepository) GetDashboardSummary(ctx context.Context, userRole, opdCode, userSub string) (*model.DashboardSummary, error) {
	var scopeWhere string
	var args []interface{}

	switch userRole {
	case "admin":
		scopeWhere = "WHERE n.deleted_at IS NULL"
	case "operator":
		scopeWhere = "WHERE n.deleted_at IS NULL AND n.opd_code = $1"
		args = append(args, opdCode)
	case "officer":
		scopeWhere = "WHERE n.deleted_at IS NULL AND n.created_by_sub = $1"
		args = append(args, userSub)
	}

	summaryQuery := fmt.Sprintf(`
		SELECT 
			COUNT(n.id) as total,
			COUNT(CASE WHEN EXTRACT(MONTH FROM n.meeting_date) = EXTRACT(MONTH FROM NOW()) AND EXTRACT(YEAR FROM n.meeting_date) = EXTRACT(YEAR FROM NOW()) THEN 1 END) as total_bulan_ini,
			COUNT(CASE WHEN n.status = 'draft' THEN 1 END) as total_draft,
			COUNT(CASE WHEN n.status = 'final' THEN 1 END) as total_final,
			COUNT(DISTINCT n.opd_code) as total_opd,
			COALESCE(SUM((SELECT COUNT(*) FROM notulen_attendees na WHERE na.notulen_id = n.id)), 0) as total_peserta
		FROM notulen n
		%s
	`, scopeWhere)

	var s model.DashboardSummary
	err := r.db.QueryRow(ctx, summaryQuery, args...).Scan(&s.TotalNotulen, &s.TotalBulanIni, &s.TotalDraft, &s.TotalFinal, &s.TotalOPDActive, &s.TotalPeserta)
	if err != nil {
		return nil, err
	}

	if s.TotalNotulen > 0 {
		s.RataPeserta = math.Round(float64(s.TotalPeserta)/float64(s.TotalNotulen)*10) / 10
	}

	// ── Query Monthly Trend (Current Year) ──
	monthlyQuery := fmt.Sprintf(`
		SELECT 
			TO_CHAR(n.meeting_date, 'Mon') as month,
			COUNT(CASE WHEN n.status = 'draft' THEN 1 END) as draft,
			COUNT(CASE WHEN n.status = 'final' THEN 1 END) as final,
			COUNT(*) as total,
			EXTRACT(MONTH FROM n.meeting_date) as month_num
		FROM notulen n
		%s AND EXTRACT(YEAR FROM n.meeting_date) = EXTRACT(YEAR FROM NOW())
		GROUP BY TO_CHAR(n.meeting_date, 'Mon'), EXTRACT(MONTH FROM n.meeting_date)
		ORDER BY month_num ASC
	`, scopeWhere)

	mRows, err := r.db.Query(ctx, monthlyQuery, args...)
	if err == nil {
		defer mRows.Close()
		s.MonthlyStats = []model.MonthlyCount{}
		for mRows.Next() {
			var m model.MonthlyCount
			var monthNum float64
			if err := mRows.Scan(&m.Month, &m.Draft, &m.Final, &m.Total, &monthNum); err == nil {
				s.MonthlyStats = append(s.MonthlyStats, m)
			}
		}
	}

	// ── Query OPD Rankings (Limit 7) ──
	opdQuery := fmt.Sprintf(`
		SELECT 
			n.opd_code,
			n.opd_name,
			COUNT(*) as count
		FROM notulen n
		%s
		GROUP BY n.opd_code, n.opd_name
		ORDER BY count DESC
		LIMIT 7
	`, scopeWhere)

	oRows, err := r.db.Query(ctx, opdQuery, args...)
	if err == nil {
		defer oRows.Close()
		s.OPDRankings = []model.OPDNotulenCount{}
		for oRows.Next() {
			var o model.OPDNotulenCount
			if err := oRows.Scan(&o.OPDCode, &o.OPDName, &o.Count); err == nil {
				s.OPDRankings = append(s.OPDRankings, o)
			}
		}
	}

	return &s, nil
}
