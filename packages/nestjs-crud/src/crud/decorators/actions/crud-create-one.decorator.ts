import {
  applyDecorators,
  PlainLiteralObject,
  Post,
  SetMetadata,
} from '@nestjs/common';

import { CRUD_MODULE_ROUTE_CREATE_ONE_METADATA } from '../../../crud.constants';
import { CrudActions } from '../../enums/crud-actions.enum';
import { CrudCreateOneOptionsInterface } from '../../interfaces/crud-route-options.interface';
import { CrudApiBody } from '../openapi/crud-api-body.decorator';
import { CrudApiOperation } from '../openapi/crud-api-operation.decorator';
import { CrudApiResponse } from '../openapi/crud-api-response.decorator';
import { CrudAction } from '../routes/crud-action.decorator';
import { CrudSerialize } from '../routes/crud-serialize.decorator';
import { CrudValidate } from '../routes/crud-validate.decorator';

/**
 * CRUD Create One route decorator
 */
export const CrudCreateOne = <
  T extends PlainLiteralObject = PlainLiteralObject,
>(
  options: CrudCreateOneOptionsInterface<T> = {},
) => {
  const { path, validation, serialization, api, ...rest } = { ...options };

  return applyDecorators(
    Post(path),
    CrudAction(CrudActions.CreateOne),
    SetMetadata(CRUD_MODULE_ROUTE_CREATE_ONE_METADATA, rest),
    CrudValidate(validation),
    CrudSerialize(serialization),
    CrudApiOperation(api?.operation),
    CrudApiBody({
      type: options?.dto,
      ...options?.api?.body,
    }),
    CrudApiResponse(CrudActions.CreateOne, api?.response),
  );
};
