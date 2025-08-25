import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

import { DB } from './generated/db';
import { env } from '../env';

export const db = new Kysely<DB>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: env.DATABASE_URL,
    }),
  }),
});
