import { TransactionQueue } from '../transaction-queue.js';

describe(TransactionQueue.name, () => {
  let queue: TransactionQueue;

  beforeEach(() => {
    queue = new TransactionQueue();
  });

  it('should resolve acquire() immediately when nothing else holds the queue', async () => {
    const release = await queue.acquire();
    expect(typeof release).toBe('function');
  });

  it('should block a second acquire() until the first releases', async () => {
    const order: number[] = [];

    const release1 = await queue.acquire();
    order.push(1);

    const secondAcquire = queue.acquire().then((release2) => {
      order.push(2);
      return release2;
    });

    // Give the second acquire a chance to (wrongly) resolve before release.
    await Promise.race([
      secondAcquire.then(() => {
        throw new Error('second acquire resolved before release');
      }),
      new Promise((resolve) => setTimeout(resolve, 20)),
    ]);

    release1();
    const release2 = await secondAcquire;

    expect(order).toEqual([1, 2]);
    release2();
  });

  it('should serve waiters in FIFO order', async () => {
    const order: number[] = [];

    const release1 = await queue.acquire();

    const p2 = queue.acquire().then((release) => {
      order.push(2);
      return release;
    });
    const p3 = queue.acquire().then((release) => {
      order.push(3);
      return release;
    });

    release1();
    const release2 = await p2;
    release2();
    const release3 = await p3;
    release3();

    expect(order).toEqual([2, 3]);
  });

  it('should let a later acquire proceed even if an earlier holder never explicitly awaited it, as long as it eventually releases', async () => {
    const release1 = await queue.acquire();

    let acquired2 = false;
    const p2 = queue.acquire().then((release) => {
      acquired2 = true;
      return release;
    });

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(acquired2).toBe(false);

    release1();
    const release2 = await p2;
    expect(acquired2).toBe(true);
    release2();
  });
});
