import {
  ExecutionContext,
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  PlainLiteralObject,
} from '@nestjs/common';

import {
  ContextOverlayInterceptor,
  getAppContext,
  Operation,
  OverlayRef,
} from '@concepta/nestjs-core';

import { ControllerTarget, MethodHandler } from '../../crud.types.js';
import { CrudContextException } from '../exceptions/crud-context.exception.js';
import { CrudQueryParser } from '../request/crud-query.parser.js';
import { CrudMetaview } from '../services/crud-metaview.service.js';
import { operationToAction } from '../utils/crud-infra.utils.js';

import { CrudContextInterface } from './interfaces/crud-context.interface.js';
import { CrudRouteOptionsInterface } from './interfaces/crud-route-options.interface.js';

export const CrudCtx = new OverlayRef<'withCrud', CrudContextInterface>(
  'withCrud',
);

@Injectable()
export class CrudContextOverlay<
  T extends PlainLiteralObject = PlainLiteralObject,
> extends ContextOverlayInterceptor {
  readonly ref = CrudCtx;

  constructor(
    @Inject(forwardRef(() => CrudMetaview))
    private reflectionService: CrudMetaview<T>,
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

    return routeOptions;
  }
}
