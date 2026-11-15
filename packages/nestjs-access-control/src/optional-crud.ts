/**
 * `@concepta/nestjs-access-control/optional/crud`
 *
 * Checks generated CRUD routes against the grant their route let the call
 * in on. Requires the optional peer dependency `@concepta/nestjs-crud`;
 * nothing on the package's main entry point imports it.
 */

export { AccessControlCrudPolicy } from './gateways/http/access-control-crud.policy.js';
