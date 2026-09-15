import { DynamicModule, Module } from '@nestjs/common';

import { createOtpRepositoryProvider } from './infrastructure/utils/create-otp-repository-provider.js';
import {
  OtpCoreAsyncOptions,
  OtpCoreModuleClass,
  OtpCoreOptions,
} from './otp-core.module-definition.js';

type OtpOptions = Omit<OtpCoreOptions, 'global'>;
type OtpAsyncOptions = Omit<OtpCoreAsyncOptions, 'global'>;

/**
 * Otp Module
 */
@Module({})
export class OtpModule {
  static register(options: OtpOptions): DynamicModule {
    return {
      module: OtpModule,
      imports: [OtpCoreModuleClass.register({ ...options, global: false })],
    };
  }

  static registerAsync(options: OtpAsyncOptions): DynamicModule {
    return {
      module: OtpModule,
      imports: [
        OtpCoreModuleClass.registerAsync({ ...options, global: false }),
      ],
    };
  }

  static forRoot(options: OtpOptions): DynamicModule {
    return {
      module: OtpModule,
      imports: [OtpCoreModuleClass.register({ ...options, global: true })],
    };
  }

  static forRootAsync(options: OtpAsyncOptions): DynamicModule {
    return {
      module: OtpModule,
      imports: [OtpCoreModuleClass.registerAsync({ ...options, global: true })],
    };
  }

  static forFeature(entityKeys: string[]): DynamicModule {
    const repoProviders = entityKeys.map((entityKey) =>
      createOtpRepositoryProvider(entityKey),
    );

    return {
      module: OtpModule,
      providers: [...repoProviders],
      exports: repoProviders,
    };
  }
}
