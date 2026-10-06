import {
  type DeepPartial,
  type MigrationInterface,
  type Repository,
  type QueryRunner,
} from 'typeorm';

import { type PlainLiteralObject } from '@nestjs/common';

import { CompanyEntity } from './company/company.entity.js';
import { NoteEntity } from './note/note.entity.js';
import { ProjectEntity } from './project/project.entity.js';
import { UserProfileEntity } from './user-profile/user-profile.entity.js';
import { UserEntity } from './users/user.entity.js';

export class Seeds implements MigrationInterface {
  private save<T extends PlainLiteralObject>(
    repo: Repository<T>,
    data: DeepPartial<T>[],
  ): Promise<T[]> {
    return repo.save(data.map((partial) => repo.create(partial)));
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const { connection } = queryRunner;

    const companiesRepo = connection.getRepository(CompanyEntity);
    const projectsRepo = connection.getRepository(ProjectEntity);
    const usersRepo = connection.getRepository(UserEntity);
    const notesRepo = connection.getRepository(NoteEntity);
    const userProfilesRepo = connection.getRepository(UserProfileEntity);

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
    await this.save(usersRepo, [
      {
        email: '1@email.com',
        isActive: true,
        companyId: 1,
        firstName: 'firstname1',
        lastName: 'lastname1',
      },
      {
        email: '2@email.com',
        isActive: true,
        companyId: 1,
      },
      {
        email: '3@email.com',
        isActive: true,
        companyId: 1,
      },
      {
        email: '4@email.com',
        isActive: true,
        companyId: 1,
      },
      {
        email: '5@email.com',
        isActive: true,
        companyId: 1,
      },
      {
        email: '6@email.com',
        isActive: true,
        companyId: 1,
      },
      {
        email: '7@email.com',
        isActive: false,
        companyId: 1,
      },
      {
        email: '8@email.com',
        isActive: false,
        companyId: 1,
      },
      {
        email: '9@email.com',
        isActive: false,
        companyId: 1,
      },
      {
        email: '10@email.com',
        isActive: true,
        companyId: 1,
      },
      {
        email: '11@email.com',
        isActive: true,
        companyId: 2,
      },
      {
        email: '12@email.com',
        isActive: true,
        companyId: 2,
      },
      {
        email: '13@email.com',
        isActive: true,
        companyId: 2,
      },
      {
        email: '14@email.com',
        isActive: true,
        companyId: 2,
      },
      {
        email: '15@email.com',
        isActive: true,
        companyId: 2,
      },
      {
        email: '16@email.com',
        isActive: true,
        companyId: 2,
      },
      {
        email: '17@email.com',
        isActive: false,
        companyId: 2,
      },
      {
        email: '18@email.com',
        isActive: false,
        companyId: 2,
      },
      {
        email: '19@email.com',
        isActive: false,
        companyId: 2,
      },
      {
        email: '20@email.com',
        isActive: false,
        companyId: 2,
      },
      {
        email: '21@email.com',
        isActive: false,
        companyId: 2,
      },
    ]);

    // user profiles - creating profiles for most users (1-18 out of 21)
    await this.save(userProfilesRepo, [
      { userId: 1, nickName: 'TechGuru', favoriteColor: 'Blue' },
      { userId: 2, nickName: 'CodeMaster', favoriteColor: 'Green' },
      { userId: 3, nickName: 'DevNinja', favoriteColor: 'Orange' },
      { userId: 4, nickName: 'WebWizard', favoriteColor: 'Purple' },
      { userId: 5, nickName: 'DataDragon', favoriteColor: 'Orange' },
      { userId: 6, nickName: 'PixelPusher', favoriteColor: 'Yellow' },
      { userId: 7, nickName: 'ByteBender', favoriteColor: 'Pink' },
      { userId: 8, nickName: 'LogicLion', favoriteColor: 'Cyan' },
      { userId: 9, nickName: 'StackStar', favoriteColor: 'Magenta' },
      { userId: 10, nickName: 'CloudCrafter', favoriteColor: 'Indigo' },
      { userId: 11, nickName: 'APIAce', favoriteColor: 'Turquoise' },
      { userId: 12, nickName: 'QueryQueen', favoriteColor: 'Orange' },
      { userId: 13, nickName: 'ScriptSage', favoriteColor: 'Lime' },
      { userId: 14, nickName: 'FuncFox', favoriteColor: 'Maroon' },
      { userId: 15, nickName: 'ReactRanger', favoriteColor: 'Navy' },
      { userId: 16, nickName: 'NodeNomad', favoriteColor: 'Olive' },
      { userId: 17, nickName: 'GitGuru', favoriteColor: 'Teal' },
      { userId: 18, nickName: 'TestTitan', favoriteColor: 'Silver' },
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
