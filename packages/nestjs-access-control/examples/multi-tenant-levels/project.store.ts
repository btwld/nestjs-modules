import { randomUUID } from 'crypto';

import { Injectable, NotFoundException } from '@nestjs/common';

import { type ProjectInterface } from './project.interface.js';

/**
 * In-memory projects of every tenant, standing in for your repository.
 * Every method takes the tenant, so one tenant's projects are never
 * reached through another's routes. With `@concepta/nestjs-repository`,
 * row scope enforces that on every read and write instead.
 */
@Injectable()
export class ProjectStore {
  private projects: ProjectInterface[] = [
    { id: 'p-1', tenantId: 'acme', ownerId: 'alice', name: 'Rocket' },
    { id: 'p-2', tenantId: 'acme', ownerId: 'bob', name: 'Launchpad' },
    { id: 'p-3', tenantId: 'globex', ownerId: 'gina', name: 'Orbit' },
    { id: 'p-4', tenantId: 'acme', ownerId: 'cara', name: 'Fuel study' },
  ];

  inTenant(tenantId: string): ProjectInterface[] {
    return this.projects.filter((project) => project.tenantId === tenantId);
  }

  ownedBy(tenantId: string, ownerId: string): ProjectInterface[] {
    return this.inTenant(tenantId).filter(
      (project) => project.ownerId === ownerId,
    );
  }

  get(tenantId: string, id: string): ProjectInterface | undefined {
    return this.inTenant(tenantId).find((project) => project.id === id);
  }

  create(tenantId: string, ownerId: string, name: string): ProjectInterface {
    const project = { id: randomUUID(), tenantId, ownerId, name };
    this.projects = [...this.projects, project];
    return project;
  }

  rename(tenantId: string, id: string, name: string): ProjectInterface {
    const project = this.found(tenantId, id);
    const renamed = { ...project, name };
    this.projects = this.projects.map((p) => (p === project ? renamed : p));
    return renamed;
  }

  remove(tenantId: string, id: string): void {
    const project = this.found(tenantId, id);
    this.projects = this.projects.filter((p) => p !== project);
  }

  private found(tenantId: string, id: string): ProjectInterface {
    const project = this.get(tenantId, id);

    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    return project;
  }
}
