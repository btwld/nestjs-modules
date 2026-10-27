import { type EntityManager } from 'typeorm';

import { Body, Controller, Get, Post } from '@nestjs/common';

import { type AppContextHost, Ctx } from '@concepta/nestjs-core';
import {
  InjectDynamicRepository,
  Transactional,
  TrxCtx,
} from '@concepta/nestjs-repository';

import { type TypeOrmRepository } from '../../repository/typeorm-repository.js';
import { resolveTransactionKey } from '../../typeorm-repository.util.js';

import {
  type RlsProjectEntityFixture,
  type RlsTaskEntityFixture,
} from './rls-project-task.entity.fixture.js';

export const RLS_PROJECTS_KEY = 'rls-projects';
export const RLS_TASKS_KEY = 'rls-tasks';

const titles = (tasks: RlsTaskEntityFixture[]): string[] =>
  tasks.map(({ title }) => title).sort();

@Controller()
export class RlsTaskControllerFixture {
  constructor(
    @InjectDynamicRepository(RLS_TASKS_KEY)
    private readonly tasks: TypeOrmRepository<RlsTaskEntityFixture>,
    @InjectDynamicRepository(RLS_PROJECTS_KEY)
    private readonly projects: TypeOrmRepository<RlsProjectEntityFixture>,
  ) {}

  @Get('tasks')
  @Transactional({ readOnly: true })
  async list(@Ctx() ctx: AppContextHost): Promise<string[]> {
    return titles(await this.tasks.find({ ctx }));
  }

  /** The same read, with the decorator forgotten. */
  @Get('tasks-without-transaction')
  async listWithoutTransaction(@Ctx() ctx: AppContextHost): Promise<string[]> {
    return titles(await this.tasks.find({ ctx }));
  }

  @Get('projects-with-tasks')
  @Transactional({ readOnly: true })
  async projectsWithTasks(@Ctx() ctx: AppContextHost): Promise<string[]> {
    const projects = await this.projects.find({
      join: [{ relation: 'tasks' }],
      ctx,
    });

    return projects
      .map(({ name, tasks = [] }) => `${name}:${titles(tasks).join(',')}`)
      .sort();
  }

  /** SQL that bypasses the repository, inside the request's transaction. */
  @Get('raw-task-report')
  @Transactional({ readOnly: true })
  async rawReport(@Ctx() ctx: AppContextHost): Promise<string[]> {
    const tx = await ctx.with(TrxCtx).trx.getOrStart(resolveTransactionKey());
    const rows: { title: string }[] = await tx
      .getClient<EntityManager>()
      .query('select title from rls_task');

    return rows.map(({ title }) => title).sort();
  }

  @Post('tasks')
  @Transactional()
  async create(
    @Ctx() ctx: AppContextHost,
    @Body() body: Partial<RlsTaskEntityFixture>,
  ): Promise<{ title: string }> {
    const { title } = await this.tasks.create(body, { ctx });
    return { title };
  }
}
