export interface EmailProviderInterface {
  send(to: string, subject: string, body: string): Promise<boolean>;
}
