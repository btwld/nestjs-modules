import { EventListenerOn } from '@concepta/nestjs-event';

import {
  type OrderCreatedEvent,
  type OrderCreatedEventAsync,
  type OrderCreatedEventInterface,
} from '../events/order-created.event';

// example listener class
export class OrderCreatedListener extends EventListenerOn<OrderCreatedEvent> {
  // custom handler
  listen(event: OrderCreatedEvent): void {
    const dto = event.payload;
    // no-op
    void dto.name;
  }
}

export class OrderCreatedListenerAsync extends EventListenerOn<OrderCreatedEventAsync> {
  // custom handler
  async listen(
    event: OrderCreatedEventAsync,
  ): Promise<OrderCreatedEventInterface> {
    return event.payload;
  }
}
