import { type AccessGrants } from '@concepta/nestjs-access-control';

/**
 * What each role may do with invoices.
 */
export const invoiceGrants: AccessGrants = {
  'role:admin': [
    { action: ['create', 'read', 'update', 'delete'], subject: 'invoice' },
  ],
  'role:accountant': [
    { action: ['create', 'read', 'update'], subject: 'invoice' },
    {
      action: 'update',
      subject: 'invoice',
      fields: ['amount'],
      inverted: true,
      reason: 'an amount changes only through a credit note',
    },
  ],
  'role:viewer': [
    { action: 'read', subject: 'invoice' },
    {
      action: 'read',
      subject: 'invoice',
      fields: ['internalNotes'],
      inverted: true,
    },
  ],
};

/**
 * Each user's roles, standing in for your user directory.
 */
export const userRoles: Record<string, string[]> = {
  ada: ['admin'],
  ben: ['accountant'],
  cy: ['viewer'],
  dee: [],
};
