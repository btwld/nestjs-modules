import { Injectable, PlainLiteralObject } from '@nestjs/common';

import { RepositoryInterface, WhereClause } from '@concepta/nestjs-repository';

import { CrudAdapter } from '../../../infrastructure/adapters/crud.adapter.js';
import { CrudContextOptionsInterface } from '../../../infrastructure/interceptors/interfaces/crud-context-options.interface.js';
import { CrudContextInterface } from '../../../infrastructure/interceptors/interfaces/crud-context.interface.js';
import { CrudParsedQueryInterface } from '../../../infrastructure/request/interfaces/crud-parsed-query.interface.js';

@Injectable()
export class TestCrudAdapter<
  T extends PlainLiteralObject,
> extends CrudAdapter<T> {
  constructor(repository: RepositoryInterface<T>) {
    super(repository);
  }

  decidePagination(
    _query: CrudParsedQueryInterface<T>,
    _options: CrudContextOptionsInterface<T>,
  ): boolean {
    return true;
  }

  exposedBuildWhere(context: CrudContextInterface<T>): WhereClause | undefined {
    return this.buildWhere(context);
  }

  exposedValidateWhereFields(clause: WhereClause | undefined): void {
    return this.validateWhereFields(clause);
  }
}
