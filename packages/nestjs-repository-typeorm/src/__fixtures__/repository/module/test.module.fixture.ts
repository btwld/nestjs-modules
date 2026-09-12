import { Module } from '@nestjs/common';

import { RepositoryModule } from '@concepta/nestjs-repository';

import { TypeOrmRepositoryModule } from '../../../typeorm-repository.module.js';
import { TEST_ENTITY_TOKEN } from '../config/test.constants.fixture.js';
import { TestEntityFixture } from '../entity/test.entity.fixture.js';

@Module({
  imports: [
    RepositoryModule.forFeature({
      module: TypeOrmRepositoryModule,
      entities: [{ key: TEST_ENTITY_TOKEN, entity: TestEntityFixture }],
    }),
  ],
})
export class TestModuleFixture {}
