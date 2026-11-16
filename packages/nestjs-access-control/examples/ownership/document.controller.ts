import { Body, Controller, Get, Param, Patch } from '@nestjs/common';

import {
  AccessControlQuery,
  AccessControlReadMany,
  AccessControlReadOne,
  AccessControlService,
  AccessControlUpdateOne,
  accessFieldPaths,
} from '@concepta/nestjs-access-control';
import { ActorCtx, type AppContextHost, Ctx } from '@concepta/nestjs-core';

import { type DocumentInterface } from './document.interface.js';
import { DocumentStore } from './document.store.js';
import { OwnDocumentQuery } from './own-document.query.js';
import { ownDocumentsOnly } from './own-documents-only.util.js';

@Controller('documents')
export class DocumentController {
  constructor(
    private readonly documents: DocumentStore,
    private readonly accessControl: AccessControlService,
  ) {}

  /**
   * Everyone's documents, or only their own for a caller limited to theirs.
   * In an application on `@concepta/nestjs-repository`, row scope narrows
   * the rows instead, for every read the same way.
   */
  @Get()
  @AccessControlReadMany('document')
  list(@Ctx() ctx: AppContextHost): DocumentInterface[] {
    const actor = ctx.with(ActorCtx);

    if (!ownDocumentsOnly(actor, 'read')) {
      return this.documents.all();
    }

    return actor.kind === 'role' && actor.userId
      ? this.documents.ownedBy(actor.userId)
      : [];
  }

  @Get(':id')
  @AccessControlReadOne('document')
  @AccessControlQuery({ service: OwnDocumentQuery })
  one(@Param('id') id: string): DocumentInterface {
    return this.documents.find(id);
  }

  @Patch(':id')
  @AccessControlUpdateOne('document')
  @AccessControlQuery({ service: OwnDocumentQuery })
  async update(
    @Ctx() ctx: AppContextHost,
    @Param('id') id: string,
    @Body() changes: Partial<Pick<DocumentInterface, 'title' | 'ownerId'>>,
  ): Promise<DocumentInterface> {
    // Checked under the caller's rules for `update`: a member may not
    // change the owner, an admin may.
    await this.accessControl.assertFields(ctx, accessFieldPaths(changes));

    return this.documents.update(id, changes);
  }
}
