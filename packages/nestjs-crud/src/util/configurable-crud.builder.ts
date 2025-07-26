import { randomUUID } from 'crypto';

import {
  applyDecorators,
  Inject,
  PlainLiteralObject,
  Type,
} from '@nestjs/common';

import { DeepPartial } from '@concepta/nestjs-common';

import { CrudAdapter } from '../crud/adapters/crud.adapter';
import { CrudBaseController } from '../crud/controllers/crud-base.controller';
import { CrudCreateMany } from '../crud/decorators/actions/crud-create-many.decorator';
import { CrudCreateOne } from '../crud/decorators/actions/crud-create-one.decorator';
import { CrudDeleteOne } from '../crud/decorators/actions/crud-delete-one.decorator';
import { CrudGetMany } from '../crud/decorators/actions/crud-get-many.decorator';
import { CrudGetOne } from '../crud/decorators/actions/crud-get-one.decorator';
import { CrudRecoverOne } from '../crud/decorators/actions/crud-recover-one.decorator';
import { CrudReplaceOne } from '../crud/decorators/actions/crud-replace-one.decorator';
import { CrudUpdateOne } from '../crud/decorators/actions/crud-update-one.decorator';
import { CrudController } from '../crud/decorators/controller/crud-controller.decorator';
import { CrudBody } from '../crud/decorators/params/crud-body.decorator';
import { CrudRequest } from '../crud/decorators/params/crud-request.decorator';
import { CrudCreateManyInterface } from '../crud/interfaces/crud-create-many.interface';
import { CrudRequestInterface } from '../crud/interfaces/crud-request.interface';
import { ConfigurableCrudOptionsTransformer } from '../crud.types';
import { CrudService } from '../services/crud.service';

import { ConfigurableCrudDecorators } from './interfaces/configurable-crud-decorators.interface';
import { ConfigurableCrudHost } from './interfaces/configurable-crud-host.interface';
import { ConfigurableCrudOptions } from './interfaces/configurable-crud-options.interface';

export class ConfigurableCrudBuilder<
  Entity extends PlainLiteralObject,
  Creatable extends DeepPartial<Entity>,
  Updatable extends DeepPartial<Entity>,
  Replaceable extends Creatable = Creatable,
  ExtraOptions extends PlainLiteralObject = PlainLiteralObject,
> {
  private extras: ExtraOptions;
  private optionsTransform: ConfigurableCrudOptionsTransformer<
    Entity,
    ExtraOptions
  >;

  constructor(private options: ConfigurableCrudOptions<Entity>) {
    this.extras = {} as ExtraOptions;
    this.optionsTransform = (options, _extras) => options;
  }

  setExtras(
    extras: ExtraOptions,
    optionsTransform: ConfigurableCrudOptionsTransformer<Entity, ExtraOptions>,
  ): ConfigurableCrudBuilder<
    Entity,
    Creatable,
    Updatable,
    Replaceable,
    ExtraOptions
  > {
    this.extras = extras;
    this.optionsTransform = optionsTransform;
    return this;
  }

  build(): ConfigurableCrudHost<Entity, Creatable, Updatable, Replaceable> {
    const options = this.optionsTransform(this.options, this.extras);
    const decorators = this.generateDecorators(options);
    const ConfigurableServiceClass = this.generateService<Entity>(
      options.service,
    );
    const ConfigurableControllerClass = this.generateClass(options, decorators);

    return {
      ConfigurableServiceProvider: {
        provide: options.service.injectionToken,
        useClass: ConfigurableServiceClass,
      },
      ConfigurableServiceClass,
      ConfigurableControllerClass,
      ...decorators,
    };
  }

  private generateDecorators<O extends ConfigurableCrudOptions<Entity>>(
    options: O,
  ): ConfigurableCrudDecorators {
    const {
      controller,
      getMany,
      getOne,
      createMany,
      createOne,
      updateOne,
      replaceOne,
      deleteOne,
      recoverOne,
    } = options;

    const operationIdPrefix =
      (Array.isArray(options.controller?.path)
        ? options.controller?.path.join()
        : options.controller?.path
      )?.replace(/[^\w]/g, '_') ?? randomUUID();

    return {
      CrudController: applyDecorators(
        CrudController(controller),
        ...(controller?.extraDecorators ?? []),
      ),
      CrudGetMany: applyDecorators(
        CrudGetMany({
          api: { operation: { operationId: `${operationIdPrefix}_getMany` } },
          ...getMany,
        }),
        ...(getMany?.extraDecorators ?? []),
      ),
      CrudGetOne: applyDecorators(
        CrudGetOne({
          api: { operation: { operationId: `${operationIdPrefix}_getOne` } },
          ...getOne,
        }),
        ...(getOne?.extraDecorators ?? []),
      ),
      CrudCreateMany: applyDecorators(
        CrudCreateMany({
          api: {
            operation: { operationId: `${operationIdPrefix}_createMany` },
          },
          ...createMany,
        }),
        ...(createMany?.extraDecorators ?? []),
      ),
      CrudCreateOne: applyDecorators(
        CrudCreateOne({
          api: { operation: { operationId: `${operationIdPrefix}_createOne` } },
          ...createOne,
        }),
        ...(createOne?.extraDecorators ?? []),
      ),
      CrudUpdateOne: applyDecorators(
        CrudUpdateOne({
          api: { operation: { operationId: `${operationIdPrefix}_updateOne` } },
          ...updateOne,
        }),
        ...(updateOne?.extraDecorators ?? []),
      ),
      CrudReplaceOne: applyDecorators(
        CrudReplaceOne({
          api: {
            operation: { operationId: `${operationIdPrefix}_replaceOne` },
          },
          ...replaceOne,
        }),
        ...(replaceOne?.extraDecorators ?? []),
      ),
      CrudDeleteOne: applyDecorators(
        CrudDeleteOne({
          api: { operation: { operationId: `${operationIdPrefix}_deleteOne` } },
          ...deleteOne,
        }),
        ...(deleteOne?.extraDecorators ?? []),
      ),
      CrudRecoverOne: applyDecorators(
        CrudRecoverOne({
          api: {
            operation: { operationId: `${operationIdPrefix}_recoverOne` },
          },
          ...recoverOne,
        }),
        ...(recoverOne?.extraDecorators ?? []),
      ),
    };
  }

  private generateClass<O extends ConfigurableCrudOptions<Entity>>(
    options: O,
    decorators: ConfigurableCrudDecorators,
  ): typeof CrudBaseController<Entity, Creatable, Updatable, Replaceable> {
    const {
      CrudController,
      CrudGetMany,
      CrudGetOne,
      CrudCreateMany,
      CrudCreateOne,
      CrudUpdateOne,
      CrudReplaceOne,
      CrudDeleteOne,
      CrudRecoverOne,
    } = decorators;

    class InternalCrudClass extends CrudBaseController<
      Entity,
      Creatable,
      Updatable,
      Replaceable
    > {
      constructor(
        @Inject(options.service.injectionToken)
        protected crudService: CrudService<Entity>,
      ) {
        super(crudService);
      }
    }

    if (options?.getMany) {
      InternalCrudClass.prototype.getMany = async function (
        this: InternalCrudClass,
        crudRequest: CrudRequestInterface<Entity>,
      ) {
        return this.crudService.getMany(crudRequest);
      };

      CrudGetMany(
        InternalCrudClass.prototype,
        'getMany',
        Object.getOwnPropertyDescriptor(InternalCrudClass.prototype, 'getMany'),
      );
      CrudRequest()(InternalCrudClass.prototype, 'getMany', 0);
    }

    if (options?.getOne) {
      InternalCrudClass.prototype.getOne = async function (
        this: InternalCrudClass,
        crudRequest: CrudRequestInterface<Entity>,
      ) {
        return this.crudService.getOne(crudRequest);
      };

      CrudGetOne(
        InternalCrudClass.prototype,
        'getOne',
        Object.getOwnPropertyDescriptor(InternalCrudClass.prototype, 'getOne'),
      );
      CrudRequest()(InternalCrudClass.prototype, 'getOne', 0);
    }

    if (options?.createMany) {
      InternalCrudClass.prototype.createMany = async function (
        this: InternalCrudClass,
        crudRequest: CrudRequestInterface<Entity>,
        createManyDto: CrudCreateManyInterface<Creatable>,
      ) {
        return this.crudService.createMany(crudRequest, {
          ...createManyDto,
          // TODO: this cast is a temporary workaround
          bulk: createManyDto.bulk as (Entity | Partial<Entity>)[],
        });
      };

      CrudCreateMany(
        InternalCrudClass.prototype,
        'createMany',
        Object.getOwnPropertyDescriptor(
          InternalCrudClass.prototype,
          'createMany',
        ),
      );
      CrudRequest()(InternalCrudClass.prototype, 'createMany', 0);
      CrudBody()(InternalCrudClass.prototype, 'createMany', 1);
    }

    if (options?.createOne) {
      InternalCrudClass.prototype.createOne = async function (
        this: InternalCrudClass,
        crudRequest: CrudRequestInterface<Entity>,
        createDto: Creatable,
      ) {
        return this.crudService.createOne(
          crudRequest,
          // TODO: this cast is a temporary workaround
          createDto as Entity | Partial<Entity>,
        );
      };

      CrudCreateOne(
        InternalCrudClass.prototype,
        'createOne',
        Object.getOwnPropertyDescriptor(
          InternalCrudClass.prototype,
          'createOne',
        ),
      );
      CrudRequest()(InternalCrudClass.prototype, 'createOne', 0);
      CrudBody()(InternalCrudClass.prototype, 'createOne', 1);
    }

    if (options?.updateOne) {
      InternalCrudClass.prototype.updateOne = async function (
        this: InternalCrudClass,
        crudRequest: CrudRequestInterface<Entity>,
        updateDto: Updatable,
      ) {
        return this.crudService.updateOne(
          crudRequest,
          // TODO: this cast is a temporary workaround
          updateDto as Entity | Partial<Entity>,
        );
      };

      CrudUpdateOne(
        InternalCrudClass.prototype,
        'updateOne',
        Object.getOwnPropertyDescriptor(
          InternalCrudClass.prototype,
          'updateOne',
        ),
      );
      CrudRequest()(InternalCrudClass.prototype, 'updateOne', 0);
      CrudBody()(InternalCrudClass.prototype, 'updateOne', 1);
    }

    if (options?.replaceOne) {
      InternalCrudClass.prototype.replaceOne = async function (
        this: InternalCrudClass,
        crudRequest: CrudRequestInterface<Entity>,
        replaceDto: Replaceable,
      ) {
        return this.crudService.replaceOne(
          crudRequest,
          // TODO: this cast is a temporary workaround
          replaceDto as Entity | Partial<Entity>,
        );
      };

      CrudReplaceOne(
        InternalCrudClass.prototype,
        'replaceOne',
        Object.getOwnPropertyDescriptor(
          InternalCrudClass.prototype,
          'replaceOne',
        ),
      );
      CrudRequest()(InternalCrudClass.prototype, 'replaceOne', 0);
      CrudBody()(InternalCrudClass.prototype, 'replaceOne', 1);
    }

    if (options?.deleteOne) {
      InternalCrudClass.prototype.deleteOne = async function (
        this: InternalCrudClass,
        crudRequest: CrudRequestInterface<Entity>,
      ) {
        return this.crudService.deleteOne(crudRequest);
      };

      CrudDeleteOne(
        InternalCrudClass.prototype,
        'deleteOne',
        Object.getOwnPropertyDescriptor(
          InternalCrudClass.prototype,
          'deleteOne',
        ),
      );
      CrudRequest()(InternalCrudClass.prototype, 'deleteOne', 0);
    }

    if (options?.recoverOne) {
      InternalCrudClass.prototype.recoverOne = async function (
        this: InternalCrudClass,
        crudRequest: CrudRequestInterface<Entity>,
      ) {
        return this.crudService.recoverOne(crudRequest);
      };

      CrudRecoverOne(
        InternalCrudClass.prototype,
        'recoverOne',
        Object.getOwnPropertyDescriptor(
          InternalCrudClass.prototype,
          'recoverOne',
        ),
      );
      CrudRequest()(InternalCrudClass.prototype, 'recoverOne', 0);
    }

    CrudController(InternalCrudClass);

    return InternalCrudClass;
  }

  private generateService<Entity extends PlainLiteralObject>(
    options: ConfigurableCrudOptions<Entity>['service'],
  ): Type<CrudService<Entity>> {
    const { adapter } = options;

    class InternalServiceClass extends CrudService<Entity> {
      constructor(
        @Inject(adapter)
        protected readonly crudAdapter: CrudAdapter<Entity>,
      ) {
        super(crudAdapter);
      }
    }

    return InternalServiceClass;
  }
}
