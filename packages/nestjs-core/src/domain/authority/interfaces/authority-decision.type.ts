import { type AuthorityAllowInterface } from './authority-allow.interface.js';
import { type AuthorityRefuseInterface } from './authority-refuse.interface.js';

/**
 * What an authority answers for one request: an allow, naming the columns
 * it allows, or a refusal. Tell them apart by `effect`.
 */
export type AuthorityDecision<Column extends string = string> =
  AuthorityAllowInterface<Column> | AuthorityRefuseInterface;
