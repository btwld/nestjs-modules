import { type PlainLiteralObject } from '@nestjs/common';

import { type AuthorityDecision } from './authority-decision.type.js';
import { type AuthorityRequestInterface } from './authority-request.interface.js';

/**
 * Decides which actions an actor may take on which objects, and on which of
 * their columns.
 *
 * `Column` narrows the column names, for an authority written for one
 * entity (`AuthorityInterface<keyof Order & string>`); one serving many
 * entities keeps `string`.
 *
 * Every check in one call should agree: an implementation that can change at
 * runtime answers a call from one snapshot, kept on `ctx`.
 */
export interface AuthorityInterface<Column extends string = string> {
  decide(
    ctx: PlainLiteralObject,
    request: AuthorityRequestInterface<Column>,
  ): AuthorityDecision<Column> | Promise<AuthorityDecision<Column>>;

  /**
   * Told, at startup, each subject it governs and its columns: a repository
   * calls it with the key and column names of every entity it attaches this
   * authority to. Optional; an authority that checks the names its rules use
   * learns them here. Without it, refusing a name it doesn't know, which a
   * misspelled deny would otherwise not deny, is the authority's own job.
   */
  govern?(subject: string, columns: readonly string[]): void;
}
