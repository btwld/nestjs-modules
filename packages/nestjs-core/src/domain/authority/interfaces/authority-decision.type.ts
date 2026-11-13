import { type AuthorityAllowInterface } from './authority-allow.interface.js';
import { type AuthorityRefuseInterface } from './authority-refuse.interface.js';

export type AuthorityDecision<Column extends string = string> =
  AuthorityAllowInterface<Column> | AuthorityRefuseInterface;
