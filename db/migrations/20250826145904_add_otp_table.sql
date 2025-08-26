-- migrate:up
CREATE TYPE otp_purpose AS ENUM ('signup', 'reset_password');

CREATE TABLE otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id),
    purpose otp_purpose NOT NULL,
    code_hash bytea NOT NULL,
    expires_at timestamptz NOT NULL,
    attempts int NOT NULL DEFAULT 0,
    consumed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX otp_expiry_idx ON otps (expires_at);

-- migrate:down
DROP TYPE otp_purpose;
DROP TABLE otps;