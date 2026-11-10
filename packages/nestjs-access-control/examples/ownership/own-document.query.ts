import { Injectable } from '@nestjs/common';

import {
  type AccessControlContextInterface,
  type CanAccess,
  PossessionEnum,
} from '@concepta/nestjs-access-control';

import { routeParam } from '../shared/route-param.util.js';

import { DocumentStore } from './document.store.js';

/**
 * Decides whether a caller who got through on an `own` grant owns the
 * document the route names. A caller with an `any` grant needs no check.
 *
 * A document that does not exist is refused like someone else's, so the
 * answer does not tell a caller on `own` which ids exist.
 */
@Injectable()
export class OwnDocumentQuery implements CanAccess {
  constructor(private readonly documents: DocumentStore) {}

  async canAccess(context: AccessControlContextInterface): Promise<boolean> {
    if (context.getQuery().possession === PossessionEnum.ANY) {
      return true;
    }

    const actor = context.getActor();
    const id = routeParam(context, 'id');

    return (
      actor.kind === 'role' &&
      id !== undefined &&
      this.documents.get(id)?.ownerId === actor.userId
    );
  }
}
