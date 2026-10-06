import { DynamicModule, Module } from '@nestjs/common';

import { createRoleAssignmentRepositoryProvider } from './infrastructure/utils/create-role-assignment-repository-provider.js';
import { createRoleRepositoryProvider } from './infrastructure/utils/create-role-repository-provider.js';
import {
  RoleCoreAsyncOptions,
  RoleCoreModuleClass,
  RoleCoreOptions,
} from './role-core.module-definition.js';

type RoleOptions = Omit<RoleCoreOptions, 'global'>;
type RoleAsyncOptions = Omit<RoleCoreAsyncOptions, 'global'>;

/**
 * Role Module
 */
@Module({})
export class RoleModule {
  static register(options: RoleOptions): DynamicModule {
    return {
      module: RoleModule,
      imports: [RoleCoreModuleClass.register({ ...options, global: false })],
    };
  }

  static registerAsync(options: RoleAsyncOptions): DynamicModule {
    return {
      module: RoleModule,
      imports: [
        RoleCoreModuleClass.registerAsync({ ...options, global: false }),
      ],
    };
  }

  static forRoot(options: RoleOptions): DynamicModule {
    return {
      module: RoleModule,
      imports: [RoleCoreModuleClass.register({ ...options, global: true })],
    };
  }

  static forRootAsync(options: RoleAsyncOptions): DynamicModule {
    return {
      module: RoleModule,
      imports: [
        RoleCoreModuleClass.registerAsync({ ...options, global: true }),
      ],
    };
  }

  static forFeature(config: {
    roleEntityKey: string;
    assignmentEntityKeys: string[];
  }): DynamicModule {
    const providers = [
      createRoleRepositoryProvider(config.roleEntityKey),
      ...config.assignmentEntityKeys.map((entityKey) =>
        createRoleAssignmentRepositoryProvider(entityKey),
      ),
    ];

    return {
      module: RoleModule,
      providers,
      exports: providers,
    };
  }
}
