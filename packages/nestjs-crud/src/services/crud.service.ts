import { Injectable, PlainLiteralObject } from '@nestjs/common';

import { CrudAdapter } from '../crud/adapters/crud.adapter';
import { CrudRequestInterface } from '../crud/interfaces/crud-request.interface';
import { CrudResponsePaginatedInterface } from '../crud/interfaces/crud-response-paginated.interface';
import { CrudServiceQueryOptionsInterface } from '../crud/interfaces/crud-service-query-options.interface';
import { CrudQueryException } from '../exceptions/crud-query.exception';

import { CrudQueryHelper } from './helpers/crud-query.helper';

// TODO: TYPEORM - review what to do
@Injectable()
export class CrudService<T extends PlainLiteralObject> {
  constructor(protected crudAdapter: CrudAdapter<T>) {}

  protected readonly crudQueryHelper: CrudQueryHelper = new CrudQueryHelper();

  async getMany(
    req: CrudRequestInterface,
    queryOptions?: CrudServiceQueryOptionsInterface,
  ): Promise<T[] | CrudResponsePaginatedInterface<T>> {
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
    req: CrudRequestInterface,
    queryOptions?: CrudServiceQueryOptionsInterface,
  ): ReturnType<CrudAdapter<T>['getOne']> {
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
    req: CrudRequestInterface,
    dto: Parameters<CrudAdapter<T>['createMany']>[1],
    queryOptions?: CrudServiceQueryOptionsInterface,
  ): ReturnType<CrudAdapter<T>['createMany']> {
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
    req: CrudRequestInterface,
    dto: Parameters<CrudAdapter<T>['createOne']>[1],
    queryOptions?: CrudServiceQueryOptionsInterface,
  ): ReturnType<CrudAdapter<T>['createOne']> {
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
    req: CrudRequestInterface,
    dto: Parameters<CrudAdapter<T>['updateOne']>[1],
    queryOptions?: CrudServiceQueryOptionsInterface,
  ): ReturnType<CrudAdapter<T>['updateOne']> {
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
    req: CrudRequestInterface,
    dto: Parameters<CrudAdapter<T>['replaceOne']>[1],
    queryOptions?: CrudServiceQueryOptionsInterface,
  ): ReturnType<CrudAdapter<T>['replaceOne']> {
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
    req: CrudRequestInterface,
    queryOptions?: CrudServiceQueryOptionsInterface,
  ): ReturnType<CrudAdapter<T>['deleteOne']> {
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
    req: CrudRequestInterface,
    queryOptions?: CrudServiceQueryOptionsInterface,
  ): ReturnType<CrudAdapter<T>['recoverOne']> {
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
