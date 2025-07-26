import { PlainLiteralObject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import {
  AccessControlCreateOne,
  AccessControlDeleteOne,
  AccessControlReadMany,
  AccessControlReadOne,
  AccessControlRecoverOne,
  AccessControlReplaceOne,
  AccessControlUpdateOne,
} from '@concepta/nestjs-access-control';
import {
  DeepPartial,
  OrgProfileCreatableInterface,
  OrgProfileEntityInterface,
} from '@concepta/nestjs-common';
import {
  ConfigurableCrudBuilder,
  ConfigurableCrudOptions,
} from '@concepta/nestjs-crud';

import { OrgProfileCreateDto } from '../dto/profile/org-profile-create.dto';
import { OrgProfilePaginatedDto } from '../dto/profile/org-profile-paginated.dto';
import { OrgProfileUpdateDto } from '../dto/profile/org-profile-update.dto';
import { OrgProfileDto } from '../dto/profile/org-profile.dto';
import { ORG_MODULE_CONFIGURABLE_CRUD_PROFILE_SERVICE_TOKEN } from '../org.constants';
import { OrgProfileResource } from '../org.types';

import { OrgProfileTypeOrmCrudAdapter } from '../__fixtures__/org-profile-typeorm-crud.adapter';

export class OrgProfileCrudBuilder<
  Entity extends OrgProfileEntityInterface = OrgProfileEntityInterface,
  Creatable extends DeepPartial<Entity> &
    OrgProfileCreatableInterface = DeepPartial<Entity> &
    OrgProfileCreatableInterface,
  Updatable extends DeepPartial<Entity> = DeepPartial<Entity>,
  Replaceable extends Creatable = Creatable,
  ExtraOptions extends PlainLiteralObject = PlainLiteralObject,
> extends ConfigurableCrudBuilder<
  Entity,
  Creatable,
  Updatable,
  Replaceable,
  ExtraOptions
> {
  constructor(
    options: ConfigurableCrudOptions<Entity> = {
      service: {
        adapter: OrgProfileTypeOrmCrudAdapter<Entity>,
        injectionToken: ORG_MODULE_CONFIGURABLE_CRUD_PROFILE_SERVICE_TOKEN,
      },
      controller: {
        path: 'org-profile',
        model: {
          type: OrgProfileDto,
          paginatedType: OrgProfilePaginatedDto,
        },
        extraDecorators: [ApiTags('org-profile')],
      },
      getMany: {
        extraDecorators: [AccessControlReadMany(OrgProfileResource.Many)],
      },
      getOne: {
        extraDecorators: [AccessControlReadOne(OrgProfileResource.One)],
      },
      createOne: {
        dto: OrgProfileCreateDto,
        extraDecorators: [AccessControlCreateOne(OrgProfileResource.One)],
      },
      updateOne: {
        dto: OrgProfileUpdateDto,
        extraDecorators: [AccessControlUpdateOne(OrgProfileResource.One)],
      },
      replaceOne: {
        dto: OrgProfileUpdateDto,
        extraDecorators: [AccessControlReplaceOne(OrgProfileResource.One)],
      },
      deleteOne: {
        extraDecorators: [AccessControlDeleteOne(OrgProfileResource.One)],
      },
      recoverOne: {
        path: 'recover/:id',
        extraDecorators: [AccessControlRecoverOne(OrgProfileResource.One)],
      },
    },
  ) {
    super(options);
  }
}
