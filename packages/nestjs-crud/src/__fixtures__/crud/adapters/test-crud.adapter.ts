/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, PlainLiteralObject, Type } from '@nestjs/common';

import { CrudAdapter } from '../../../crud/adapters/crud.adapter';
import { CrudCreateManyInterface } from '../../../crud/interfaces/crud-create-many.interface';
import { CrudRequestOptionsInterface } from '../../../crud/interfaces/crud-request-options.interface';
import { CrudRequestInterface } from '../../../crud/interfaces/crud-request.interface';
import { CrudRequestParsedParamsInterface } from '../../../request/interfaces/crud-request-parsed-params.interface';

class TestEntity {}

@Injectable()
export class TestCrudAdapter<
  T extends PlainLiteralObject,
> extends CrudAdapter<T> {
  entityName(): string {
    return 'TestEntity';
  }

  entityType(): Type<T> {
    return TestEntity as Type<T>;
  }

  async getMany(req: CrudRequestInterface<T>): Promise<any> {
    return { req };
  }

  async getOne(req: CrudRequestInterface<T>): Promise<any> {
    return { req };
  }

  async createOne(req: CrudRequestInterface<T>, dto: T): Promise<any> {
    return { req, dto };
  }

  async createMany(
    req: CrudRequestInterface<T>,
    dto: CrudCreateManyInterface<T>,
  ): Promise<any> {
    return { req, dto };
  }

  async updateOne(req: CrudRequestInterface<T>, dto: T): Promise<any> {
    return { req, dto };
  }

  async replaceOne(req: CrudRequestInterface<T>, dto: T): Promise<any> {
    return { req, dto };
  }

  async deleteOne(req: CrudRequestInterface<T>): Promise<any> {
    return { req };
  }

  async recoverOne(req: CrudRequestInterface<T>): Promise<any> {
    return { req };
  }

  decidePagination(
    _parsed: CrudRequestParsedParamsInterface<T>,
    _options: CrudRequestOptionsInterface<T>,
  ): boolean {
    return true;
  }
}
