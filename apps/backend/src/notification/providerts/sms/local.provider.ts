import { SMSProviderInterface } from './interface';

export class LocalSMSProvider implements SMSProviderInterface {
  async send(to: string, message: string): Promise<boolean> {
    console.log('Simulating SMS provider');
    console.table({ to, message });
    return true;
  }
}
