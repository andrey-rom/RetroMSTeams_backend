-- AlterTable: add creator_id with a default for existing rows, then remove default
ALTER TABLE "sessions" ADD COLUMN "creator_id" TEXT NOT NULL DEFAULT 'system';
-- Backfill is not critical for dev data; existing sessions get 'system' as creator
