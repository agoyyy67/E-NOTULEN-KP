package service

import (
	"context"

	"e-notulen/backend/internal/model"
	"e-notulen/backend/internal/repository"
)

type OPDService interface {
	GetSKPDList(ctx context.Context) ([]model.OPDSKPDItem, error)
	GetOPDSettings(ctx context.Context, kodeUnit string) (*model.OPDSettings, error)
	UpdateOPDSettings(ctx context.Context, kodeUnit string, req model.UpdateOPDSettingsRequest) (*model.OPDSettings, error)
	UpdateLogoURL(ctx context.Context, kodeUnit, logoURL string) error
}

type opdService struct {
	opdRepo repository.OPDRepository
}

func NewOPDService(opdRepo repository.OPDRepository) OPDService {
	return &opdService{opdRepo: opdRepo}
}

func (s *opdService) GetSKPDList(ctx context.Context) ([]model.OPDSKPDItem, error) {
	return s.opdRepo.GetSKPDList(ctx)
}

func (s *opdService) GetOPDSettings(ctx context.Context, kodeUnit string) (*model.OPDSettings, error) {
	settings, err := s.opdRepo.GetOPDSettings(ctx, kodeUnit)
	if err != nil {
		// Return default settings if not configured yet
		return &model.OPDSettings{
			KodeUnit:         kodeUnit,
			OPDName:          "",
			LetterheadConfig: map[string]interface{}{},
		}, nil
	}
	return settings, nil
}

func (s *opdService) UpdateOPDSettings(ctx context.Context, kodeUnit string, req model.UpdateOPDSettingsRequest) (*model.OPDSettings, error) {
	existing, _ := s.opdRepo.GetOPDSettings(ctx, kodeUnit)

	opdName := req.OPDName
	if opdName == "" && existing != nil && existing.OPDName != "" {
		opdName = existing.OPDName
	}
	if opdName == "" {
		opdName = "OPD " + kodeUnit
	}

	settings := &model.OPDSettings{
		KodeUnit:         kodeUnit,
		OPDName:          opdName,
		Address:          req.Address,
		Phone:            req.Phone,
		Email:            req.Email,
		LetterheadConfig: req.LetterheadConfig,
	}

	err := s.opdRepo.SaveOrUpdateSettings(ctx, settings)
	if err != nil {
		return nil, err
	}

	return s.GetOPDSettings(ctx, kodeUnit)
}

func (s *opdService) UpdateLogoURL(ctx context.Context, kodeUnit, logoURL string) error {
	return s.opdRepo.UpdateLogoURL(ctx, kodeUnit, logoURL)
}
