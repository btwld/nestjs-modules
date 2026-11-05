import { Test, type TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  getDynamicRepositoryToken,
  RepositoryModule,
  type RepositoryInterface,
} from '@concepta/nestjs-repository';

import { BadgeHolderEntityFixture } from '../../__fixtures__/repository/entity/badge-holder.entity.fixture.js';
import { BadgeEntityFixture } from '../../__fixtures__/repository/entity/badge.entity.fixture.js';
import { RibbonEntityFixture } from '../../__fixtures__/repository/entity/ribbon.entity.fixture.js';
import { TypeOrmSqliteRepositoryModule } from '../../sqlite/typeorm-sqlite-repository.module.js';

describe('TypeOrmRepository and eager relations', () => {
  let moduleFixture: TestingModule;
  let holders: RepositoryInterface<BadgeHolderEntityFixture>;
  let badges: RepositoryInterface<BadgeEntityFixture>;
  let ribbons: RepositoryInterface<RibbonEntityFixture>;

  beforeEach(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          synchronize: true,
          entities: [
            BadgeHolderEntityFixture,
            BadgeEntityFixture,
            RibbonEntityFixture,
          ],
        }),
        RepositoryModule.forRoot({
          drivers: [
            {
              driver: TypeOrmSqliteRepositoryModule,
              entities: [
                {
                  key: 'holders',
                  entity: BadgeHolderEntityFixture,
                  allowEagerRelations: true,
                },
                { key: 'badges', entity: BadgeEntityFixture },
                {
                  key: 'ribbons',
                  entity: RibbonEntityFixture,
                  allowEagerRelations: true,
                },
              ],
            },
          ],
        }),
      ],
    }).compile();
    holders = moduleFixture.get(getDynamicRepositoryToken('holders'));
    badges = moduleFixture.get(getDynamicRepositoryToken('badges'));
    ribbons = moduleFixture.get(getDynamicRepositoryToken('ribbons'));
  });

  afterEach(async () => {
    await moduleFixture.close();
  });

  it('returns an eager relation with only its own columns, not what its class initializes', async () => {
    const badge = await badges.create({ label: 'gold', parentId: null });
    await holders.create({ name: 'Ada', badgeId: badge.id });

    const [holder] = await holders.find();

    expect({ ...holder?.badge }).toEqual({ ...badge });
  });

  it('still hands on an eager relation TypeORM loads inside one, which the result check refuses', async () => {
    const badge = await badges.create({ label: 'gold', parentId: null });
    const holder = await holders.create({ name: 'Ada', badgeId: badge.id });
    await ribbons.create({ name: 'blue', holderId: holder.id });

    await expect(ribbons.find()).rejects.toThrow(
      'properties nothing asked for: holder.badge',
    );
  });
});
