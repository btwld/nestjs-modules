import { applyDecorators, Patch, SetMetadata } from '@nestjs/common';

import {
  CRUD_MODULE_ROUTE_RECOVER_ONE_DEFAULT_PATH,
  CRUD_MODULE_ROUTE_RECOVER_ONE_METADATA,
} from '../../../crud.constants';
import { CrudActions } from '../../enums/crud-actions.enum';
import { CrudRecoverOneOptionsInterface } from '../../interfaces/crud-route-options.interface';
import { CrudApiOperation } from '../openapi/crud-api-operation.decorator';
import { CrudApiParam } from '../openapi/crud-api-param.decorator';
import { CrudApiResponse } from '../openapi/crud-api-response.decorator';
import { CrudAction } from '../routes/crud-action.decorator';
import { CrudSerialize } from '../routes/crud-serialize.decorator';
import { CrudValidate } from '../routes/crud-validate.decorator';

/**
 * CRUD Recover One route decorator
 */
export const CrudRecoverOne = (
  options: CrudRecoverOneOptionsInterface = {},
) => {
  const {
    path = CRUD_MODULE_ROUTE_RECOVER_ONE_DEFAULT_PATH,
    validation,
    serialization,
    api,
    ...rest
  } = { ...options };

  return applyDecorators(
    Patch(path),
    CrudAction(CrudActions.RecoverOne),
    SetMetadata(CRUD_MODULE_ROUTE_RECOVER_ONE_METADATA, rest),
    CrudValidate(validation),
    CrudSerialize(serialization),
    CrudApiOperation(api?.operation),
    CrudApiParam(api?.params),
    CrudApiResponse(CrudActions.RecoverOne, api?.response),
  );
};
