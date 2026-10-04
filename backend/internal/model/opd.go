package model

import "time"

type OPDSKPDItem struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	Value string `json:"value"`
}

type SKPDAPIResponse struct {
	Code   int           `json:"code"`
	Status string        `json:"status"`
	Data   []OPDSKPDItem `json:"data"`
}

type OPDSettings struct {
	KodeUnit         string                 `json:"kode_unit"`
	OPDName          string                 `json:"opd_name"`
	LogoURL          string                 `json:"logo_url"`
	LetterheadConfig map[string]interface{} `json:"letterhead_config"`
	Address          string                 `json:"address"`
	Phone            string                 `json:"phone"`
	Email            string                 `json:"email"`
	CreatedAt        time.Time              `json:"created_at"`
	UpdatedAt        time.Time              `json:"updated_at"`
}

type UpdateOPDSettingsRequest struct {
	OPDName          string                 `json:"opd_name"`
	Address          string                 `json:"address"`
	Phone            string                 `json:"phone"`
	Email            string                 `json:"email"`
	LetterheadConfig map[string]interface{} `json:"letterhead_config"`
}
