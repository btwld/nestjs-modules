import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { AppContextHost, Ctx } from '@concepta/nestjs-core';
import {
  InjectDynamicRepository,
  type RepositoryInterface,
} from '@concepta/nestjs-repository';

import { type InvoiceEntity } from './invoice.entities.js';
import { INVOICES } from './invoice.rules.js';

@Controller('invoices')
export class InvoiceController {
  constructor(
    @InjectDynamicRepository(INVOICES)
    private readonly invoices: RepositoryInterface<InvoiceEntity>,
  ) {}

  /** `?include=customer` joins each invoice's customer. */
  @Get()
  list(@Ctx() ctx: AppContextHost, @Query('include') include?: string) {
    return this.invoices.find({
      join: include === 'customer' ? [{ relation: 'customer' }] : undefined,
      ctx,
    });
  }

  /** Creates the invoice and its `lines` in one call. */
  @Post()
  create(@Ctx() ctx: AppContextHost, @Body() body: Partial<InvoiceEntity>) {
    return this.invoices.create(body, { ctx });
  }
}
