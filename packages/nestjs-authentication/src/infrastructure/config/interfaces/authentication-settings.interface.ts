import { type GuardsPolicySettingsInterface } from '../../../domain/policies/guards.policy.js';
import { type JwtStrategyPolicySettingsInterface } from '../../../domain/policies/jwt-strategy.policy.js';
import { type JwtPolicySettingsInterface } from '../../../domain/policies/jwt.policy.js';
import { type LocalStrategyPolicySettingsInterface } from '../../../domain/policies/local-strategy.policy.js';
import { type RecoveryPolicySettingsInterface } from '../../../domain/policies/recovery.policy.js';
import { type RefreshStrategyPolicySettingsInterface } from '../../../domain/policies/refresh-strategy.policy.js';
import { type VerifyPolicySettingsInterface } from '../../../domain/policies/verify.policy.js';

export interface AuthenticationStrategiesSettingsInterface {
  jwt?: JwtStrategyPolicySettingsInterface;
  local?: LocalStrategyPolicySettingsInterface;
  refresh?: RefreshStrategyPolicySettingsInterface;
}

export interface AuthenticationMfaSettingsInterface {
  recovery?: RecoveryPolicySettingsInterface;
  verify?: VerifyPolicySettingsInterface;
}

export interface AuthenticationSettingsInterface {
  /**
   * JWT token signing settings (access/refresh secrets, expiry, etc.)
   */
  jwt?: JwtPolicySettingsInterface;

  /**
   * Passport strategy settings (jwt, local, refresh).
   * Presence of a strategy key activates that strategy.
   */
  strategies?: AuthenticationStrategiesSettingsInterface;

  /**
   * Multi-factor authentication settings (recovery, verify).
   * Presence of a key activates that MFA feature.
   */
  mfa?: AuthenticationMfaSettingsInterface;

  /**
   * Guard enablement and disable callback settings.
   */
  guards?: GuardsPolicySettingsInterface;
}
