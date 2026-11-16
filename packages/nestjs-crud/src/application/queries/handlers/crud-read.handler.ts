import { HttpException, type PlainLiteralObject } from '@nestjs/common';

import { CrudQueryException } from '../../../infrastructure/exceptions/crud-query.exception.js';
import { type CrudReadQuery } from '../impl/crud-read.query.js';

import { CrudQueryBaseHandler } from './crud-query-base.handler.js';

export class CrudReadHandler<
  Entity extends PlainLiteralObject = PlainLiteralObject,
> extends CrudQueryBaseHandler<Entity> {
  async execute(query: CrudReadQuery<Entity>): Promise<Entity> {
    const { context } = query;

    try {
      return await this.crudAdapter.read(context);
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
