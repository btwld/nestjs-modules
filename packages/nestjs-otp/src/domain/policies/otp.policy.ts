import { OtpTypeNotDefinedException } from '../exceptions/otp-type-not-defined.exception.js';
import { type OtpTypeServiceInterface } from '../interfaces/otp-type-service.interface.js';

export interface OtpPolicySettings {
  types?: { [key: string]: OtpTypeServiceInterface };
  duplicateStrategy?: 'ALLOW' | 'DEACTIVATE';
  keepHistoryDays?: number;
  rateSeconds?: number;
  rateThreshold?: number;
}

export interface OtpRateLimit {
  rateSeconds: number;
  rateThreshold: number;
}

export class OtpPolicy {
  private readonly types: { [key: string]: OtpTypeServiceInterface };

  private readonly duplicateStrategy: 'ALLOW' | 'DEACTIVATE';

  private readonly keepHistoryDays?: number;

  private readonly rateSeconds?: number;

  private readonly rateThreshold?: number;

  constructor(settings?: OtpPolicySettings) {
    const {
      types = {},
      duplicateStrategy = 'DEACTIVATE',
      keepHistoryDays,
      rateSeconds,
      rateThreshold,
    } = settings ?? {};

    this.types = types;
    this.duplicateStrategy = duplicateStrategy;
    this.keepHistoryDays = keepHistoryDays;
    this.rateSeconds = rateSeconds;
    this.rateThreshold = rateThreshold;
  }

  resolveTypeService(type: string): OtpTypeServiceInterface {
    const typeService = this.types[type];

    if (!typeService) {
      throw new OtpTypeNotDefinedException(type);
    }

    return typeService;
  }

  resolveDuplicateStrategy(
    override?: 'ALLOW' | 'DEACTIVATE',
  ): 'ALLOW' | 'DEACTIVATE' {
    return override ?? this.duplicateStrategy;
  }

  resolveKeepHistoryDays(override?: number): number | undefined {
    return override !== undefined ? override : this.keepHistoryDays;
  }

  resolveRateLimit(overrides?: {
    rateSeconds?: number;
    rateThreshold?: number;
  }): OtpRateLimit | undefined {
    const rateSeconds =
      overrides?.rateSeconds !== undefined
        ? overrides.rateSeconds
        : this.rateSeconds;
    const rateThreshold =
      overrides?.rateThreshold !== undefined
        ? overrides.rateThreshold
        : this.rateThreshold;

    if (rateSeconds && rateThreshold) {
      return { rateSeconds, rateThreshold };
    }

    return undefined;
  }
}
