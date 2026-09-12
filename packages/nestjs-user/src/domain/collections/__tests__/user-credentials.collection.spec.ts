import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';

import { UserPasswordHistoryViolationException } from '../../exceptions/user-password-history-violation.exception.js';
import { type UserPasswordPort } from '../../ports/user-password.port.js';
import { UserCredentialsCollection } from '../user-credentials.collection.js';

describe(UserCredentialsCollection.name, () => {
  const entries = [
    { id: 'cred-1', passwordHash: 'hash1' },
    { id: 'cred-2', passwordHash: 'hash2' },
  ];

  const mockPasswordPort: DeepMockProxy<UserPasswordPort> =
    mockDeep<UserPasswordPort>();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('notReused', () => {
    it('should resolve when password is not reused', async () => {
      mockPasswordPort.validateHistory.mockResolvedValue(true);

      const collection = new UserCredentialsCollection(
        entries,
        mockPasswordPort,
      );

      await expect(collection.notReused('new-pass')).resolves.toBeUndefined();
      expect(mockPasswordPort.validateHistory).toHaveBeenCalledWith(
        'new-pass',
        entries,
      );
    });

    it('should throw when password is reused', async () => {
      mockPasswordPort.validateHistory.mockResolvedValue(false);

      const collection = new UserCredentialsCollection(
        entries,
        mockPasswordPort,
      );

      await expect(collection.notReused('old-pass')).rejects.toThrow(
        UserPasswordHistoryViolationException,
      );
    });
  });
});
