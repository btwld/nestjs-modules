import { DynamicModule, Module } from '@nestjs/common';

import {
  InvitationAsyncOptions,
  InvitationModuleClass,
  InvitationOptions,
} from './invitation.module-definition.js';

/**
 * Invitation module
 */
@Module({})
export class InvitationModule extends InvitationModuleClass {
  static register(options: InvitationOptions): DynamicModule {
    return super.register(options);
  }

  static registerAsync(options: InvitationAsyncOptions): DynamicModule {
    return super.registerAsync(options);
  }

  static forRoot(options: InvitationOptions): DynamicModule {
    return super.register({ ...options, global: true });
  }

  static forRootAsync(options: InvitationAsyncOptions): DynamicModule {
    return super.registerAsync({ ...options, global: true });
  }
}
