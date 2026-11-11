import { type CrudRequestPolicyInterface } from './interfaces/crud-request-policy.interface.js';

/** The default request policy: every request runs. */
export class CrudAllowAllPolicy implements CrudRequestPolicyInterface {
  check(): void {
    // Nothing to refuse.
  }
}
