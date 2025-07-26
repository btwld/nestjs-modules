import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  PlainLiteralObject,
} from '@nestjs/common';
import { isFunction } from '@nestjs/common/utils/shared.utils';

import { CRUD_MODULE_CRUD_REQUEST_KEY } from '../../crud.constants';
import { CrudRequestException } from '../../exceptions/crud-request.exception';
import { CrudRequestQueryParser } from '../../request/crud-request-query.parser';
import { SCondition } from '../../request/types/crud-request-query.types';
import { CrudReflectionService } from '../../services/crud-reflection.service';
import { CrudActions } from '../enums/crud-actions.enum';
import { CrudOptionsInterface } from '../interfaces/crud-options.interface';
import { CrudRequestInterface } from '../interfaces/crud-request.interface';

@Injectable()
export class CrudRequestInterceptor<
  T extends PlainLiteralObject = PlainLiteralObject,
> implements NestInterceptor
{
  constructor(private reflectionService: CrudReflectionService<T>) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();

    try {
      if (!req[CRUD_MODULE_CRUD_REQUEST_KEY]) {
        const options = this.reflectionService.getRequestOptions(
          context.getClass(),
          context.getHandler(),
        );

        const action = this.reflectionService.getAction(context.getHandler());

        const parser = CrudRequestQueryParser.create();

        parser.parseQuery(req.query);

        parser.search = {
          $and: this.getSearch(parser, options, action, req?.params),
        };

        req[CRUD_MODULE_CRUD_REQUEST_KEY] = this.getCrudRequest(
          parser,
          options,
        );
      }

      return next.handle();
    } catch (error) {
      throw new CrudRequestException({
        originalError: error,
      });
    }
  }

  getCrudRequest(
    parser: CrudRequestQueryParser<T>,
    crudOptions: Partial<CrudOptionsInterface<T>>,
  ): CrudRequestInterface<T> {
    const parsed = parser.getParsed();
    const { query, routes, params } = crudOptions;

    return {
      parsed,
      options: {
        query,
        routes,
        params,
      },
    };
  }

  getSearch(
    parser: CrudRequestQueryParser<T>,
    crudOptions: Partial<CrudOptionsInterface<T>>,
    action: CrudActions,
    params?: PlainLiteralObject,
  ): SCondition<T>[] {
    // params condition
    const paramsSearch = this.getParamsSearch(parser, crudOptions, params);

    // if `CrudOptions.query.filter` is a function then return transformed query search conditions
    if (
      isFunction(crudOptions.query?.filter) &&
      typeof crudOptions.query?.filter === 'function'
    ) {
      const filterCond =
        (crudOptions.query?.filter)(
          parser.search,
          action === CrudActions.ReadAll,
        ) || /* istanbul ignore next */ {};

      return [...paramsSearch, filterCond];
    }

    // if `CrudOptions.query.filter` is array or search condition type
    const optionsFilter =
      crudOptions.query?.filter !== undefined &&
      Array.isArray(crudOptions.query?.filter) &&
      crudOptions.query?.filter.length
        ? (crudOptions.query?.filter).map(parser.convertFilterToSearch)
        : [(crudOptions.query?.filter as SCondition<T>) || {}];

    let search: SCondition<T>[] = [];

    if (parser.search) {
      search = [parser.search];
    } else if (parser.filter.length && parser.or.length) {
      search =
        parser.filter.length === 1 && parser.or.length === 1
          ? [
              {
                $or: [
                  parser.convertFilterToSearch(parser.filter[0]),
                  parser.convertFilterToSearch(parser.or[0]),
                ],
              },
            ]
          : [
              {
                $or: [
                  { $and: parser.filter.map(parser.convertFilterToSearch) },
                  { $and: parser.or.map(parser.convertFilterToSearch) },
                ],
              },
            ];
    } else if (parser.filter.length) {
      search = parser.filter.map(parser.convertFilterToSearch);
    } else {
      if (parser.or.length) {
        search =
          parser.or.length === 1
            ? [parser.convertFilterToSearch(parser.or[0])]
            : /* istanbul ignore next */ [
                {
                  $or: parser.or.map(parser.convertFilterToSearch),
                },
              ];
      }
    }

    return [...paramsSearch, ...optionsFilter, ...search];
  }

  getParamsSearch(
    parser: CrudRequestQueryParser<T>,
    crudOptions: Partial<CrudOptionsInterface<T>>,
    params?: PlainLiteralObject,
  ): SCondition<T>[] {
    if (params) {
      parser.parseParams(params, crudOptions.params ?? {});

      return Array.isArray(parser.paramsFilter) && parser.paramsFilter.length
        ? parser.paramsFilter.map(parser.convertFilterToSearch)
        : [];
    }

    return [];
  }
}
