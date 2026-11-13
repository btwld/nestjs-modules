import { z } from 'zod';

import {
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
  paginatedSchema,
} from '@concepta/nestjs-crud';

import { type InvoiceEntity } from './invoice.entity.js';

export const INVOICES = 'invoice';

/**
 * Clerks enter and correct invoices, but never see the notes, and never
 * change an amount once entered. Managers do everything.
 */
export const INVOICE_GRANTS: AccessGrants = {
  'role:clerk': [
    { action: ['create', 'read', 'update'], subject: INVOICES },
    {
      action: 'read',
      subject: INVOICES,
      fields: ['notes'],
      inverted: true,
    },
    {
      action: 'update',
      subject: INVOICES,
      fields: ['amount'],
      inverted: true,
    },
  ],
  'role:manager': [
    { action: ['create', 'read', 'update', 'delete'], subject: INVOICES },
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
      entity: INVOICES,
      request: { body: invoiceWriteSchema },
      response: {
        resource: invoiceSchema,
        paginated: paginatedSchema(invoiceSchema),
      },
    },
    operations: [
      {
        operation: Operation.List,
        extraDecorators: [AccessControlReadMany(INVOICES)],
      },
      {
        operation: Operation.Read,
        extraDecorators: [AccessControlReadOne(INVOICES)],
      },
      {
        operation: Operation.Create,
        extraDecorators: [AccessControlCreateOne(INVOICES)],
      },
      {
        operation: Operation.Update,
        request: { body: invoiceUpdateSchema },
        extraDecorators: [AccessControlUpdateOne(INVOICES)],
      },
      {
        operation: Operation.Replace,
        extraDecorators: [AccessControlReplaceOne(INVOICES)],
      },
      {
        operation: Operation.Delete,
        extraDecorators: [AccessControlDeleteOne(INVOICES)],
      },
    ],
  }).build();
