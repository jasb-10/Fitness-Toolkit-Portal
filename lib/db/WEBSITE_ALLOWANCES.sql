-- Apply to the development database before running the updated website API.
-- Backfill defaults for existing projects; do not run against production until
-- the Replit deployment and database update are scheduled together.
ALTER TABLE website_projects
  ADD COLUMN IF NOT EXISTS generation_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refinement_attempts integer NOT NULL DEFAULT 0;
