package service

import (
	"context"
	"errors"
	"fmt"

	"e-notulen/backend/internal/model"
	"e-notulen/backend/internal/repository"
	"e-notulen/backend/pkg/pdf"
	"e-notulen/backend/pkg/response"
	"e-notulen/backend/pkg/storage"
	"e-notulen/backend/pkg/word"

	"github.com/google/uuid"
)

// Sentinel errors — digunakan handler untuk menentukan HTTP status yang tepat
var (
	ErrForbidden = errors.New("forbidden")
	ErrNotFound  = errors.New("not found")
)

type NotulenService interface {
	CreateNotulen(ctx context.Context, userCtx model.UserContext, req model.CreateNotulenRequest) (*model.Notulen, error)
	GetNotulenByID(ctx context.Context, userCtx model.UserContext, id uuid.UUID) (*model.Notulen, error)
	UpdateNotulen(ctx context.Context, userCtx model.UserContext, id uuid.UUID, req model.UpdateNotulenRequest) (*model.Notulen, error)
	DeleteNotulen(ctx context.Context, userCtx model.UserContext, id uuid.UUID) error
	RestoreNotulen(ctx context.Context, userCtx model.UserContext, id uuid.UUID) (*model.Notulen, error)
	ForceDeleteNotulen(ctx context.Context, userCtx model.UserContext, id uuid.UUID) error
	DuplicateNotulen(ctx context.Context, userCtx model.UserContext, id uuid.UUID) (*model.Notulen, error)
	UpdateNotulenStatus(ctx context.Context, userCtx model.UserContext, id uuid.UUID, status string) error
	ListNotulen(ctx context.Context, userCtx model.UserContext, filter model.NotulenFilter) ([]model.Notulen, *response.Meta, error)
	AutoSaveNotulen(ctx context.Context, userCtx model.UserContext, id uuid.UUID, req model.AutoSaveRequest) error
	GetAutoSaveHistory(ctx context.Context, userCtx model.UserContext, id uuid.UUID) ([]model.AutoSave, error)
	GenerateNotulenPDF(ctx context.Context, userCtx model.UserContext, id uuid.UUID) ([]byte, string, error)
	GenerateNotulenWord(ctx context.Context, userCtx model.UserContext, id uuid.UUID) ([]byte, string, error)
	AddAttachment(ctx context.Context, userCtx model.UserContext, notulenID uuid.UUID, fileName, fileURL string, fileSize int64, mimeType string) (*model.Attachment, error)
	DeleteAttachment(ctx context.Context, userCtx model.UserContext, notulenID, attachmentID uuid.UUID) error
	GetPublicNotulenInfo(ctx context.Context, id uuid.UUID) (*model.PublicNotulenInfo, error)
	GeneratePublicNotulenPDF(ctx context.Context, id uuid.UUID) ([]byte, string, error)
	AddPublicAttendee(ctx context.Context, notulenID uuid.UUID, req model.AttendeeInput) error
}

type notulenService struct {
	notulenRepo    repository.NotulenRepository
	attendeeRepo   repository.AttendeeRepository
	attachmentRepo repository.AttachmentRepository
	autoSaveRepo   repository.AutoSaveRepository
	opdRepo        repository.OPDRepository
	pdfGen         *pdf.PDFGenerator
	wordGen        *word.WordGenerator
	storage        *storage.MinioStorage
}

func NewNotulenService(
	notulenRepo repository.NotulenRepository,
	attendeeRepo repository.AttendeeRepository,
	attachmentRepo repository.AttachmentRepository,
	autoSaveRepo repository.AutoSaveRepository,
	opdRepo repository.OPDRepository,
	pdfGen *pdf.PDFGenerator,
	wordGen *word.WordGenerator,
	storage *storage.MinioStorage,
) NotulenService {
	return &notulenService{
		notulenRepo:    notulenRepo,
		attendeeRepo:   attendeeRepo,
		attachmentRepo: attachmentRepo,
		autoSaveRepo:   autoSaveRepo,
		opdRepo:        opdRepo,
		pdfGen:         pdfGen,
		wordGen:        wordGen,
		storage:        storage,
	}
}

func (s *notulenService) CreateNotulen(ctx context.Context, userCtx model.UserContext, req model.CreateNotulenRequest) (*model.Notulen, error) {
	opdCode := req.OPDCode
	opdName := req.OPDName

	if userCtx.Role != "admin" {
		opdCode = userCtx.OPDCode
		if userCtx.OPDName != "" {
			opdName = userCtx.OPDName
		}
	}
	if opdCode == "" {
		opdCode = "00"
	}
	if settings, err := s.opdRepo.GetOPDSettings(ctx, opdCode); err == nil && settings != nil && settings.OPDName != "" {
		opdName = settings.OPDName
	}
	if opdName == "" {
		opdName = "Instansi Pemkab Purbalingga"
	}

	userSub, err := uuid.Parse(userCtx.Sub)
	if err != nil {
		userSub = uuid.New()
	}

	status := req.Status
	if status == "" {
		status = "draft"
	}

	n := &model.Notulen{
		ID:               uuid.New(),
		Title:            req.Title,
		MeetingDate:      req.MeetingDate,
		StartTime:        req.StartTime,
		EndTime:          req.EndTime,
		Location:         req.Location,
		LedBy:            req.LedBy,
		LedByPosition:    req.LedByPosition,
		LedByNIP:         req.LedByNIP,
		SignedBy:         req.SignedBy,
		SignedByPosition: req.SignedByPosition,
		SignedByNIP:      req.SignedByNIP,
		NotulistName:     req.NotulistName,
		NotulistPosition: req.NotulistPosition,
		NotulistNIP:      req.NotulistNIP,
		InputType:        req.InputType,
		Content:          req.Content,
		FileURL:          req.FileURL,
		FileName:         req.FileName,
		Summary:          req.Summary,
		OPDCode:          opdCode,
		OPDName:          opdName,
		CreatedBySub:     userSub,
		CreatedByName:    userCtx.Name,
		Status:           status,
	}

	err = s.notulenRepo.Create(ctx, n)
	if err != nil {
		return nil, fmt.Errorf("failed to create notulen: %w", err)
	}

	if len(req.Attendees) > 0 {
		_ = s.attendeeRepo.CreateBatch(ctx, n.ID, req.Attendees)
	}

	return s.GetNotulenByID(ctx, userCtx, n.ID)
}

func (s *notulenService) GetNotulenByID(ctx context.Context, userCtx model.UserContext, id uuid.UUID) (*model.Notulen, error) {
	n, err := s.notulenRepo.GetByIDIncludeDeleted(ctx, id)
	if err != nil {
		return nil, err
	}

	if err := s.checkPermission(userCtx, n); err != nil {
		return nil, err
	}

	attendees, _ := s.attendeeRepo.GetByNotulenID(ctx, id)
	n.Attendees = attendees

	attachments, _ := s.attachmentRepo.GetByNotulenID(ctx, id)
	n.Attachments = attachments

	settings, _ := s.opdRepo.GetOPDSettings(ctx, n.OPDCode)
	n.OPDSettings = settings

	return n, nil
}

func (s *notulenService) UpdateNotulen(ctx context.Context, userCtx model.UserContext, id uuid.UUID, req model.UpdateNotulenRequest) (*model.Notulen, error) {
	existing, err := s.notulenRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if err := s.checkPermission(userCtx, existing); err != nil {
		return nil, err
	}

	if req.Title != "" {
		existing.Title = req.Title
	}
	if req.MeetingDate != "" {
		existing.MeetingDate = req.MeetingDate
	}
	if req.StartTime != nil {
		existing.StartTime = req.StartTime
	}
	if req.EndTime != nil {
		existing.EndTime = req.EndTime
	}
	if req.Location != "" {
		existing.Location = req.Location
	}
	if req.LedBy != "" {
		existing.LedBy = req.LedBy
	}
	if req.LedByPosition != "" {
		existing.LedByPosition = req.LedByPosition
	}
	if req.LedByNIP != "" {
		existing.LedByNIP = req.LedByNIP
	}
	existing.SignedBy = req.SignedBy
	existing.SignedByPosition = req.SignedByPosition
	existing.SignedByNIP = req.SignedByNIP
	if req.NotulistName != "" {
		existing.NotulistName = req.NotulistName
	}
	if req.NotulistPosition != "" {
		existing.NotulistPosition = req.NotulistPosition
	}
	if req.NotulistNIP != "" {
		existing.NotulistNIP = req.NotulistNIP
	}
	if req.OPDCode != "" {
		existing.OPDCode = req.OPDCode
	}
	if req.OPDName != "" {
		existing.OPDName = req.OPDName
	}
	if settings, err := s.opdRepo.GetOPDSettings(ctx, existing.OPDCode); err == nil && settings != nil && settings.OPDName != "" {
		existing.OPDName = settings.OPDName
	}
	if req.InputType != "" {
		existing.InputType = req.InputType
	}
	if len(req.Content) > 0 {
		existing.Content = req.Content
	}
	if req.FileURL != "" {
		existing.FileURL = req.FileURL
	}
	if req.FileName != "" {
		existing.FileName = req.FileName
	}
	if req.Summary != "" {
		existing.Summary = req.Summary
	}
	if req.Status != "" {
		existing.Status = req.Status
	}

	err = s.notulenRepo.Update(ctx, existing)
	if err != nil {
		return nil, err
	}

	// Update attendees jika field Attendees disertakan dalam request
	// (nil = tidak ada perubahan; [] = hapus semua; [..] = ganti dengan yang baru)
	if req.Attendees != nil {
		_ = s.attendeeRepo.DeleteByNotulenID(ctx, id)
		if len(req.Attendees) > 0 {
			_ = s.attendeeRepo.CreateBatch(ctx, id, req.Attendees)
		}
	}

	return s.GetNotulenByID(ctx, userCtx, id)
}

func (s *notulenService) DeleteNotulen(ctx context.Context, userCtx model.UserContext, id uuid.UUID) error {
	n, err := s.notulenRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if err := s.checkPermission(userCtx, n); err != nil {
		return err
	}
	return s.notulenRepo.SoftDelete(ctx, id, userCtx.Name, userCtx.Sub)
}

func (s *notulenService) RestoreNotulen(ctx context.Context, userCtx model.UserContext, id uuid.UUID) (*model.Notulen, error) {
	n, err := s.notulenRepo.GetByIDIncludeDeleted(ctx, id)
	if err != nil {
		return nil, err
	}
	if n.DeletedAt == nil {
		return nil, fmt.Errorf("%w: notulen ini tidak dalam status terhapus", ErrNotFound)
	}
	if err := s.checkPermission(userCtx, n); err != nil {
		return nil, err
	}
	if err := s.notulenRepo.Restore(ctx, id); err != nil {
		return nil, fmt.Errorf("failed to restore notulen: %w", err)
	}
	return s.GetNotulenByID(ctx, userCtx, id)
}

func (s *notulenService) ForceDeleteNotulen(ctx context.Context, userCtx model.UserContext, id uuid.UUID) error {
	n, err := s.notulenRepo.GetByIDIncludeDeleted(ctx, id)
	if err != nil {
		return err
	}
	if n.DeletedAt == nil {
		return fmt.Errorf("%w: naskah notulen ini tidak berada di tempat sampah", ErrNotFound)
	}
	if err := s.checkPermission(userCtx, n); err != nil {
		return err
	}
	return s.notulenRepo.ForceDelete(ctx, id)
}

func (s *notulenService) DuplicateNotulen(ctx context.Context, userCtx model.UserContext, id uuid.UUID) (*model.Notulen, error) {
	source, err := s.GetNotulenByID(ctx, userCtx, id)
	if err != nil {
		return nil, err
	}

	userSub, _ := uuid.Parse(userCtx.Sub)

	dup := &model.Notulen{
		ID:               uuid.New(),
		Title:            "Salinan — " + source.Title,
		MeetingDate:      source.MeetingDate,
		StartTime:        source.StartTime,
		EndTime:          source.EndTime,
		Location:         source.Location,
		LedBy:            source.LedBy,
		LedByPosition:    source.LedByPosition,
		LedByNIP:         source.LedByNIP,
		NotulistName:     source.NotulistName,
		NotulistPosition: source.NotulistPosition,
		NotulistNIP:      source.NotulistNIP,
		InputType:        source.InputType,
		Content:          source.Content,
		OPDCode:          source.OPDCode,
		OPDName:          source.OPDName,
		CreatedBySub:     userSub,
		CreatedByName:    userCtx.Name,
		Status:           "draft",
	}

	err = s.notulenRepo.Create(ctx, dup)
	if err != nil {
		return nil, fmt.Errorf("failed to duplicate notulen: %w", err)
	}

	return s.GetNotulenByID(ctx, userCtx, dup.ID)
}

func (s *notulenService) UpdateNotulenStatus(ctx context.Context, userCtx model.UserContext, id uuid.UUID, status string) error {
	n, err := s.notulenRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if err := s.checkPermission(userCtx, n); err != nil {
		return err
	}
	return s.notulenRepo.UpdateStatus(ctx, id, status)
}

func (s *notulenService) ListNotulen(ctx context.Context, userCtx model.UserContext, filter model.NotulenFilter) ([]model.Notulen, *response.Meta, error) {
	filter.UserRole = userCtx.Role
	filter.UserSub = userCtx.Sub
	if userCtx.Role == "operator" {
		filter.OPDCode = userCtx.OPDCode
	}
	return s.notulenRepo.List(ctx, filter)
}

func (s *notulenService) AutoSaveNotulen(ctx context.Context, userCtx model.UserContext, id uuid.UUID, req model.AutoSaveRequest) error {
	n, err := s.notulenRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if err := s.checkPermission(userCtx, n); err != nil {
		return err
	}

	userSub, _ := uuid.Parse(userCtx.Sub)
	as := &model.AutoSave{
		ID:          uuid.New(),
		NotulenID:   id,
		Content:     req.Content,
		SavedBySub:  userSub,
		SavedByName: userCtx.Name,
	}

	return s.autoSaveRepo.Save(ctx, as)
}

func (s *notulenService) GetAutoSaveHistory(ctx context.Context, userCtx model.UserContext, id uuid.UUID) ([]model.AutoSave, error) {
	n, err := s.notulenRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if err := s.checkPermission(userCtx, n); err != nil {
		return nil, err
	}
	return s.autoSaveRepo.GetHistory(ctx, id)
}

func (s *notulenService) GenerateNotulenPDF(ctx context.Context, userCtx model.UserContext, id uuid.UUID) ([]byte, string, error) {
	n, err := s.GetNotulenByID(ctx, userCtx, id)
	if err != nil {
		return nil, "", err
	}

	settings, _ := s.opdRepo.GetOPDSettings(ctx, n.OPDCode)

	pdfBytes, err := s.pdfGen.GenerateNotulenPDF(n, settings)
	if err != nil {
		return nil, "", err
	}

	fileName := fmt.Sprintf("Notulen_Rapat_%s.pdf", n.ID.String()[:8])
	return pdfBytes, fileName, nil
}

func (s *notulenService) GenerateNotulenWord(ctx context.Context, userCtx model.UserContext, id uuid.UUID) ([]byte, string, error) {
	n, err := s.GetNotulenByID(ctx, userCtx, id)
	if err != nil {
		return nil, "", err
	}

	settings, _ := s.opdRepo.GetOPDSettings(ctx, n.OPDCode)

	docxBytes, err := s.wordGen.GenerateNotulenDOCX(n, settings)
	if err != nil {
		return nil, "", err
	}

	fileName := fmt.Sprintf("Notulen_Rapat_%s.docx", n.ID.String()[:8])
	return docxBytes, fileName, nil
}

func (s *notulenService) AddAttachment(ctx context.Context, userCtx model.UserContext, notulenID uuid.UUID, fileName, fileURL string, fileSize int64, mimeType string) (*model.Attachment, error) {
	n, err := s.notulenRepo.GetByID(ctx, notulenID)
	if err != nil {
		return nil, err
	}
	if err := s.checkPermission(userCtx, n); err != nil {
		return nil, err
	}

	att := &model.Attachment{
		ID:        uuid.New(),
		NotulenID: notulenID,
		FileName:  fileName,
		FileURL:   fileURL,
		FileSize:  fileSize,
		MimeType:  mimeType,
	}

	err = s.attachmentRepo.Create(ctx, att)
	if err != nil {
		return nil, err
	}

	return att, nil
}

func (s *notulenService) DeleteAttachment(ctx context.Context, userCtx model.UserContext, notulenID, attachmentID uuid.UUID) error {
	n, err := s.notulenRepo.GetByID(ctx, notulenID)
	if err != nil {
		return err
	}
	if err := s.checkPermission(userCtx, n); err != nil {
		return err
	}
	return s.attachmentRepo.Delete(ctx, attachmentID)
}

func (s *notulenService) checkPermission(userCtx model.UserContext, n *model.Notulen) error {
	switch userCtx.Role {
	case "admin":
		return nil
	case "operator":
		if n.OPDCode != userCtx.OPDCode {
			return fmt.Errorf("%w: akses ditolak untuk OPD yang berbeda", ErrForbidden)
		}
		return nil
	case "officer":
		if n.CreatedBySub.String() != userCtx.Sub {
			return fmt.Errorf("%w: akses ditolak, notulen dibuat oleh pengguna lain", ErrForbidden)
		}
		return nil
	default:
		return fmt.Errorf("%w: role pengguna tidak valid", ErrForbidden)
	}
}

func (s *notulenService) GetPublicNotulenInfo(ctx context.Context, id uuid.UUID) (*model.PublicNotulenInfo, error) {
	n, err := s.notulenRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	signedBy := n.SignedBy
	if signedBy == "" {
		signedBy = n.LedBy
	}
	signedByPos := n.SignedByPosition
	if signedByPos == "" {
		signedByPos = n.LedByPosition
	}
	signedByNIP := n.SignedByNIP
	if signedByNIP == "" {
		signedByNIP = n.LedByNIP
	}

	return &model.PublicNotulenInfo{
		ID:               n.ID,
		Title:            n.Title,
		MeetingDate:      n.MeetingDate,
		StartTime:        n.StartTime,
		EndTime:          n.EndTime,
		Location:         n.Location,
		OPDName:          n.OPDName,
		Status:           n.Status,
		SignedBy:         signedBy,
		SignedByPosition: signedByPos,
		SignedByNIP:      signedByNIP,
		NotulistName:     n.NotulistName,
		NotulistPosition: n.NotulistPosition,
		NotulistNIP:      n.NotulistNIP,
		FinalizedAt:      n.UpdatedAt,
	}, nil
}

func (s *notulenService) GeneratePublicNotulenPDF(ctx context.Context, id uuid.UUID) ([]byte, string, error) {
	n, err := s.notulenRepo.GetByID(ctx, id)
	if err != nil {
		return nil, "", err
	}

	// Hanya dokumen berstatus final yang sah diunduh salinannya secara publik
	if n.Status != "final" {
		return nil, "", ErrForbidden
	}

	attendees, _ := s.attendeeRepo.GetByNotulenID(ctx, id)
	n.Attendees = attendees

	attachments, _ := s.attachmentRepo.GetByNotulenID(ctx, id)
	n.Attachments = attachments

	settings, _ := s.opdRepo.GetOPDSettings(ctx, n.OPDCode)
	n.OPDSettings = settings

	pdfBytes, err := s.pdfGen.GenerateNotulenPDF(n, settings)
	if err != nil {
		return nil, "", err
	}

	fileName := fmt.Sprintf("Notulen_Rapat_%s.pdf", n.ID.String()[:8])
	return pdfBytes, fileName, nil
}

func (s *notulenService) AddPublicAttendee(ctx context.Context, notulenID uuid.UUID, req model.AttendeeInput) error {
	_, err := s.notulenRepo.GetByID(ctx, notulenID)
	if err != nil {
		return err
	}
	
	req.SortOrder = 999 

	return s.attendeeRepo.CreateSingle(ctx, notulenID, req)
}
