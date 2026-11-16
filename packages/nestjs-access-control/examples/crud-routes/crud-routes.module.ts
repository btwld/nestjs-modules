import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  AccessControlModule,
  AccessControlService,
} from '@concepta/nestjs-access-control';
import { AccessControlCrudPolicy } from '@concepta/nestjs-access-control/optional/crud';
import { CoreModule } from '@concepta/nestjs-core';
import { CrudModule } from '@concepta/nestjs-crud';
import { RepositoryModule } from '@concepta/nestjs-repository';
import { TypeOrmSqliteRepositoryModule } from '@concepta/nestjs-repository-typeorm/sqlite';

import { DemoAuthGuard } from '../shared/demo-auth.guard.js';
import { demoRequestOf } from '../shared/demo-request.util.js';

import {
  controllers,
  INVOICE,
  INVOICE_GRANTS,
  providers,
  USER_ROLES,
} from './invoice.crud.js';
import { InvoiceEntity } from './invoice.entity.js';

@Module({
  imports: [RepositoryModule.forFeature([INVOICE])],
  controllers: Object.values(controllers),
  providers,
})
class InvoiceCrudModule {}

@Module({
  imports: [
    CoreModule.forRoot({}),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: ':memory:',
      synchronize: true,
      entities: [InvoiceEntity],
    }),
    RepositoryModule.forRoot({
      adapters: [
        {
          adapter: TypeOrmSqliteRepositoryModule,
          entities: [{ key: INVOICE, entity: InvoiceEntity }],
        },
      ],
    }),
    AccessControlModule.forRoot({
      settings: { grants: INVOICE_GRANTS },
      actorResolver: {
        actorFor: async (_ctx, context) => {
          const user = demoRequestOf(context)?.user;

          return user
            ? {
                kind: 'role',
                roles: USER_ROLES[user.id] ?? [],
                userId: user.id,
              }
            : undefined;
        },
      },
    }),
    // Every generated route's query and body, checked under its grant.
    CrudModule.forRootAsync({
      inject: [AccessControlService],
      useFactory: (accessControl: AccessControlService) => ({
        requestPolicy: new AccessControlCrudPolicy(accessControl),
      }),
    }),
    InvoiceCrudModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: DemoAuthGuard }],
})
export class CrudRoutesModule {}
