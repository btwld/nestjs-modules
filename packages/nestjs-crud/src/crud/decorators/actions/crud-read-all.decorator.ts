import { applyDecorators, Get, PlainLiteralObject } from '@nestjs/common';

import { CrudActions } from '../../enums/crud-actions.enum';
import { CrudReadAllOptionsInterface } from '../../interfaces/crud-route-options.interface';
import { CrudApiOperation } from '../openapi/crud-api-operation.decorator';
import { CrudApiQuery } from '../openapi/crud-api-query.decorator';
import { CrudApiResponse } from '../openapi/crud-api-response.decorator';
import { CrudAction } from '../routes/crud-action.decorator';
import { CrudSerialize } from '../routes/crud-serialize.decorator';
import { CrudValidate } from '../routes/crud-validate.decorator';

/**
 * CRUD Read All route decorator
 */
export const CrudReadAll = <T extends PlainLiteralObject = PlainLiteralObject>(
  options: CrudReadAllOptionsInterface<T> = {},
) => {
  const { path, validation, serialization, api } = options;

  return applyDecorators(
    Get(path),
    CrudAction(CrudActions.ReadAll),
    CrudValidate(validation),
    CrudSerialize(serialization),
    CrudApiOperation(api?.operation),
    CrudApiQuery(api?.query),
    CrudApiResponse(CrudActions.ReadAll, api?.response),
  );
};
