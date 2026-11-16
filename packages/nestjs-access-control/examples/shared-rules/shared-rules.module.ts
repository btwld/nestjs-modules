import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccessControlModule } from '@concepta/nestjs-access-control';
import { CoreModule } from '@concepta/nestjs-core';
import { RepositoryModule } from '@concepta/nestjs-repository';
import { CaslAuthority } from '@concepta/nestjs-repository/optional/casl';
import { TypeOrmSqliteRepositoryModule } from '@concepta/nestjs-repository-typeorm/sqlite';

import { DemoAuthGuard } from '../shared/demo-auth.guard.js';
import { demoRequestOf } from '../shared/demo-request.util.js';

import { InvoiceController } from './invoice.controller.js';
import { InvoiceEntity } from './invoice.entity.js';
import {
  InvoiceAuthorityModule,
  INVOICE,
  ROUTE_GRANTS,
  USER_ROLES,
} from './invoice.rules.js';

@Module({
  imports: [
    CoreModule.forRoot({}),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: ':memory:',
      synchronize: true,
      entities: [InvoiceEntity],
    }),
    // The data: every repository call decided by the shared authority.
    RepositoryModule.forRoot({
      imports: [InvoiceAuthorityModule],
      authority: { required: true },
      adapters: [
        {
          driver: TypeOrmSqliteRepositoryModule,
          entities: [
            {
              key: INVOICE,
              entity: InvoiceEntity,
              authority: { access: 'governed', authority: CaslAuthority },
            },
          ],
        },
      ],
    }),
    RepositoryModule.forFeature([INVOICE]),
    // The routes: decided by the same authority, narrowed by ROUTE_GRANTS.
    AccessControlModule.forRootAsync({
      imports: [InvoiceAuthorityModule],
      inject: [CaslAuthority],
      useFactory: (authority: CaslAuthority) => ({
        authority: { authority },
        settings: { grants: ROUTE_GRANTS },
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
    }),
  ],
  controllers: [InvoiceController],
  providers: [{ provide: APP_GUARD, useClass: DemoAuthGuard }],
})
export class SharedRulesModule {}
