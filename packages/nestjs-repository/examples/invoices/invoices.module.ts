import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CoreModule } from '@concepta/nestjs-core';
import { RepositoryModule } from '@concepta/nestjs-repository';
import { CaslAuthority } from '@concepta/nestjs-repository/optional/casl';
import { TypeOrmSqliteRepositoryModule } from '@concepta/nestjs-repository-typeorm/sqlite';

import { DemoActorGuard } from '../shared/demo-actor.guard.js';

import { InvoiceController } from './invoice.controller.js';
import {
  CustomerEntity,
  InvoiceEntity,
  InvoiceLineEntity,
} from './invoice.entities.js';
import {
  CUSTOMER,
  INVOICE,
  INVOICE_LINE,
  InvoiceRules,
  TenantRowScope,
} from './invoice.rules.js';

const GOVERNED = { access: 'governed', authority: CaslAuthority } as const;
const TENANT = { access: 'scoped', resolver: TenantRowScope } as const;

@Module({
  providers: [
    InvoiceRules,
    TenantRowScope,
    {
      provide: CaslAuthority,
      inject: [InvoiceRules],
      useFactory: (rules: InvoiceRules) => new CaslAuthority(rules),
    },
  ],
  exports: [CaslAuthority, TenantRowScope],
})
export class InvoiceAuthorityModule {}

@Module({
  imports: [
    CoreModule.forRoot({}),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: ':memory:',
      synchronize: true,
      entities: [CustomerEntity, InvoiceEntity, InvoiceLineEntity],
    }),
    RepositoryModule.forRoot({
      imports: [InvoiceAuthorityModule],
      drivers: [
        {
          driver: TypeOrmSqliteRepositoryModule,
          entities: [
            { key: CUSTOMER, entity: CustomerEntity, authority: GOVERNED },
            {
              key: INVOICE,
              entity: InvoiceEntity,
              authority: GOVERNED,
              rowScope: TENANT,
              relations: { lines: { cascade: true } },
            },
            {
              key: INVOICE_LINE,
              entity: InvoiceLineEntity,
              authority: GOVERNED,
              rowScope: TENANT,
            },
          ],
        },
      ],
    }),
    RepositoryModule.forFeature([CUSTOMER, INVOICE]),
  ],
  controllers: [InvoiceController],
  providers: [{ provide: APP_GUARD, useClass: DemoActorGuard }],
})
export class InvoicesModule {}
