-- Script Migration DOWN: Rollback e-Notulen Initial Schema

DROP TABLE IF EXISTS notulen_auto_saves;
DROP TABLE IF EXISTS notulen_attachments;
DROP TABLE IF EXISTS notulen_attendees;
DROP TABLE IF EXISTS notulen;
DROP TABLE IF EXISTS opd_settings;
