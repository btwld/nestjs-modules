import { Body, Controller, Get, Param, Patch } from '@nestjs/common';

import {
  AccessControlOwnInHandler,
  AccessControlQuery,
  AccessControlReadMany,
  AccessControlReadOne,
  AccessControlService,
  AccessControlUpdateOne,
  accessFieldPaths,
  PossessionEnum,
} from '@concepta/nestjs-access-control';
import { type AppContextHost, Ctx } from '@concepta/nestjs-core';

import { type DocumentInterface } from './document.interface.js';
import { DocumentStore } from './document.store.js';
import { OwnDocumentQuery } from './own-document.query.js';

@Controller('documents')
export class DocumentController {
  constructor(
    private readonly documents: DocumentStore,
    private readonly accessControl: AccessControlService,
  ) {}

  /**
   * Everyone's documents for a caller the route let in on `any`, their own
   * for one on `own`. In an application on `@concepta/nestjs-repository`,
   * row scope narrows the rows instead, for every read the same way.
   */
  @Get()
  @AccessControlReadMany('document')
  @AccessControlOwnInHandler()
  list(@Ctx() ctx: AppContextHost): DocumentInterface[] {
    const decision = this.accessControl.decision(ctx);

    if (decision?.possession === PossessionEnum.ANY) {
      return this.documents.all();
    }

    return decision?.actor.kind === 'role' && decision.actor.userId
      ? this.documents.ownedBy(decision.actor.userId)
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
    // Checked under the grant the caller got in on: a member on
    // `update:own` may not change the owner, an admin on `update:any` may.
    await this.accessControl.assertFields(ctx, accessFieldPaths(changes));

    return this.documents.update(id, changes);
  }
}
