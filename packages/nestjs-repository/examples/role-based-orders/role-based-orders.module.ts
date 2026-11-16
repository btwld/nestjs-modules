import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CoreModule } from '@concepta/nestjs-core';
import { RepositoryModule } from '@concepta/nestjs-repository';
import { CaslAuthority } from '@concepta/nestjs-repository/optional/casl';
import { TypeOrmSqliteRepositoryModule } from '@concepta/nestjs-repository-typeorm/sqlite';

import { DemoActorGuard } from '../shared/demo-actor.guard.js';

import { BillingSyncJob } from './billing-sync.job.js';
import { OrderController } from './order.controller.js';
import { OrderEntity } from './order.entity.js';
import { ORDER, OrderRules } from './order.rules.js';

/** The authority, built from the application's rules. */
@Module({
  providers: [
    OrderRules,
    {
      provide: CaslAuthority,
      inject: [OrderRules],
      useFactory: (rules: OrderRules) => new CaslAuthority(rules),
    },
  ],
  exports: [CaslAuthority],
})
export class OrderAuthorityModule {}

@Module({
  imports: [
    CoreModule.forRoot({}),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: ':memory:',
      synchronize: true,
      entities: [OrderEntity],
    }),
    RepositoryModule.forRoot({
      imports: [OrderAuthorityModule],
      authority: { required: true },
      adapters: [
        {
          adapter: TypeOrmSqliteRepositoryModule,
          entities: [
            {
              key: ORDER,
              entity: OrderEntity,
              authority: { access: 'governed', authority: CaslAuthority },
            },
          ],
        },
      ],
    }),
    RepositoryModule.forFeature([ORDER]),
  ],
  controllers: [OrderController],
  providers: [BillingSyncJob, { provide: APP_GUARD, useClass: DemoActorGuard }],
})
export class RoleBasedOrdersModule {}
