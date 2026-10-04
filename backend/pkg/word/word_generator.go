package word

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"e-notulen/backend/internal/model"
)

// WordGenerator menghasilkan file DOCX (Office Open XML) murni tanpa library eksternal.
// DOCX = file ZIP berisi beberapa file XML sesuai standar OOXML (ECMA-376).
type WordGenerator struct{}

func NewWordGenerator() *WordGenerator {
	return &WordGenerator{}
}

// GenerateNotulenDOCX menghasilkan byte[] file .docx yang valid untuk satu notulen.
func (g *WordGenerator) GenerateNotulenDOCX(notulen *model.Notulen, settings *model.OPDSettings) ([]byte, error) {
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)

	// Kumpulkan teks konten dari JSON Tiptap
	contentText := extractTiptapText(notulen.Content)

	// Bangun bagian-bagian dokumen
	files := map[string]string{
		"_rels/.rels":                  buildRels(),
		"[Content_Types].xml":          buildContentTypes(),
		"word/_rels/document.xml.rels": buildDocumentRels(),
		"word/document.xml":            buildDocument(notulen, settings, contentText),
		"word/styles.xml":              buildStyles(),
		"word/settings.xml":            buildSettings(),
		"docProps/core.xml":            buildCoreProps(notulen),
		"docProps/app.xml":             buildAppProps(),
	}

	for name, content := range files {
		w, err := zw.Create(name)
		if err != nil {
			return nil, fmt.Errorf("failed to create %s in zip: %w", name, err)
		}
		if _, err := w.Write([]byte(content)); err != nil {
			return nil, fmt.Errorf("failed to write %s: %w", name, err)
		}
	}

	if err := zw.Close(); err != nil {
		return nil, fmt.Errorf("failed to close zip: %w", err)
	}

	return buf.Bytes(), nil
}

// ── Tiptap JSON → Plain Text extractor ──────────────────────────────────────

type tiptapNode struct {
	Type    string            `json:"type"`
	Text    string            `json:"text,omitempty"`
	Content []tiptapNode      `json:"content,omitempty"`
	Marks   []tiptapMark      `json:"marks,omitempty"`
	Attrs   map[string]interface{} `json:"attrs,omitempty"`
}

type tiptapMark struct {
	Type string `json:"type"`
}

func extractTiptapText(raw json.RawMessage) string {
	if len(raw) == 0 {
		return ""
	}
	var root tiptapNode
	if err := json.Unmarshal(raw, &root); err != nil {
		return ""
	}
	var sb strings.Builder
	walkTiptap(&sb, root)
	return strings.TrimSpace(sb.String())
}

func walkTiptap(sb *strings.Builder, node tiptapNode) {
	switch node.Type {
	case "text":
		sb.WriteString(node.Text)
	case "hardBreak":
		sb.WriteString("\n")
	case "paragraph", "heading":
		for _, child := range node.Content {
			walkTiptap(sb, child)
		}
		sb.WriteString("\n")
	case "bulletList", "orderedList":
		for _, child := range node.Content {
			walkTiptap(sb, child)
		}
	case "listItem":
		sb.WriteString("• ")
		for _, child := range node.Content {
			walkTiptap(sb, child)
		}
	case "blockquote":
		for _, child := range node.Content {
			walkTiptap(sb, child)
		}
		sb.WriteString("\n")
	default:
		for _, child := range node.Content {
			walkTiptap(sb, child)
		}
	}
}

// ── OOXML Document Builder ──────────────────────────────────────────────────

func xmlEscape(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	s = strings.ReplaceAll(s, "\"", "&quot;")
	s = strings.ReplaceAll(s, "'", "&apos;")
	return s
}

// paragraphXML membungkus teks dalam elemen <w:p> OOXML.
// styleID: "Heading1", "Heading2", "" (Normal)
// bold: true/false, center: true/false
func paragraphXML(text, styleID string, bold, center bool, fontSize int) string {
	text = xmlEscape(text)
	if text == "" {
		return `<w:p><w:pPr></w:pPr></w:p>`
	}

	pPr := "<w:pPr>"
	if styleID != "" {
		pPr += fmt.Sprintf(`<w:pStyle w:val="%s"/>`, styleID)
	}
	if center {
		pPr += `<w:jc w:val="center"/>`
	}
	pPr += "</w:pPr>"

	rPr := "<w:rPr>"
	if bold {
		rPr += "<w:b/>"
	}
	if fontSize > 0 {
		rPr += fmt.Sprintf(`<w:sz w:val="%d"/><w:szCs w:val="%d"/>`, fontSize*2, fontSize*2)
	}
	rPr += "</w:rPr>"

	return fmt.Sprintf(`<w:p>%s<w:r>%s<w:t xml:space="preserve">%s</w:t></w:r></w:p>`, pPr, rPr, text)
}

// tableRowXML membuat satu baris tabel 3 kolom (label, ":", value).
func tableRowXML(label, value string) string {
	label = xmlEscape(label)
	value = xmlEscape(value)
	return fmt.Sprintf(`
<w:tr>
  <w:tc><w:tcPr><w:tcW w:w="2000" w:type="dxa"/></w:tcPr>
    <w:p><w:r><w:rPr></w:rPr><w:t xml:space="preserve">%s</w:t></w:r></w:p></w:tc>
  <w:tc><w:tcPr><w:tcW w:w="200" w:type="dxa"/></w:tcPr>
    <w:p><w:r><w:t>:</w:t></w:r></w:p></w:tc>
  <w:tc><w:tcPr><w:tcW w:w="6000" w:type="dxa"/></w:tcPr>
    <w:p><w:r><w:t xml:space="preserve">%s</w:t></w:r></w:p></w:tc>
</w:tr>`, label, value)
}

func buildDocument(n *model.Notulen, s *model.OPDSettings, contentText string) string {
	var sb strings.Builder

	sb.WriteString(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`)
	sb.WriteString(`<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"`)
	sb.WriteString(` xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"`)
	sb.WriteString(` xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"`)
	sb.WriteString(`><w:body>`)

	// ── Kop Surat ──
	sb.WriteString(paragraphXML("PEMERINTAH KABUPATEN PURBALINGGA", "", true, true, 12))

	opdName := n.OPDName
	if s != nil && s.OPDName != "" {
		opdName = s.OPDName
	}
	sb.WriteString(paragraphXML(strings.ToUpper(opdName), "", true, true, 14))

	if s != nil && s.Address != "" {
		sb.WriteString(paragraphXML(s.Address, "", false, true, 10))
	}

	contactParts := []string{}
	if s != nil && s.Phone != "" {
		contactParts = append(contactParts, "Telp: "+s.Phone)
	}
	if s != nil && s.Email != "" {
		contactParts = append(contactParts, "Email: "+s.Email)
	}
	if len(contactParts) > 0 {
		sb.WriteString(paragraphXML(strings.Join(contactParts, " | "), "", false, true, 9))
	}

	// Garis pemisah Kop Surat (simulasi dengan paragraph border)
	sb.WriteString(`<w:p><w:pPr><w:jc w:val="center"/>`)
	sb.WriteString(`<w:pBdr><w:bottom w:val="double" w:sz="6" w:space="1" w:color="000000"/></w:pBdr>`)
	sb.WriteString(`</w:pPr></w:p>`)

	// ── Judul ──
	sb.WriteString(`<w:p></w:p>`) // spasi
	sb.WriteString(paragraphXML("NOTULEN", "", true, true, 14))
	sb.WriteString(paragraphXML(strings.ToUpper(n.Title), "", true, true, 12))
	sb.WriteString(`<w:p></w:p>`)

	// ── Metadata Rapat (Tabel) ──
	sb.WriteString(`<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/>`)
	sb.WriteString(`<w:tblW w:w="8200" w:type="dxa"/>`)
	sb.WriteString(`<w:tblBorders>`)
	sb.WriteString(`<w:top w:val="none"/><w:left w:val="none"/>`)
	sb.WriteString(`<w:bottom w:val="none"/><w:right w:val="none"/>`)
	sb.WriteString(`<w:insideH w:val="none"/><w:insideV w:val="none"/>`)
	sb.WriteString(`</w:tblBorders></w:tblPr>`)

	// Waktu
	timeStr := "Selesai"
	if n.StartTime != nil && *n.StartTime != "" {
		timeStr = *n.StartTime + " WIB"
		if n.EndTime != nil && *n.EndTime != "" {
			timeStr += " s/d " + *n.EndTime + " WIB"
		}
	}

	sb.WriteString(tableRowXML("Hari / Tanggal", n.MeetingDate))
	sb.WriteString(tableRowXML("Waktu", timeStr))
	sb.WriteString(tableRowXML("Tempat", n.Location))

	ledByStr := n.LedBy
	if n.LedByPosition != "" {
		ledByStr = n.LedBy + ", " + n.LedByPosition
	}
	sb.WriteString(tableRowXML("Dipimpin Oleh", ledByStr))

	// Peserta
	if len(n.Attendees) > 0 {
		attLines := []string{}
		for i, att := range n.Attendees {
			line := fmt.Sprintf("%d. %s", i+1, att.Name)
			if att.Institution != "" {
				line += " - " + att.Institution
			}
			attLines = append(attLines, line)
		}
		sb.WriteString(tableRowXML("Dihadiri Oleh", strings.Join(attLines, "\n")))
	} else {
		sb.WriteString(tableRowXML("Dihadiri Oleh", "-"))
	}

	sb.WriteString(`</w:tbl>`)
	sb.WriteString(`<w:p></w:p>`)

	// ── Isi Risalah ──
	sb.WriteString(paragraphXML("ISI RISALAH", "", true, false, 12))
	sb.WriteString(`<w:p><w:pPr><w:pBdr>`)
	sb.WriteString(`<w:bottom w:val="single" w:sz="4" w:space="1" w:color="000000"/>`)
	sb.WriteString(`</w:pBdr></w:pPr></w:p>`)

	if contentText != "" {
		lines := strings.Split(contentText, "\n")
		for _, line := range lines {
			if strings.TrimSpace(line) == "" {
				sb.WriteString(`<w:p></w:p>`)
			} else {
				sb.WriteString(paragraphXML(line, "", false, false, 12))
			}
		}
	} else {
		sb.WriteString(paragraphXML("(Belum ada isi risalah rapat yang dicatat)", "", false, false, 12))
	}

	sb.WriteString(`<w:p></w:p>`)

	// ── Kalimat Penutup ──
	sb.WriteString(paragraphXML(
		"Demikian Notulen Rapat ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.",
		"", false, false, 12,
	))
	sb.WriteString(`<w:p></w:p><w:p></w:p>`)

	// ── Blok Tanda Tangan ──
	// Tentukan pimpinan penanda tangan
	signerName := strings.TrimSpace(n.SignedBy)
	if signerName == "" {
		signerName = strings.TrimSpace(n.LedBy)
	}
	signerPos := strings.TrimSpace(n.SignedByPosition)
	if signerPos == "" {
		signerPos = strings.TrimSpace(n.LedByPosition)
	}
	if signerPos == "" {
		signerPos = "Pimpinan Rapat,"
	} else if !strings.HasSuffix(signerPos, ",") {
		signerPos += ","
	}
	signerNIP := strings.TrimSpace(n.SignedByNIP)
	if signerNIP == "" {
		signerNIP = strings.TrimSpace(n.LedByNIP)
	}

	notulistNIP := strings.TrimSpace(n.NotulistNIP)

	// Tabel 2 kolom untuk TTD berdampingan
	sb.WriteString(`<w:tbl><w:tblPr><w:tblW w:w="8200" w:type="dxa"/>`)
	sb.WriteString(`<w:tblBorders>`)
	sb.WriteString(`<w:top w:val="none"/><w:left w:val="none"/>`)
	sb.WriteString(`<w:bottom w:val="none"/><w:right w:val="none"/>`)
	sb.WriteString(`<w:insideH w:val="none"/><w:insideV w:val="none"/>`)
	sb.WriteString(`</w:tblBorders></w:tblPr>`)

	sb.WriteString(`<w:tr>`)
	// Kolom kiri (Pimpinan)
	sb.WriteString(`<w:tc><w:tcPr><w:tcW w:w="4100" w:type="dxa"/></w:tcPr>`)
	sb.WriteString(paragraphXML(signerPos, "", false, true, 11))
	sb.WriteString(paragraphXML("", "", false, true, 11))
	sb.WriteString(paragraphXML("", "", false, true, 11))
	sb.WriteString(paragraphXML("", "", false, true, 11))
	sb.WriteString(paragraphXML(signerName, "", true, true, 11))
	if signerNIP != "" {
		sb.WriteString(paragraphXML("NIP. "+signerNIP, "", false, true, 10))
	}
	sb.WriteString(`</w:tc>`)

	// Kolom kanan (Notulis)
	sb.WriteString(`<w:tc><w:tcPr><w:tcW w:w="4100" w:type="dxa"/></w:tcPr>`)
	sb.WriteString(paragraphXML("Notulis,", "", false, true, 11))
	sb.WriteString(paragraphXML("", "", false, true, 11))
	sb.WriteString(paragraphXML("", "", false, true, 11))
	sb.WriteString(paragraphXML("", "", false, true, 11))
	sb.WriteString(paragraphXML(n.NotulistName, "", true, true, 11))
	if notulistNIP != "" {
		sb.WriteString(paragraphXML("NIP. "+notulistNIP, "", false, true, 10))
	}
	sb.WriteString(`</w:tc>`)
	sb.WriteString(`</w:tr></w:tbl>`)

	// ── Disclaimer Footer ──
	sb.WriteString(`<w:p></w:p><w:p></w:p>`)
	sb.WriteString(`<w:p><w:pPr><w:pBdr>`)
	sb.WriteString(`<w:top w:val="single" w:sz="4" w:space="1" w:color="AAAAAA"/>`)
	sb.WriteString(`</w:pBdr></w:pPr></w:p>`)
	sb.WriteString(paragraphXML(
		"Dokumen ini diterbitkan secara elektronik melalui Aplikasi e-Notulen Pemerintah Kabupaten Purbalingga.",
		"", false, true, 8,
	))

	// Seksi penutup dokumen
	sb.WriteString(`<w:sectPr>`)
	sb.WriteString(`<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/>`)
	sb.WriteString(`</w:sectPr>`)
	sb.WriteString(`</w:body></w:document>`)

	return sb.String()
}

// ── OOXML Boilerplate Files ──────────────────────────────────────────────────

func buildRels() string {
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`
}

func buildContentTypes() string {
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`
}

func buildDocumentRels() string {
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
</Relationships>`
}

func buildStyles() string {
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr>
      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
      <w:sz w:val="24"/><w:szCs w:val="24"/>
    </w:rPr></w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:pPr><w:spacing w:after="120"/></w:pPr>
  </w:style>
  <w:style w:type="table" w:styleId="TableGrid">
    <w:name w:val="Table Grid"/>
  </w:style>
</w:styles>`
}

func buildSettings() string {
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:defaultTabStop w:val="720"/>
</w:settings>`
}

func buildCoreProps(n *model.Notulen) string {
	now := time.Now().UTC().Format("2006-01-02T15:04:05Z")
	title := xmlEscape(n.Title)
	creator := xmlEscape(n.CreatedByName)
	return fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>%s</dc:title>
  <dc:creator>%s</dc:creator>
  <cp:lastModifiedBy>e-Notulen System</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">%s</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">%s</dcterms:modified>
</cp:coreProperties>`, title, creator, now, now)
}

func buildAppProps() string {
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>e-Notulen Pemerintah Kabupaten Purbalingga</Application>
</Properties>`
}
