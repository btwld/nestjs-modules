import {
  type FastifyRequest as Request,
  type LightMyRequestResponse as Response,
} from 'fastify';
import { mock } from 'jest-mock-extended';

import { MessageFormatUtil } from './message-format.util';

describe('message format util', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('formatRequestMessage()', () => {
    it('should format message', async () => {
      const fakeDate: string = new Date(1555555550000).toISOString();
      const mockDate = new Date(1555555550000);

      jest
        .spyOn(global, 'Date')
        .mockImplementation(() => mockDate as unknown as string);

      const req = mock<Request>({ method: 'GET', url: '/fake/path' });

      expect(MessageFormatUtil.formatRequestMessage(req)).toEqual(
        `${fakeDate} GET /fake/path`,
      );
    });
  });

  describe('formatResponseMessage()', () => {
    it('should format message', async () => {
      const error: Error = new Error('Bad things');
      const startDate: Date = new Date(1555555549900);
      const fakeDate: string = new Date(1555555550000).toISOString();
      const mockDate = new Date(1555555550000);

      jest
        .spyOn(global, 'Date')
        .mockImplementation(() => mockDate as unknown as string);

      const req = mock<Request>({ method: 'GET', url: '/fake/path' });
      const res = mock<Response>({ statusCode: 200 });

      expect(
        MessageFormatUtil.formatResponseMessage(req, res, startDate, error),
      ).toEqual(`${fakeDate} GET /fake/path 200 0ms - Error: Bad things`);
    });
  });
});
