import { env } from '../../env';

export interface NotificationConfig {
  emailProvider: 'ses';
  smsProvider: 'twilio' | 'local';
}

export const getNotificationConfig = (): NotificationConfig => ({
  emailProvider: 'ses', // The provider will switch to Localstack in any environment other than production
  smsProvider: env.NODE_ENV === 'production' ? 'twilio' : 'local',
});
