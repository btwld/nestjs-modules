/**
 * The decision still pending behind a refusal: the `pending` gate of the
 * first deny given, among those that refused, but only when every one of
 * them is pending and an allow among `rules` covers what was refused, so
 * closing the gates would let it through. A deny that isn't pending is
 * final, so a refusal it takes part in is never reported as pending; with no
 * allow, nothing is pending either.
 *
 * @param rules - Every rule that applies to what was refused, as written
 * (`AuthorityRuleInterface`), allows included, highest priority first, so
 * the first given comes last: for a refused action, the rules of the whole
 * subject; for a refused field or column, the rules covering it and the
 * denies beneath it.
 */
export function authorityGateOf(
  rules: readonly { readonly inverted?: boolean; readonly pending?: string }[],
): string | undefined {
  if (!rules.some((rule) => rule.inverted !== true)) {
    return undefined;
  }

  const gates = rules
    .filter((rule) => rule.inverted === true)
    .map((rule) => rule.pending);

  return gates.every((gate) => gate !== undefined) ? gates.at(-1) : undefined;
}
