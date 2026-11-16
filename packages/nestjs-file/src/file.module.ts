import { DynamicModule, Module } from '@nestjs/common';

import {
  FileAsyncOptions,
  FileModuleClass,
  FileOptions,
} from './file.module-definition.js';

// Distributes over the scanned and unscanned option shapes, so `Omit` keeps
// them apart.
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

type FileRegistrationOptions = DistributiveOmit<FileOptions, 'global'>;
type FileAsyncRegistrationOptions = Omit<FileAsyncOptions, 'global'>;

@Module({})
export class FileModule extends FileModuleClass {
  static register(options: FileRegistrationOptions): DynamicModule {
    return super.register({ ...options, global: false });
  }

  static registerAsync(options: FileAsyncRegistrationOptions): DynamicModule {
    return super.registerAsync({ ...options, global: false });
  }

  static forRoot(options: FileRegistrationOptions): DynamicModule {
    return super.register({ ...options, global: true });
  }

  static forRootAsync(options: FileAsyncRegistrationOptions): DynamicModule {
    return super.registerAsync({ ...options, global: true });
  }
}
