import { HttpException, type PlainLiteralObject } from '@nestjs/common';

import { CrudQueryException } from '../../../infrastructure/exceptions/crud-query.exception.js';
import { type CrudResponsePaginatedInterface } from '../../../infrastructure/interfaces/crud-response-paginated.interface.js';
import { type CrudListQuery } from '../impl/crud-list.query.js';

import { CrudQueryBaseHandler } from './crud-query-base.handler.js';

export class CrudListHandler<
  Entity extends PlainLiteralObject = PlainLiteralObject,
> extends CrudQueryBaseHandler<Entity> {
  async execute(
    query: CrudListQuery<Entity>,
  ): Promise<CrudResponsePaginatedInterface<Entity>> {
    const { context } = query;

    try {
      return await this.crudAdapter.list(context);
    } catch (e) {
      if (e instanceof HttpException) {
        throw e;
      }
      throw new CrudQueryException(this.crudAdapter.entityName(), {
        originalError: e,
      });
    }
  }
}
