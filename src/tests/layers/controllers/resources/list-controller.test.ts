/**
 * Tests for ListResourcesController
 */

import type { ListResourcesResult } from '@modelcontextprotocol/sdk/types.js';
import { describe, expect, it, vi } from 'vitest';

import { ListResourcesController } from '../../../../layers/controllers/resources/list-controller.js';

// Mock ResourceService
interface ResourceService {
  listResources(): Promise<ListResourcesResult>;
}

const mockResourceService: ResourceService = {
  listResources: vi.fn(),
};

describe('ListResourcesController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('metadata', () => {
    it('should have correct method name', () => {
      const controller = new ListResourcesController(mockResourceService);
      expect(controller.method).toBe('resources/list');
    });
  });

  describe('handle', () => {
    it('should successfully list resources', async () => {
      const controller = new ListResourcesController(mockResourceService);
      const mockResult: ListResourcesResult = {
        resources: [
          {
            uri: 'file://workspace1/file1.txt',
            name: 'File 1',
            description: 'Test file 1',
            mimeType: 'text/plain',
          },
          {
            uri: 'file://workspace2/file2.md',
            name: 'File 2',
            description: 'Test markdown file',
            mimeType: 'text/markdown',
          },
        ],
      };

      vi.mocked(mockResourceService.listResources).mockResolvedValue(
        mockResult
      );

      const result = await controller.handle({});

      expect(mockResourceService.listResources).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
      expect(result.resources).toHaveLength(2);
    });

    it('should handle empty resource list', async () => {
      const controller = new ListResourcesController(mockResourceService);
      const emptyResult: ListResourcesResult = {
        resources: [],
      };

      vi.mocked(mockResourceService.listResources).mockResolvedValue(
        emptyResult
      );

      const result = await controller.handle({});

      expect(mockResourceService.listResources).toHaveBeenCalled();
      expect(result).toEqual(emptyResult);
      expect(result.resources).toHaveLength(0);
    });

    it('should handle resources with minimal metadata', async () => {
      const controller = new ListResourcesController(mockResourceService);
      const minimalResult: ListResourcesResult = {
        resources: [
          {
            uri: 'file://test.txt',
            name: 'Test',
          },
        ],
      };

      vi.mocked(mockResourceService.listResources).mockResolvedValue(
        minimalResult
      );

      const result = await controller.handle({});

      expect(result.resources[0]).toEqual({
        uri: 'file://test.txt',
        name: 'Test',
      });
    });

    it('should handle service errors', async () => {
      const controller = new ListResourcesController(mockResourceService);
      const serviceError = new Error('Service unavailable');

      vi.mocked(mockResourceService.listResources).mockRejectedValue(
        serviceError
      );

      await expect(controller.handle({})).rejects.toThrow(
        'Service unavailable'
      );
    });

    it('should handle non-Error exceptions from service', async () => {
      const controller = new ListResourcesController(mockResourceService);

      vi.mocked(mockResourceService.listResources).mockRejectedValue(
        'String error'
      );

      await expect(controller.handle({})).rejects.toThrow('String error');
    });

    it('should handle resources with all optional fields', async () => {
      const controller = new ListResourcesController(mockResourceService);
      const fullResult: ListResourcesResult = {
        resources: [
          {
            uri: 'file://workspace/complex.json',
            name: 'Complex Resource',
            description: 'A resource with all metadata',
            mimeType: 'application/json',
          },
        ],
      };

      vi.mocked(mockResourceService.listResources).mockResolvedValue(
        fullResult
      );

      const result = await controller.handle({});

      expect(result.resources[0]).toEqual({
        uri: 'file://workspace/complex.json',
        name: 'Complex Resource',
        description: 'A resource with all metadata',
        mimeType: 'application/json',
      });
    });

    it('should handle large resource lists', async () => {
      const controller = new ListResourcesController(mockResourceService);
      const largeResourceList = Array.from({ length: 100 }, (_, i) => ({
        uri: `file://workspace/file${i}.txt`,
        name: `File ${i}`,
        description: `Test file number ${i}`,
        mimeType: 'text/plain',
      }));

      const largeResult: ListResourcesResult = {
        resources: largeResourceList,
      };

      vi.mocked(mockResourceService.listResources).mockResolvedValue(
        largeResult
      );

      const result = await controller.handle({});

      expect(result.resources).toHaveLength(100);
      expect(result.resources[0].name).toBe('File 0');
      expect(result.resources[99].name).toBe('File 99');
    });

    it('should handle request parameter correctly', async () => {
      const controller = new ListResourcesController(mockResourceService);
      const mockResult: ListResourcesResult = { resources: [] };

      vi.mocked(mockResourceService.listResources).mockResolvedValue(
        mockResult
      );

      // The request parameter is not used in this controller, but should not cause issues
      const request = { someProperty: 'test' };
      await controller.handle(request);

      expect(mockResourceService.listResources).toHaveBeenCalled();
    });

    it('should pass through service result without modification', async () => {
      const controller = new ListResourcesController(mockResourceService);
      const originalResult: ListResourcesResult = {
        resources: [
          {
            uri: 'file://test.txt',
            name: 'Test File',
            description: 'Original description',
            mimeType: 'text/plain',
          },
        ],
      };

      vi.mocked(mockResourceService.listResources).mockResolvedValue(
        originalResult
      );

      const result = await controller.handle({});

      // Result should be exactly what the service returned
      expect(result).toBe(originalResult);
      expect(result.resources[0]).toBe(originalResult.resources[0]);
    });
  });
});
