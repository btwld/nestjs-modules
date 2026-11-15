import { AuthorityActionRefusedException } from '../../../../domain/authority/exceptions/authority-action-refused.exception.js';
import { type Actor } from '../../../../domain/authority/interfaces/actor.type.js';
import { type AuthorityRequestInterface } from '../../../../domain/authority/interfaces/authority-request.interface.js';
import { type AuthorityInterface } from '../../../../domain/authority/interfaces/authority.interface.js';
import { ActorCtx } from '../../../context/actor.context.js';
import { AppContextHost } from '../../../context/app-context.host.js';
import { assertAuthority } from '../assert-authority.util.js';

const CLERK: Actor = { kind: 'role', roles: ['clerk'], userId: 'u-1' };

function acting(actor: Actor): AppContextHost {
  const ctx = new AppContextHost();
  ctx.defineOverlay(ActorCtx, actor, { immutable: true });
  return ctx;
}

/** Allows only `allowed` (`action subject`), refusing `gated` with a gate. */
function authority(...allowed: string[]): AuthorityInterface & {
  requests: AuthorityRequestInterface[];
} {
  const requests: AuthorityRequestInterface[] = [];
  return {
    requests,
    decide: (_ctx, request) => {
      requests.push(request);
      if (allowed.includes(`${request.action} ${request.subject}`)) {
        return { effect: 'allow' };
      }
      return request.subject === 'gated'
        ? { effect: 'refuse', gate: 'FIN-12' }
        : { effect: 'refuse' };
    },
  };
}

describe(assertAuthority.name, () => {
  it('lets an allowed action through, asking for the actor with no columns', async () => {
    const deciding = authority('void invoice');

    await expect(
      assertAuthority(acting(CLERK), deciding, 'invoice', 'void'),
    ).resolves.toBeUndefined();
    expect(deciding.requests).toEqual([
      { actor: CLERK, subject: 'invoice', action: 'void', columns: [] },
    ]);
  });

  it('refuses an action the authority refuses, with its gate', async () => {
    const error = await assertAuthority(
      acting(CLERK),
      authority('void invoice'),
      'gated',
      'void',
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AuthorityActionRefusedException);
    expect(error).toMatchObject({
      message: 'Not allowed to void gated',
      context: {
        subject: 'gated',
        action: 'void',
        refusal: 'authority',
        actor: CLERK,
        gate: 'FIN-12',
      },
    });
  });

  it('refuses when nobody is acting, never asking the authority', async () => {
    const deciding = authority('void invoice');

    const error = await assertAuthority(
      new AppContextHost(),
      deciding,
      'invoice',
      'void',
    ).catch((e: unknown) => e);

    expect(error).toMatchObject({
      context: { refusal: 'no-actor', subject: 'invoice', action: 'void' },
    });
    expect(deciding.requests).toEqual([]);
  });
});
