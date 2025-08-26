-- migrate:up
ALTER TABLE users ADD COLUMN is_confirmed BOOLEAN DEFAULT false;

-- migrate:down
ALTER TABLE users DROP COLUMN is_confirmed;
