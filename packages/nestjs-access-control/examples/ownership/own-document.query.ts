import { Injectable } from '@nestjs/common';

import {
  type AccessControlContextInterface,
  type CanAccess,
} from '@concepta/nestjs-access-control';

import { routeParam } from '../shared/route-param.util.js';

import { DocumentStore } from './document.store.js';
import { ownDocumentsOnly } from './own-documents-only.util.js';

/**
 * Lets a caller limited to their own documents for the route's action reach
 * only the document they own; anyone else is let through.
 *
 * A document that does not exist is refused like someone else's, so the
 * answer does not tell a limited caller which ids exist.
 */
@Injectable()
export class OwnDocumentQuery implements CanAccess {
  constructor(private readonly documents: DocumentStore) {}

  async canAccess(context: AccessControlContextInterface): Promise<boolean> {
    const actor = context.getActor();

    if (!ownDocumentsOnly(actor, context.getQuery().action)) {
      return true;
    }

    const id = routeParam(context, 'id');

    return (
      actor.kind === 'role' &&
      actor.userId !== undefined &&
      id !== undefined &&
      this.documents.get(id)?.ownerId === actor.userId
    );
  }
}
