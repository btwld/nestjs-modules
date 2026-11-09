import { UserPasswordPolicy } from '../user-password.policy.js';

describe(UserPasswordPolicy.name, () => {
  describe('defaults', () => {
    const policy = new UserPasswordPolicy();

    it('should not restrict reuse by default', () => {
      expect(policy.reuseRestricted).toBe(false);
    });

    it('should not require current password by default', () => {
      expect(policy.requireCurrent).toBe(false);
    });

    it('should return undefined for reuseLimitDate when not restricted', () => {
      expect(policy.reuseLimitDate).toBeUndefined();
    });
  });

  describe('custom settings', () => {
    it('should restrict reuse when reuseAfterDays > 0', () => {
      const policy = new UserPasswordPolicy({ reuseAfterDays: 30 });

      expect(policy.reuseRestricted).toBe(true);
    });

    it('should return a date in the past for reuseLimitDate', () => {
      const policy = new UserPasswordPolicy({ reuseAfterDays: 30 });
      const limitDate = policy.reuseLimitDate;

      expect(limitDate).toBeInstanceOf(Date);
      expect(limitDate!.getTime()).toBeLessThan(Date.now());

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const diffMs = Math.abs(limitDate!.getTime() - thirtyDaysAgo.getTime());
      expect(diffMs).toBeLessThan(1000);
    });

    it('should require current password when configured', () => {
      const policy = new UserPasswordPolicy({ requireCurrent: true });

      expect(policy.requireCurrent).toBe(true);
    });
  });
});
