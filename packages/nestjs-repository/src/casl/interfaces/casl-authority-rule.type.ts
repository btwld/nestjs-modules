import { type RawRule } from '@casl/ability';

/**
 * One CASL rule: an action (`create`, `read`, `update` or `delete`) on an
 * object (an entity's `forRoot()` key), optionally limited to some of its
 * columns (`fields`), allowing or, with `inverted`, denying. A deny's
 * `reason` is reported as the decision still pending. CASL's `manage` and
 * `all` mean every action and every object.
 */
export type CaslAuthorityRule = RawRule<[string, string], unknown>;
