package repository

import (
	"context"

	"e-notulen/backend/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AttachmentRepository interface {
	GetByNotulenID(ctx context.Context, notulenID uuid.UUID) ([]model.Attachment, error)
	Create(ctx context.Context, att *model.Attachment) error
	Delete(ctx context.Context, id uuid.UUID) error
}

type attachmentRepository struct {
	db *pgxpool.Pool
}

func NewAttachmentRepository(db *pgxpool.Pool) AttachmentRepository {
	return &attachmentRepository{db: db}
}

func (r *attachmentRepository) GetByNotulenID(ctx context.Context, notulenID uuid.UUID) ([]model.Attachment, error) {
	query := `
		SELECT id, notulen_id, file_name, file_url, file_size, mime_type, sort_order, created_at
		FROM notulen_attachments
		WHERE notulen_id = $1
		ORDER BY sort_order ASC, created_at ASC
	`
	rows, err := r.db.Query(ctx, query, notulenID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []model.Attachment
	for rows.Next() {
		var a model.Attachment
		if err := rows.Scan(&a.ID, &a.NotulenID, &a.FileName, &a.FileURL, &a.FileSize, &a.MimeType, &a.SortOrder, &a.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, a)
	}

	return result, nil
}

func (r *attachmentRepository) Create(ctx context.Context, att *model.Attachment) error {
	if att.ID == uuid.Nil {
		att.ID = uuid.New()
	}
	query := `
		INSERT INTO notulen_attachments (id, notulen_id, file_name, file_url, file_size, mime_type, sort_order, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
	`
	_, err := r.db.Exec(ctx, query, att.ID, att.NotulenID, att.FileName, att.FileURL, att.FileSize, att.MimeType, att.SortOrder)
	return err
}

func (r *attachmentRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM notulen_attachments WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	return err
}
