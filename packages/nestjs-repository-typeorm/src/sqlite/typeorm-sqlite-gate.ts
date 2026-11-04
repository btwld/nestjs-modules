/**
 * The turn to use a SQLite data source's one connection, taken in order of
 * asking. A transaction holds it from before `BEGIN` until it ends, so a statement
 * of anyone else's waits instead of running inside it. Transactions wait
 * for each other in the repository's own queue first (the factory runs
 * them one at a time), where a scope's timeout can end the wait.
 */
export class TypeOrmSqliteGate {
  private tail: Promise<void> = Promise.resolve();

  /** Wait for the turn, and hold it until the returned release is called. */
  async acquire(): Promise<() => void> {
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const previous = this.tail;
    this.tail = previous.then(() => held);
    await previous;
    return release;
  }

  /** Run `work` in a turn of its own. */
  async run<T>(work: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await work();
    } finally {
      release();
    }
  }
}

const gates = new WeakMap<object, TypeOrmSqliteGate>();

/** The gate of `dataSource`'s connection, shared by everything using it. */
export function gateOf(dataSource: object): TypeOrmSqliteGate {
  const existing = gates.get(dataSource);
  if (existing) return existing;
  const gate = new TypeOrmSqliteGate();
  gates.set(dataSource, gate);
  return gate;
}
