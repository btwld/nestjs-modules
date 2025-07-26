import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common';

import { CRUD_MODULE_ROUTE_ACTION_METADATA } from '../../../crud.constants';
import { CrudActions } from '../../enums/crud-actions.enum';
import { CrudRequestInterceptor } from '../../interceptors/crud-request.interceptor';

/**
 * CRUD action route decorator
 */
export const CrudAction = (action: CrudActions) =>
  applyDecorators(
    SetMetadata(CRUD_MODULE_ROUTE_ACTION_METADATA, action),
    UseInterceptors(CrudRequestInterceptor),
  );
