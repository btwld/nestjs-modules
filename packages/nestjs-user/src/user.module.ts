import { DynamicModule, Module } from '@nestjs/common';

import {
  UserAsyncOptions,
  UserModuleClass,
  UserOptions,
} from './user.module-definition.js';

type UserRegistrationOptions = Omit<UserOptions, 'global'>;
type UserAsyncRegistrationOptions = Omit<UserAsyncOptions, 'global'>;

@Module({})
export class UserModule extends UserModuleClass {
  static register(options: UserRegistrationOptions): DynamicModule {
    return super.register({ ...options, global: false });
  }

  static registerAsync(options: UserAsyncRegistrationOptions): DynamicModule {
    return super.registerAsync({ ...options, global: false });
  }

  static forRoot(options: UserRegistrationOptions): DynamicModule {
    return super.register({ ...options, global: true });
  }

  static forRootAsync(options: UserAsyncRegistrationOptions): DynamicModule {
    return super.registerAsync({ ...options, global: true });
  }
}
