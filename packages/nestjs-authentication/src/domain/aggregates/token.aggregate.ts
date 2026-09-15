import { randomUUID } from 'crypto';

import {
  type DomainFactory,
  type EventContextHost,
} from '@concepta/nestjs-core';
import {
  type AggregateMetaInterface,
  DomainAggregate,
} from '@concepta/nestjs-core/aggregate';

import { TokenIssuedEvent } from '../events/token-issued.event.js';
import { TokenRevokedEvent } from '../events/token-revoked.event.js';
import { TokenAlreadyRevokedException } from '../exceptions/token-already-revoked.exception.js';
import { type TokenCreatableInterface } from '../interfaces/token-creatable.interface.js';
import { type TokenInterface } from '../interfaces/token.interface.js';

export class Token extends DomainAggregate<TokenInterface> {
  constructor(
    id: string,
    props: TokenInterface,
    version?: number,
    meta?: AggregateMetaInterface,
  ) {
    super(id, props, version, meta);
  }

  get sub() {
    return this.props.sub;
  }

  get type() {
    return this.props.type;
  }

  get scope() {
    return this.props.scope;
  }

  get iat() {
    return this.props.iat;
  }

  get exp() {
    return this.props.exp;
  }

  get revokedAt() {
    return this.props.revokedAt;
  }

  isExpired(now: Date = new Date()): boolean {
    return now >= this.props.exp;
  }

  isRevoked(): boolean {
    return this.props.revokedAt !== undefined;
  }

  isActive(now: Date = new Date()): boolean {
    return !this.isExpired(now) && !this.isRevoked();
  }

  static create(
    eventContext: EventContextHost,
    dto: TokenCreatableInterface,
    refreshedFrom?: string,
  ): Token {
    return Token.createWithId(eventContext, randomUUID(), dto, refreshedFrom);
  }

  static createWithId(
    eventContext: EventContextHost,
    id: string,
    dto: TokenCreatableInterface,
    refreshedFrom?: string,
  ): Token {
    const iat = dto.iat ?? new Date();
    const props: TokenInterface = {
      sub: dto.sub,
      type: dto.type,
      scope: dto.scope ?? [],
      iat,
      exp: dto.exp,
    };
    const token = new Token(id, props);
    token.apply(
      new TokenIssuedEvent(eventContext, token.toPlain(), refreshedFrom),
    );
    return token;
  }

  revoke(eventContext: EventContextHost, now: Date = new Date()): void {
    if (this.isRevoked()) {
      throw new TokenAlreadyRevokedException(this.id);
    }
    this.props = { ...this.props, revokedAt: now };
    this.apply(new TokenRevokedEvent(eventContext, this.toPlain()));
  }
}

Token satisfies DomainFactory<TokenCreatableInterface, Token>;
