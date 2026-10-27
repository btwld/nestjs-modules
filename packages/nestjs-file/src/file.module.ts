import { DynamicModule, Module } from '@nestjs/common';

import {
  FileAsyncOptions,
  FileModuleClass,
  FileOptions,
} from './file.module-definition.js';

type FileRegistrationOptions = Omit<FileOptions, 'global'>;
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
