import { type INestApplicationContext, type Type } from '@nestjs/common';

import { type ConformanceCapabilitiesInterface } from './conformance-capabilities.interface.js';
import { type ConformanceFixturesInterface } from './conformance-fixtures.interface.js';

/**
 * What the conformance sections need from a harness, whatever its driver.
 */
export interface ConformanceContextOptionsInterface {
  name: string;
  capabilities: ConformanceCapabilitiesInterface;
  fixtures: Record<
    keyof ConformanceFixturesInterface,
    { key: string; entity: Type }
  >;
  createApp(): Promise<INestApplicationContext>;
  reset(app: INestApplicationContext): Promise<void>;
  linkBookTag(
    app: INestApplicationContext,
    link: { bookId: string; tagId: string },
  ): Promise<void>;
}
