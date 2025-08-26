export interface SMSProviderInterface {
  send(to: string, message: string): Promise<boolean>;
}
