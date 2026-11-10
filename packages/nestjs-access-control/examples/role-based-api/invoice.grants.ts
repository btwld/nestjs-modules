import { type AccessGrants } from '@concepta/nestjs-access-control';

/**
 * What each role may do with invoices.
 */
export const invoiceGrants: AccessGrants = {
  'role:admin': [
    {
      action: ['create:any', 'read:any', 'update:any', 'delete:any'],
      subject: 'invoice',
    },
  ],
  'role:accountant': [
    { action: ['create:any', 'read:any', 'update:any'], subject: 'invoice' },
    {
      action: 'update:any',
      subject: 'invoice',
      fields: ['amount'],
      inverted: true,
      reason: 'an amount changes only through a credit note',
    },
  ],
  'role:viewer': [
    { action: 'read:any', subject: 'invoice' },
    {
      action: 'read:any',
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
