-- migrate:up
ALTER TABLE otps DROP CONSTRAINT IF EXISTS otps_user_id_key;

-- Enforce: at most one ACTIVE (unconsumed) OTP per user+purpose
CREATE UNIQUE INDEX IF NOT EXISTS 
uniq_active_otp_per_user_purpose 
    ON otps (user_id, purpose)
    WHERE consumed_at IS NULL;

-- migrate:down
DROP INDEX IF EXISTS uniq_active_otp_per_user_purpose;
-- Restore the original uniqueness if rolling back
ALTER TABLE otps ADD CONSTRAINT otps_user_id_key UNIQUE (user_id);
