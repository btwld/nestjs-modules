import { applyDecorators, Get } from '@nestjs/common';

import { CRUD_MODULE_ROUTE_ID_DEFAULT_PATH } from '../../../crud.constants';
import { CrudActions } from '../../enums/crud-actions.enum';
import { CrudReadOneOptionsInterface } from '../../interfaces/crud-route-options.interface';
import { CrudApiOperation } from '../openapi/crud-api-operation.decorator';
import { CrudApiParam } from '../openapi/crud-api-param.decorator';
import { CrudApiQuery } from '../openapi/crud-api-query.decorator';
import { CrudApiResponse } from '../openapi/crud-api-response.decorator';
import { CrudAction } from '../routes/crud-action.decorator';
import { CrudSerialize } from '../routes/crud-serialize.decorator';
import { CrudValidate } from '../routes/crud-validate.decorator';

/**
 * CRUD Read One route decorator
 */
export const CrudReadOne = (options: CrudReadOneOptionsInterface = {}) => {
  const {
    path = CRUD_MODULE_ROUTE_ID_DEFAULT_PATH,
    validation,
    serialization,
    api,
  } = { ...options };

  return applyDecorators(
    Get(path),
    CrudAction(CrudActions.ReadOne),
    CrudValidate(validation),
    CrudSerialize(serialization),
    CrudApiOperation(api?.operation),
    CrudApiQuery(api?.query),
    CrudApiParam(api?.params),
    CrudApiResponse(CrudActions.ReadOne, api?.response),
  );
};
