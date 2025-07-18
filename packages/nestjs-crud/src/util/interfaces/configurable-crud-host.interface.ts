import { ClassProvider, PlainLiteralObject, Type } from '@nestjs/common';

import { DeepPartial } from '@concepta/nestjs-common';

import { CrudBaseController } from '../../crud/controllers/crud-base.controller';
import { CrudService } from '../../services/crud.service';

import { ConfigurableCrudDecorators } from './configurable-crud-decorators.interface';

export interface ConfigurableCrudHost<
  Entity extends PlainLiteralObject,
  Creatable extends DeepPartial<Entity>,
  Updatable extends DeepPartial<Entity>,
  Replaceable extends Creatable = Creatable,
> extends ConfigurableCrudDecorators {
  ConfigurableControllerClass: typeof CrudBaseController<
    Entity,
    Creatable,
    Updatable,
    Replaceable
  >;
  ConfigurableServiceClass: Type<CrudService<Entity>>;
  ConfigurableServiceProvider: ClassProvider;
}
