-- migrate:up
ALTER TABLE verification_sessions ADD CONSTRAINT uniq_verification_sessions_user_id_purpose UNIQUE (user_id, purpose);

-- migrate:down
ALTER TABLE verification_sessions DROP CONSTRAINT IF EXISTS uniq_verification_sessions_user_id_purpose;