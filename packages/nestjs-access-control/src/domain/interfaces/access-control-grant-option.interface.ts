export interface AccessControlGrantOptionInterface {
  resource: string;
  /**
   * The action, without possession: `read`, `update`, or one of your own,
   * such as `approve`.
   */
  action: string;
}
