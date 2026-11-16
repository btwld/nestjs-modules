import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CoreModule } from '@concepta/nestjs-core';
import { RepositoryModule } from '@concepta/nestjs-repository';
import { CaslAuthority } from '@concepta/nestjs-repository/optional/casl';
import { TypeOrmSqliteRepositoryModule } from '@concepta/nestjs-repository-typeorm/sqlite';

import { DemoActorGuard } from '../shared/demo-actor.guard.js';

import { DocumentEntity } from './document.entity.js';
import { DocumentController, RulesController } from './rules.controller.js';
import { StoredRuleEntity } from './stored-rule.entity.js';
import { DOCUMENT, RULE, StoredRules } from './stored-rules.js';

const GOVERNED = { access: 'governed', authority: CaslAuthority } as const;

/** The authority, reading its rules from the `stored_rule` table. */
@Module({
  imports: [RepositoryModule.forFeature([RULE])],
  providers: [
    StoredRules,
    {
      provide: CaslAuthority,
      inject: [StoredRules],
      useFactory: (rules: StoredRules) => new CaslAuthority(rules),
    },
  ],
  exports: [CaslAuthority],
})
export class StoredAuthorityModule {}

@Module({
  imports: [
    CoreModule.forRoot({}),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: ':memory:',
      synchronize: true,
      entities: [DocumentEntity, StoredRuleEntity],
    }),
    RepositoryModule.forRoot({
      imports: [StoredAuthorityModule],
      authority: { required: true },
      adapters: [
        {
          adapter: TypeOrmSqliteRepositoryModule,
          entities: [
            { key: DOCUMENT, entity: DocumentEntity, authority: GOVERNED },
            { key: RULE, entity: StoredRuleEntity, authority: GOVERNED },
          ],
        },
      ],
    }),
    RepositoryModule.forFeature([DOCUMENT, RULE]),
    // The rules controller checks a rule against the authority before
    // saving it.
    StoredAuthorityModule,
  ],
  controllers: [DocumentController, RulesController],
  providers: [{ provide: APP_GUARD, useClass: DemoActorGuard }],
})
export class RulesFromStorageModule {}
