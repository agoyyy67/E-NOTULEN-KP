-- Script Migration UP: e-Notulen Initial Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Pengaturan Kop Surat per OPD
CREATE TABLE IF NOT EXISTS opd_settings (
    kode_unit           VARCHAR(20) PRIMARY KEY,
    opd_name            VARCHAR(255) NOT NULL,
    logo_url            VARCHAR(512),
    letterhead_config   JSONB NOT NULL DEFAULT '{}',
    address             TEXT,
    phone               VARCHAR(50),
    email               VARCHAR(255),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Data Utama Notulen Rapat
CREATE TABLE IF NOT EXISTS notulen (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title             VARCHAR(500) NOT NULL,
    meeting_date      DATE NOT NULL,
    start_time        TIME,
    end_time          TIME,
    location          VARCHAR(500),
    led_by            VARCHAR(255),
    led_by_position   VARCHAR(255),
    led_by_nip        VARCHAR(30),
    signed_by         VARCHAR(255),
    signed_by_position VARCHAR(255),
    signed_by_nip     VARCHAR(30),
    notulist_name     VARCHAR(255),
    notulist_position VARCHAR(255),
    notulist_nip      VARCHAR(30),
    input_type        VARCHAR(20) NOT NULL DEFAULT 'editor'
                      CHECK (input_type IN ('editor', 'upload')),
    content           JSONB,
    file_url          VARCHAR(512),
    file_name         VARCHAR(255),
    summary           TEXT,
    content_search    TSVECTOR GENERATED ALWAYS AS (
                        to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE(summary, ''))
                      ) STORED,
    opd_code          VARCHAR(20) NOT NULL,
    opd_name          VARCHAR(255) NOT NULL,
    created_by_sub    UUID NOT NULL,
    created_by_name   VARCHAR(255) NOT NULL,
    status            VARCHAR(20) NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'final')),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notulen_opd_code ON notulen(opd_code);
CREATE INDEX IF NOT EXISTS idx_notulen_created_by_sub ON notulen(created_by_sub);
CREATE INDEX IF NOT EXISTS idx_notulen_meeting_date ON notulen(meeting_date);
CREATE INDEX IF NOT EXISTS idx_notulen_status ON notulen(status);
CREATE INDEX IF NOT EXISTS idx_notulen_content_search ON notulen USING GIN(content_search);
CREATE INDEX IF NOT EXISTS idx_notulen_deleted_at ON notulen(deleted_at) WHERE deleted_at IS NULL;

-- 3. Peserta Rapat
CREATE TABLE IF NOT EXISTS notulen_attendees (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notulen_id      UUID NOT NULL REFERENCES notulen(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    institution     VARCHAR(255),
    position        VARCHAR(255),
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notulen_attendees_notulen_id ON notulen_attendees(notulen_id);

-- 4. Lampiran Foto Dokumentasi
CREATE TABLE IF NOT EXISTS notulen_attachments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notulen_id      UUID NOT NULL REFERENCES notulen(id) ON DELETE CASCADE,
    file_name       VARCHAR(255) NOT NULL,
    file_url        VARCHAR(512) NOT NULL,
    file_size       BIGINT NOT NULL DEFAULT 0,
    mime_type       VARCHAR(100) NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notulen_attachments_notulen_id ON notulen_attachments(notulen_id);

-- 5. Riwayat Auto-Save Snapshot Tiptap
CREATE TABLE IF NOT EXISTS notulen_auto_saves (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notulen_id      UUID NOT NULL REFERENCES notulen(id) ON DELETE CASCADE,
    content         JSONB NOT NULL,
    saved_by_sub    UUID NOT NULL,
    saved_by_name   VARCHAR(255) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notulen_auto_saves_notulen_id ON notulen_auto_saves(notulen_id);

-- Patch columns for existing databases
ALTER TABLE notulen ADD COLUMN IF NOT EXISTS signed_by VARCHAR(255);
ALTER TABLE notulen ADD COLUMN IF NOT EXISTS signed_by_position VARCHAR(255);
ALTER TABLE notulen ADD COLUMN IF NOT EXISTS signed_by_nip VARCHAR(30);
ALTER TABLE notulen ADD COLUMN IF NOT EXISTS deleted_by_name VARCHAR(255);
ALTER TABLE notulen ADD COLUMN IF NOT EXISTS deleted_by_sub UUID;
