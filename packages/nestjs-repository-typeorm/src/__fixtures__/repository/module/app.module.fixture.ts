import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RepositoryModule } from '@concepta/nestjs-repository';

import { TypeOrmRepositoryModule } from '../../../typeorm-repository.module.js';
import { ormConfig } from '../config/ormconfig.fixture.js';
import { TEST_ENTITY_TOKEN } from '../config/test.constants.fixture.js';
import { TestEntityFixture } from '../entity/test.entity.fixture.js';

@Module({
  imports: [
    TypeOrmModule.forRoot(ormConfig),
    RepositoryModule.forRoot({
      drivers: [
        {
          driver: TypeOrmRepositoryModule,
          entities: [{ key: TEST_ENTITY_TOKEN, entity: TestEntityFixture }],
        },
      ],
    }),
  ],
})
export class AppModuleFixture {}
