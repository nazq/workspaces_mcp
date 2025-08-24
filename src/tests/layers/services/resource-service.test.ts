import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  InstructionsRepository,
  WorkspaceRepository,
} from '../../../layers/data/index.js';
import { ResourceService } from '../../../layers/services/resource-service.js';
import type {
  GlobalInstructions,
  SharedInstruction,
  WorkspaceMetadata,
} from '../../../types/index.js';

// Mock logger to avoid console output during tests
vi.mock('../../../utils/logger.js', () => ({
  createChildLogger: () => ({
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
}));

describe('ResourceService', () => {
  let resourceService: ResourceService;
  let mockWorkspaceRepository: InstructionsRepository;
  let mockInstructionsRepository: WorkspaceRepository;

  const mockWorkspaceMetadata: WorkspaceMetadata = {
    name: 'test-workspace',
    description: 'A test workspace',
    path: '/path/to/workspace',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    modifiedAt: new Date('2024-01-02T00:00:00Z'),
  };

  const mockSharedInstruction: SharedInstruction = {
    name: 'react-guide',
    description: 'React development guide',
    content: '# React Guide\n\nUse hooks and functional components.',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    modifiedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockGlobalInstructions: GlobalInstructions = {
    content: '# Global Instructions\n\nThese apply to all workspaces.',
    modifiedAt: new Date('2024-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    // Create mock repositories
    mockWorkspaceRepository = {
      list: vi.fn(),
      exists: vi.fn(),
      getMetadata: vi.fn(),
    } as any;

    mockInstructionsRepository = {
      listShared: vi.fn(),
      getShared: vi.fn(),
      getGlobal: vi.fn(),
    } as any;

    resourceService = new ResourceService({
      workspaceRepository: mockWorkspaceRepository,
      instructionsRepository: mockInstructionsRepository,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('listResources', () => {
    it('should list resources with workspaces and shared instructions', async () => {
      // Setup mocks
      vi.mocked(mockWorkspaceRepository.list).mockResolvedValue([
        mockWorkspaceMetadata,
      ]);
      vi.mocked(mockInstructionsRepository.listShared).mockResolvedValue([
        mockSharedInstruction,
      ]);

      const result = await resourceService.listResources();

      expect(result.resources).toHaveLength(3); // workspace + shared instruction + global

      // Check workspace resource
      expect(result.resources[0]).toEqual({
        uri: 'workspace://test-workspace',
        name: 'test-workspace',
        description: 'A test workspace',
        mimeType: 'application/json',
      });

      // Check shared instruction resource
      expect(result.resources[1]).toEqual({
        uri: 'instruction://shared/react-guide',
        name: 'Shared Instruction: react-guide',
        description: 'React development guide',
        mimeType: 'text/plain',
      });

      // Check global instructions resource
      expect(result.resources[2]).toEqual({
        uri: 'instruction://global',
        name: 'Global Instructions',
        description: 'Global instructions that apply to all workspaces',
        mimeType: 'text/plain',
      });
    });

    it('should use default descriptions when not provided', async () => {
      const workspaceWithoutDescription = {
        ...mockWorkspaceMetadata,
        description: undefined,
      };
      const instructionWithoutDescription = {
        ...mockSharedInstruction,
        description: undefined,
      };

      vi.mocked(mockWorkspaceRepository.list).mockResolvedValue([
        workspaceWithoutDescription,
      ]);
      vi.mocked(mockInstructionsRepository.listShared).mockResolvedValue([
        instructionWithoutDescription,
      ]);

      const result = await resourceService.listResources();

      expect(result.resources[0]?.description).toBe(
        'Workspace: test-workspace'
      );
      expect(result.resources[1]?.description).toBe(
        'Shared instruction: react-guide'
      );
    });

    it('should handle empty workspaces and instructions', async () => {
      vi.mocked(mockWorkspaceRepository.list).mockResolvedValue([]);
      vi.mocked(mockInstructionsRepository.listShared).mockResolvedValue([]);

      const result = await resourceService.listResources();

      expect(result.resources).toHaveLength(1); // Only global instructions
      expect(result.resources[0]?.uri).toBe('instruction://global');
    });

    it('should handle multiple workspaces and instructions', async () => {
      const workspace2 = { ...mockWorkspaceMetadata, name: 'workspace2' };
      const instruction2 = { ...mockSharedInstruction, name: 'python-guide' };

      vi.mocked(mockWorkspaceRepository.list).mockResolvedValue([
        mockWorkspaceMetadata,
        workspace2,
      ]);
      vi.mocked(mockInstructionsRepository.listShared).mockResolvedValue([
        mockSharedInstruction,
        instruction2,
      ]);

      const result = await resourceService.listResources();

      expect(result.resources).toHaveLength(5); // 2 workspaces + 2 shared instructions + global
    });

    it('should throw error when workspace repository fails', async () => {
      vi.mocked(mockWorkspaceRepository.list).mockRejectedValue(
        new Error('Database error')
      );
      vi.mocked(mockInstructionsRepository.listShared).mockResolvedValue([]);

      await expect(resourceService.listResources()).rejects.toThrow(
        'Unable to list resources'
      );
    });

    it('should throw error when instructions repository fails', async () => {
      vi.mocked(mockWorkspaceRepository.list).mockResolvedValue([]);
      vi.mocked(mockInstructionsRepository.listShared).mockRejectedValue(
        new Error('File error')
      );

      await expect(resourceService.listResources()).rejects.toThrow(
        'Unable to list resources'
      );
    });
  });

  describe('readResource', () => {
    describe('workspace resources', () => {
      it('should read workspace resource successfully', async () => {
        vi.mocked(mockWorkspaceRepository.exists).mockResolvedValue(true);
        vi.mocked(mockWorkspaceRepository.getMetadata).mockResolvedValue(
          mockWorkspaceMetadata
        );

        const result = await resourceService.readResource(
          'workspace://test-workspace'
        );

        expect(result.contents).toHaveLength(1);
        expect(result.contents[0]).toMatchObject({
          uri: 'workspace://test-workspace',
          mimeType: 'application/json',
        });

        const content = JSON.parse(result.contents[0]!.text!);
        expect(content).toEqual({
          name: 'test-workspace',
          description: 'A test workspace',
          path: '/path/to/workspace',
          createdAt: '2024-01-01T00:00:00.000Z',
          modifiedAt: '2024-01-02T00:00:00.000Z',
        });
      });

      it('should throw error for non-existent workspace', async () => {
        vi.mocked(mockWorkspaceRepository.exists).mockResolvedValue(false);

        await expect(
          resourceService.readResource('workspace://non-existent')
        ).rejects.toThrow("Workspace 'non-existent' not found");
      });

      it('should handle workspace without description', async () => {
        const workspaceWithoutDescription = {
          ...mockWorkspaceMetadata,
          description: undefined,
        };
        vi.mocked(mockWorkspaceRepository.exists).mockResolvedValue(true);
        vi.mocked(mockWorkspaceRepository.getMetadata).mockResolvedValue(
          workspaceWithoutDescription
        );

        const result = await resourceService.readResource(
          'workspace://test-workspace'
        );
        const content = JSON.parse(result.contents[0]!.text!);

        expect(content.description).toBeUndefined();
      });
    });

    describe('instruction resources', () => {
      it('should read global instructions', async () => {
        vi.mocked(mockInstructionsRepository.getGlobal).mockResolvedValue(
          mockGlobalInstructions
        );

        const result = await resourceService.readResource(
          'instruction://global'
        );

        expect(result.contents).toHaveLength(1);
        expect(result.contents[0]).toEqual({
          uri: 'instruction://global',
          mimeType: 'text/plain',
          text: '# Global Instructions\n\nThese apply to all workspaces.',
        });
      });

      it('should read shared instruction', async () => {
        vi.mocked(mockInstructionsRepository.getShared).mockResolvedValue(
          mockSharedInstruction
        );

        const result = await resourceService.readResource(
          'instruction://shared/react-guide'
        );

        expect(result.contents).toHaveLength(1);
        expect(result.contents[0]).toEqual({
          uri: 'instruction://shared/react-guide',
          mimeType: 'text/plain',
          text: '# React Guide\n\nUse hooks and functional components.',
        });

        expect(mockInstructionsRepository.getShared).toHaveBeenCalledWith(
          'react-guide'
        );
      });

      it('should throw error for invalid instruction path', async () => {
        await expect(
          resourceService.readResource('instruction://invalid/path')
        ).rejects.toThrow('Invalid instruction path: invalid/path');
      });

      it('should handle instruction repository errors gracefully', async () => {
        vi.mocked(mockInstructionsRepository.getGlobal).mockRejectedValue(
          new Error('File not found')
        );

        await expect(
          resourceService.readResource('instruction://global')
        ).rejects.toThrow('File not found');
      });
    });

    describe('URI parsing and validation', () => {
      it('should throw error for unsupported URI scheme', async () => {
        await expect(
          resourceService.readResource('http://example.com')
        ).rejects.toThrow('Unsupported resource scheme: http');
      });

      it('should throw error for invalid URI format', async () => {
        await expect(
          resourceService.readResource('invalid-uri')
        ).rejects.toThrow('Invalid URI format: invalid-uri');
      });

      it('should throw error for URI without path', async () => {
        await expect(
          resourceService.readResource('workspace://')
        ).rejects.toThrow('Invalid URI format: workspace://');
      });

      it('should handle complex paths correctly', async () => {
        vi.mocked(mockInstructionsRepository.getShared).mockResolvedValue(
          mockSharedInstruction
        );

        await resourceService.readResource(
          'instruction://shared/complex/path/name'
        );

        expect(mockInstructionsRepository.getShared).toHaveBeenCalledWith(
          'complex/path/name'
        );
      });
    });

    describe('error handling', () => {
      it('should re-throw Error instances directly', async () => {
        const originalError = new Error('Specific error message');
        vi.mocked(mockWorkspaceRepository.exists).mockRejectedValue(
          originalError
        );

        await expect(
          resourceService.readResource('workspace://test')
        ).rejects.toThrow('Specific error message');
      });

      it('should wrap non-Error objects in generic error', async () => {
        vi.mocked(mockWorkspaceRepository.exists).mockRejectedValue(
          'String error'
        );

        await expect(
          resourceService.readResource('workspace://test')
        ).rejects.toThrow('Unable to read resource: workspace://test');
      });

      it('should handle workspace repository errors', async () => {
        vi.mocked(mockWorkspaceRepository.exists).mockResolvedValue(true);
        vi.mocked(mockWorkspaceRepository.getMetadata).mockRejectedValue(
          new Error('Database connection failed')
        );

        await expect(
          resourceService.readResource('workspace://test')
        ).rejects.toThrow('Database connection failed');
      });
    });
  });

  describe('URI parsing edge cases', () => {
    it('should handle URIs with special characters', async () => {
      vi.mocked(mockInstructionsRepository.getShared).mockResolvedValue(
        mockSharedInstruction
      );

      await resourceService.readResource(
        'instruction://shared/name-with-dashes'
      );

      expect(mockInstructionsRepository.getShared).toHaveBeenCalledWith(
        'name-with-dashes'
      );
    });

    it('should handle URIs with numbers', async () => {
      vi.mocked(mockWorkspaceRepository.exists).mockResolvedValue(true);
      vi.mocked(mockWorkspaceRepository.getMetadata).mockResolvedValue(
        mockWorkspaceMetadata
      );

      await resourceService.readResource('workspace://project123');

      expect(mockWorkspaceRepository.exists).toHaveBeenCalledWith('project123');
    });

    it('should reject malformed URI with colons in wrong place', async () => {
      await expect(
        resourceService.readResource('invalid:scheme://path')
      ).rejects.toThrow('Invalid URI format: invalid:scheme://path');
    });
  });
});
