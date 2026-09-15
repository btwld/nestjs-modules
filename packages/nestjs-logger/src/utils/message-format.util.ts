import {
  type FastifyRequest as Request,
  type LightMyRequestResponse as Response,
} from 'fastify';

/**
 * Message formatting utility
 *
 * @internal
 */
export class MessageFormatUtil {
  /**
   * Function to format message from request.
   *
   * @param req - request
   */
  static formatRequestMessage(req: Request): string {
    const { method, url } = req;
    const now = new Date();

    return `${now.toISOString()} ${method} ${url}`;
  }

  /**
   * Function to format message for response.
   *
   * @param req - request
   * @param res - response
   * @param startDate - start date
   * @param error - error
   */
  static formatResponseMessage(
    req: Request,
    res: Response,
    startDate: Date,
    error?: Error,
  ): string {
    const { method, url } = req;
    const now = new Date();

    return (
      `${now.toISOString()} ${method} ${url} ${res.statusCode} ` +
      `${now.getTime() - startDate.getTime()}ms` +
      (error ? ` - ${error}` : '')
    );
  }
}
