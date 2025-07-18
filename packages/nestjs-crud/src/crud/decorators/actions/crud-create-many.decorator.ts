import { applyDecorators, Post } from '@nestjs/common';

import { CRUD_MODULE_ROUTE_CREATE_MANY_DEFAULT_PATH } from '../../../crud.constants';
import { CrudValidationOptions } from '../../../crud.types';
import { CrudActions } from '../../enums/crud-actions.enum';
import { CrudCreateManyOptionsInterface } from '../../interfaces/crud-route-options.interface';
import { CrudApiBody } from '../openapi/crud-api-body.decorator';
import { CrudApiOperation } from '../openapi/crud-api-operation.decorator';
import { CrudApiResponse } from '../openapi/crud-api-response.decorator';
import { CrudAction } from '../routes/crud-action.decorator';
import { CrudSerialize } from '../routes/crud-serialize.decorator';
import { CrudValidate } from '../routes/crud-validate.decorator';

/**
 * CRUD Create Many route decorator
 */
export const CrudCreateMany = (
  options: CrudCreateManyOptionsInterface = {},
) => {
  const {
    path = CRUD_MODULE_ROUTE_CREATE_MANY_DEFAULT_PATH,
    dto,
    validation,
    serialization,
    api,
  } = { ...options };

  const validationMerged: CrudValidationOptions = dto
    ? { expectedType: dto, ...validation }
    : validation;

  return applyDecorators(
    Post(path),
    CrudAction(CrudActions.CreateMany),
    CrudValidate(validationMerged),
    CrudSerialize(serialization),
    CrudApiOperation(api?.operation),
    CrudApiBody({
      type: options?.dto,
      ...options?.api?.body,
    }),
    CrudApiResponse(CrudActions.CreateMany, api?.response),
  );
};
