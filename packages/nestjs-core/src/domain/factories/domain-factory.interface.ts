import { type EventContextInterface } from '../events/causal-context/interfaces/event-context.interface.js';

export interface DomainFactory<Creatable, Domain> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new (...args: any[]): Domain;

  create(
    eventContext: EventContextInterface,
    props: Creatable,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: any[]
  ): Domain;

  createWithId(
    eventContext: EventContextInterface,
    id: string,
    props: Creatable,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: any[]
  ): Domain;
}
