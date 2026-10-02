import { type DataSourceOptions } from 'typeorm';

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RepositoryModule } from '@concepta/nestjs-repository';

import { TypeOrmRepositoryModule } from '../../typeorm-repository.module.js';

import { CurrencyEntityFixture } from './currency.entity.fixture.js';
import { DocRowScopeFixture } from './doc-row-scope.fixture.js';
import { DocEntityFixture } from './doc.entity.fixture.js';
import { OrderLineRowScopeFixture } from './order-line-row-scope.fixture.js';
import { OrderLineEntityFixture } from './order-line.entity.fixture.js';
import { OrderEntityFixture } from './order.entity.fixture.js';
import { ProfileRowScopeFixture } from './profile-row-scope.fixture.js';
import { ProfileEntityFixture } from './profile.entity.fixture.js';
import {
  ROW_SCOPE_CURRENCY_TOKEN,
  ROW_SCOPE_DOC_TOKEN,
  ROW_SCOPE_PROFILE_TOKEN,
  ROW_SCOPE_ORDER_LINE_TOKEN,
  ROW_SCOPE_ORDER_TOKEN,
} from './row-scope.constants.fixture.js';
import { TenantRowScopeFixture } from './tenant-row-scope.fixture.js';

export {
  ROW_SCOPE_ORDER_TOKEN,
  ROW_SCOPE_ORDER_LINE_TOKEN,
  ROW_SCOPE_CURRENCY_TOKEN,
  ROW_SCOPE_DOC_TOKEN,
  ROW_SCOPE_PROFILE_TOKEN,
};

export const rowScopeOrmConfig: DataSourceOptions = {
  type: 'sqlite',
  database: ':memory:',
  synchronize: true,
  entities: [
    OrderEntityFixture,
    OrderLineEntityFixture,
    CurrencyEntityFixture,
    DocEntityFixture,
    ProfileEntityFixture,
  ],
};

@Module({
  providers: [
    TenantRowScopeFixture,
    OrderLineRowScopeFixture,
    DocRowScopeFixture,
    ProfileRowScopeFixture,
  ],
  exports: [
    TenantRowScopeFixture,
    OrderLineRowScopeFixture,
    DocRowScopeFixture,
    ProfileRowScopeFixture,
  ],
})
export class TenantRowScopeModuleFixture {}

@Module({
  imports: [
    TenantRowScopeModuleFixture,
    RepositoryModule.forFeature({
      module: TypeOrmRepositoryModule,
      // The resolvers are bound inside the module forFeature returns, so that
      // module needs to be able to resolve them.
      imports: [TenantRowScopeModuleFixture],
      entities: [
        {
          key: ROW_SCOPE_ORDER_TOKEN,
          entity: OrderEntityFixture,
          rowScope: { access: 'scoped', resolver: TenantRowScopeFixture },
        },
        {
          key: ROW_SCOPE_ORDER_LINE_TOKEN,
          entity: OrderLineEntityFixture,
          rowScope: { access: 'scoped', resolver: OrderLineRowScopeFixture },
        },
        {
          key: ROW_SCOPE_DOC_TOKEN,
          entity: DocEntityFixture,
          rowScope: { access: 'scoped', resolver: DocRowScopeFixture },
        },
        {
          key: ROW_SCOPE_PROFILE_TOKEN,
          entity: ProfileEntityFixture,
          rowScope: { access: 'scoped', resolver: ProfileRowScopeFixture },
        },
        {
          key: ROW_SCOPE_CURRENCY_TOKEN,
          entity: CurrencyEntityFixture,
          rowScope: {
            access: 'public',
            reason: 'shared reference data, not tenant-owned',
          },
        },
      ],
    }),
  ],
})
export class RowScopeFeatureModuleFixture {}

@Module({
  imports: [
    TypeOrmModule.forRoot(rowScopeOrmConfig),
    RepositoryModule.forRoot({}),
    RowScopeFeatureModuleFixture,
  ],
})
export class RowScopeAppModuleFixture {}
