import { type StandardSchemaV1 } from '@standard-schema/spec';

export interface LocalStrategyPolicySettingsInterface {
  loginSchema?: StandardSchemaV1;
  usernameField?: string;
  passwordField?: string;
}

export class LocalStrategyPolicy {
  readonly loginSchema: StandardSchemaV1 | undefined;
  readonly usernameField: string;
  readonly passwordField: string;

  constructor(settings: LocalStrategyPolicySettingsInterface) {
    const {
      loginSchema,
      usernameField = 'username',
      passwordField = 'password',
    } = settings;

    this.loginSchema = loginSchema;
    this.usernameField = usernameField;
    this.passwordField = passwordField;
  }
}
