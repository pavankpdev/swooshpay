import { NotificationConfig } from './config/notification.config';
import { EmailProviderInterface } from './providerts/email/interface';
import { SESEmailProvider } from './providerts/email/ses.provider';
import { OutboxEmailProvider } from './providerts/email/outbox.provider';
import { SMSProviderInterface } from './providerts/sms/interface';
import { LocalSMSProvider } from './providerts/sms/local.provider';

export class NotificationProviderFactory {
  static createEmailProvider(
    config: NotificationConfig
  ): EmailProviderInterface {
    switch (config.emailProvider) {
      case 'outbox':
        return new OutboxEmailProvider();
      case 'ses':
      default:
        return new SESEmailProvider();
    }
  }

  static createSMSProvider(config: NotificationConfig): SMSProviderInterface {
    switch (config.smsProvider) {
      case 'twilio':
        return new LocalSMSProvider();
      default:
        return new LocalSMSProvider();
    }
  }
}
