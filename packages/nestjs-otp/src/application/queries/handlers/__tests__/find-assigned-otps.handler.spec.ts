import {
  createMockOtpEntity,
  createMockOtpRepository,
  createMockRepositoryResolver,
  DEFAULT_OTP_NAMESPACE,
  toOtpDomain,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { Otp } from '../../../../domain/aggregates/otp.js';
import { FindAssignedOtpsQuery } from '../../impl/find-assigned-otps.query.js';
import { FindAssignedOtpsHandler } from '../find-assigned-otps.handler.js';

describe(FindAssignedOtpsHandler.name, () => {
  let handler: FindAssignedOtpsHandler;
  let mockRepo: ReturnType<typeof createMockOtpRepository>;

  const ctx = {};

  beforeEach(() => {
    mockRepo = createMockOtpRepository();
    const mockResolver = createMockRepositoryResolver(mockRepo);

    handler = new FindAssignedOtpsHandler(mockResolver);
  });

  it('should return all OTPs for assignee and category', async () => {
    const otps = [
      toOtpDomain(createMockOtpEntity({ id: '1' })),
      toOtpDomain(createMockOtpEntity({ id: '2' })),
    ];
    mockRepo.findAllByAssigneeAndCategory.mockResolvedValue(otps);

    const query = new FindAssignedOtpsQuery(ctx, DEFAULT_OTP_NAMESPACE, {
      assigneeId: 'test-assignee',
      category: 'test-category',
    });

    const result = await handler.execute(query);

    expect(result).toHaveLength(2);
    expect(result[0]).toBeInstanceOf(Otp);
  });

  it('should return empty array when none found', async () => {
    mockRepo.findAllByAssigneeAndCategory.mockResolvedValue([]);

    const query = new FindAssignedOtpsQuery(ctx, DEFAULT_OTP_NAMESPACE, {
      assigneeId: 'test-assignee',
      category: 'test-category',
    });

    const result = await handler.execute(query);

    expect(result).toHaveLength(0);
  });
});
