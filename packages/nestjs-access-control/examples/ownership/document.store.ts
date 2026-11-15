import { Injectable, NotFoundException } from '@nestjs/common';

import { type DocumentInterface } from './document.interface.js';

/**
 * In-memory documents, standing in for your repository.
 */
@Injectable()
export class DocumentStore {
  private documents = new Map<string, DocumentInterface>([
    ['doc-1', { id: 'doc-1', ownerId: 'maya', title: 'Maya’s plan' }],
    ['doc-2', { id: 'doc-2', ownerId: 'max', title: 'Max’s notes' }],
  ]);

  all(): DocumentInterface[] {
    return [...this.documents.values()];
  }

  ownedBy(ownerId: string): DocumentInterface[] {
    return this.all().filter((document) => document.ownerId === ownerId);
  }

  /**
   * The document, or `undefined`; for checks that must not throw.
   */
  get(id: string): DocumentInterface | undefined {
    return this.documents.get(id);
  }

  find(id: string): DocumentInterface {
    const document = this.documents.get(id);

    if (!document) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    return document;
  }

  update(
    id: string,
    changes: Partial<Pick<DocumentInterface, 'title' | 'ownerId'>>,
  ): DocumentInterface {
    const document = { ...this.find(id), ...changes, id };
    this.documents = new Map(this.documents).set(id, document);
    return document;
  }
}
