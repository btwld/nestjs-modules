import {
  ConfigurableModuleBuilder,
  type DynamicModule,
  type Provider,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';

import { createSettingsProvider } from '@concepta/nestjs-core';
import { RepositoryModule } from '@concepta/nestjs-repository';

import { ConfirmFileUploadHandler } from './application/commands/handlers/confirm-file-upload.handler.js';
import { CreateFileHandler } from './application/commands/handlers/create-file.handler.js';
import { RemoveFileHandler } from './application/commands/handlers/remove-file.handler.js';
import { RestoreFileHandler } from './application/commands/handlers/restore-file.handler.js';
import { SoftDeleteFileHandler } from './application/commands/handlers/soft-delete-file.handler.js';
import { GetFileByKeyHandler } from './application/queries/handlers/get-file-by-key.handler.js';
import { GetFileHandler } from './application/queries/handlers/get-file.handler.js';
import { FileLifecycleService } from './domain/services/file-lifecycle.service.js';
import { FileStorageService } from './domain/services/file-storage.service.js';
import { FILE_MODULE_SETTINGS_TOKEN } from './file.constants.js';
import { fileDefaultConfig } from './infrastructure/config/file-default.config.js';
import { type FileExtrasInterface } from './infrastructure/config/interfaces/file-extras.interface.js';
import { type FileOptionsInterface } from './infrastructure/config/interfaces/file-options.interface.js';
import { type FileSettingsInterface } from './infrastructure/config/interfaces/file-settings.interface.js';
import { FileMapper } from './infrastructure/persistence/file.mapper.js';
import { createFileRepositoryProvider } from './infrastructure/utils/create-file-repository-provider.js';

const RAW_OPTIONS_TOKEN = Symbol('__FILE_MODULE_RAW_OPTIONS_TOKEN__');

export const {
  ConfigurableModuleClass: FileModuleClass,
  OPTIONS_TYPE: FILE_OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE: FILE_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<FileOptionsInterface>({
  moduleName: 'File',
  optionsInjectionToken: RAW_OPTIONS_TOKEN,
})
  .setExtras<FileExtrasInterface>(
    { global: false, entities: { file: 'file' } },
    definitionTransform,
  )
  .build();

export type FileOptions = typeof FILE_OPTIONS_TYPE;
export type FileAsyncOptions = typeof FILE_ASYNC_OPTIONS_TYPE;

function definitionTransform(
  definition: DynamicModule,
  {
    global,
    providers: overrideProviders,
    entities,
    repositories,
  }: FileExtrasInterface,
): DynamicModule {
  const { providers = [], imports = [] } = definition;

  return {
    ...definition,
    global,
    imports: createFileImports({ imports, entities }),
    providers: createFileProviders({
      providers: [...providers, ...(overrideProviders ?? [])],
      entities,
      repositories,
    }),
    exports: [ConfigModule, RAW_OPTIONS_TOKEN, ...createFileExports()],
  };
}

export function createFileImports(options: {
  imports: DynamicModule['imports'];
  entities: FileExtrasInterface['entities'];
}): DynamicModule['imports'] {
  return [
    ...(options.imports || []),
    ConfigModule.forFeature(fileDefaultConfig),
    CqrsModule.forRoot(),
    RepositoryModule.forFeature([options.entities.file]),
  ];
}

export function createFileProviders(options: {
  providers?: Provider[];
  entities: FileExtrasInterface['entities'];
  repositories?: FileExtrasInterface['repositories'];
}): Provider[] {
  return [
    createFileSettingsProvider(),
    createFileStorageServiceProvider(),
    FileLifecycleService,
    FileMapper,
    createFileRepositoryProvider(
      options.entities.file,
      options.repositories?.file,
    ),
    CreateFileHandler,
    ConfirmFileUploadHandler,
    SoftDeleteFileHandler,
    RestoreFileHandler,
    RemoveFileHandler,
    GetFileHandler,
    GetFileByKeyHandler,
    // Consumer overrides (last provider for a token wins)
    ...(options.providers ?? []),
  ];
}

export function createFileExports(): Required<
  Pick<DynamicModule, 'exports'>
>['exports'] {
  return [FILE_MODULE_SETTINGS_TOKEN, FileMapper];
}

function createFileStorageServiceProvider(): Provider {
  return {
    provide: FileStorageService,
    inject: [RAW_OPTIONS_TOKEN],
    useFactory: (options: FileOptionsInterface) =>
      new FileStorageService(options.storageServices),
  };
}

export function createFileSettingsProvider(
  optionsOverrides?: FileOptions,
): Provider {
  return createSettingsProvider<FileSettingsInterface, FileOptionsInterface>({
    settingsToken: FILE_MODULE_SETTINGS_TOKEN,
    optionsToken: RAW_OPTIONS_TOKEN,
    settingsKey: fileDefaultConfig.KEY,
    optionsOverrides,
  });
}
