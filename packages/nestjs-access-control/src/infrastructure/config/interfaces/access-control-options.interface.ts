import { type CanActivate, type NestInterceptor } from '@nestjs/common';

import { type AccessControlPortSettings } from '../../../application/ports/access-control.port.js';
import { type AccessControlServiceInterface } from '../../../domain/ports/access-control-service.interface.js';

import { type AccessControlSettingsInterface } from './access-control-settings.interface.js';

export interface AccessControlOptionsInterface {
  settings: AccessControlSettingsInterface;
  service?: AccessControlServiceInterface;
  appGuard?: CanActivate | false;
  appFilter?: NestInterceptor | false;
  ports?: {
    accessControl?: AccessControlPortSettings;
  };
}
