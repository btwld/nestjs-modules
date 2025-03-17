import { DeepPartial, ObjectLiteral } from 'typeorm';
import { AdditionalCrudMethodArgs } from '../crud.types';
import { CrudMethodNotImplementedException } from '../exceptions/crud-method-not-implemented.exception';
import { CrudControllerInterface } from '../interfaces/crud-controller.interface';
import { CrudRequestInterface } from '../interfaces/crud-request.interface';
import { CrudCreateManyInterface } from '../interfaces/crud-create-many.interface';
import { CrudResponsePaginatedInterface } from '../interfaces/crud-response-paginated.interface';
import { TypeOrmCrudService } from '../services/typeorm-crud.service';

export class CrudBaseController<
  Entity extends ObjectLiteral,
  Creatable extends DeepPartial<Entity>,
  Updatable extends DeepPartial<Entity>,
  Replaceable extends Creatable = Creatable,
> implements CrudControllerInterface<Entity, Creatable, Updatable, Replaceable>
{
  constructor(protected crudService: TypeOrmCrudService<Entity>) {}

  getMany(
    _crudRequest: CrudRequestInterface,
    ..._rest: AdditionalCrudMethodArgs
  ): Promise<CrudResponsePaginatedInterface<Entity> | Entity[]> {
    throw new CrudMethodNotImplementedException(this, this.getMany);
  }

  getOne(
    _crudRequest: CrudRequestInterface,
    ..._rest: AdditionalCrudMethodArgs
  ): Promise<Entity> {
    throw new CrudMethodNotImplementedException(this, this.getOne);
  }

  createOne(
    _crudRequest: CrudRequestInterface,
    _dto: Creatable,
    ..._rest: AdditionalCrudMethodArgs
  ): Promise<Entity> {
    throw new CrudMethodNotImplementedException(this, this.createOne);
  }

  createMany(
    _crudRequest: CrudRequestInterface,
    _dto: CrudCreateManyInterface<Creatable>,
    ..._rest: AdditionalCrudMethodArgs
  ): Promise<Entity[]> {
    throw new CrudMethodNotImplementedException(this, this.createMany);
  }

  updateOne(
    _crudRequest: CrudRequestInterface,
    _dto: Updatable,
    ..._rest: AdditionalCrudMethodArgs
  ): Promise<Entity> {
    throw new CrudMethodNotImplementedException(this, this.updateOne);
  }

  replaceOne(
    _crudRequest: CrudRequestInterface,
    _dto: Replaceable,
    ..._rest: AdditionalCrudMethodArgs
  ): Promise<Entity> {
    throw new CrudMethodNotImplementedException(this, this.replaceOne);
  }

  deleteOne(
    _crudRequest: CrudRequestInterface,
    ..._rest: AdditionalCrudMethodArgs
  ): Promise<Entity | void> {
    throw new CrudMethodNotImplementedException(this, this.deleteOne);
  }

  recoverOne(
    _crudRequest: CrudRequestInterface,
    ..._rest: AdditionalCrudMethodArgs
  ): Promise<Entity> {
    throw new CrudMethodNotImplementedException(this, this.recoverOne);
  }
}
