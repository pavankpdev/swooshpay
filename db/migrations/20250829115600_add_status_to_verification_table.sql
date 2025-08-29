-- migrate:up
ALTER TABLE verification_sessions
ADD COLUMN is_consumed BOOLEAN 
NOT NULL DEFAULT false;

-- migrate:down
ALTER TABLE verification_sessions
DROP COLUMN is_consumed;
