package pdf

import (
	"bytes"
	"crypto/tls"
	_ "embed"
	"encoding/json"
	"fmt"
	"image"
	"image/draw"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"image/png"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"e-notulen/backend/internal/model"

	"github.com/jung-kurt/gofpdf"
	"github.com/skip2/go-qrcode"
)

//go:embed assets/logo-purbalingga-official.png
var defaultLogoBytes []byte

type PDFGenerator struct{}

func NewPDFGenerator() *PDFGenerator {
	return &PDFGenerator{}
}

func (g *PDFGenerator) GenerateNotulenPDF(notulen *model.Notulen, settings *model.OPDSettings) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(20, 20, 20)
	pdf.SetFooterFunc(func() {
		pdf.SetY(-15)
		pdf.SetFont("Times", "I", 8)
		pdf.SetTextColor(100, 100, 100)
		pdf.CellFormat(0, 8, "Dokumen ini diterbitkan secara elektronik melalui Aplikasi e-Notulen Pemerintah Kabupaten Purbalingga.", "", 0, "C", false, 0, "")
		pdf.SetTextColor(0, 0, 0)
	})
	pdf.AddPage()

	// 1. Kop Surat OPD Header
	districtName := "PEMERINTAH KABUPATEN PURBALINGGA"
	opdName := notulen.OPDName
	address := ""
	phone := ""
	email := ""
	hasLogo := false

	if settings != nil {
		if settings.OPDName != "" {
			opdName = settings.OPDName
		}
		address = settings.Address
		phone = settings.Phone
		email = settings.Email

		// Render Logo if LogoURL is provided
		if settings.LogoURL != "" {
			imgBytes, imgType, err := fetchImageBytes(settings.LogoURL)
			if err == nil && len(imgBytes) > 0 {
				opt := gofpdf.ImageOptions{ImageType: imgType, ReadDpi: true}
				pdf.RegisterImageOptionsReader("opd_logo", opt, bytes.NewReader(imgBytes))
				// Gambar logo: x=20, y=11, w=20, h=0 (proporsional, tinggi ~22.5mm)
				pdf.ImageOptions("opd_logo", 20, 11, 20, 0, false, opt, 0, "")
				hasLogo = true
			}
		}
	}

	// Fallback ke default logo resmi Pemkab Purbalingga jika logo custom OPD belum diatur atau gagal dimuat
	if !hasLogo && len(defaultLogoBytes) > 0 {
		opt := gofpdf.ImageOptions{ImageType: "PNG", ReadDpi: true}
		pdf.RegisterImageOptionsReader("default_opd_logo", opt, bytes.NewReader(defaultLogoBytes))
		if pdf.Ok() {
			pdf.ImageOptions("default_opd_logo", 20, 11, 20, 0, false, opt, 0, "")
			hasLogo = true
		} else {
			pdf.ClearError()
		}
	}

	// Atur posisi Y awal teks Kop Surat
	pdf.SetY(12)

	// Jika ada logo, geser margin kiri teks ke x=44 agar teks berpusat di area kanan tanpa menimpa logo
	textWidth := float64(170)
	if hasLogo {
		pdf.SetLeftMargin(44)
		textWidth = 146
	} else {
		pdf.SetLeftMargin(20)
	}

	// Baris 1: PEMERINTAH KABUPATEN PURBALINGGA
	pdf.SetFont("Times", "B", 12)
	pdf.CellFormat(textWidth, 5.5, districtName, "", 1, "C", false, 0, "")

	// Baris 2: NAMA OPD
	pdf.SetFont("Times", "B", 14)
	pdf.CellFormat(textWidth, 6.5, strings.ToUpper(opdName), "", 1, "C", false, 0, "")

	// Berikan jarak vertikal 1.5mm agar teks alamat tidak menumpuk/bertabrakan dengan judul OPD
	pdf.SetY(pdf.GetY() + 1.5)

	// Baris 3 & 4: Alamat & Kontak Instansi
	pdf.SetFont("Times", "I", 9)
	if address != "" && (phone != "" || email != "") {
		// Tampilkan Alamat di baris 3
		pdf.CellFormat(textWidth, 4.0, address, "", 1, "C", false, 0, "")

		// Tampilkan Telepon & Email di baris 4
		contactStr := ""
		if phone != "" {
			contactStr += "Telp: " + phone
		}
		if email != "" {
			if contactStr != "" {
				contactStr += " | Email: " + email
			} else {
				contactStr += "Email: " + email
			}
		}
		pdf.CellFormat(textWidth, 4.0, contactStr, "", 1, "C", false, 0, "")
	} else {
		// Jika salah satu kosong, gabungkan dalam 1 baris
		singleLine := address
		if phone != "" {
			if singleLine != "" {
				singleLine += " | Telp: " + phone
			} else {
				singleLine += "Telp: " + phone
			}
		}
		if email != "" {
			if singleLine != "" {
				singleLine += " | Email: " + email
			} else {
				singleLine += "Email: " + email
			}
		}
		if singleLine == "" {
			singleLine = "Purbalingga, Jawa Tengah"
		}
		pdf.CellFormat(textWidth, 4.5, singleLine, "", 1, "C", false, 0, "")
	}

	// Reset margin kiri kembali ke standar 20
	pdf.SetLeftMargin(20)

	// Hitung Y pembatas Kop Surat (minimal Y=39 agar ada jarak 5.5mm dari pita bawah logo)
	lineY := pdf.GetY() + 3.0
	if lineY < 39 {
		lineY = 39
	}

	// Double Line separator for Kop Surat
	pdf.SetLineWidth(0.8)
	pdf.Line(20, lineY, 190, lineY)
	pdf.SetLineWidth(0.2)
	pdf.Line(20, lineY+1.2, 190, lineY+1.2)
	pdf.SetY(lineY + 6)

	// 2. Title Document
	pdf.SetFont("Times", "B", 14)
	pdf.CellFormat(0, 7, "NOTULEN", "", 1, "C", false, 0, "")
	pdf.SetFont("Times", "B", 11)
	pdf.CellFormat(0, 6, strings.ToUpper(notulen.Title), "", 1, "C", false, 0, "")
	pdf.Ln(6)

	// 3. Informasional Rapat & Dihadiri Oleh (Format Dinas Resmi)
	pdf.SetFont("Times", "", 11)
	colW1, colW2, colW3 := float64(35), float64(5), float64(130)

	cleanPDFText := func(s string) string {
		r := strings.NewReplacer(
			"–", "-",
			"—", "-",
			"“", `"`,
			"”", `"`,
			"‘", "'",
			"’", "'",
			"…", "...",
			"•", "*",
		)
		return r.Replace(s)
	}

	rowInfo := func(label, value string) {
		pdf.CellFormat(colW1, 6, cleanPDFText(label), "", 0, "L", false, 0, "")
		pdf.CellFormat(colW2, 6, ":", "", 0, "C", false, 0, "")
		pdf.MultiCell(colW3, 6, cleanPDFText(value), "", "L", false)
	}

	timeStr := "Selesai"
	if notulen.StartTime != nil && *notulen.StartTime != "" {
		timeStr = *notulen.StartTime + " WIB"
		if notulen.EndTime != nil && *notulen.EndTime != "" {
			timeStr += " s/d " + *notulen.EndTime + " WIB"
		}
	}

	rowInfo("Hari, Tanggal", notulen.MeetingDate)
	rowInfo("Waktu", timeStr)
	rowInfo("Tempat", notulen.Location)

	ledByStr := notulen.LedBy
	if notulen.LedByPosition != "" {
		ledByStr = fmt.Sprintf("%s, %s", notulen.LedBy, notulen.LedByPosition)
	}
	rowInfo("Dipimpin Oleh", ledByStr)

	// Dihadiri Oleh (List bernomor tanpa tabel)
	if len(notulen.Attendees) > 0 {
		for idx, att := range notulen.Attendees {
			instStr := cleanPDFText(att.Institution)
			attPos := cleanPDFText(att.Position)
			attName := cleanPDFText(att.Name)

			if instStr == "" && attPos != "" {
				instStr = attPos
			} else if instStr != "" && attPos != "" {
				instStr = fmt.Sprintf("%s - %s", instStr, attPos)
			}

			attLine := fmt.Sprintf("%d.  %s", idx+1, attName)
			if instStr != "" {
				attLine = fmt.Sprintf("%d.  %s - %s", idx+1, attName, instStr)
			}

			if idx == 0 {
				pdf.CellFormat(colW1, 6, "Dihadiri Oleh", "", 0, "L", false, 0, "")
				pdf.CellFormat(colW2, 6, ":", "", 0, "C", false, 0, "")
				pdf.MultiCell(colW3, 6, attLine, "", "L", false)
			} else {
				pdf.CellFormat(colW1, 6, "", "", 0, "L", false, 0, "")
				pdf.CellFormat(colW2, 6, "", "", 0, "C", false, 0, "")
				pdf.MultiCell(colW3, 6, attLine, "", "L", false)
			}
		}
	} else {
		rowInfo("Dihadiri Oleh", "-")
	}
	pdf.Ln(6)

	// 4. Isi Risalah Notulen (Tiptap Content langsung menyambung)
	pdf.SetFont("Times", "", 11)
	rendered := renderTiptapContentToPDF(pdf, []byte(notulen.Content))
	if !rendered {
		summaryText := notulen.Summary
		if summaryText == "" {
			summaryText = "(Belum ada isi risalah rapat yang dicatat)"
		}
		pdf.MultiCell(0, 6, summaryText, "", "J", false)
	}
	pdf.Ln(4)

	// 4b. Kalimat Penutup Risalah (Sebelum TTD)
	pdf.SetFont("Times", "", 11)
	pdf.MultiCell(0, 6, "Demikian Notulen Rapat ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.", "", "J", false)
	pdf.Ln(4)

	// 5. Kolom Tanda Tangan
	pdf.Ln(5)
	pdf.SetFont("Times", "", 11)

	halfW := float64(85)

	// Determine Left Signature Official (Pimpinan Penanda Tangan or Pemimpin Rapat)
	signerTitle := "Pimpinan Rapat,"
	if strings.TrimSpace(notulen.SignedByPosition) != "" {
		signerTitle = strings.TrimSpace(notulen.SignedByPosition)
		if !strings.HasSuffix(signerTitle, ",") {
			signerTitle = signerTitle + ","
		}
	} else if strings.TrimSpace(notulen.LedByPosition) != "" {
		signerTitle = strings.TrimSpace(notulen.LedByPosition)
		if !strings.HasSuffix(signerTitle, ",") {
			signerTitle = signerTitle + ","
		}
	}

	signerName := strings.TrimSpace(notulen.SignedBy)
	if signerName == "" {
		signerName = strings.TrimSpace(notulen.LedBy)
	}

	signerNIP := "-"
	if strings.TrimSpace(notulen.SignedByNIP) != "" {
		signerNIP = strings.TrimSpace(notulen.SignedByNIP)
	} else if strings.TrimSpace(notulen.LedByNIP) != "" {
		signerNIP = strings.TrimSpace(notulen.LedByNIP)
	}

	pdf.CellFormat(halfW, 6, cleanPDFText(signerTitle), "", 0, "C", false, 0, "")
	pdf.CellFormat(halfW, 6, "Notulis,", "", 1, "C", false, 0, "")

	pdf.Ln(22) // Spasi TTD simetris dan bersih untuk kedua pihak

	pdf.SetFont("Times", "BU", 11)
	pdf.CellFormat(halfW, 6, cleanPDFText(signerName), "", 0, "C", false, 0, "")
	pdf.CellFormat(halfW, 6, cleanPDFText(notulen.NotulistName), "", 1, "C", false, 0, "")

	pdf.SetFont("Times", "", 10)
	notulistNIP := "-"
	if strings.TrimSpace(notulen.NotulistNIP) != "" {
		notulistNIP = strings.TrimSpace(notulen.NotulistNIP)
	}
	pdf.CellFormat(halfW, 5, "NIP. "+cleanPDFText(signerNIP), "", 0, "C", false, 0, "")
	pdf.CellFormat(halfW, 5, "NIP. "+cleanPDFText(notulistNIP), "", 1, "C", false, 0, "")

	// 5a. Blok Verifikasi Berdiri Sendiri di Bawah Tanda Tangan (hanya untuk dokumen final)
	if notulen.Status == "final" && notulen.ID.String() != "" && notulen.ID.String() != "00000000-0000-0000-0000-000000000000" {
		baseURL := os.Getenv("NEXT_PUBLIC_APP_URL")
		if baseURL == "" {
			baseURL = os.Getenv("APP_URL")
		}
		if baseURL == "" {
			baseURL = "http://localhost:3004"
		}
		baseURL = strings.TrimSuffix(baseURL, "/")
		verifyURL := fmt.Sprintf("%s/verifikasi/%s", baseURL, notulen.ID.String())

		// Generate QR Code PNG in-memory (256x256 px)
		qrPNG, err := qrcode.Encode(verifyURL, qrcode.Medium, 256)
		if err == nil && len(qrPNG) > 0 {
			qrImageName := fmt.Sprintf("qr_verify_%s", notulen.ID.String()[:8])
			opt := gofpdf.ImageOptions{ImageType: "PNG", ReadDpi: false}
			pdf.RegisterImageOptionsReader(qrImageName, opt, bytes.NewReader(qrPNG))
			if pdf.Ok() {
				// Pastikan muat di halaman ini atau beri jarak proporsional
				if pdf.GetY() > 248 {
					pdf.AddPage()
				} else {
					pdf.Ln(6)
				}

				boxX := 20.0
				boxY := pdf.GetY()
				boxW := 170.0
				boxH := 19.0

				// Background kotak legalitas & garis tipis
				pdf.SetFillColor(248, 250, 252) // abu-abu lembut
				pdf.SetDrawColor(203, 213, 225) // border tipis slate
				pdf.SetLineWidth(0.2)
				pdf.Rect(boxX, boxY, boxW, boxH, "FD")

				// QR Code di sebelah kiri box
				qrSize := 15.0
				pdf.ImageOptions(qrImageName, boxX+2.0, boxY+2.0, qrSize, qrSize, false, opt, 0, "")

				// Teks legalitas di samping QR Code
				textX := boxX + 20.0
				pdf.SetXY(textX, boxY+2.8)
				pdf.SetFont("Times", "B", 8)
				pdf.SetTextColor(15, 23, 42)
				pdf.CellFormat(boxW-22.0, 3.8, "VERIFIKASI KEASLIAN DOKUMEN ELEKTRONIK", "", 1, "L", false, 0, "")

				pdf.SetX(textX)
				pdf.SetFont("Times", "", 7.5)
				pdf.SetTextColor(51, 65, 85)
				pdf.CellFormat(boxW-22.0, 3.4, "Dokumen ini telah disahkan dan terdaftar secara elektronik pada Sistem Informasi e-Notulen", "", 1, "L", false, 0, "")

				pdf.SetX(textX)
				pdf.CellFormat(boxW-22.0, 3.4, "Pemerintah Kabupaten Purbalingga. Pindai QR Code untuk memeriksa keabsahan dokumen.", "", 1, "L", false, 0, "")

				pdf.SetTextColor(0, 0, 0) // reset warna teks
				pdf.SetY(boxY + boxH + 2.0)
			} else {
				pdf.ClearError()
			}
		}
	}

	// 6. Dokumentasi Foto Rapat (Halaman Baru Khusus Lampiran Foto - Gambar 2)
	var validAttachments []model.Attachment
	for _, att := range notulen.Attachments {
		lowerName := strings.ToLower(att.FileName)
		lowerMime := strings.ToLower(att.MimeType)
		if strings.HasPrefix(lowerMime, "image/") ||
			strings.HasSuffix(lowerName, ".png") ||
			strings.HasSuffix(lowerName, ".jpg") ||
			strings.HasSuffix(lowerName, ".jpeg") ||
			strings.HasSuffix(lowerName, ".webp") {
			validAttachments = append(validAttachments, att)
		}
	}

	if len(validAttachments) > 0 {
		// Halaman baru khusus Dokumentasi Kegiatan (Gambar 2)
		pdf.AddPage()

		pdf.SetFont("Times", "B", 12)
		pdf.CellFormat(0, 7, "DOKUMENTASI KEGIATAN", "", 1, "C", false, 0, "")
		pdf.Ln(4)

		pdf.SetFont("Times", "", 11)
		pdf.CellFormat(35, 6, "Nama Rapat", "", 0, "L", false, 0, "")
		pdf.CellFormat(5, 6, ":", "", 0, "C", false, 0, "")
		pdf.SetFont("Times", "B", 11)
		pdf.MultiCell(130, 6, notulen.Title, "", "L", false)

		pdf.SetFont("Times", "", 11)
		pdf.CellFormat(35, 6, "Hari / Tanggal", "", 0, "L", false, 0, "")
		pdf.CellFormat(5, 6, ":", "", 0, "C", false, 0, "")
		pdf.SetFont("Times", "B", 11)
		pdf.MultiCell(130, 6, notulen.MeetingDate, "", "L", false)

		pdf.SetFont("Times", "", 11)
		pdf.CellFormat(35, 6, "Waktu", "", 0, "L", false, 0, "")
		pdf.CellFormat(5, 6, ":", "", 0, "C", false, 0, "")
		pdf.SetFont("Times", "B", 11)
		pdf.MultiCell(130, 6, timeStr, "", "L", false)
		pdf.Ln(8)

		for idx, att := range validAttachments {
			imgBytes, imgType, err := fetchImageBytes(att.FileURL)
			if err != nil {
				log.Printf("[PDF Generator] Skipping attachment %s: %v", att.FileName, err)
				continue
			}

			imageName := fmt.Sprintf("att_photo_%d", idx)
			opt := gofpdf.ImageOptions{ImageType: imgType, ReadDpi: false}
			info := pdf.RegisterImageOptionsReader(imageName, opt, bytes.NewReader(imgBytes))
			if !pdf.Ok() {
				log.Printf("[PDF Generator] RegisterImageOptionsReader failed for %s: %v", att.FileName, pdf.Error())
				pdf.ClearError()
				continue
			}

			photoW := float64(130)
			photoH := float64(80)
			if info != nil && info.Width() > 0 {
				photoH = photoW * (info.Height() / info.Width())
				if photoH > 100 {
					photoH = 100
					photoW = photoH * (info.Width() / info.Height())
				}
			}

			// Cek page break jika mendekati batas bawah A4
			if pdf.GetY()+photoH+10 > 275 {
				pdf.AddPage()
			}

			posX := 20.0 + (170.0-photoW)/2.0 // Center image horizontally
			posY := pdf.GetY()

			// Gambar foto kegiatan rapat dengan border tipis
			pdf.ImageOptions(imageName, posX, posY, photoW, photoH, false, opt, 0, "")
			pdf.SetLineWidth(0.2)
			pdf.Rect(posX, posY, photoW, photoH, "D")

			pdf.SetY(posY + photoH + 8)
		}
	}

	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, fmt.Errorf("failed to generate pdf: %w", err)
	}

	return buf.Bytes(), nil
}

// ── Tiptap JSON to PDF Converter Helpers ───────────────────────

type TiptapNode struct {
	Type    string                 `json:"type"`
	Attrs   map[string]interface{} `json:"attrs,omitempty"`
	Text    string                 `json:"text,omitempty"`
	Content []TiptapNode           `json:"content,omitempty"`
}

func extractNodeText(node TiptapNode) string {
	if node.Type == "text" {
		return node.Text
	}
	var sb strings.Builder
	for _, child := range node.Content {
		sb.WriteString(extractNodeText(child))
	}
	return sb.String()
}

func renderTiptapContentToPDF(pdf *gofpdf.Fpdf, rawContent []byte) bool {
	if len(rawContent) == 0 {
		return false
	}

	// Unwrap double stringified JSON if needed
	var unescaped string
	if err := json.Unmarshal(rawContent, &unescaped); err == nil {
		rawContent = []byte(unescaped)
	}

	var root TiptapNode
	if err := json.Unmarshal(rawContent, &root); err != nil {
		return false
	}

	if len(root.Content) == 0 {
		return false
	}

	renderedAny := false
	for _, child := range root.Content {
		if renderNodeToPDF(pdf, child, 0) {
			renderedAny = true
		}
	}

	return renderedAny
}

func getHeadingLevel(attrs map[string]interface{}) int {
	if attrs == nil {
		return 1
	}
	v, ok := attrs["level"]
	if !ok {
		return 1
	}
	switch val := v.(type) {
	case float64:
		return int(val)
	case float32:
		return int(val)
	case int:
		return val
	case int64:
		return int(val)
	case json.Number:
		if i, err := val.Int64(); err == nil {
			return int(i)
		}
	case string:
		var l int
		if _, err := fmt.Sscanf(val, "%d", &l); err == nil {
			return l
		}
	}
	return 1
}

func getAlignmentFlag(attrs map[string]interface{}, defaultAlign string) string {
	if attrs == nil {
		return defaultAlign
	}
	alignVal, exists := attrs["textAlign"]
	if !exists {
		alignVal, exists = attrs["align"]
	}
	if !exists {
		return defaultAlign
	}
	alignStr, ok := alignVal.(string)
	if !ok {
		return defaultAlign
	}
	switch strings.ToLower(alignStr) {
	case "center":
		return "C"
	case "right":
		return "R"
	case "justify":
		return "J"
	case "left":
		return "L"
	default:
		return defaultAlign
	}
}

func renderTableToPDF(pdf *gofpdf.Fpdf, tableNode TiptapNode) {
	if len(tableNode.Content) == 0 {
		return
	}

	// Calculate max columns
	maxCols := 0
	for _, row := range tableNode.Content {
		if row.Type == "tableRow" && len(row.Content) > maxCols {
			maxCols = len(row.Content)
		}
	}

	if maxCols == 0 {
		return
	}

	totalWidth := 170.0 // 190 - 20 mm
	colWidth := totalWidth / float64(maxCols)

	pdf.Ln(2)
	for _, row := range tableNode.Content {
		if row.Type != "tableRow" {
			continue
		}

		// Calculate maximum line count in this row for height calculation
		maxLines := 1
		rowLines := make([][]string, len(row.Content))

		for i, cell := range row.Content {
			cellText := strings.TrimSpace(strings.ReplaceAll(extractNodeText(cell), "\n", " "))
			lines := pdf.SplitLines([]byte(cellText), colWidth-3)
			if len(lines) == 0 {
				lines = [][]byte{[]byte("")}
			}
			strLines := make([]string, len(lines))
			for j, l := range lines {
				strLines[j] = string(l)
			}
			rowLines[i] = strLines
			if len(strLines) > maxLines {
				maxLines = len(strLines)
			}
		}

		rowHeight := float64(maxLines) * 5.0
		if rowHeight < 7.0 {
			rowHeight = 7.0
		}

		// Ensure page break doesn't slice row awkwardly
		if pdf.GetY()+rowHeight > 265 {
			pdf.AddPage()
		}

		startX := 20.0
		startY := pdf.GetY()

		for i, cell := range row.Content {
			isHeader := cell.Type == "tableHeader"
			align := getAlignmentFlag(cell.Attrs, "L")

			if isHeader {
				pdf.SetFont("Times", "B", 10)
				pdf.SetFillColor(240, 243, 246)
			} else {
				pdf.SetFont("Times", "", 10)
				pdf.SetFillColor(255, 255, 255)
			}

			cellX := startX + float64(i)*colWidth
			pdf.Rect(cellX, startY, colWidth, rowHeight, "FD")

			// Render lines inside cell
			pdf.SetXY(cellX+1.5, startY+1.5)
			for _, lineStr := range rowLines[i] {
				pdf.CellFormat(colWidth-3, 4.5, lineStr, "", 2, align, false, 0, "")
			}
		}
		pdf.SetY(startY + rowHeight)
	}
	pdf.Ln(3)
}

func renderNodeToPDF(pdf *gofpdf.Fpdf, node TiptapNode, indent int) bool {
	switch node.Type {
	case "heading":
		level := getHeadingLevel(node.Attrs)
		text := extractNodeText(node)
		if strings.TrimSpace(text) == "" {
			return false
		}
		align := getAlignmentFlag(node.Attrs, "L")
		pdf.Ln(3)
		switch level {
		case 1:
			pdf.SetFont("Times", "B", 14)
			pdf.MultiCell(0, 6, text, "", align, false)
			pdf.Ln(2)
		case 2:
			pdf.SetFont("Times", "B", 12)
			pdf.MultiCell(0, 5.5, text, "", align, false)
			pdf.Ln(1.5)
		default:
			pdf.SetFont("Times", "BI", 11)
			pdf.MultiCell(0, 5, text, "", align, false)
			pdf.Ln(1)
		}
		return true

	case "paragraph":
		text := extractNodeText(node)
		if strings.TrimSpace(text) == "" {
			pdf.Ln(2)
			return true
		}
		align := getAlignmentFlag(node.Attrs, "J")
		pdf.SetFont("Times", "", 11)
		pdf.MultiCell(0, 5.5, text, "", align, false)
		pdf.Ln(1.5)
		return true

	case "bulletList":
		hasContent := false
		for _, item := range node.Content {
			if item.Type == "listItem" {
				itemText := extractNodeText(item)
				if strings.TrimSpace(itemText) != "" {
					pdf.SetFont("Times", "", 11)
					pdf.SetX(20 + float64(indent*5))
					pdf.MultiCell(0, 5.5, "- "+itemText, "", "L", false)
					pdf.Ln(1)
					hasContent = true
				}
			}
		}
		return hasContent

	case "orderedList":
		hasContent := false
		count := 1
		for _, item := range node.Content {
			if item.Type == "listItem" {
				itemText := extractNodeText(item)
				if strings.TrimSpace(itemText) != "" {
					pdf.SetFont("Times", "", 11)
					pdf.SetX(20 + float64(indent*5))
					pdf.MultiCell(0, 5.5, fmt.Sprintf("%d. %s", count, itemText), "", "L", false)
					pdf.Ln(1)
					count++
					hasContent = true
				}
			}
		}
		return hasContent

	case "taskList":
		hasContent := false
		for _, item := range node.Content {
			if item.Type == "taskItem" {
				itemText := extractNodeText(item)
				if strings.TrimSpace(itemText) != "" {
					checked := false
					if item.Attrs != nil {
						if c, ok := item.Attrs["checked"].(bool); ok {
							checked = c
						}
					}
					prefix := "[  ] "
					if checked {
						prefix = "[x] "
					}
					pdf.SetFont("Times", "", 11)
					pdf.SetX(20 + float64(indent*5))
					pdf.MultiCell(0, 5.5, prefix+itemText, "", "L", false)
					pdf.Ln(1)
					hasContent = true
				}
			}
		}
		return hasContent

	case "table":
		renderTableToPDF(pdf, node)
		return true

	case "blockquote":
		text := extractNodeText(node)
		if strings.TrimSpace(text) != "" {
			pdf.SetFont("Times", "I", 10.5)
			pdf.SetX(25)
			pdf.MultiCell(160, 5, `"`+text+`"`, "", "L", false)
			pdf.Ln(2)
			return true
		}
		return false

	case "horizontalRule":
		pdf.Ln(2)
		y := pdf.GetY()
		pdf.SetLineWidth(0.3)
		pdf.Line(20, y, 190, y)
		pdf.Ln(3)
		return true

	case "image":
		if node.Attrs != nil {
			if src, ok := node.Attrs["src"].(string); ok && src != "" {
				imgBytes, imgType, err := fetchImageBytes(src)
				if err == nil && len(imgBytes) > 0 {
					if pdf.GetY()+55 > 265 {
						pdf.AddPage()
					}
					imageName := fmt.Sprintf("tiptap_img_%d", int(pdf.GetY()*10))
					opt := gofpdf.ImageOptions{ImageType: imgType, ReadDpi: false}
					info := pdf.RegisterImageOptionsReader(imageName, opt, bytes.NewReader(imgBytes))
					if !pdf.Ok() {
						log.Printf("[PDF Generator] Tiptap image register failed: %v", pdf.Error())
						pdf.ClearError()
						return false
					}
					imgW := float64(120)
					imgH := float64(60)
					if info != nil && info.Width() > 0 {
						imgH = imgW * (info.Height() / info.Width())
						if imgH > 80 {
							imgH = 80
						}
					}
					pdf.ImageOptions(imageName, 20, pdf.GetY()+2, imgW, imgH, false, opt, 0, "")
					if !pdf.Ok() {
						pdf.ClearError()
						return false
					}
					pdf.SetY(pdf.GetY() + imgH + 4)
					return true
				}
			}
		}
		return false

	default:
		text := extractNodeText(node)
		if strings.TrimSpace(text) != "" {
			align := getAlignmentFlag(node.Attrs, "L")
			pdf.SetFont("Times", "", 11)
			pdf.MultiCell(0, 5.5, text, "", align, false)
			pdf.Ln(1.5)
			return true
		}
		return false
	}
}

// ── Helper: Download image bytes from URL (Internal MinIO or Public URL) ──
var pdfHTTPClient = &http.Client{
	Timeout: 5 * time.Second,
	Transport: &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	},
}

func fetchImageBytes(fileURL string) ([]byte, string, error) {
	if strings.TrimSpace(fileURL) == "" {
		return nil, "", fmt.Errorf("empty image url")
	}

	cleanPath := fileURL
	if u, err := url.Parse(fileURL); err == nil && u.Scheme != "" {
		cleanPath = u.Path
	}
	cleanPath = strings.TrimPrefix(cleanPath, "/")
	if strings.HasPrefix(cleanPath, "api/v1/storage/") {
		cleanPath = strings.TrimPrefix(cleanPath, "api/v1/storage/")
	}
	if strings.HasPrefix(cleanPath, "storage/") {
		cleanPath = strings.TrimPrefix(cleanPath, "storage/")
	}

	// Candidate URLs to attempt in order
	var urlsToTry []string
	appPort := os.Getenv("APP_PORT")
	if appPort == "" {
		appPort = "8080"
	}
	urlsToTry = append(urlsToTry, fmt.Sprintf("http://localhost:%s/api/v1/storage/%s", appPort, cleanPath))
	urlsToTry = append(urlsToTry, fmt.Sprintf("http://127.0.0.1:%s/api/v1/storage/%s", appPort, cleanPath))

	minioEndpoint := os.Getenv("MINIO_ENDPOINT")
	if minioEndpoint != "" {
		scheme := "http"
		if os.Getenv("MINIO_USE_SSL") == "true" {
			scheme = "https"
		}
		rawKey := strings.TrimPrefix(cleanPath, "e-notulen/")
		rawKey = strings.TrimPrefix(rawKey, "notulen/")
		urlsToTry = append(urlsToTry, fmt.Sprintf("%s://%s/e-notulen/notulen/%s", scheme, minioEndpoint, rawKey))
		urlsToTry = append(urlsToTry, fmt.Sprintf("%s://%s/e-notulen/%s", scheme, minioEndpoint, rawKey))
		urlsToTry = append(urlsToTry, fmt.Sprintf("%s://%s/notulen/%s", scheme, minioEndpoint, rawKey))
	}

	if strings.HasPrefix(fileURL, "http://") || strings.HasPrefix(fileURL, "https://") {
		urlsToTry = append(urlsToTry, fileURL)
	}

	var lastErr error
	var resp *http.Response

	for _, tryURL := range urlsToTry {
		r, err := pdfHTTPClient.Get(tryURL)
		if err == nil && r.StatusCode == http.StatusOK {
			resp = r
			break
		}
		if r != nil {
			r.Body.Close()
		}
		if err != nil {
			lastErr = err
		} else {
			lastErr = fmt.Errorf("http status %d", r.StatusCode)
		}
	}

	if resp == nil {
		log.Printf("[ERROR PDF] fetchImageBytes failed for %s (attempted: %v): %v", fileURL, urlsToTry, lastErr)
		return nil, "", fmt.Errorf("failed to fetch image from any endpoint: %w", lastErr)
	}

	imgBytes, err := io.ReadAll(resp.Body)
	if err != nil || len(imgBytes) == 0 {
		log.Printf("[ERROR PDF] fetchImageBytes empty bytes from %s", fileURL)
		return nil, "", fmt.Errorf("empty image bytes from %s", fileURL)
	}

	// Re-encode image to standard 8-bit RGBA PNG via Go's image package for 100% gofpdf compatibility
	img, _, err := image.Decode(bytes.NewReader(imgBytes))
	if err == nil {
		bounds := img.Bounds()
		dst := image.NewRGBA(image.Rect(0, 0, bounds.Dx(), bounds.Dy()))
		draw.Draw(dst, dst.Bounds(), img, bounds.Min, draw.Src)

		var pngBuf bytes.Buffer
		if err := png.Encode(&pngBuf, dst); err == nil {
			return pngBuf.Bytes(), "PNG", nil
		}
	}

	imgType := "PNG"
	contentType := strings.ToLower(resp.Header.Get("Content-Type"))
	lowerURL := strings.ToLower(fileURL)

	if strings.HasSuffix(lowerURL, ".jpg") || strings.HasSuffix(lowerURL, ".jpeg") || strings.Contains(contentType, "jpeg") || strings.Contains(contentType, "jpg") {
		imgType = "JPG"
	} else if len(imgBytes) >= 3 && imgBytes[0] == 0xFF && imgBytes[1] == 0xD8 && imgBytes[2] == 0xFF {
		imgType = "JPG"
	} else if len(imgBytes) >= 4 && imgBytes[0] == 0x89 && imgBytes[1] == 'P' && imgBytes[2] == 'N' && imgBytes[3] == 'G' {
		imgType = "PNG"
	}

	return imgBytes, imgType, nil
}
