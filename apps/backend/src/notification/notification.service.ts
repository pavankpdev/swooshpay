import { Injectable } from '@nestjs/common';
import { NotificationServiceInterface } from './notification.interface';
import { EmailProviderInterface } from './providerts/email/interface';
import { SMSProviderInterface } from './providerts/sms/interface';
import { getNotificationConfig } from './config/notification.config';
import { NotificationProviderFactory } from './notification.provider.factory';

@Injectable()
export class NotificationService implements NotificationServiceInterface {
  private emailProvider: EmailProviderInterface;
  private smsProvider: SMSProviderInterface;

  constructor() {
    const config = getNotificationConfig();
    this.emailProvider =
      NotificationProviderFactory.createEmailProvider(config);
    this.smsProvider = NotificationProviderFactory.createSMSProvider(config);
  }

  async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    return this.emailProvider.send(to, subject, body);
  }

  async sendSMS(to: string, message: string): Promise<boolean> {
    return this.smsProvider.send(to, message);
  }
}
