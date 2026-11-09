export interface CausalPairInterface {
  correlationId: string;
  causationId: string;
}

/**
 * Abstracts over *where* the correlation/causation pair for the current
 * logical operation lives — an HTTP request context, a test fixture, a
 * seed script. {@link createCausalContext} is written once against this
 * interface and never touches the concrete source.
 */
export interface CausalContextResolver {
  /** Returns the pair if one is already established, else `undefined`. */
  resolve(): CausalPairInterface | undefined;
  /**
   * Records a freshly synthesized pair so a later call through the same
   * resolver instance is consistent. Not a substitute for seeding the
   * pair at the true root of a request.
   */
  memoize(pair: CausalPairInterface): void;
}
