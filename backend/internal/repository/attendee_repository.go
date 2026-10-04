package repository

import (
	"context"

	"e-notulen/backend/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AttendeeRepository interface {
	GetByNotulenID(ctx context.Context, notulenID uuid.UUID) ([]model.Attendee, error)
	CreateBatch(ctx context.Context, notulenID uuid.UUID, attendees []model.AttendeeInput) error
	CreateSingle(ctx context.Context, notulenID uuid.UUID, attendee model.AttendeeInput) error
	DeleteByNotulenID(ctx context.Context, notulenID uuid.UUID) error
}

type attendeeRepository struct {
	db *pgxpool.Pool
}

func NewAttendeeRepository(db *pgxpool.Pool) AttendeeRepository {
	return &attendeeRepository{db: db}
}

func (r *attendeeRepository) GetByNotulenID(ctx context.Context, notulenID uuid.UUID) ([]model.Attendee, error) {
	query := `
		SELECT id, notulen_id, name, COALESCE(institution, ''), COALESCE(position, ''), sort_order, created_at
		FROM notulen_attendees
		WHERE notulen_id = $1
		ORDER BY sort_order ASC, created_at ASC
	`
	rows, err := r.db.Query(ctx, query, notulenID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []model.Attendee
	for rows.Next() {
		var a model.Attendee
		if err := rows.Scan(&a.ID, &a.NotulenID, &a.Name, &a.Institution, &a.Position, &a.SortOrder, &a.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, a)
	}

	return result, nil
}

func (r *attendeeRepository) CreateBatch(ctx context.Context, notulenID uuid.UUID, attendees []model.AttendeeInput) error {
	if len(attendees) == 0 {
		return nil
	}

	query := `
		INSERT INTO notulen_attendees (id, notulen_id, name, institution, position, sort_order, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
	`

	for idx, a := range attendees {
		_, err := r.db.Exec(ctx, query, uuid.New(), notulenID, a.Name, a.Institution, a.Position, idx+1)
		if err != nil {
			return err
		}
	}
	return nil
}

func (r *attendeeRepository) CreateSingle(ctx context.Context, notulenID uuid.UUID, a model.AttendeeInput) error {
	query := `
		INSERT INTO notulen_attendees (id, notulen_id, name, institution, position, sort_order, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
	`
	_, err := r.db.Exec(ctx, query, uuid.New(), notulenID, a.Name, a.Institution, a.Position, a.SortOrder)
	return err
}

func (r *attendeeRepository) DeleteByNotulenID(ctx context.Context, notulenID uuid.UUID) error {
	query := `DELETE FROM notulen_attendees WHERE notulen_id = $1`
	_, err := r.db.Exec(ctx, query, notulenID)
	return err
}
