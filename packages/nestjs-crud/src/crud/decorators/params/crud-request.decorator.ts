import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { CRUD_MODULE_CRUD_REQUEST_KEY } from '../../../crud.constants';
import { CrudRequestInterface } from '../../interfaces/crud-request.interface';

/**
 * \@CrudRequest() parameter decorator
 */
export const CrudRequest = createParamDecorator<CrudRequestInterface>(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request[CRUD_MODULE_CRUD_REQUEST_KEY];
  },
);
