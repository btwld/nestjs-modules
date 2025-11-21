import { Injectable, PlainLiteralObject } from '@nestjs/common';

import { CrudRequestInterface } from '../../crud/interfaces/crud-request.interface';
import { convertFilterToSearch } from '../../request/crud-request.utils';
import {
  SCondition,
  QueryRelation,
} from '../../request/types/crud-request-query.types';

/**
 * Helper service for building search conditions from parsed CRUD requests
 */
@Injectable()
export class CrudSearchHelper<Entity extends PlainLiteralObject> {
  /**
   * Build final search conditions from parsed request data
   */
  buildSearch(
    req: CrudRequestInterface<Entity>,
    options?: { relation?: QueryRelation<Entity> },
  ): void {
    const { relation } = options || {};
    const searchConditions = this.getSearchConditions(req, relation);

    req.parsed.search =
      searchConditions.length === 0
        ? undefined
        : searchConditions.length === 1
          ? searchConditions[0]
          : { $and: searchConditions };
  }

  /**
   * Get all search conditions from various sources
   */
  private getSearchConditions(
    req: CrudRequestInterface<Entity>,
    relation?: QueryRelation<Entity>,
  ): SCondition<Entity>[] {
    const { parsed, options } = req;

    // params condition
    const paramsSearch = this.getParamsSearch(req);

    // if `CrudOptions.query.filter` is array or search condition type
    const optionsFilter =
      options?.query?.filter !== undefined &&
      Array.isArray(options.query.filter) &&
      options.query.filter.length
        ? options.query.filter.map(convertFilterToSearch)
        : options?.query?.filter
          ? [options.query.filter as SCondition<Entity>]
          : [];

    let search: SCondition<Entity>[] = [];

    // Match filters where relation property equals the target (undefined matches undefined)
    const relationProperty = relation?.property ?? undefined;
    const applicableFilters = (parsed.filter || []).filter(
      (f) => f.relation === relationProperty,
    );
    const applicableOrs = (parsed.or || []).filter(
      (f) => f.relation === relationProperty,
    );

    if (parsed.search) {
      search = [parsed.search];
    } else if (applicableFilters.length && applicableOrs.length) {
      search =
        applicableFilters.length === 1 && applicableOrs.length === 1
          ? [
              {
                $or: [
                  convertFilterToSearch(applicableFilters[0]),
                  convertFilterToSearch(applicableOrs[0]),
                ],
              },
            ]
          : [
              {
                $or: [
                  { $and: applicableFilters.map(convertFilterToSearch) },
                  { $and: applicableOrs.map(convertFilterToSearch) },
                ],
              },
            ];
    } else if (applicableFilters.length) {
      search = applicableFilters.map(convertFilterToSearch);
    } else {
      if (applicableOrs.length) {
        search =
          applicableOrs.length === 1
            ? [convertFilterToSearch(applicableOrs[0])]
            : /* istanbul ignore next */ [
                {
                  $or: applicableOrs.map(convertFilterToSearch),
                },
              ];
      }
    }

    return [...paramsSearch, ...optionsFilter, ...search];
  }

  /**
   * Get search conditions from params
   */
  private getParamsSearch(
    req: CrudRequestInterface<Entity>,
  ): SCondition<Entity>[] {
    const { parsed } = req;

    return Array.isArray(parsed.paramsFilter) && parsed.paramsFilter.length
      ? parsed.paramsFilter.map(convertFilterToSearch)
      : [];
  }
}
