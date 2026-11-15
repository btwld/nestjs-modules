import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';

import { findAppContext } from '@concepta/nestjs-core';

import { canReadAccessField } from '../../domain/utils/can-read-access-field.util.js';
import { projectAccessFields } from '../../domain/utils/project-access-fields.util.js';
import { AccessDecisionCtx } from '../interfaces/access-decision-context.interface.js';

/**
 * Removes the fields the actor may not read from a checked route's
 * response, under their `read` rules whatever the route's action (see
 * `canReadAccessField`). Each item of an array, and of a page's `data`, is
 * filtered; a route that was not checked passes through.
 *
 * Registered globally, so on the way out it runs after the route's own
 * interceptors, response serialization included.
 */
@Injectable()
export class AccessControlFilter implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data: unknown) => {
        const ctx = findAppContext(context);

        if (!ctx?.supports(AccessDecisionCtx)) {
          return data;
        }

        const { ability, query } = ctx.with(AccessDecisionCtx);

        return projectAccessFields(data, (path) =>
          canReadAccessField(ability, query, path),
        );
      }),
    );
  }
}
