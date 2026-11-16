import { type Actor } from '@concepta/nestjs-core';

/**
 * The verbs each role holds on everyone's documents. Your own data, kept
 * beside the grants: grants say which verbs a role holds, this says on
 * whose documents. A role not listed for a verb holds it only on the
 * documents its holder owns.
 */
export const EVERYONES_DOCUMENTS: Readonly<Record<string, readonly string[]>> =
  {
    manager: ['read'],
    admin: ['read', 'update'],
  };

/**
 * Whether the actor may take `action` only on documents they own: a person
 * is limited unless one of their roles holds the action on everyone's
 * documents, and anyone who is not a person is limited too.
 */
export function ownDocumentsOnly(actor: Actor, action: string): boolean {
  return (
    actor.kind !== 'role' ||
    !actor.roles.some((role) => EVERYONES_DOCUMENTS[role]?.includes(action))
  );
}
