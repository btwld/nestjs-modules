import { Injectable, PlainLiteralObject } from '@nestjs/common';

import { CrudAdapter } from '../crud/adapters/crud.adapter';
import { CrudRequestInterface } from '../crud/interfaces/crud-request.interface';
import { CrudResponsePaginatedInterface } from '../crud/interfaces/crud-response-paginated.interface';
import { CrudServiceQueryOptionsInterface } from '../crud/interfaces/crud-service-query-options.interface';
import { CrudQueryException } from '../exceptions/crud-query.exception';

import { CrudQueryHelper } from './helpers/crud-query.helper';

// TODO: TYPEORM - review what to do
@Injectable()
export class CrudService<Entity extends PlainLiteralObject> {
  constructor(protected crudAdapter: CrudAdapter<Entity>) {}

  protected readonly crudQueryHelper: CrudQueryHelper<Entity> =
    new CrudQueryHelper();

  async getMany(
    req: CrudRequestInterface<Entity>,
    queryOptions?: CrudServiceQueryOptionsInterface<Entity>,
  ): Promise<Entity[] | CrudResponsePaginatedInterface<Entity>> {
    // apply options
    this.crudQueryHelper.modifyRequest(req, queryOptions);

    // the result
    let result;

    // get parent result
    try {
      result = await this.crudAdapter.getMany(req);
    } catch (e) {
      throw new CrudQueryException(this.crudAdapter.entityName(), {
        originalError: e,
      });
    }

    // is an array?
    if (Array.isArray(result)) {
      // yes, just return
      return result;
    } else {
      // not an array, return as is
      return result;
    }
  }

  async getOne(
    req: CrudRequestInterface<Entity>,
    queryOptions?: CrudServiceQueryOptionsInterface<Entity>,
  ): ReturnType<CrudAdapter<Entity>['getOne']> {
    // apply options
    this.crudQueryHelper.modifyRequest(req, queryOptions);
    // return parent result
    try {
      return this.crudAdapter.getOne(req);
    } catch (e) {
      throw new CrudQueryException(this.crudAdapter.entityName(), {
        originalError: e,
      });
    }
  }

  async createMany(
    req: CrudRequestInterface<Entity>,
    dto: Parameters<CrudAdapter<Entity>['createMany']>[1],
    queryOptions?: CrudServiceQueryOptionsInterface<Entity>,
  ): ReturnType<CrudAdapter<Entity>['createMany']> {
    // apply options
    this.crudQueryHelper.modifyRequest(req, queryOptions);
    // return parent result
    try {
      return this.crudAdapter.createMany(req, dto);
    } catch (e) {
      throw new CrudQueryException(this.crudAdapter.entityName(), {
        originalError: e,
      });
    }
  }

  async createOne(
    req: CrudRequestInterface<Entity>,
    dto: Parameters<CrudAdapter<Entity>['createOne']>[1],
    queryOptions?: CrudServiceQueryOptionsInterface<Entity>,
  ): ReturnType<CrudAdapter<Entity>['createOne']> {
    // apply options
    this.crudQueryHelper.modifyRequest(req, queryOptions);
    // return parent result
    try {
      return this.crudAdapter.createOne(req, dto);
    } catch (e) {
      throw new CrudQueryException(this.crudAdapter.entityName(), {
        originalError: e,
      });
    }
  }

  async updateOne(
    req: CrudRequestInterface<Entity>,
    dto: Parameters<CrudAdapter<Entity>['updateOne']>[1],
    queryOptions?: CrudServiceQueryOptionsInterface<Entity>,
  ): ReturnType<CrudAdapter<Entity>['updateOne']> {
    // apply options
    this.crudQueryHelper.modifyRequest(req, queryOptions);
    // return parent result
    try {
      return this.crudAdapter.updateOne(req, dto);
    } catch (e) {
      throw new CrudQueryException(this.crudAdapter.entityName(), {
        originalError: e,
      });
    }
  }

  async replaceOne(
    req: CrudRequestInterface<Entity>,
    dto: Parameters<CrudAdapter<Entity>['replaceOne']>[1],
    queryOptions?: CrudServiceQueryOptionsInterface<Entity>,
  ): ReturnType<CrudAdapter<Entity>['replaceOne']> {
    // apply options
    this.crudQueryHelper.modifyRequest(req, queryOptions);
    // return parent result
    try {
      return this.crudAdapter.replaceOne(req, dto);
    } catch (e) {
      throw new CrudQueryException(this.crudAdapter.entityName(), {
        originalError: e,
      });
    }
  }

  async deleteOne(
    req: CrudRequestInterface<Entity>,
    queryOptions?: CrudServiceQueryOptionsInterface<Entity>,
  ): ReturnType<CrudAdapter<Entity>['deleteOne']> {
    // apply options
    this.crudQueryHelper.modifyRequest(req, queryOptions);
    // return parent result
    try {
      return this.crudAdapter.deleteOne(req);
    } catch (e) {
      throw new CrudQueryException(this.crudAdapter.entityName(), {
        originalError: e,
      });
    }
  }

  async recoverOne(
    req: CrudRequestInterface<Entity>,
    queryOptions?: CrudServiceQueryOptionsInterface<Entity>,
  ): ReturnType<CrudAdapter<Entity>['recoverOne']> {
    // apply options
    this.crudQueryHelper.modifyRequest(req, queryOptions);
    // return parent result
    try {
      return this.crudAdapter.recoverOne(req);
    } catch (e) {
      throw new CrudQueryException(this.crudAdapter.entityName(), {
        originalError: e,
      });
    }
  }
}
