import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RepositoryModule } from '@concepta/nestjs-repository';

import { ormConfig } from '../config/ormconfig.fixture.js';

import { TestModuleFixture } from './test.module.fixture.js';

@Module({
  imports: [
    TypeOrmModule.forRoot(ormConfig),
    RepositoryModule.forRoot({}),
    TestModuleFixture,
  ],
})
export class AppModuleFixture {}
