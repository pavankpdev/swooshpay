-- migrate:up
CREATE TABLE verification_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    attempts integer NOT NULL DEFAULT 0,
    purpose otp_purpose NOT NULL,
    expires_at timestamp NOT NULL,
    created_at timestamp NOT NULL DEFAULT NOW(),
    updated_at timestamp NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_verification_sessions_updated_at
BEFORE UPDATE ON "verification_sessions"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- migrate:down
DROP TRIGGER IF EXISTS set_verification_sessions_updated_at ON "verification_sessions";
DROP TABLE "verification_sessions";