import { Test, type TestingModule } from '@nestjs/testing';

import {
  getDynamicRepositoryToken,
  type RepositoryInterface,
  type OrgMemberEntityInterface,
} from '@concepta/nestjs-common';

import { OrgMemberException } from '../exceptions/org-member.exception';
import { type OrgMemberCreatableInterface } from '../interfaces/org-member-creatable.interface';
import { ORG_MODULE_ORG_MEMBER_ENTITY_KEY } from '../org.constants';

import { OrgMemberModelService } from './org-member-model.service';
import { OrgMemberService } from './org-member.service';

describe(OrgMemberService.name, () => {
  let service: OrgMemberService;
  let repo: jest.Mocked<RepositoryInterface<OrgMemberEntityInterface>>;
  let orgMemberModelService: jest.Mocked<OrgMemberModelService>;

  const mockOrgMember: OrgMemberEntityInterface = {
    id: 'test-id',
    userId: 'test-user-id',
    orgId: 'test-org-id',
    active: true,
    dateCreated: new Date(),
    dateUpdated: new Date(),
    dateDeleted: null,
    version: 1,
  };

  const mockCreatableOrgMember: OrgMemberCreatableInterface = {
    userId: 'test-user-id',
    orgId: 'test-org-id',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrgMemberService,
        {
          provide: getDynamicRepositoryToken(ORG_MODULE_ORG_MEMBER_ENTITY_KEY),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: OrgMemberModelService,
          useValue: {
            create: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrgMemberService>(OrgMemberService);
    repo = module.get(
      getDynamicRepositoryToken(ORG_MODULE_ORG_MEMBER_ENTITY_KEY),
    );
    orgMemberModelService = module.get(OrgMemberModelService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe(OrgMemberService.prototype.add.name, () => {
    it('should successfully add a new org member', async () => {
      // Arrange
      repo.findOne.mockResolvedValue(null);
      orgMemberModelService.create.mockResolvedValue(mockOrgMember);

      // Act
      const result = await service.add(mockCreatableOrgMember);

      // Assert
      expect(repo.findOne).toHaveBeenCalledWith({
        where: mockCreatableOrgMember,
      });
      expect(orgMemberModelService.create).toHaveBeenCalledWith(
        mockCreatableOrgMember,
      );
      expect(result).toEqual(mockOrgMember);
    });

    it('should throw OrgMemberException when org member already exists', async () => {
      // Arrange
      repo.findOne.mockResolvedValue(mockOrgMember);

      // Act & Assert
      await expect(service.add(mockCreatableOrgMember)).rejects.toThrow(
        OrgMemberException,
      );
      expect(repo.findOne).toHaveBeenCalledWith({
        where: mockCreatableOrgMember,
      });
      expect(orgMemberModelService.create).not.toHaveBeenCalled();
    });

    it('should throw error when repository findOne fails', async () => {
      // Arrange
      const error = new Error('Database error');
      repo.findOne.mockRejectedValue(error);

      // Act & Assert
      await expect(service.add(mockCreatableOrgMember)).rejects.toThrow(error);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: mockCreatableOrgMember,
      });
      expect(orgMemberModelService.create).not.toHaveBeenCalled();
    });

    it('should throw error when model service create fails', async () => {
      // Arrange
      const error = new Error('Create error');
      repo.findOne.mockResolvedValue(null);
      orgMemberModelService.create.mockRejectedValue(error);

      // Act & Assert
      await expect(service.add(mockCreatableOrgMember)).rejects.toThrow(error);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: mockCreatableOrgMember,
      });
      expect(orgMemberModelService.create).toHaveBeenCalledWith(
        mockCreatableOrgMember,
      );
    });
  });

  describe(OrgMemberService.prototype.remove.name, () => {
    it('should successfully remove an org member', async () => {
      // Arrange
      orgMemberModelService.remove.mockResolvedValue(mockOrgMember);

      // Act
      const result = await service.remove('test-id');

      // Assert
      expect(orgMemberModelService.remove).toHaveBeenCalledWith({
        id: 'test-id',
      });
      expect(result).toEqual(mockOrgMember);
    });

    it('should throw error when model service remove fails', async () => {
      // Arrange
      const error = new Error('Remove error');
      orgMemberModelService.remove.mockRejectedValue(error);

      // Act & Assert
      await expect(service.remove('test-id')).rejects.toThrow(error);
      expect(orgMemberModelService.remove).toHaveBeenCalledWith({
        id: 'test-id',
      });
    });
  });
});
