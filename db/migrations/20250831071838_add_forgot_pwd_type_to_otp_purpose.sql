-- migrate:up
ALTER TYPE otp_purpose ADD VALUE 'forgot_password';

-- migrate:down
ALTER TYPE otp_purpose DROP VALUE 'forgot_password';
