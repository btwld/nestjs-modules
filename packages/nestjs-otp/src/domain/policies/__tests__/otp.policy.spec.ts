import { OtpTypeNotDefinedException } from '../../exceptions/otp-type-not-defined.exception.js';
import { type OtpTypeServiceInterface } from '../../interfaces/otp-type-service.interface.js';
import { OtpPolicy } from '../otp.policy.js';

describe(OtpPolicy.name, () => {
  const uuidType: OtpTypeServiceInterface = {
    generator: () => 'generated-passcode',
    validator: () => true,
  };

  describe('resolveTypeService', () => {
    it('should return the registered type service', () => {
      const policy = new OtpPolicy({ types: { uuid: uuidType } });

      expect(policy.resolveTypeService('uuid')).toBe(uuidType);
    });

    it('should throw OtpTypeNotDefinedException when the type is not registered', () => {
      const policy = new OtpPolicy({ types: {} });

      expect(() => policy.resolveTypeService('unknown')).toThrow(
        OtpTypeNotDefinedException,
      );
    });

    it('should throw OtpTypeNotDefinedException when no types are configured at all', () => {
      const policy = new OtpPolicy();

      expect(() => policy.resolveTypeService('uuid')).toThrow(
        OtpTypeNotDefinedException,
      );
    });
  });

  describe('resolveDuplicateStrategy', () => {
    it('should default to DEACTIVATE when nothing is configured', () => {
      const policy = new OtpPolicy();

      expect(policy.resolveDuplicateStrategy()).toBe('DEACTIVATE');
    });

    it('should use the configured setting when no override is given', () => {
      const policy = new OtpPolicy({ duplicateStrategy: 'ALLOW' });

      expect(policy.resolveDuplicateStrategy()).toBe('ALLOW');
    });

    it('should let an override win over the configured setting', () => {
      const policy = new OtpPolicy({ duplicateStrategy: 'ALLOW' });

      expect(policy.resolveDuplicateStrategy('DEACTIVATE')).toBe('DEACTIVATE');
    });
  });

  describe('resolveKeepHistoryDays', () => {
    it('should return undefined when nothing is configured', () => {
      const policy = new OtpPolicy();

      expect(policy.resolveKeepHistoryDays()).toBeUndefined();
    });

    it('should return the configured setting when no override is given', () => {
      const policy = new OtpPolicy({ keepHistoryDays: 30 });

      expect(policy.resolveKeepHistoryDays()).toBe(30);
    });

    it('should return 0 rather than falling through to the configured setting', () => {
      const policy = new OtpPolicy({ keepHistoryDays: 30 });

      expect(policy.resolveKeepHistoryDays(0)).toBe(0);
    });

    it('should let an override win over the configured setting', () => {
      const policy = new OtpPolicy({ keepHistoryDays: 30 });

      expect(policy.resolveKeepHistoryDays(7)).toBe(7);
    });
  });

  describe('resolveRateLimit', () => {
    it('should return undefined when nothing is configured', () => {
      const policy = new OtpPolicy();

      expect(policy.resolveRateLimit()).toBeUndefined();
    });

    it('should return the configured rate limit when no overrides are given', () => {
      const policy = new OtpPolicy({ rateSeconds: 60, rateThreshold: 3 });

      expect(policy.resolveRateLimit()).toEqual({
        rateSeconds: 60,
        rateThreshold: 3,
      });
    });

    it('should return undefined when the configured rateSeconds is 0', () => {
      const policy = new OtpPolicy({ rateSeconds: 0, rateThreshold: 3 });

      expect(policy.resolveRateLimit()).toBeUndefined();
    });

    it('should return undefined when an override sets rateThreshold to 0', () => {
      const policy = new OtpPolicy({ rateSeconds: 60, rateThreshold: 3 });

      expect(policy.resolveRateLimit({ rateThreshold: 0 })).toBeUndefined();
    });

    it('should let overrides win over configured settings independently', () => {
      const policy = new OtpPolicy({ rateSeconds: 60, rateThreshold: 3 });

      expect(policy.resolveRateLimit({ rateSeconds: 120 })).toEqual({
        rateSeconds: 120,
        rateThreshold: 3,
      });
    });
  });
});
