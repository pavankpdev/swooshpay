import { z } from 'zod';

const processENVs = () => {
  const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'staging', 'CI']),
    DATABASE_URL: z.string(),
    JWT_SECRET: z.string(),
    AWS_ACCESS_KEY_ID: z.string(),
    AWS_SECRET_ACCESS_KEY: z.string(),
    AWS_REGION: z.string(),
    AWS_SES_EMAIL_IDENTITY: z.email(),
  });

  const env = envSchema.parse(process.env);

  if (envSchema.safeParse(process.env).success === false) {
    throw new Error('Invalid environment variables');
  }

  return env;
};

export const env = processENVs();
