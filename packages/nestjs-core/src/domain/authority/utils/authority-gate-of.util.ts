/**
 * The decision still pending behind a refusal: the first `reason` among the
 * denies that apply, in the order they were given, but only when every one
 * of them has one. A deny without a reason is final, so a refusal it takes
 * part in is never reported as pending. No deny at all is a refusal with
 * nothing pending.
 *
 * @param rules - The rules that apply to the refused action and subject,
 * highest priority first, so the first given comes last. Pass only the
 * rules of the whole subject: a deny naming fields refuses those fields,
 * not the subject.
 */
export function authorityGateOf(
  rules: readonly { readonly inverted: boolean; readonly reason?: string }[],
): string | undefined {
  const reasons = rules
    .filter((rule) => rule.inverted)
    .map((rule) => rule.reason);

  return reasons.every((reason) => reason !== undefined)
    ? reasons.at(-1)
    : undefined;
}
