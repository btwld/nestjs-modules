import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CrudModule } from '../crud.module';

import { default as ormConfig } from './ormconfig.fixture';
import { PhotoCcbCustomModuleFixture } from './photo-ccb-custom/photo-ccb-custom.module.fixture';

@Module({
  imports: [
    TypeOrmModule.forRoot(ormConfig),
    CrudModule.forRoot({}),
    PhotoCcbCustomModuleFixture,
  ],
})
export class AppCcbCustomModuleFixture {}
