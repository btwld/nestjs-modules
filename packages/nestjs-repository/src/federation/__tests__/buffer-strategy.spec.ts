import { BufferStrategy } from '../buffer-strategy.js';
import { FEDERATION_MAX_BUFFER_SIZE } from '../federation.constants.js';

describe('BufferStrategy', () => {
  it('should advance with default batch size equal to user limit', () => {
    const buffer = new BufferStrategy(10);
    const first = buffer.advance();
    expect(first).toEqual({ limit: 10, offset: 0 });

    const second = buffer.advance();
    expect(second).toEqual({ limit: 10, offset: 10 });
  });

  it('should use custom batch size', () => {
    const buffer = new BufferStrategy(10, { batchSize: 25 });
    const first = buffer.advance();
    expect(first).toEqual({ limit: 25, offset: 0 });

    const second = buffer.advance();
    expect(second).toEqual({ limit: 25, offset: 25 });
  });

  it('should report limit reached when offset exceeds maxOffset', () => {
    const buffer = new BufferStrategy(10, { maxOffset: 20 });
    expect(buffer.hasReachedLimit()).toBe(false);

    buffer.advance(); // offset → 10
    expect(buffer.hasReachedLimit()).toBe(false);

    buffer.advance(); // offset → 20
    expect(buffer.hasReachedLimit()).toBe(true);
  });

  it('should cap maxOffset at FEDERATION_MAX_BUFFER_SIZE', () => {
    const buffer = new BufferStrategy(10, {
      maxOffset: FEDERATION_MAX_BUFFER_SIZE + 500,
    });

    // Advance to FEDERATION_MAX_BUFFER_SIZE
    let advances = 0;
    while (!buffer.hasReachedLimit()) {
      buffer.advance();
      advances++;
    }

    expect(advances).toBe(FEDERATION_MAX_BUFFER_SIZE / 10);
  });
});
