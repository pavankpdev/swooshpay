import { env } from '../../env';

export interface NotificationConfig {
  emailProvider: 'ses' | 'outbox';
  smsProvider: 'twilio' | 'local';
  outboxPath?: string;
}

export const getNotificationConfig = (): NotificationConfig => {
  // Allow explicit override via env, otherwise use 'outbox' in CI, 'ses' elsewhere.
  const emailProvider =
    (process.env.EMAIL_PROVIDER as 'ses' | 'outbox') ||
    (env.NODE_ENV === 'CI' ? 'outbox' : 'ses');

  const outboxPath =
    process.env.EMAIL_OUTBOX_PATH || '/tmp/swooshpay-emails.jsonl';

  return {
    emailProvider,
    smsProvider: env.NODE_ENV === 'production' ? 'twilio' : 'local',
    outboxPath,
  };
};
