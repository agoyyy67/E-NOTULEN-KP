package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"e-notulen/backend/internal/model"

	"github.com/jackc/pgx/v5/pgxpool"
)

type OPDRepository interface {
	GetSKPDList(ctx context.Context) ([]model.OPDSKPDItem, error)
	GetOPDSettings(ctx context.Context, kodeUnit string) (*model.OPDSettings, error)
	SaveOrUpdateSettings(ctx context.Context, settings *model.OPDSettings) error
	UpdateLogoURL(ctx context.Context, kodeUnit, logoURL string) error
}

type opdRepository struct {
	db         *pgxpool.Pool
	skpdAPIURL string
	cacheTTL   time.Duration
	cacheData  []model.OPDSKPDItem
	cacheExpiry time.Time
	mu         sync.RWMutex
}

func NewOPDRepository(db *pgxpool.Pool, skpdAPIURL string, cacheTTLSeconds int) OPDRepository {
	return &opdRepository{
		db:         db,
		skpdAPIURL: skpdAPIURL,
		cacheTTL:   time.Duration(cacheTTLSeconds) * time.Second,
	}
}

func (r *opdRepository) GetSKPDList(ctx context.Context) ([]model.OPDSKPDItem, error) {
	r.mu.RLock()
	if time.Now().Before(r.cacheExpiry) && len(r.cacheData) > 0 {
		data := r.cacheData
		r.mu.RUnlock()
		return data, nil
	}
	r.mu.RUnlock()

	r.mu.Lock()
	defer r.mu.Unlock()

	if time.Now().Before(r.cacheExpiry) && len(r.cacheData) > 0 {
		return r.cacheData, nil
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(r.skpdAPIURL)
	if err != nil {
		if len(r.cacheData) > 0 {
			return r.cacheData, nil // Fallback to stale cache if external API is down
		}
		return nil, fmt.Errorf("failed to fetch SKPD list from external API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		if len(r.cacheData) > 0 {
			return r.cacheData, nil
		}
		return nil, fmt.Errorf("external SKPD API returned status: %d", resp.StatusCode)
	}

	var apiResp model.SKPDAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		if len(r.cacheData) > 0 {
			return r.cacheData, nil
		}
		return nil, fmt.Errorf("failed to decode SKPD API response: %w", err)
	}

	r.cacheData = apiResp.Data
	r.cacheExpiry = time.Now().Add(r.cacheTTL)
	return apiResp.Data, nil
}

func (r *opdRepository) GetOPDSettings(ctx context.Context, kodeUnit string) (*model.OPDSettings, error) {
	query := `
		SELECT kode_unit, opd_name, COALESCE(logo_url, ''), letterhead_config, COALESCE(address, ''), COALESCE(phone, ''), COALESCE(email, ''), created_at, updated_at
		FROM opd_settings
		WHERE kode_unit = $1
	`
	var s model.OPDSettings
	var rawConfig []byte

	err := r.db.QueryRow(ctx, query, kodeUnit).Scan(
		&s.KodeUnit,
		&s.OPDName,
		&s.LogoURL,
		&rawConfig,
		&s.Address,
		&s.Phone,
		&s.Email,
		&s.CreatedAt,
		&s.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if len(rawConfig) > 0 {
		_ = json.Unmarshal(rawConfig, &s.LetterheadConfig)
	}

	return &s, nil
}

func (r *opdRepository) SaveOrUpdateSettings(ctx context.Context, s *model.OPDSettings) error {
	configBytes, err := json.Marshal(s.LetterheadConfig)
	if err != nil {
		configBytes = []byte("{}")
	}

	query := `
		INSERT INTO opd_settings (kode_unit, opd_name, logo_url, letterhead_config, address, phone, email, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
		ON CONFLICT (kode_unit) DO UPDATE SET
			opd_name = CASE WHEN EXCLUDED.opd_name <> '' THEN EXCLUDED.opd_name ELSE opd_settings.opd_name END,
			letterhead_config = EXCLUDED.letterhead_config,
			address = EXCLUDED.address,
			phone = EXCLUDED.phone,
			email = EXCLUDED.email,
			updated_at = NOW()
	`

	_, err = r.db.Exec(ctx, query,
		s.KodeUnit,
		s.OPDName,
		s.LogoURL,
		configBytes,
		s.Address,
		s.Phone,
		s.Email,
	)
	return err
}

func (r *opdRepository) UpdateLogoURL(ctx context.Context, kodeUnit, logoURL string) error {
	query := `
		INSERT INTO opd_settings (kode_unit, opd_name, logo_url, updated_at)
		VALUES ($2, 'OPD', $1, NOW())
		ON CONFLICT (kode_unit) DO UPDATE SET
			logo_url = EXCLUDED.logo_url,
			updated_at = NOW()
	`
	_, err := r.db.Exec(ctx, query, logoURL, kodeUnit)
	return err
}
