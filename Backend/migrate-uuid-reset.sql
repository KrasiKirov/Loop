-- DESTRUCTIVE clean-slate reset to UUID schema (pre-launch only).
-- Run: psql -d adaptive_learning -f migrate-uuid-reset.sql
--   then: psql -d adaptive_learning -f schema.sql
--   then: psql -d adaptive_learning -f seed.sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
