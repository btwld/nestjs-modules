import { type OnOptions } from 'eventemitter2';
/**
 * Interfaces defining public options object for "listen on" style events.
 */
export interface EventListenOnOptionsInterface extends Partial<
  Pick<OnOptions, 'async' | 'nextTick'>
> {}
