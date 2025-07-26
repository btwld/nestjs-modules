import { Injectable, PlainLiteralObject } from '@nestjs/common';

import { CrudRequestInterface } from '../../crud/interfaces/crud-request.interface';
import { CrudServiceQueryOptionsInterface } from '../../crud/interfaces/crud-service-query-options.interface';
import { SCondition } from '../../request/types/crud-request-query.types';

@Injectable()
export class CrudQueryHelper<Entity extends PlainLiteralObject> {
  modifyRequest(
    req: CrudRequestInterface<Entity>,
    options?: CrudServiceQueryOptionsInterface<Entity>,
  ) {
    // get any options?
    if (options) {
      // deconstruct
      const { filter, ...rest } = options;
      // merge the options
      this.mergeOptions(req, rest);
      // add filters to search
      this.addSearch(req, filter);
    }
  }

  mergeOptions(
    req: CrudRequestInterface<Entity>,
    options: Omit<CrudServiceQueryOptionsInterface<Entity>, 'filter'>,
  ) {
    // already have options on request?
    if (req.options) {
      // yes, merge them
      req.options.query = {
        ...req.options?.query,
        ...options,
      };
    } else {
      // no, set the property
      req.options = {
        query: options,
      };
    }
  }

  addSearch(req: CrudRequestInterface<Entity>, search?: SCondition<Entity>) {
    if (search) {
      if (req.parsed.search) {
        req.parsed.search = {
          $and: [req.parsed.search, search],
        };
      } else {
        req.parsed.search = search;
      }
    }
  }
}
