import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  ConfigurableCrudOptions,
  ConfigurableCrudOptionsTransformer,
  CrudModule,
} from '@concepta/nestjs-crud';
import { EventModule } from '@concepta/nestjs-event';
import { TypeOrmExtModule } from '@concepta/nestjs-typeorm-ext';

import { USER_MODULE_USER_PROFILE_ENTITY_KEY } from '../user.constants';
import { UserProfileCrudBuilder } from '../utils/user-profile.crud-builder';

import { UserProfileCreateDtoFixture } from './dto/user-profile-create.dto.fixture';
import { UserProfileUpdateDtoFixture } from './dto/user-profile-update.dto.fixture';
import { UserProfileDtoFixture } from './dto/user-profile.dto.fixture';
import { ormConfig } from './ormconfig.fixture';
import { UserCrudModelServiceFixture } from './services/user-crud-model.service.fixture';
import { UserProfileTypeOrmCrudAdapterFixture } from './services/user-profile-typeorm-crud.adapter.fixture';
import { USER_PROFILE_CRUD_OPTIONS_DEFAULT } from './user-constants.fixtures';
import { UserProfileEntityFixture } from './user-profile.entity.fixture';

type UserProfileExtras = {
  model: {
    type: typeof UserProfileDtoFixture;
  };
  createOne: {
    dto: typeof UserProfileCreateDtoFixture;
  };
  updateOne: {
    dto: typeof UserProfileUpdateDtoFixture;
  };
};

const extras: UserProfileExtras = {
  model: {
    type: UserProfileDtoFixture,
  },
  createOne: {
    dto: UserProfileCreateDtoFixture,
  },
  updateOne: {
    dto: UserProfileUpdateDtoFixture,
  },
};

// update config to use new dto
const myOptionsTransform: ConfigurableCrudOptionsTransformer<
  UserProfileEntityFixture,
  UserProfileExtras
> = (
  options: ConfigurableCrudOptions<UserProfileEntityFixture>,
  extras?: UserProfileExtras,
): ConfigurableCrudOptions<UserProfileEntityFixture> => {
  if (!extras) return options;

  options.controller.model.type = extras.model.type;
  options.service.adapter =
    UserProfileTypeOrmCrudAdapterFixture<UserProfileEntityFixture>;
  if (options.createOne) options.createOne.dto = extras.createOne.dto;
  if (options.updateOne) options.updateOne.dto = extras.updateOne.dto;
  return options;
};

// define profile with custom dtos
const userProfileCrudBuilder = new UserProfileCrudBuilder<
  UserProfileEntityFixture,
  UserProfileCreateDtoFixture,
  UserProfileUpdateDtoFixture,
  UserProfileCreateDtoFixture,
  UserProfileExtras
>(USER_PROFILE_CRUD_OPTIONS_DEFAULT);
userProfileCrudBuilder.setExtras(extras, myOptionsTransform);

const { ConfigurableControllerClass, ConfigurableServiceProvider } =
  userProfileCrudBuilder.build();

@Global()
@Module({
  imports: [
    TypeOrmModule.forRoot(ormConfig),
    TypeOrmExtModule.forFeature({
      [USER_MODULE_USER_PROFILE_ENTITY_KEY]: {
        entity: UserProfileEntityFixture,
      },
    }),
    CrudModule.forRoot({}),
    EventModule.forRoot({}),
  ],
  providers: [
    UserProfileTypeOrmCrudAdapterFixture,
    UserCrudModelServiceFixture,
    ConfigurableServiceProvider,
  ],
  exports: [UserCrudModelServiceFixture, ConfigurableServiceProvider],
  controllers: [ConfigurableControllerClass],
})
export class AppModuleUserProfileFixture {}
