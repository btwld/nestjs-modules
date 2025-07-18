import { Injectable } from '@nestjs/common';

import { CrudRequestInterface } from '../../crud/interfaces/crud-request.interface';
import { CrudServiceQueryOptionsInterface } from '../../crud/interfaces/crud-service-query-options.interface';
import { SCondition } from '../../request/types/crud-request-query.types';

@Injectable()
export class CrudQueryHelper {
  modifyRequest(
    req: CrudRequestInterface,
    options?: CrudServiceQueryOptionsInterface,
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
    req: CrudRequestInterface,
    options: Omit<CrudServiceQueryOptionsInterface, 'filter'>,
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

  addSearch(req: CrudRequestInterface, search?: SCondition) {
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
