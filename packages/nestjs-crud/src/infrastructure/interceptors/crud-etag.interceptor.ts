import { from, Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { getAppContext, isObject } from '@concepta/nestjs-core';

import { crudIsPaginatedHelper } from '../utils/crud-is-paginated.helper.js';
import { resolveCrudAdapter } from '../utils/resolve-crud-adapter.js';

import { CrudCtx } from './crud-context.overlay.js';

/**
 * A response object carrying a `setHeader`/`header` method — covers both
 * Express's `Response` and Fastify's `FastifyReply` without depending on
 * either as a hard dependency.
 */
interface ResponseWithHeader {
  setHeader?(name: string, value: string): unknown;
  header?(name: string, value: string): unknown;
}

/**
 * Narrows to a plain, indexable object — `isObject` alone narrows only to
 * `object`, which has no index signature.
 */
function isIndexable(value: unknown): value is Record<string, unknown> {
  return isObject(value) && !Array.isArray(value);
}

/**
 * Emits `ETag` on single-resource responses, derived from the entity's
 * version column — never from a `version` key in the body, so a resource
 * that happens to expose an unrelated field of that name never gets a
 * bogus validator. See #472.
 *
 * Must run inner to `CrudSerializeInterceptor` (registered after it in
 * `CrudInit()`) so it reads the raw entity before response-schema
 * serialization strips fields off it.
 */
@Injectable()
export class CrudETagInterceptor implements NestInterceptor {
  constructor(private readonly moduleRef: ModuleRef) {}

  /**
   * @internal
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next
      .handle()
      .pipe(
        mergeMap((response: unknown) =>
          from(Promise.resolve(this.applyETag(context, response))),
        ),
      );
  }

  private applyETag(context: ExecutionContext, response: unknown): unknown {
    if (!isIndexable(response) || crudIsPaginatedHelper(response)) {
      // No ETag on List/CreateBatch: HTTP has no per-item entity-tag
      // inside a collection body.
      return response;
    }

    const request = context.switchToHttp().getRequest();
    const ctx = getAppContext(request);

    if (!ctx.supports(CrudCtx)) {
      return response;
    }

    const crudCtx = ctx.with(CrudCtx);

    // The tag is a row validator and does not vary with representation —
    // suppress it when the client narrowed the response with `?select=`,
    // or a client that cached the full body and later requested a
    // narrowed one with `If-None-Match` would get a bodiless 304 for the
    // wrong shape. `join` isn't checked: it's fixed per route by
    // `@CrudJoin()`, not settable per-request, so it can't vary the
    // representation across two calls to the same route.
    if (crudCtx.query.fields?.length) {
      return response;
    }

    const versionColumn =
      crudCtx.versionColumn ?? this.lookupVersionColumn(crudCtx.entity);

    if (!versionColumn) {
      return response;
    }

    const value = response[versionColumn];

    if (value === undefined) {
      return response;
    }

    const res = context.switchToHttp().getResponse<ResponseWithHeader>();

    if (typeof res.setHeader === 'function') {
      res.setHeader('ETag', `"${value}"`);
    } else if (typeof res.header === 'function') {
      res.header('ETag', `"${value}"`);
    }

    return response;
  }

  /**
   * ETag is best-effort: a hand-decorated `@CrudController` using a custom
   * resolver never registers an adapter provider under the dynamic token
   * (`ConfigurableCrudBuilder` is what wires that up), so resolution can
   * legitimately fail. Never let that turn a successful response into a
   * 500 — just skip the header. Broad on purpose: `ModuleRef.get` has no
   * non-throwing form, and no public exception type to narrow to.
   */
  private lookupVersionColumn(entity: string): string | undefined {
    try {
      return resolveCrudAdapter(this.moduleRef, entity).versionColumn();
    } catch {
      return undefined;
    }
  }
}
