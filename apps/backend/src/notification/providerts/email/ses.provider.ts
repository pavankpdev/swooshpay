import {
  SESClient,
  SESClientConfig,
  SendEmailCommand,
} from '@aws-sdk/client-ses';

import { EmailProviderInterface } from './interface';
import { env } from '../../../env';
import { InternalServerErrorException } from '@nestjs/common';

export class SESEmailProvider implements EmailProviderInterface {
  private client: SESClient;

  constructor() {
    const config: SESClientConfig = {
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    };

    if (env.NODE_ENV !== 'production') {
      config.endpoint = 'http://localhost:4566';
    }

    this.client = new SESClient(config);
  }
  async send(to: string, subject: string, body: string): Promise<boolean> {
    try {
      // TODO: add support for templates
      const commad = new SendEmailCommand({
        Destination: {
          ToAddresses: [to],
        },
        Message: {
          Body: {
            Text: {
              Charset: 'UTF-8',
              Data: body,
            },
          },
          Subject: {
            Charset: 'UTF-8',
            Data: subject,
          },
        },
        Source: env.AWS_SES_EMAIL_IDENTITY,
      });

      const res = await this.client.send(commad);

      if (res.$metadata.httpStatusCode !== 200) {
        throw new InternalServerErrorException('Failed to send email');
      }

      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }
}
