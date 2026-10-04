package service

import (
	"context"

	"e-notulen/backend/internal/model"
	"e-notulen/backend/internal/repository"
)

type ReportService interface {
	GetDashboardSummary(ctx context.Context, userCtx model.UserContext) (*model.DashboardSummary, error)
}

type reportService struct {
	notulenRepo repository.NotulenRepository
}

func NewReportService(notulenRepo repository.NotulenRepository) ReportService {
	return &reportService{notulenRepo: notulenRepo}
}

func (s *reportService) GetDashboardSummary(ctx context.Context, userCtx model.UserContext) (*model.DashboardSummary, error) {
	summary, err := s.notulenRepo.GetDashboardSummary(ctx, userCtx.Role, userCtx.OPDCode, userCtx.Sub)
	if err != nil {
		return nil, err
	}

	// recentActivities difilter berdasarkan role agar officer tidak
	// melihat aktivitas dari OPD lain
	recentFilter := model.NotulenFilter{
		Page:      1,
		PerPage:   5,
		SortBy:    "created_at",
		SortOrder: "DESC",
		UserRole:  userCtx.Role,
		UserSub:   userCtx.Sub,
		OPDCode:   userCtx.OPDCode,
	}
	recentActivities, _, _ := s.notulenRepo.List(ctx, recentFilter)
	summary.RecentActivities = recentActivities

	return summary, nil
}
