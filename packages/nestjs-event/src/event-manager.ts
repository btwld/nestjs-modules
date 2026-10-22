import { Logger } from '@nestjs/common';

import { EventException } from './exceptions/event.exception';
import { type EventDispatchService } from './services/event-dispatch.service';
import { type EventListenService } from './services/event-listen.service';

interface EventManagerOptions {
  allowManualShutdown: boolean;
}

/**
 * Single class for managing global access to event services.
 */
export class EventManager {
  /**
   * The singleton instance.
   */
  private static instance: EventManager | undefined;

  /**
   * When toggled on, allows manual shutdown. Primarily used for unit testing.
   */
  private static allowManualShutdown: boolean = false;

  /**
   * Constructor.
   *
   * @param eventDispatchService - Instance of the event dispatch service.
   * @param eventListenService - Instance of the event listen service.
   * @param options - Options.
   */
  private constructor(
    private eventDispatchService: EventDispatchService,
    private eventListenService: EventListenService,
    options: EventManagerOptions = { allowManualShutdown: false },
  ) {
    // apply manual shutdown setting
    EventManager.allowManualShutdown = options.allowManualShutdown;
  }

  /**
   * Intialize the singleton.
   *
   * Can only be called once per application run, unless manual shutdown is enabled.
   *
   * @param eventDispatchService - Instance of the event dispatch service.
   * @param eventListenService - Instance of the event listen service.
   * @param options - Event manager options.
   */
  public static initialize(
    eventDispatchService: EventDispatchService,
    eventListenService: EventListenService,
    options: EventManagerOptions = { allowManualShutdown: false },
  ) {
    // already have an instance?
    if (this.instance) {
      // Log a warning
      // TODO: eventually this should throw an exception
      Logger.warn(`${this.name} has already been initialized.`);
    } else {
      // create new instance
      this.instance = new EventManager(
        eventDispatchService,
        eventListenService,
        options,
      );
    }
  }

  /**
   * Returns the singleton instance.
   */
  public static getInstance(): EventManager {
    if (this.instance instanceof EventManager) {
      return this.instance;
    } else {
      throw new EventException({
        message: `${this.name} has not been initialized.`,
      });
    }
  }

  /**
   * Resets the singleton state to it's default
   */
  private static reset() {
    this.instance = undefined;
    this.allowManualShutdown = false;
  }

  /**
   * Manually shutdown the event manager.
   *
   * Allow manual shutdown must be enabled or an exeption will be thrown.
   */
  public static shutdown() {
    if (this.allowManualShutdown) {
      this.reset();
    } else {
      throw new EventException({
        message: `%s can't be shutdown manually. Manual shutdown has not been enabled.`,
        messageParams: [this.name],
      });
    }
  }

  /**
   * Returns the instance of the event dispatch service.
   */
  static get dispatch(): EventDispatchService {
    return this.getInstance().eventDispatchService;
  }

  /**
   * Returns the instance of the event listen service.
   */
  static get listen(): EventListenService {
    return this.getInstance().eventListenService;
  }

  /**
   * Nest lifecyle event.
   */
  onApplicationShutdown() {
    EventManager.reset();
  }
}
