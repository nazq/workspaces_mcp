import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EventBus, Logger } from '../../../interfaces/services.js';
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
import { Err, isErr, isOk, Ok } from '../../../utils/result.js';

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
    // Create mock repositories with Result pattern
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

    // Create mock event bus and logger
    const mockEventBus: EventBus = {
      emit: vi.fn().mockResolvedValue(undefined),
      on: vi.fn().mockReturnValue(() => {}),
      once: vi.fn(),
      off: vi.fn(),
      removeAllListeners: vi.fn(),
      getListenerCount: vi.fn().mockReturnValue(0),
      getRegisteredEvents: vi.fn().mockReturnValue([]),
      setMaxListeners: vi.fn(),
      emitBatch: vi.fn().mockResolvedValue(undefined),
    };

    const mockLogger: Logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
    };

    resourceService = new ResourceService(
      mockWorkspaceRepository,
      mockInstructionsRepository,
      mockEventBus,
      mockLogger
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('listResources', () => {
    it('should list resources with workspaces and shared instructions', async () => {
      // Setup mocks with Result pattern
      vi.mocked(mockWorkspaceRepository.list).mockResolvedValue(
        Ok([mockWorkspaceMetadata])
      );
      vi.mocked(mockInstructionsRepository.listShared).mockResolvedValue(
        Ok([mockSharedInstruction])
      );

      const result = await resourceService.listResources();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.resources).toHaveLength(3); // workspace + shared instruction + global

        // Check workspace resource
        expect(result.data.resources[0]).toEqual({
          uri: 'workspace://test-workspace',
          name: '📁 test-workspace',
          description: 'A test workspace',
          mimeType: 'application/json',
        });

        // Check shared instruction resource
        expect(result.data.resources[1]).toEqual({
          uri: 'instruction://shared/react-guide',
          name: '📝 react-guide',
          description: 'React development guide',
          mimeType: 'text/markdown',
        });

        // Check global instructions resource
        expect(result.data.resources[2]).toEqual({
          uri: 'instruction://global',
          name: '🌍 Global Instructions',
          description: '⭐ Essential global instructions - loads automatically for all sessions',
          mimeType: 'text/markdown',
        });
      }
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

      vi.mocked(mockWorkspaceRepository.list).mockResolvedValue(
        Ok([workspaceWithoutDescription])
      );
      vi.mocked(mockInstructionsRepository.listShared).mockResolvedValue(
        Ok([instructionWithoutDescription])
      );

      const result = await resourceService.listResources();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.resources[0]?.description).toBe(
          'Workspace: test-workspace'
        );
        expect(result.data.resources[1]?.description).toBe(
          'Shared instruction: react-guide'
        );
      }
    });

    it('should handle empty workspaces and instructions', async () => {
      vi.mocked(mockWorkspaceRepository.list).mockResolvedValue(Ok([]));
      vi.mocked(mockInstructionsRepository.listShared).mockResolvedValue(Ok([]));

      const result = await resourceService.listResources();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.resources).toHaveLength(1); // Only global instructions
        expect(result.data.resources[0]?.uri).toBe('instruction://global');
      }
    });

    it('should handle multiple workspaces and instructions', async () => {
      const workspace2 = { ...mockWorkspaceMetadata, name: 'workspace2' };
      const instruction2 = { ...mockSharedInstruction, name: 'python-guide' };

      vi.mocked(mockWorkspaceRepository.list).mockResolvedValue(
        Ok([mockWorkspaceMetadata, workspace2])
      );
      vi.mocked(mockInstructionsRepository.listShared).mockResolvedValue(
        Ok([mockSharedInstruction, instruction2])
      );

      const result = await resourceService.listResources();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.resources).toHaveLength(5); // 2 workspaces + 2 shared instructions + global
      }
    });

    it('should handle error when workspace repository fails', async () => {
      vi.mocked(mockWorkspaceRepository.list).mockResolvedValue(
        Err(new Error('Database error'))
      );
      vi.mocked(mockInstructionsRepository.listShared).mockResolvedValue(Ok([]));

      const result = await resourceService.listResources();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        // Should still return global instructions even if workspace listing fails
        expect(result.data.resources).toHaveLength(1);
        expect(result.data.resources[0]?.uri).toBe('instruction://global');
      }
    });

    it('should handle error when instructions repository fails', async () => {
      vi.mocked(mockWorkspaceRepository.list).mockResolvedValue(Ok([]));
      vi.mocked(mockInstructionsRepository.listShared).mockResolvedValue(
        Err(new Error('File error'))
      );

      const result = await resourceService.listResources();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        // Should still return global instructions even if shared instructions listing fails
        expect(result.data.resources).toHaveLength(1);
        expect(result.data.resources[0]?.uri).toBe('instruction://global');
      }
    });
  });

  describe('readResource', () => {
    describe('workspace resources', () => {
      it('should read workspace resource successfully', async () => {
        vi.mocked(mockWorkspaceRepository.exists).mockResolvedValue(Ok(true));
        vi.mocked(mockWorkspaceRepository.getMetadata).mockResolvedValue(
          Ok({
            ...mockWorkspaceMetadata,
            updatedAt: mockWorkspaceMetadata.modifiedAt, // Add updatedAt field
            size: 1024,
            fileCount: 5,
          })
        );

        const result = await resourceService.readResource(
          'workspace://test-workspace'
        );

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.data.contents).toHaveLength(1);
          expect(result.data.contents[0]).toMatchObject({
            uri: 'workspace://test-workspace',
            mimeType: 'application/json',
          });

          const content = JSON.parse(result.data.contents[0]!.text!);
          expect(content.name).toBe('test-workspace');
          expect(content.description).toBe('A test workspace');
          expect(content.path).toBe('/path/to/workspace');
        }
      });

      it('should return error for non-existent workspace', async () => {
        vi.mocked(mockWorkspaceRepository.exists).mockResolvedValue(Ok(false));

        const result = await resourceService.readResource('workspace://non-existent');

        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.message).toBe("Workspace 'non-existent' not found");
        }
      });

      it('should handle workspace without description', async () => {
        const workspaceWithoutDescription = {
          ...mockWorkspaceMetadata,
          description: undefined,
          updatedAt: mockWorkspaceMetadata.modifiedAt,
          size: 1024,
          fileCount: 5,
        };
        vi.mocked(mockWorkspaceRepository.exists).mockResolvedValue(Ok(true));
        vi.mocked(mockWorkspaceRepository.getMetadata).mockResolvedValue(
          Ok(workspaceWithoutDescription)
        );

        const result = await resourceService.readResource(
          'workspace://test-workspace'
        );

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          const content = JSON.parse(result.data.contents[0]!.text!);
          expect(content.description).toBeUndefined();
        }
      });
    });

    describe('instruction resources', () => {
      it('should read global instructions', async () => {
        vi.mocked(mockInstructionsRepository.getGlobal).mockResolvedValue(
          Ok(mockGlobalInstructions)
        );

        const result = await resourceService.readResource(
          'instruction://global'
        );

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.data.contents).toHaveLength(1);
          expect(result.data.contents[0]).toEqual({
            uri: 'instruction://global',
            mimeType: 'text/markdown',
            text: '# Global Instructions\n\nThese apply to all workspaces.',
          });
        }
      });

      it('should read shared instruction', async () => {
        vi.mocked(mockInstructionsRepository.getShared).mockResolvedValue(
          Ok(mockSharedInstruction)
        );

        const result = await resourceService.readResource(
          'instruction://shared/react-guide'
        );

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.data.contents).toHaveLength(1);
          expect(result.data.contents[0]).toEqual({
            uri: 'instruction://shared/react-guide',
            mimeType: 'text/markdown',
            text: '# React Guide\n\nUse hooks and functional components.',
          });
        }

        expect(mockInstructionsRepository.getShared).toHaveBeenCalledWith(
          'react-guide'
        );
      });

      it('should return error for invalid instruction path', async () => {
        const result = await resourceService.readResource('instruction://invalid/path');

        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.message).toContain('Invalid instruction path: invalid/path');
        }
      });

      it('should handle instruction repository errors gracefully', async () => {
        vi.mocked(mockInstructionsRepository.getGlobal).mockResolvedValue(
          Err(new Error('File not found'))
        );

        const result = await resourceService.readResource('instruction://global');

        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.message).toContain('File not found');
        }
      });
    });

    describe('URI parsing and validation', () => {
      it('should return error for unsupported URI scheme', async () => {
        const result = await resourceService.readResource('http://example.com');

        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.message).toContain('Unsupported URI scheme');
        }
      });

      it('should return error for invalid URI format', async () => {
        const result = await resourceService.readResource('invalid-uri');

        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.message).toContain('Invalid URI format');
        }
      });

      it('should return error for URI without path', async () => {
        const result = await resourceService.readResource('workspace://');

        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.message).toContain('Invalid URI format');
        }
      });

      it('should handle complex paths correctly', async () => {
        vi.mocked(mockInstructionsRepository.getShared).mockResolvedValue(
          Ok(mockSharedInstruction)
        );

        const result = await resourceService.readResource(
          'instruction://shared/complex/path/name'
        );

        expect(isOk(result)).toBe(true);
        expect(mockInstructionsRepository.getShared).toHaveBeenCalledWith(
          'complex/path/name'
        );
      });
    });

    describe('error handling', () => {
      it('should handle Error instances from repository', async () => {
        const originalError = new Error('Specific error message');
        vi.mocked(mockWorkspaceRepository.exists).mockResolvedValue(
          Err(originalError)
        );

        const result = await resourceService.readResource('workspace://test');

        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.message).toContain('Specific error message');
        }
      });

      it('should handle unexpected errors gracefully', async () => {
        vi.mocked(mockWorkspaceRepository.exists).mockRejectedValue(
          new Error('Unexpected error')
        );

        const result = await resourceService.readResource('workspace://test');

        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.message).toContain('Failed to read workspace resource');
        }
      });

      it('should handle workspace repository errors', async () => {
        vi.mocked(mockWorkspaceRepository.exists).mockResolvedValue(Ok(true));
        vi.mocked(mockWorkspaceRepository.getMetadata).mockResolvedValue(
          Err(new Error('Database connection failed'))
        );

        const result = await resourceService.readResource('workspace://test');

        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.message).toContain('Database connection failed');
        }
      });
    });
  });

  describe('URI parsing edge cases', () => {
    it('should handle URIs with special characters', async () => {
      vi.mocked(mockInstructionsRepository.getShared).mockResolvedValue(
        Ok(mockSharedInstruction)
      );

      const result = await resourceService.readResource(
        'instruction://shared/name-with-dashes'
      );

      expect(isOk(result)).toBe(true);
      expect(mockInstructionsRepository.getShared).toHaveBeenCalledWith(
        'name-with-dashes'
      );
    });

    it('should handle URIs with numbers', async () => {
      vi.mocked(mockWorkspaceRepository.exists).mockResolvedValue(Ok(true));
      vi.mocked(mockWorkspaceRepository.getMetadata).mockResolvedValue(
        Ok({
          ...mockWorkspaceMetadata,
          name: 'project123',
          updatedAt: mockWorkspaceMetadata.modifiedAt,
          size: 1024,
          fileCount: 5,
        })
      );

      const result = await resourceService.readResource('workspace://project123');

      expect(isOk(result)).toBe(true);
      expect(mockWorkspaceRepository.exists).toHaveBeenCalledWith('project123');
    });

    it('should reject malformed URI with colons in wrong place', async () => {
      const result = await resourceService.readResource('invalid:scheme://path');

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('Invalid URI format');
      }
    });
  });
});
