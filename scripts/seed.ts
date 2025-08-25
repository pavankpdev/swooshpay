import { Kysely, PostgresDialect } from "kysely";
import { Pool } from 'pg';

// Import the DB type from the generated file
import { DB } from '../apps/backend/src/db/generated/db';

// Create the database connection
const db = new Kysely<DB>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: 'postgresql://swooshpay:swooshpay@localhost:5432/swooshpay',
    })
  })
});

async function seed() {
  try {
    // Delete existing data
    await db.deleteFrom('users').execute();
    console.log('Deleted existing data from users table');

    // Seed new data
    const users = [
      {
        fullname: 'John Doe',
        username: 'johndoe',
        email: 'john@example.com',
        password: 'password123',
      },
      {
        fullname: 'Jane Smith',
        username: 'janesmith',
        email: 'jane@example.com',
        password: 'password456',
      },
      {
        fullname: 'Bob Johnson',
        username: 'bobjohnson',
        email: 'bob@example.com',
        password: 'password789',
      }
    ];

    // Insert new data
    for (const user of users) {
      await db.insertInto('users').values(user).execute();
    }
    
    console.log('Seeded', users.length, 'users');

    // Close the database connection
    await db.destroy();
  } catch (error) {
    console.error('Error seeding database:', error);
    await db.destroy();
    process.exit(1);
  }
}

// Run the seed function
seed();