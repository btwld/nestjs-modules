import { z } from 'zod';

import { Operation } from '@concepta/nestjs-core';
import {
  ConfigurableCrudBuilder,
  createBatchSchema,
  paginatedSchema,
} from '@concepta/nestjs-crud';

import { AccessControlCreateMany } from '../../gateways/decorators/access-control-create-many.decorator.js';
import { AccessControlCreateOne } from '../../gateways/decorators/access-control-create-one.decorator.js';
import { AccessControlDeleteOne } from '../../gateways/decorators/access-control-delete-one.decorator.js';
import { AccessControlReadMany } from '../../gateways/decorators/access-control-read-many.decorator.js';
import { AccessControlReadOne } from '../../gateways/decorators/access-control-read-one.decorator.js';
import { AccessControlReplaceOne } from '../../gateways/decorators/access-control-replace-one.decorator.js';
import { AccessControlRestoreOne } from '../../gateways/decorators/access-control-restore-one.decorator.js';
import { AccessControlSoftDeleteOne } from '../../gateways/decorators/access-control-soft-delete-one.decorator.js';
import { AccessControlUpdateOne } from '../../gateways/decorators/access-control-update-one.decorator.js';

import { type AttackInvoiceEntity } from './attack.entities.js';
import { INVOICE } from './attack.rules.js';

const dateSchema = z.union([z.date(), z.string()]).nullable();

/**
 * Every column, so the serializer strips nothing the repository returned:
 * what a caller may not read has to be left out below it.
 */
const lineSchema = z.object({
  id: z.string(),
  tenantId: z.string().optional(),
  invoiceId: z.string().optional(),
  sku: z.string().optional(),
  amount: z.number().optional(),
  deletedAt: dateSchema.optional(),
});

const invoiceSchema = z.object({
  id: z.string(),
  tenantId: z.string().optional(),
  number: z.string().optional(),
  amount: z.number().optional(),
  internalNotes: z.string().optional(),
  customerId: z.string().optional(),
  deletedAt: dateSchema.optional(),
  lines: z.array(lineSchema).optional(),
});

const lineWriteSchema = z.object({
  id: z.string().optional(),
  tenantId: z.string().optional(),
  sku: z.string(),
  amount: z.number(),
});

/**
 * What a client may send. It names the notes and the tenant, as a client
 * of this API may: the rules, not the schema, decide who may write them.
 */
const invoiceWriteSchema = z.object({
  number: z.string(),
  amount: z.number(),
  customerId: z.string(),
  internalNotes: z.string().optional(),
  tenantId: z.string().optional(),
  lines: z.array(lineWriteSchema).optional(),
});

const invoiceUpdateSchema = invoiceWriteSchema.partial().extend({
  deletedAt: z.string().nullable().optional(),
});

/**
 * Every generated invoice route, each declaring the grant for the action
 * its repository call takes.
 */
export const { controllers, providers } =
  new ConfigurableCrudBuilder<AttackInvoiceEntity>({
    controller: {
      path: 'invoices',
      entity: INVOICE,
      // A cascade refused halfway leaves nothing behind.
      transactional: true,
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
      {
        operation: Operation.SoftDelete,
        path: 'soft/:id',
        extraDecorators: [AccessControlSoftDeleteOne(INVOICE)],
      },
      {
        operation: Operation.Restore,
        extraDecorators: [AccessControlRestoreOne(INVOICE)],
      },
    ],
  }).build();

const customerInvoiceWriteSchema = invoiceWriteSchema.omit({
  customerId: true,
});

/**
 * A customer's invoices: the route names the customer, and CRUD writes it
 * into every invoice it creates or changes.
 */
export const customerInvoiceRoutes =
  new ConfigurableCrudBuilder<AttackInvoiceEntity>({
    controller: {
      path: 'customers/:customerId/invoices',
      entity: INVOICE,
      request: {
        body: customerInvoiceWriteSchema,
        params: {
          customerId: { field: 'customerId', type: 'uuid' },
          id: { field: 'id', type: 'uuid', primary: true },
        },
      },
      response: { resource: invoiceSchema },
    },
    operations: [
      {
        operation: Operation.Create,
        extraDecorators: [AccessControlCreateOne(INVOICE)],
      },
      {
        operation: Operation.Update,
        request: { body: customerInvoiceWriteSchema.partial() },
        extraDecorators: [AccessControlUpdateOne(INVOICE)],
      },
    ],
  }).build();

/**
 * A mistake: a response schema that requires the notes, which a clerk may
 * not read, so the repository leaves them out of a clerk's row.
 */
export const strictInvoiceRoutes =
  new ConfigurableCrudBuilder<AttackInvoiceEntity>({
    controller: {
      path: 'strict/invoices',
      entity: INVOICE,
      response: {
        resource: invoiceSchema.extend({ internalNotes: z.string() }),
      },
    },
    operations: [
      {
        operation: Operation.Read,
        extraDecorators: [AccessControlReadOne(INVOICE)],
      },
    ],
  }).build();
