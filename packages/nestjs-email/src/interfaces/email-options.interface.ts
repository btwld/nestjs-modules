import { type EmailServiceInterface } from './email-service.interface';
import { type EmailSettingsInterface } from './email-settings.interface';

export interface EmailOptionsInterface {
  settings?: EmailSettingsInterface;
  mailerService: EmailServiceInterface;
}
