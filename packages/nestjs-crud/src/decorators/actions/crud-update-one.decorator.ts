import { applyDecorators, Patch, SetMetadata } from '@nestjs/common';
import { CrudUpdateOneOptionsInterface } from '../../interfaces/crud-route-options.interface';
import { CrudValidationOptions } from '../../crud.types';
import { CrudActions } from '../../crud.enums';
import { CrudAction } from '../routes/crud-action.decorator';
import {
  CRUD_MODULE_ROUTE_ID_DEFAULT_PATH,
  CRUD_MODULE_ROUTE_UPDATE_ONE_METADATA,
} from '../../crud.constants';
import { CrudValidate } from '../routes/crud-validate.decorator';
import { CrudSerialize } from '../routes/crud-serialize.decorator';
import { CrudApiOperation } from '../openapi/crud-api-operation.decorator';
import { CrudApiParam } from '../openapi/crud-api-param.decorator';
import { CrudApiBody } from '../openapi/crud-api-body.decorator';
import { CrudApiResponse } from '../openapi/crud-api-response.decorator';

/**
 * CRUD Update One route decorator
 */
export const CrudUpdateOne = (options: CrudUpdateOneOptionsInterface = {}) => {
  const {
    path = CRUD_MODULE_ROUTE_ID_DEFAULT_PATH,
    dto,
    validation,
    serialization,
    api,
    ...rest
  } = { ...options };

  const validationMerged: CrudValidationOptions = dto
    ? { expectedType: dto, ...validation }
    : validation;

  return applyDecorators(
    Patch(path),
    CrudAction(CrudActions.UpdateOne),
    SetMetadata(CRUD_MODULE_ROUTE_UPDATE_ONE_METADATA, rest),
    CrudValidate(validationMerged),
    CrudSerialize(serialization),
    CrudApiOperation(api?.operation),
    CrudApiParam(api?.params),
    CrudApiBody({
      type: options?.dto,
      ...options?.api?.body,
    }),
    CrudApiResponse(CrudActions.UpdateOne, api?.response),
  );
};
