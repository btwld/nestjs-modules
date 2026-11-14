import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';

import { AppContextHost, Ctx } from '@concepta/nestjs-core';
import {
  InjectDynamicRepository,
  type RepositoryInterface,
  Where,
} from '@concepta/nestjs-repository';

import { type DocumentEntity } from './document.entity.js';
import { type StoredRuleEntity } from './stored-rule.entity.js';
import { DOCUMENT, RULE } from './stored-rules.js';

/** An admin edits the rules; the next request is decided by them. */
@Controller('rules')
export class RulesController {
  constructor(
    @InjectDynamicRepository(RULE)
    private readonly rules: RepositoryInterface<StoredRuleEntity>,
  ) {}

  @Post()
  grant(@Ctx() ctx: AppContextHost, @Body() body: Partial<StoredRuleEntity>) {
    return this.rules.create(body, { ctx });
  }

  @Delete(':id')
  async revoke(@Ctx() ctx: AppContextHost, @Param('id') id: string) {
    const rule = await this.rules.findOne({ where: Where.eq('id', id), ctx });
    if (!rule) throw new NotFoundException();
    return this.rules.delete(rule, { ctx });
  }
}

@Controller('documents')
export class DocumentController {
  constructor(
    @InjectDynamicRepository(DOCUMENT)
    private readonly documents: RepositoryInterface<DocumentEntity>,
  ) {}

  @Get()
  list(@Ctx() ctx: AppContextHost) {
    return this.documents.find({ ctx });
  }
}
