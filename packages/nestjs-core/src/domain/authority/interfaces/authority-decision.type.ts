import { type AuthorityAllowInterface } from './authority-allow.interface.js';
import { type AuthorityRefuseInterface } from './authority-refuse.interface.js';

export type AuthorityDecision =
  AuthorityAllowInterface | AuthorityRefuseInterface;
