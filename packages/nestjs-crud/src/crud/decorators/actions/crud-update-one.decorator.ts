import {
  applyDecorators,
  Patch,
  PlainLiteralObject,
  SetMetadata,
} from '@nestjs/common';

import {
  CRUD_MODULE_ROUTE_ID_DEFAULT_PATH,
  CRUD_MODULE_ROUTE_UPDATE_ONE_METADATA,
} from '../../../crud.constants';
import { CrudValidationOptions } from '../../../crud.types';
import { CrudActions } from '../../enums/crud-actions.enum';
import { CrudUpdateOneOptionsInterface } from '../../interfaces/crud-route-options.interface';
import { CrudApiBody } from '../openapi/crud-api-body.decorator';
import { CrudApiOperation } from '../openapi/crud-api-operation.decorator';
import { CrudApiParam } from '../openapi/crud-api-param.decorator';
import { CrudApiResponse } from '../openapi/crud-api-response.decorator';
import { CrudAction } from '../routes/crud-action.decorator';
import { CrudSerialize } from '../routes/crud-serialize.decorator';
import { CrudValidate } from '../routes/crud-validate.decorator';

/**
 * CRUD Update One route decorator
 */
export const CrudUpdateOne = <
  T extends PlainLiteralObject = PlainLiteralObject,
>(
  options: CrudUpdateOneOptionsInterface<T> = {},
) => {
  const {
    path = CRUD_MODULE_ROUTE_ID_DEFAULT_PATH,
    dto,
    validation,
    serialization,
    api,
    ...rest
  } = { ...options };

  const validationMerged: CrudValidationOptions<T> = dto
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
