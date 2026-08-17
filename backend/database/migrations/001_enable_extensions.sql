-- =====================================================
-- Migration: 001_enable_extensions
-- Description:
-- Enables PostgreSQL extensions required by the application.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;