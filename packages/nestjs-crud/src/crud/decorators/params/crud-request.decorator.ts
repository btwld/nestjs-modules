import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { CRUD_MODULE_CRUD_REQUEST_KEY } from '../../../crud.constants';

/**
 * \@CrudRequest() parameter decorator
 */
export const CrudRequest = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request[CRUD_MODULE_CRUD_REQUEST_KEY];
  },
);
