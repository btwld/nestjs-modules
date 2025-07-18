/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, PlainLiteralObject } from '@nestjs/common';

import { CrudAdapter } from '../../../crud/adapters/crud.adapter';
import { CrudCreateManyInterface } from '../../../crud/interfaces/crud-create-many.interface';
import { CrudRequestOptionsInterface } from '../../../crud/interfaces/crud-request-options.interface';
import { CrudRequestInterface } from '../../../crud/interfaces/crud-request.interface';
import { CrudRequestParsedParamsInterface } from '../../../request/interfaces/crud-request-parsed-params.interface';

@Injectable()
export class TestCrudAdapter<
  T extends PlainLiteralObject,
> extends CrudAdapter<T> {
  entityName(): string {
    return 'TestEntity';
  }

  async getMany(req: CrudRequestInterface): Promise<any> {
    return { req };
  }

  async getOne(req: CrudRequestInterface): Promise<any> {
    return { req };
  }

  async createOne(req: CrudRequestInterface, dto: T): Promise<any> {
    return { req, dto };
  }

  async createMany(
    req: CrudRequestInterface,
    dto: CrudCreateManyInterface<T>,
  ): Promise<any> {
    return { req, dto };
  }

  async updateOne(req: CrudRequestInterface, dto: T): Promise<any> {
    return { req, dto };
  }

  async replaceOne(req: CrudRequestInterface, dto: T): Promise<any> {
    return { req, dto };
  }

  async deleteOne(req: CrudRequestInterface): Promise<any> {
    return { req };
  }

  async recoverOne(req: CrudRequestInterface): Promise<any> {
    return { req };
  }

  decidePagination(
    _parsed: CrudRequestParsedParamsInterface,
    _options: CrudRequestOptionsInterface,
  ): boolean {
    return true;
  }
}
