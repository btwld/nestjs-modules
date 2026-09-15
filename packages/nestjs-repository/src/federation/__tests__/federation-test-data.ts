/**
 * Preset data builders for federation orchestrator tests.
 *
 * Ported from nestjs-crud __tests__/crud-federation/fixtures/crud-federation-test-data.ts
 * Data shapes preserved exactly — only the import types changed.
 */
import { type PlainLiteralObject } from '@nestjs/common';

export interface TestRoot extends PlainLiteralObject {
  id: number;
  name: string;
  companyId?: number;
  [key: string]: unknown;
}

export interface TestRelation extends PlainLiteralObject {
  id: number;
  rootId: number;
  title: string;
  priority?: number;
  status?: string;
  isLatest?: boolean;
  [key: string]: unknown;
}

export interface TestProfile extends PlainLiteralObject {
  id: number;
  rootId: number;
  bio: string;
  avatar?: string;
  [key: string]: unknown;
}

export interface TestSettings extends PlainLiteralObject {
  id: number;
  rootId: number;
  theme: string;
  notifications: boolean;
  [key: string]: unknown;
}

// Minimal root-relation dataset (2-3 entities for basic tests)
export const createMinimalRootRelationSet = () => ({
  roots: [
    { id: 1, name: 'Root 1' },
    { id: 2, name: 'Root 2' },
    { id: 3, name: 'Root 3' },
  ] as TestRoot[],

  relations: [
    { id: 1, rootId: 1, title: 'Relation 1', isLatest: true },
    { id: 2, rootId: 2, title: 'Relation 2', isLatest: true },
    { id: 3, rootId: 2, title: 'Relation 3', isLatest: false },
    // Root 3 has no relations - useful for LEFT JOIN tests
  ] as TestRelation[],
});

// Filtered dataset with mixed active/inactive states
export const createFilteredDataSet = () => ({
  roots: [
    { id: 1, name: 'Active Root' },
    { id: 2, name: 'Mixed Root' },
    { id: 3, name: 'Inactive Root' },
  ] as TestRoot[],

  activeRelations: [
    { id: 1, rootId: 1, title: 'Active Task', status: 'active' },
    { id: 2, rootId: 2, title: 'Active Item', status: 'active' },
  ] as TestRelation[],

  allRelations: [
    { id: 1, rootId: 1, title: 'Active Task', status: 'active' },
    { id: 2, rootId: 2, title: 'Active Item', status: 'active' },
    { id: 3, rootId: 2, title: 'Pending Item', status: 'pending' },
    { id: 4, rootId: 3, title: 'Inactive Task', status: 'inactive' },
  ] as TestRelation[],
});

// Sort order dataset with predictable names
export const createNameSortDataSet = () => ({
  roots: [
    { id: 1, name: 'Root A' },
    { id: 3, name: 'Root B' },
    { id: 2, name: 'Root C' },
  ] as TestRoot[],

  relations: [
    { id: 1, rootId: 1, title: 'Relation 1' },
    { id: 2, rootId: 3, title: 'Relation 2' },
    // Root 2 has no relations
  ] as TestRelation[],
});

export const createIdDescSortDataSet = () => ({
  roots: [
    { id: 3, name: 'Root 5' },
    { id: 4, name: 'Root 4' },
    { id: 5, name: 'Root 3' },
    { id: 2, name: 'Root 2' },
    { id: 1, name: 'Root 1' },
  ] as TestRoot[],

  relations: [
    { id: 1, rootId: 2, title: 'Relation 1' },
    { id: 2, rootId: 4, title: 'Relation 2' },
    { id: 3, rootId: 4, title: 'Relation 3' },
  ] as TestRelation[],
});

export const createMultiSortDataSet = () => ({
  roots: [
    { id: 3, name: 'Root A' },
    { id: 1, name: 'Root A' },
    { id: 2, name: 'Root B' },
  ] as TestRoot[],

  relations: [
    { id: 1, rootId: 1, title: 'Relation 1' },
    { id: 2, rootId: 1, title: 'Relation 2' },
    { id: 3, rootId: 3, title: 'Relation 3' },
    // Root 2 has no relations
  ] as TestRelation[],
});

// Multi-relation dataset (root with multiple relation types)
export const createMultiRelationSet = () => ({
  roots: [
    { id: 1, name: 'Root 1' },
    { id: 2, name: 'Root 2' },
  ] as TestRoot[],

  relations: [
    { id: 1, rootId: 1, title: 'Relation 1' },
    { id: 2, rootId: 2, title: 'Relation 2' },
  ] as TestRelation[],

  profiles: [
    { id: 1, rootId: 1, bio: 'Profile 1', avatar: 'avatar1.jpg' },
    // Root 2 has no profile
  ] as TestProfile[],

  settings: [
    { id: 1, rootId: 1, theme: 'dark', notifications: true },
    { id: 2, rootId: 2, theme: 'light', notifications: false },
  ] as TestSettings[],
});

// Single entity datasets for minimal tests
export const createSingleEntitySet = () => ({
  roots: [{ id: 1, name: 'Only Root' }] as TestRoot[],
  relations: [{ id: 1, rootId: 1, title: 'Only Relation' }] as TestRelation[],
});

// Relation sort by title dataset for relation-driven sorting
export const createRelationSortByTitleSet = () => ({
  relationsByTitle: [
    { id: 1, rootId: 2, title: 'Alpha Task' },
    { id: 2, rootId: 1, title: 'Beta Task' },
    { id: 3, rootId: 3, title: 'Charlie Task' },
    { id: 4, rootId: 1, title: 'Delta Task' },
  ] as TestRelation[],

  rootsInRelationOrder: [
    { id: 2, name: 'Root 2' },
    { id: 1, name: 'Root 1' },
    { id: 3, name: 'Root 3' },
  ] as TestRoot[],

  rootsInNaturalOrder: [
    { id: 1, name: 'Root 1' },
    { id: 2, name: 'Root 2' },
    { id: 3, name: 'Root 3' },
  ] as TestRoot[],
});

// Relation sort by priority with multiple relations per root
export const createRelationSortByPrioritySet = () => ({
  relationsByPriority: [
    { id: 1, rootId: 1, title: 'Critical', priority: 10 },
    { id: 2, rootId: 1, title: 'High A', priority: 8 },
    { id: 3, rootId: 2, title: 'High B', priority: 7 },
    { id: 4, rootId: 3, title: 'Medium', priority: 5 },
    { id: 5, rootId: 2, title: 'Low', priority: 3 },
  ] as TestRelation[],

  uniqueRootsInOrder: [
    { id: 1, name: 'Root 1' },
    { id: 2, name: 'Root 2' },
    { id: 3, name: 'Root 3' },
  ] as TestRoot[],
});

// Large relation sort dataset for pagination testing
export const createRelationSortPaginationSet = () => ({
  allRelationsSorted: [
    { id: 1, rootId: 5, title: 'Alpha' },
    { id: 2, rootId: 2, title: 'Bravo' },
    { id: 3, rootId: 8, title: 'Charlie' },
    { id: 4, rootId: 1, title: 'Delta' },
    { id: 5, rootId: 9, title: 'Echo' },
    { id: 6, rootId: 4, title: 'Foxtrot' },
    { id: 7, rootId: 7, title: 'Golf' },
    { id: 8, rootId: 3, title: 'Hotel' },
    { id: 9, rootId: 6, title: 'India' },
    { id: 10, rootId: 10, title: 'Juliet' },
  ] as TestRelation[],

  firstPageRoots: [
    { id: 5, name: 'Root 5' },
    { id: 2, name: 'Root 2' },
    { id: 8, name: 'Root 8' },
    { id: 1, name: 'Root 1' },
    { id: 9, name: 'Root 9' },
  ] as TestRoot[],

  secondPageRoots: [
    { id: 4, name: 'Root 4' },
    { id: 7, name: 'Root 7' },
    { id: 3, name: 'Root 3' },
    { id: 6, name: 'Root 6' },
    { id: 10, name: 'Root 10' },
  ] as TestRoot[],
});

// Combined root and relation filters dataset
export const createCombinedFiltersSet = () => ({
  projectRoots: [
    { id: 1, name: 'Project Alpha' },
    { id: 2, name: 'Project Beta' },
  ] as TestRoot[],

  allRoots: [
    { id: 1, name: 'Project Alpha' },
    { id: 2, name: 'Project Beta' },
    { id: 3, name: 'Internal Tool' },
    { id: 4, name: 'Project Gamma' },
  ] as TestRoot[],

  activeRelations: [
    { id: 1, rootId: 1, title: 'Feature A', status: 'active' },
    { id: 2, rootId: 2, title: 'Feature B', status: 'active' },
  ] as TestRelation[],

  allRelations: [
    { id: 1, rootId: 1, title: 'Feature A', status: 'active' },
    { id: 2, rootId: 2, title: 'Feature B', status: 'active' },
    { id: 3, rootId: 3, title: 'Internal Task', status: 'active' },
    { id: 4, rootId: 4, title: 'Old Feature', status: 'completed' },
  ] as TestRelation[],
});
