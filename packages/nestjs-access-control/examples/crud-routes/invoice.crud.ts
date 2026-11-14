import { z } from 'zod';

import {
  AccessControlCreateMany,
  AccessControlCreateOne,
  AccessControlDeleteOne,
  AccessControlReadMany,
  AccessControlReadOne,
  AccessControlReplaceOne,
  AccessControlUpdateOne,
  type AccessGrants,
} from '@concepta/nestjs-access-control';
import { Operation } from '@concepta/nestjs-core';
import {
  ConfigurableCrudBuilder,
  createBatchSchema,
  paginatedSchema,
} from '@concepta/nestjs-crud';

import { type InvoiceEntity } from './invoice.entity.js';

export const INVOICE = 'invoice';

/**
 * Clerks enter and correct invoices, but never see the notes, and never
 * change an amount once entered. Managers do everything.
 */
export const INVOICE_GRANTS: AccessGrants = {
  'role:clerk': [
    { action: ['create', 'read', 'update'], subject: INVOICE },
    {
      action: 'read',
      subject: INVOICE,
      fields: ['notes'],
      inverted: true,
    },
    {
      action: 'update',
      subject: INVOICE,
      fields: ['amount'],
      inverted: true,
    },
  ],
  'role:manager': [
    { action: ['create', 'read', 'update', 'delete'], subject: INVOICE },
  ],
};

/** Which roles each demo user has. */
export const USER_ROLES: Record<string, string[]> = {
  ada: ['clerk'],
  grace: ['manager'],
};

const invoiceSchema = z.object({
  id: z.string(),
  customer: z.string(),
  amount: z.number(),
  notes: z.string(),
});
const invoiceWriteSchema = invoiceSchema.omit({ id: true });
const invoiceUpdateSchema = invoiceWriteSchema.partial();

/**
 * Generated CRUD routes, each declaring the grant it needs. The request
 * policy registered on `CrudModule` then checks each request's query and
 * body under that grant.
 */
export const { controllers, providers } =
  new ConfigurableCrudBuilder<InvoiceEntity>({
    controller: {
      path: 'invoices',
      entity: INVOICE,
      request: { body: invoiceWriteSchema },
      response: {
        resource: invoiceSchema,
        paginated: paginatedSchema(invoiceSchema),
      },
    },
    operations: [
      {
        operation: Operation.List,
        extraDecorators: [AccessControlReadMany(INVOICE)],
      },
      {
        operation: Operation.Read,
        extraDecorators: [AccessControlReadOne(INVOICE)],
      },
      {
        operation: Operation.Create,
        extraDecorators: [AccessControlCreateOne(INVOICE)],
      },
      {
        operation: Operation.CreateBatch,
        request: { bodyBatch: createBatchSchema(invoiceWriteSchema) },
        response: { serialization: { resource: z.array(invoiceSchema) } },
        extraDecorators: [AccessControlCreateMany(INVOICE)],
      },
      {
        operation: Operation.Update,
        request: { body: invoiceUpdateSchema },
        extraDecorators: [AccessControlUpdateOne(INVOICE)],
      },
      {
        operation: Operation.Replace,
        extraDecorators: [AccessControlReplaceOne(INVOICE)],
      },
      {
        operation: Operation.Delete,
        extraDecorators: [AccessControlDeleteOne(INVOICE)],
      },
    ],
  }).build();
