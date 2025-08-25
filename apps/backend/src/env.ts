import { z } from 'zod';

const processENVs = () => {
  const envSchema = z.object({
    DATABASE_URL: z.string(),
    JWT_SECRET: z.string(),
  });

  const env = envSchema.parse(process.env);

  if (envSchema.safeParse(process.env).success === false) {
    throw new Error('Invalid environment variables');
  }

  return env;
};

export const env = processENVs();
