import { HttpStatus, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiResponse,
  ApiResponseMetadata,
  ApiResponseOptions,
  ApiResponseSchemaHost,
  getSchemaPath,
} from '@nestjs/swagger';

import { DecoratorTargetObject } from '../../../crud.types';
import { CrudException } from '../../../exceptions/crud.exception';
import { CrudReflectionService } from '../../../services/crud-reflection.service';
import { CrudInvalidResponseDto } from '../../dto/crud-invalid-response.dto';
import { CrudResponsePaginatedDto } from '../../dto/crud-response-paginated.dto';
import { CrudActions } from '../../enums/crud-actions.enum';

/**
 * Utility decorator used to apply response
 * options *from the controller context*.
 *
 * DO NOT USE THIS DIRECTLY ON METHODS!!!
 */
export function applyApiResponse(
  action: CrudActions,
  options: ApiResponseOptions = {},
): MethodDecorator {
  return (target: DecoratorTargetObject, ...rest) => {
    // break out args
    const [propertyKey] = rest;

    // reflection service
    const reflectionService = new CrudReflectionService();

    if (!('prototype' in target)) {
      throw new CrudException({
        message:
          'Cannot decorate with apply api response, target must be a class',
      });
    }

    // get the serialize options
    const serializeOptions = reflectionService.getAllSerializationOptions(
      target,
      target.prototype[propertyKey],
    );

    // get the request options
    const requestOptions = reflectionService.getRequestOptions(
      target,
      target.prototype[propertyKey],
    );

    // determine the dto type
    const dto =
      serializeOptions?.type ??
      requestOptions.model.type ??
      CrudInvalidResponseDto;

    // determine pagination dto
    const paginatedDto =
      serializeOptions?.paginatedType ??
      requestOptions.model.paginatedType ??
      CrudResponsePaginatedDto;

    // dto meta options
    const dtoMetaOptions: ApiResponseMetadata = {};

    // dto schema options
    let dtoSchemaOptions: ApiResponseSchemaHost = { schema: {} };

    // action is the discriminator
    switch (action) {
      // read all
      case CrudActions.ReadAll:
        dtoSchemaOptions = createReadAllResponse({
          action: CrudActions.ReadAll,
          modelName: requestOptions.model.type.name,
          dto,
          paginatedDto,
          alwaysPaginate: requestOptions.query?.alwaysPaginate ?? false,
        });
        break;

      // create many
      case CrudActions.CreateMany:
        dtoSchemaOptions.schema = createArraySchema(dto);
        break;

      // returns deleted item or empty
      case CrudActions.DeleteOne:
        dtoMetaOptions.type =
          requestOptions.routes?.deleteOne?.returnDeleted === true
            ? dto
            : undefined;
        break;

      // returns recovered item or empty
      case CrudActions.RecoverOne:
        dtoMetaOptions.type =
          requestOptions.routes?.recoverOne?.returnRecovered === true
            ? dto
            : undefined;
        break;

      // returns one item
      case CrudActions.ReadOne:
      case CrudActions.CreateOne:
      case CrudActions.UpdateOne:
      case CrudActions.ReplaceOne:
      default:
        dtoMetaOptions.type = dto;
        break;
    }

    // merge the options
    const mergedOptions: ApiResponseOptions = {
      status: HttpStatus.OK,
      description: `${action} ${requestOptions.model.type.name}`,
      ...dtoMetaOptions,
      ...dtoSchemaOptions,
      ...options,
    };

    ApiExtraModels(paginatedDto)(target, ...rest);
    ApiResponse(mergedOptions)(target, ...rest);
  };
}

//
// private routines
//

function createArraySchema(dto: Type): ApiResponseSchemaHost['schema'] {
  return {
    type: 'array',
    items: {
      $ref: getSchemaPath(dto),
    },
  };
}

function createPaginatedSchema(
  paginatedDto: Type,
): ApiResponseSchemaHost['schema'] {
  return {
    $ref: getSchemaPath(paginatedDto),
  };
}

function createPaginatedResponse(options: {
  action: CrudActions;
  modelName: string;
  paginatedDto: Type;
}): ApiResponseSchemaHost {
  return {
    description: `${options.action} ${options.modelName} as paginated response.`,
    schema: createPaginatedSchema(options.paginatedDto),
  };
}

function createArrayOrPaginatedResponse(options: {
  action: CrudActions;
  modelName: string;
  dto: Type;
  paginatedDto: Type;
}): ApiResponseSchemaHost {
  return {
    description: `${options.action} ${options.modelName} as array or paginated response.`,
    schema: {
      oneOf: [
        createPaginatedSchema(options.paginatedDto),
        createArraySchema(options.dto),
      ],
    },
  };
}

function createReadAllResponse(options: {
  action: CrudActions;
  modelName: string;
  dto: Type;
  paginatedDto: Type;
  alwaysPaginate: boolean;
}): ApiResponseSchemaHost {
  // is pagination forced?
  if (options.alwaysPaginate) {
    // yes, use paginated type
    return createPaginatedResponse(options);
  } else {
    // no, could be pagination OR array
    return createArrayOrPaginatedResponse(options);
  }
}
