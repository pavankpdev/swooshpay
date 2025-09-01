import { EmailProviderInterface } from './interface';
import fs from 'fs';
import path from 'path';

export class OutboxEmailProvider implements EmailProviderInterface {
  async send(to: string, subject: string, body: string): Promise<boolean> {
    try {
      const outboxPath =
        process.env.EMAIL_OUTBOX_PATH || '/tmp/swooshpay-emails.jsonl';
      const dir = path.dirname(outboxPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const record = {
        to,
        subject,
        body,
        timestamp: new Date().toISOString(),
      };
      fs.appendFileSync(outboxPath, JSON.stringify(record) + '\n', 'utf8');
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }
}
