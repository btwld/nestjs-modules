import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import {
  type AccessRuleInterface,
  accessRuleProblems,
} from '@concepta/nestjs-access-control';

const RULES_SUBJECT = 'user-rules';

/**
 * Rules kept in storage, standing in for your database: a template per
 * role, plus each user's own rules on top. An admin screen edits the user
 * rules; the next request sees the change.
 */
@Injectable()
export class PermissionStore {
  private readonly roleRules: Record<string, AccessRuleInterface[]> = {
    analyst: [
      { action: 'read:any', subject: 'report' },
      {
        action: 'read:any',
        subject: 'report',
        fields: ['payroll'],
        inverted: true,
        reason: 'payroll is for HR',
      },
    ],
    admin: [
      { action: 'read:any', subject: 'report' },
      { action: ['read:any', 'update:any'], subject: RULES_SUBJECT },
    ],
  };

  private userRules = new Map<string, AccessRuleInterface[]>();

  rulesFor(roles: readonly string[], userId?: string): AccessRuleInterface[] {
    return [
      ...roles.flatMap((role) => this.roleRules[role] ?? []),
      ...((userId && this.userRules.get(userId)) || []),
    ];
  }

  userRulesOf(userId: string): AccessRuleInterface[] {
    return this.userRules.get(userId) ?? [];
  }

  /**
   * Replaces a user's own rules on behalf of `editorId`. Refused, before
   * anything is saved:
   *
   * - an edit of the editor's own rules, so nobody raises their own access;
   * - rules that could not be used, with every problem listed;
   * - rules on `user-rules`: the power to edit rules comes from a role, so
   *   an editor cannot hand it to someone else one user at a time.
   */
  setUserRules(
    editorId: string,
    userId: string,
    rules: AccessRuleInterface[],
  ): void {
    if (editorId === userId) {
      throw new ForbiddenException('Nobody edits their own rules');
    }

    const problems = accessRuleProblems(rules, `user ${userId}`);

    if (problems.length) {
      throw new BadRequestException(problems);
    }

    const granting = rules.flatMap((rule, index) =>
      [rule.subject].flat().includes(RULES_SUBJECT)
        ? [`user ${userId} rule ${index}: ${RULES_SUBJECT} comes from a role`]
        : [],
    );

    if (granting.length) {
      throw new BadRequestException(granting);
    }

    this.userRules = new Map(this.userRules).set(userId, rules);
  }
}
