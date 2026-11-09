import {
  createMockOtpEntity,
  createMockOtpRepository,
  createMockRepositoryResolver,
  DEFAULT_OTP_NAMESPACE,
  toOtpDomain,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { Otp } from '../../../../domain/aggregates/otp.js';
import { OtpNotFoundException } from '../../../exceptions/otp-not-found.exception.js';
import { GetOtpQuery } from '../../impl/get-otp.query.js';
import { GetOtpHandler } from '../get-otp.handler.js';

describe(GetOtpHandler.name, () => {
  let handler: GetOtpHandler;
  let mockRepo: ReturnType<typeof createMockOtpRepository>;

  const ctx = {};

  beforeEach(() => {
    mockRepo = createMockOtpRepository();
    const mockResolver = createMockRepositoryResolver(mockRepo);

    handler = new GetOtpHandler(mockResolver);
  });

  it('should return an OTP by id', async () => {
    const otp = toOtpDomain(createMockOtpEntity());
    mockRepo.get.mockResolvedValue(otp);

    const query = new GetOtpQuery(ctx, DEFAULT_OTP_NAMESPACE, 'test-id');

    const result = await handler.execute(query);

    expect(result).toBeInstanceOf(Otp);
    expect(result.id).toBe('test-id');
    expect(mockRepo.get).toHaveBeenCalledWith(expect.anything(), 'test-id');
  });

  it('should throw OtpNotFoundException when not found', async () => {
    mockRepo.get.mockResolvedValue(null);

    const query = new GetOtpQuery(ctx, DEFAULT_OTP_NAMESPACE, 'missing');

    await expect(handler.execute(query)).rejects.toThrow(OtpNotFoundException);
  });
});
