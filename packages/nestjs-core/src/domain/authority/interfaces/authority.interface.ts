import { type PlainLiteralObject } from '@nestjs/common';

import { type Actor } from './actor.type.js';
import { type AuthorityDecision } from './authority-decision.type.js';
import { type AuthorityRequestInterface } from './authority-request.interface.js';
import { type AuthorityRuleInterface } from './authority-rule.interface.js';

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

  /**
   * Whether it decides `subject`: one `govern` told it of, or one it was
   * declared to decide, the same answer for every actor. Access control decides such a subject by the
   * authority even when its `except` lists it, and fails startup on the
   * entry. Optional; without it, `except` is taken as written.
   */
  governs?(subject: string): boolean;

  /**
   * The rules it decides `actor` by on `ctx`, as written, gates and reasons
   * included. Access control's `effectiveRules` combines them with the
   * actor's for a UI, keeping only what decides; send them to a caller
   * through it, not as they are. Optional; an authority that doesn't decide
   * from rules leaves it out.
   */
  rulesFor?(
    ctx: PlainLiteralObject,
    actor: Actor,
  ):
    | AuthorityRuleInterface<string>[]
    | Promise<AuthorityRuleInterface<string>[]>;
}
