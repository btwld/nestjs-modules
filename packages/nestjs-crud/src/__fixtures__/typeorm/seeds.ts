import { ClassType } from '@nestjsx/util';
import { plainToClass } from 'class-transformer';
import { MigrationInterface, Repository, QueryRunner } from 'typeorm';

import { PlainLiteralObject } from '@nestjs/common';

import { CompanyEntity } from './company/company.entity';
import { NoteEntity } from './note/note.entity';
import { ProjectEntity } from './project/project.entity';
import { NameEntity, UserEntity } from './users/user.entity';

export class Seeds implements MigrationInterface {
  private save<T extends PlainLiteralObject>(
    repo: Repository<T>,
    data: Partial<T>[],
  ): Promise<T[]> {
    return repo.save(
      data.map((partial: Partial<T>) =>
        plainToClass(repo.target as ClassType<T>, partial, {
          ignoreDecorators: true,
        }),
      ),
    );
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const { connection } = queryRunner;

    const companiesRepo = connection.getRepository(CompanyEntity);
    const projectsRepo = connection.getRepository(ProjectEntity);
    const usersRepo = connection.getRepository(UserEntity);
    const notesRepo = connection.getRepository(NoteEntity);

    // companies
    await this.save(companiesRepo, [
      { name: 'Name1', domain: 'Domain1' },
      { name: 'Name2', domain: 'Domain2' },
      { name: 'Name3', domain: 'Domain3' },
      { name: 'Name4', domain: 'Domain4' },
      { name: 'Name5', domain: 'Domain5' },
      { name: 'Name6', domain: 'Domain6' },
      { name: 'Name7', domain: 'Domain7' },
      { name: 'Name8', domain: 'Domain8' },
      { name: 'Name9', domain: 'Domain9', deletedAt: new Date() },
      { name: 'Name10', domain: 'Domain10' },
    ]);

    // projects
    await this.save(projectsRepo, [
      {
        name: 'Project1',
        description: 'description1',
        isActive: true,
        companyId: 1,
      },
      {
        name: 'Project2',
        description: 'description2',
        isActive: true,
        companyId: 1,
      },
      {
        name: 'Project3',
        description: 'description3',
        isActive: true,
        companyId: 2,
      },
      {
        name: 'Project4',
        description: 'description4',
        isActive: true,
        companyId: 2,
      },
      {
        name: 'Project5',
        description: 'description5',
        isActive: true,
        companyId: 3,
      },
      {
        name: 'Project6',
        description: 'description6',
        isActive: true,
        companyId: 3,
      },
      {
        name: 'Project7',
        description: 'description7',
        isActive: true,
        companyId: 4,
      },
      {
        name: 'Project8',
        description: 'description8',
        isActive: true,
        companyId: 4,
      },
      {
        name: 'Project9',
        description: 'description9',
        isActive: true,
        companyId: 5,
      },
      {
        name: 'Project10',
        description: 'description10',
        isActive: true,
        companyId: 5,
      },
      {
        name: 'Project11',
        description: 'description11',
        isActive: false,
        companyId: 6,
      },
      {
        name: 'Project12',
        description: 'description12',
        isActive: false,
        companyId: 6,
      },
      {
        name: 'Project13',
        description: 'description13',
        isActive: false,
        companyId: 7,
      },
      {
        name: 'Project14',
        description: 'description14',
        isActive: false,
        companyId: 7,
      },
      {
        name: 'Project15',
        description: 'description15',
        isActive: false,
        companyId: 8,
      },
      {
        name: 'Project16',
        description: 'description16',
        isActive: false,
        companyId: 8,
      },
      {
        name: 'Project17',
        description: 'description17',
        isActive: false,
        companyId: 9,
      },
      {
        name: 'Project18',
        description: 'description18',
        isActive: false,
        companyId: 9,
      },
      {
        name: 'Project19',
        description: 'description19',
        isActive: false,
        companyId: 10,
      },
      {
        name: 'Project20',
        description: 'description20',
        isActive: false,
        companyId: 10,
      },
    ]);

    // users
    const name: NameEntity = { first: '', last: '' };
    const name1: NameEntity = { first: 'firstname1', last: 'lastname1' };
    await this.save(usersRepo, [
      {
        email: '1@email.com',
        isActive: true,
        companyId: 1,
        profileId: 1,
        name: name1,
      },
      {
        email: '2@email.com',
        isActive: true,
        companyId: 1,
        profileId: 2,
        name,
      },
      {
        email: '3@email.com',
        isActive: true,
        companyId: 1,
        profileId: 3,
        name,
      },
      {
        email: '4@email.com',
        isActive: true,
        companyId: 1,
        profileId: 4,
        name,
      },
      {
        email: '5@email.com',
        isActive: true,
        companyId: 1,
        profileId: 5,
        name,
      },
      {
        email: '6@email.com',
        isActive: true,
        companyId: 1,
        profileId: 6,
        name,
      },
      {
        email: '7@email.com',
        isActive: false,
        companyId: 1,
        profileId: 7,
        name,
      },
      {
        email: '8@email.com',
        isActive: false,
        companyId: 1,
        profileId: 8,
        name,
      },
      {
        email: '9@email.com',
        isActive: false,
        companyId: 1,
        profileId: 9,
        name,
      },
      {
        email: '10@email.com',
        isActive: true,
        companyId: 1,
        profileId: 10,
        name,
      },
      {
        email: '11@email.com',
        isActive: true,
        companyId: 2,
        profileId: 11,
        name,
      },
      {
        email: '12@email.com',
        isActive: true,
        companyId: 2,
        profileId: 12,
        name,
      },
      {
        email: '13@email.com',
        isActive: true,
        companyId: 2,
        profileId: 13,
        name,
      },
      {
        email: '14@email.com',
        isActive: true,
        companyId: 2,
        profileId: 14,
        name,
      },
      {
        email: '15@email.com',
        isActive: true,
        companyId: 2,
        profileId: 15,
        name,
      },
      {
        email: '16@email.com',
        isActive: true,
        companyId: 2,
        profileId: 16,
        name,
      },
      {
        email: '17@email.com',
        isActive: false,
        companyId: 2,
        profileId: 17,
        name,
      },
      {
        email: '18@email.com',
        isActive: false,
        companyId: 2,
        profileId: 18,
        name,
      },
      {
        email: '19@email.com',
        isActive: false,
        companyId: 2,
        profileId: 19,
        name,
      },
      {
        email: '20@email.com',
        isActive: false,
        companyId: 2,
        profileId: 20,
        name,
      },
      {
        email: '21@email.com',
        isActive: false,
        companyId: 2,
        profileId: null,
        name,
      },
    ]);

    // notes
    await this.save(notesRepo, [
      { revisionId: 1 },
      { revisionId: 1 },
      { revisionId: 2 },
      { revisionId: 2 },
      { revisionId: 3 },
      { revisionId: 3 },
    ]);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
