import {
  BadRequestException,
  ExecutionContext,
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  PlainLiteralObject,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import {
  ContextOverlayInterceptor,
  getAppContext,
  Operation,
  OverlayRef,
} from '@concepta/nestjs-core';

import { ControllerTarget, MethodHandler } from '../../crud.types.js';
import { CrudContextException } from '../exceptions/crud-context.exception.js';
import { CrudPreconditionRequiredException } from '../exceptions/crud-precondition-required.exception.js';
import { parseIfMatch } from '../request/crud-precondition.parser.js';
import { CrudQueryParser } from '../request/crud-query.parser.js';
import { CrudMetaview } from '../services/crud-metaview.service.js';
import { operationToAction } from '../utils/crud-infra.utils.js';
import { resolveCrudAdapter } from '../utils/resolve-crud-adapter.js';

import { CrudContextInterface } from './interfaces/crud-context.interface.js';
import { CrudRouteOptionsInterface } from './interfaces/crud-route-options.interface.js';

export const CrudCtx = new OverlayRef<'withCrud', CrudContextInterface>(
  'withCrud',
);

// The only operations `If-Match` governs — a lost-update precondition has
// no meaning on a read. Shared by the precondition parse below and
// `getRouteOptions`'s `requireVersion` resolution, so the two can't drift.
const PRECONDITION_OPERATIONS = new Set<Operation>([
  Operation.Update,
  Operation.Replace,
  Operation.Delete,
  Operation.SoftDelete,
  Operation.Restore,
]);

@Injectable()
export class CrudContextOverlay<
  T extends PlainLiteralObject = PlainLiteralObject,
> extends ContextOverlayInterceptor {
  readonly ref = CrudCtx;

  constructor(
    @Inject(forwardRef(() => CrudMetaview))
    private reflectionService: CrudMetaview<T>,
    private moduleRef: ModuleRef,
  ) {
    super();
  }

  private resolve(
    context: ExecutionContext | undefined,
  ): CrudContextInterface<T> {
    if (!context) {
      throw new CrudContextException({
        message: 'CrudContextOverlay requires an ExecutionContext',
        fault: 'usage',
      });
    }

    try {
      const req = context.switchToHttp().getRequest();
      const target = context.getClass();
      const handler = context.getHandler();

      const ctxOptions = this.reflectionService.getContextOptions(
        target,
        handler,
      );

      const parser = CrudQueryParser.create<T>();
      parser.parseQuery(req.query);

      if (req.params) {
        parser.parseParams(req.params, ctxOptions.params ?? {});
      }

      const entity = this.reflectionService.getEntity(target);

      if (!entity) {
        throw new CrudContextException({
          message: `No entity defined for ${target.name} (use @CrudEntity or @CrudController)`,
          fault: 'usage',
        });
      }

      const operation = this.reflectionService.getOperation(handler);

      if (!operation) {
        throw new CrudContextException({
          message: `No CRUD operation defined for ${target.name}.${handler.name}`,
          fault: 'usage',
        });
      }

      const route = this.getRouteOptions(target, handler, operation);

      // Only computed for the operations `If-Match` governs — a read with
      // a stale (or malformed) `If-Match` is simply not evaluated, rather
      // than 400ing a GET for a precondition it was never going to check.
      const precondition = PRECONDITION_OPERATIONS.has(operation)
        ? parseIfMatch(req.headers['if-match'])
        : undefined;

      if (route.requireVersion && precondition?.version === undefined) {
        // `If-Match: *` deliberately does not satisfy this: it states no
        // version at all, which is exactly the blind write this flag
        // exists to forbid.
        throw new CrudPreconditionRequiredException(entity);
      }

      let versionColumn: string | undefined;

      if (precondition?.version !== undefined) {
        // A hand-decorated `@CrudController` using a custom resolver never
        // registers an adapter provider under the dynamic token
        // (`ConfigurableCrudBuilder` is what wires that up) — from the
        // client's perspective that's indistinguishable from the entity
        // having no version column, so both fail the same way.
        versionColumn = this.lookupVersionColumn(entity);

        if (!versionColumn) {
          throw new BadRequestException(
            `Entity "${entity}" has no version column; If-Match cannot be honored`,
          );
        }
      }

      const result: CrudContextInterface<T> = {
        entity,
        operation,
        action: operationToAction(operation),
        params: parser.getRouteParams(),
        query: parser.getParsedQuery(),
        options: {
          query: ctxOptions.query,
          params: ctxOptions.params,
          route,
        },
        precondition,
        versionColumn,
      };

      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // Genuinely unexpected: query/param parsing errors are HttpExceptions
      // and already rethrown above, so anything reaching here is a bug or
      // an infrastructure failure, not something the caller did.
      throw new CrudContextException({
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        originalError: error,
      });
    }
  }

  // Broad on purpose: `ModuleRef.get` has no non-throwing form, and no
  // public exception type to narrow the catch to.
  private lookupVersionColumn(entity: string): string | undefined {
    try {
      return resolveCrudAdapter(this.moduleRef, entity).versionColumn();
    } catch {
      return undefined;
    }
  }

  attach(context: ExecutionContext): void {
    const target = context.getClass();
    const handler = context.getHandler();

    if (
      !this.reflectionService.getEntity(target) ||
      !this.reflectionService.getOperation(handler)
    ) {
      return;
    }

    const request = context.switchToHttp().getRequest();
    const ctx = getAppContext(request);
    const resolved = this.resolve(context);
    ctx.defineOverlay(CrudCtx, resolved);
  }

  private getRouteOptions(
    target: ControllerTarget,
    handler: MethodHandler,
    operation: Operation,
  ): CrudRouteOptionsInterface<T> {
    const queryOptions = this.reflectionService.getQuery(handler);
    const commandOptions = this.reflectionService.getCommand(handler);

    const routeOptions: CrudRouteOptionsInterface<T> = {
      query: queryOptions?.resolved,
      queryHandler: this.reflectionService.getQueryHandler(handler),
      command: commandOptions?.resolved,
      commandHandler: this.reflectionService.getCommandHandler(handler),
    };

    switch (operation) {
      case Operation.Delete:
      case Operation.SoftDelete:
        routeOptions.returnDeleted = this.reflectionService.getReturnDeleted(
          target,
          handler,
        );
        break;
      case Operation.Restore:
        routeOptions.returnRestored = this.reflectionService.getReturnRestored(
          target,
          handler,
        );
        break;
    }

    if (PRECONDITION_OPERATIONS.has(operation)) {
      routeOptions.requireVersion = this.reflectionService.getRequireVersion(
        target,
        handler,
      );
    }

    return routeOptions;
  }
}
