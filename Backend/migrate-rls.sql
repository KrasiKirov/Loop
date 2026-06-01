-- RLS is folded into schema.sql + the clean-slate reset.
-- Apply (pre-launch) with:
--   psql -d adaptive_learning -f migrate-uuid-reset.sql
--   psql -d adaptive_learning -f schema.sql
--   psql -d adaptive_learning -f seed.sql
-- This file is a documentation pointer; no statements needed.
SELECT 'Run migrate-uuid-reset.sql then schema.sql then seed.sql' AS note;
