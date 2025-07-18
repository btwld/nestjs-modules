import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { CrudActions } from '../crud/enums/crud-actions.enum';
import { CrudApiParamMetadataInterface } from '../crud/interfaces/crud-api-param-metadata.interface';
import { CrudApiQueryMetadataInterface } from '../crud/interfaces/crud-api-query-metadata.interface';
import { CrudApiResponseMetadataInterface } from '../crud/interfaces/crud-api-response-metadata.interface';
import { CrudModelOptionsInterface } from '../crud/interfaces/crud-model-options.interface';
import { CrudOptionsInterface } from '../crud/interfaces/crud-options.interface';
import { CrudParamsOptionsInterface } from '../crud/interfaces/crud-params-options.interface';
import {
  CrudCreateOneOptionsInterface,
  CrudDeleteOneOptionsInterface,
  CrudRecoverOneOptionsInterface,
  CrudReplaceOneOptionsInterface,
  CrudUpdateOneOptionsInterface,
} from '../crud/interfaces/crud-route-options.interface';
import { CrudSerializationOptionsInterface } from '../crud/interfaces/crud-serialization-options.interface';
import { CrudServiceQueryOptionsInterface } from '../crud/interfaces/crud-service-query-options.interface';
import { CrudValidationMetadataInterface } from '../crud/interfaces/crud-validation-metadata.interface';
import {
  CRUD_MODULE_ROUTE_ACTION_METADATA,
  CRUD_MODULE_ROUTE_CREATE_ONE_METADATA,
  CRUD_MODULE_ROUTE_DELETE_ONE_METADATA,
  CRUD_MODULE_ROUTE_MODEL_METADATA,
  CRUD_MODULE_ROUTE_RECOVER_ONE_METADATA,
  CRUD_MODULE_ROUTE_REPLACE_ONE_METADATA,
  CRUD_MODULE_ROUTE_UPDATE_ONE_METADATA,
  CRUD_MODULE_ROUTE_VALIDATION_METADATA,
  CRUD_MODULE_ROUTE_PARAMS_METADATA,
  CRUD_MODULE_ROUTE_QUERY_ALLOW_METADATA,
  CRUD_MODULE_ROUTE_QUERY_EXCLUDE_METADATA,
  CRUD_MODULE_ROUTE_QUERY_PERSIST_METADATA,
  CRUD_MODULE_ROUTE_QUERY_FILTER_METADATA,
  CRUD_MODULE_ROUTE_QUERY_SORT_METADATA,
  CRUD_MODULE_ROUTE_QUERY_LIMIT_METADATA,
  CRUD_MODULE_ROUTE_QUERY_MAX_LIMIT_METADATA,
  CRUD_MODULE_ROUTE_QUERY_CACHE_METADATA,
  CRUD_MODULE_ROUTE_QUERY_ALWAYS_PAGINATE_METADATA,
  CRUD_MODULE_ROUTE_QUERY_SOFT_DELETE_METADATA,
  CRUD_MODULE_ROUTE_SERIALIZATION_METADATA,
  CRUD_MODULE_PARAM_BODY_METADATA,
  CRUD_MODULE_API_PARAMS_METADATA,
  CRUD_MODULE_API_RESPONSE_METADATA,
  CRUD_MODULE_API_QUERY_METADATA,
} from '../crud.constants';
import {
  CrudValidationOptions,
  ReflectionTargetOrHandler,
} from '../crud.types';

@Injectable()
export class CrudReflectionService {
  private reflector = new Reflector();

  public getRequestOptions(
    target: ReflectionTargetOrHandler,
    handler: ReflectionTargetOrHandler,
  ): CrudOptionsInterface & { model: CrudModelOptionsInterface } {
    return {
      model: this.getAllModelOptions(target, handler),

      params: this.getAllParamOptions(handler, target) ?? {
        id: {
          field: 'id',
          type: 'number',
          primary: true,
        },
      },

      routes: {
        createOne: {
          returnShallow: false,
          ...(this.reflector.get<CrudCreateOneOptionsInterface>(
            CRUD_MODULE_ROUTE_CREATE_ONE_METADATA,
            handler,
          ) ?? {}),
        },
        replaceOne: {
          returnShallow: false,
          ...(this.reflector.get<CrudReplaceOneOptionsInterface>(
            CRUD_MODULE_ROUTE_REPLACE_ONE_METADATA,
            handler,
          ) ?? {}),
        },
        updateOne: {
          returnShallow: false,
          ...(this.reflector.get<CrudUpdateOneOptionsInterface>(
            CRUD_MODULE_ROUTE_UPDATE_ONE_METADATA,
            handler,
          ) ?? {}),
        },
        deleteOne: {
          returnDeleted: false,
          ...(this.reflector.get<CrudDeleteOneOptionsInterface>(
            CRUD_MODULE_ROUTE_DELETE_ONE_METADATA,
            handler,
          ) ?? {}),
        },
        recoverOne: {
          returnRecovered: false,
          ...(this.reflector.get<CrudRecoverOneOptionsInterface>(
            CRUD_MODULE_ROUTE_RECOVER_ONE_METADATA,
            handler,
          ) ?? {}),
        },
      },

      query: {
        allow: this.reflector.getAllAndOverride<
          CrudServiceQueryOptionsInterface['allow']
        >(CRUD_MODULE_ROUTE_QUERY_ALLOW_METADATA, [handler, target]),

        exclude: this.reflector.getAllAndOverride<
          CrudServiceQueryOptionsInterface['exclude']
        >(CRUD_MODULE_ROUTE_QUERY_EXCLUDE_METADATA, [handler, target]),

        persist: this.reflector.getAllAndOverride<
          CrudServiceQueryOptionsInterface['persist']
        >(CRUD_MODULE_ROUTE_QUERY_PERSIST_METADATA, [handler, target]),

        filter:
          this.reflector.getAllAndOverride<
            CrudServiceQueryOptionsInterface['filter']
          >(CRUD_MODULE_ROUTE_QUERY_FILTER_METADATA, [handler, target]) ?? {},

        sort: this.reflector.getAllAndOverride<
          CrudServiceQueryOptionsInterface['sort']
        >(CRUD_MODULE_ROUTE_QUERY_SORT_METADATA, [handler, target]),

        limit: this.reflector.getAllAndOverride<
          CrudServiceQueryOptionsInterface['limit']
        >(CRUD_MODULE_ROUTE_QUERY_LIMIT_METADATA, [handler, target]),

        maxLimit: this.reflector.getAllAndOverride<
          CrudServiceQueryOptionsInterface['maxLimit']
        >(CRUD_MODULE_ROUTE_QUERY_MAX_LIMIT_METADATA, [handler, target]),

        cache: this.reflector.getAllAndOverride<
          CrudServiceQueryOptionsInterface['cache']
        >(CRUD_MODULE_ROUTE_QUERY_CACHE_METADATA, [handler, target]),

        alwaysPaginate: this.reflector.getAllAndOverride<
          CrudServiceQueryOptionsInterface['alwaysPaginate']
        >(CRUD_MODULE_ROUTE_QUERY_ALWAYS_PAGINATE_METADATA, [handler, target]),

        softDelete: this.reflector.getAllAndOverride<
          CrudServiceQueryOptionsInterface['softDelete']
        >(CRUD_MODULE_ROUTE_QUERY_SOFT_DELETE_METADATA, [handler, target]),
      },
    };
  }

  public getAction(handler: ReflectionTargetOrHandler): CrudActions {
    return this.reflector.get<CrudActions>(
      CRUD_MODULE_ROUTE_ACTION_METADATA,
      handler,
    );
  }

  public getAllModelOptions(
    target: ReflectionTargetOrHandler,
    handler: ReflectionTargetOrHandler,
  ) {
    return this.reflector.getAllAndOverride<CrudModelOptionsInterface>(
      CRUD_MODULE_ROUTE_MODEL_METADATA,
      [handler, target],
    );
  }

  public getAllParamOptions(
    target: ReflectionTargetOrHandler,
    handler: ReflectionTargetOrHandler,
  ) {
    return this.reflector.getAllAndOverride<CrudParamsOptionsInterface>(
      CRUD_MODULE_ROUTE_PARAMS_METADATA,
      [handler, target],
    );
  }

  public getValidationOptions(
    target: ReflectionTargetOrHandler,
  ): CrudValidationOptions {
    return this.reflector.get(CRUD_MODULE_ROUTE_VALIDATION_METADATA, target);
  }

  public getBodyParamOptions(target: ReflectionTargetOrHandler) {
    return this.reflector.get<CrudValidationMetadataInterface[]>(
      CRUD_MODULE_PARAM_BODY_METADATA,
      target,
    );
  }

  public getAllSerializationOptions(
    target: ReflectionTargetOrHandler,
    handler: ReflectionTargetOrHandler,
  ): CrudSerializationOptionsInterface {
    return this.reflector.getAllAndOverride<CrudSerializationOptionsInterface>(
      CRUD_MODULE_ROUTE_SERIALIZATION_METADATA,
      [handler, target],
    );
  }

  public getApiQueryOptions(target: ReflectionTargetOrHandler) {
    return this.reflector.get<CrudApiQueryMetadataInterface[]>(
      CRUD_MODULE_API_QUERY_METADATA,
      target,
    );
  }

  public getApiParamsOptions(target: ReflectionTargetOrHandler) {
    return this.reflector.get<CrudApiParamMetadataInterface[]>(
      CRUD_MODULE_API_PARAMS_METADATA,
      target,
    );
  }

  public getApiResponseOptions(target: ReflectionTargetOrHandler) {
    return this.reflector.get<CrudApiResponseMetadataInterface[]>(
      CRUD_MODULE_API_RESPONSE_METADATA,
      target,
    );
  }
}
