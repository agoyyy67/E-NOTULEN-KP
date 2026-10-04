package model

type DashboardSummary struct {
	TotalNotulen       int64                  `json:"total_notulen"`
	TotalBulanIni      int64                  `json:"total_notulen_bulan_ini"`
	TotalDraft         int64                  `json:"total_draft"`
	TotalFinal         int64                  `json:"total_final"`
	TotalOPDActive     int64                  `json:"total_opd_active"`
	TotalPeserta       int64                  `json:"total_peserta"`
	RataPeserta        float64                `json:"rata_peserta"`
	RecentActivities   []Notulen              `json:"recent_activities"`
	MonthlyStats       []MonthlyCount         `json:"monthly_stats"`
	OPDRankings        []OPDNotulenCount      `json:"opd_rankings,omitempty"`
}

type MonthlyCount struct {
	Month string `json:"month"` // e.g. "Jan", "Feb"
	Draft int64  `json:"draft"`
	Final int64  `json:"final"`
	Total int64  `json:"total"`
}

type OPDNotulenCount struct {
	OPDCode string `json:"opd_code"`
	OPDName string `json:"opd_name"`
	Count   int64  `json:"count"`
}
