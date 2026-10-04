package repository

import (
	"context"

	"e-notulen/backend/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AutoSaveRepository interface {
	Save(ctx context.Context, as *model.AutoSave) error
	GetHistory(ctx context.Context, notulenID uuid.UUID) ([]model.AutoSave, error)
}

type autoSaveRepository struct {
	db *pgxpool.Pool
}

func NewAutoSaveRepository(db *pgxpool.Pool) AutoSaveRepository {
	return &autoSaveRepository{db: db}
}

func (r *autoSaveRepository) Save(ctx context.Context, as *model.AutoSave) error {
	if as.ID == uuid.Nil {
		as.ID = uuid.New()
	}

	queryInsert := `
		INSERT INTO notulen_auto_saves (id, notulen_id, content, saved_by_sub, saved_by_name, created_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
	`
	_, err := r.db.Exec(ctx, queryInsert, as.ID, as.NotulenID, as.Content, as.SavedBySub, as.SavedByName)
	if err != nil {
		return err
	}

	// Auto-cleanup: keep only latest 20 snapshots
	queryCleanup := `
		DELETE FROM notulen_auto_saves
		WHERE notulen_id = $1 AND id NOT IN (
			SELECT id FROM notulen_auto_saves
			WHERE notulen_id = $1
			ORDER BY created_at DESC
			LIMIT 20
		)
	`
	_, _ = r.db.Exec(ctx, queryCleanup, as.NotulenID)

	return nil
}

func (r *autoSaveRepository) GetHistory(ctx context.Context, notulenID uuid.UUID) ([]model.AutoSave, error) {
	query := `
		SELECT id, notulen_id, content, saved_by_sub, saved_by_name, created_at
		FROM notulen_auto_saves
		WHERE notulen_id = $1
		ORDER BY created_at DESC
		LIMIT 20
	`
	rows, err := r.db.Query(ctx, query, notulenID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []model.AutoSave
	for rows.Next() {
		var as model.AutoSave
		if err := rows.Scan(&as.ID, &as.NotulenID, &as.Content, &as.SavedBySub, &as.SavedByName, &as.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, as)
	}

	return result, nil
}
