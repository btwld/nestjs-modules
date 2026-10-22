import {
  EventAsync,
  type EventAsyncInterface,
  Event,
  type EventInterface,
} from '@concepta/nestjs-event';

export type OrderCreatedEventInterface = {
  name: string;
  description: string;
};

export class OrderCreatedEvent
  extends Event<OrderCreatedEventInterface>
  implements EventInterface<OrderCreatedEventInterface> {}

export class OrderCreatedEventAsync
  extends EventAsync<OrderCreatedEventInterface>
  implements EventAsyncInterface<OrderCreatedEventInterface> {}
