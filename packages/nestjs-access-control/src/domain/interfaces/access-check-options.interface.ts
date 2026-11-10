export interface AccessCheckOptionsInterface {
  /**
   * Field paths the action touches, such as the keys of a write body. Each
   * is checked as well as the resource; a deny on a field refuses the
   * action even when the resource is allowed.
   */
  fields?: string[];
}
