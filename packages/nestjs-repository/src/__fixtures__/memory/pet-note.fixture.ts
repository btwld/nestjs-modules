import { type PlainLiteralObject } from '@nestjs/common';

import { type RepositoryColumnMetadataInterface } from '../../repository/interfaces/repository-column-metadata.interface.js';
import { type RepositoryMetadataInterface } from '../../repository/interfaces/repository-metadata.interface.js';

export const PET_TOKEN = 'pets';
export const NOTE_TOKEN = 'notes';

export interface PetFixture extends PlainLiteralObject {
  id: string;
  name: string;
}

export class PetEntityFixture implements PetFixture {
  [key: string]: unknown;
  declare id: string;
  declare name: string;
}

export interface NoteFixture extends PlainLiteralObject {
  id: string;
  body: string;
  owner?: string | null;
}

export class NoteEntityFixture implements NoteFixture {
  [key: string]: unknown;
  declare id: string;
  declare body: string;
  declare owner?: string | null;
}

const column = (
  name: string,
  isPrimary = false,
): RepositoryColumnMetadataInterface => ({
  name,
  isPrimary,
  isVersion: false,
  isRemoveDate: false,
});

export const PET_METADATA: RepositoryMetadataInterface<PetFixture> = {
  name: 'Pet',
  type: PetEntityFixture,
  urn: 'urn:memory:Pet',
  columns: [column('id', true), column('name')],
  relations: [],
};

export const NOTE_METADATA: RepositoryMetadataInterface<NoteFixture> = {
  name: 'Note',
  type: NoteEntityFixture,
  urn: 'urn:memory:Note',
  columns: [column('id', true), column('body'), column('owner')],
  relations: [],
};
