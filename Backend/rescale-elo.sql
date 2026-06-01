-- One-time migration: rescale ratings from the old small scale to the
-- standard (~chess) Elo magnitude.
--   Questions:  new = old * 10 + 600   (old 10-150  ->  ~700-2100)
--   Users:      reset to the new baseline of 1000 (old ratings are not
--               meaningful under the new scale + corrected formula)
--
-- Safe to run exactly once on a database that was seeded with the old scale.
-- Run with: psql -d adaptive_learning -f rescale-elo.sql

BEGIN;

UPDATE calculus            SET score = score * 10 + 600;
UPDATE discretemath        SET score = score * 10 + 600;
UPDATE linearalgebra       SET score = score * 10 + 600;
UPDATE statistics          SET score = score * 10 + 600;
UPDATE anatomy             SET score = score * 10 + 600;
UPDATE microbiology        SET score = score * 10 + 600;
UPDATE molecularbiology    SET score = score * 10 + 600;
UPDATE physiology          SET score = score * 10 + 600;
UPDATE analyticalchemistry SET score = score * 10 + 600;
UPDATE biochemistry        SET score = score * 10 + 600;
UPDATE inorganicchemistry  SET score = score * 10 + 600;
UPDATE organicchemistry    SET score = score * 10 + 600;
UPDATE astrophysics        SET score = score * 10 + 600;
UPDATE electromagnetics    SET score = score * 10 + 600;
UPDATE quantummechanics    SET score = score * 10 + 600;
UPDATE thermodynamics      SET score = score * 10 + 600;

-- Reset all users to the new baseline rating.
UPDATE users SET score = 1000;

COMMIT;
