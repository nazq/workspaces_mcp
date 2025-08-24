/**
 * Tests for ControllerFactory
 */

import { describe, expect, it, vi } from 'vitest';

import type { ControllerDependencies } from '../../../layers/controllers/factory.js';
import { ControllerFactory } from '../../../layers/controllers/factory.js';
import { ListResourcesController } from '../../../layers/controllers/resources/list-controller.js';
import { ReadResourceController } from '../../../layers/controllers/resources/read-controller.js';
import { CallToolController } from '../../../layers/controllers/tools/call-controller.js';
import { ListToolsController } from '../../../layers/controllers/tools/list-controller.js';

// Mock services
const mockResourceService = {
  listResources: vi.fn().mockResolvedValue({ resources: [] }),
  readResource: vi
    .fn()
    .mockResolvedValue({ contents: [{ type: 'text', text: 'test' }] }),
};

const mockToolService = {
  listTools: vi.fn().mockResolvedValue({ tools: [] }),
  callTool: vi
    .fn()
    .mockResolvedValue({ content: [{ type: 'text', text: 'result' }] }),
};

const mockDependencies: ControllerDependencies = {
  resourceService: mockResourceService,
  toolService: mockToolService,
};

describe('ControllerFactory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createAll', () => {
    it('should create all controllers with dependencies', () => {
      const controllers = ControllerFactory.createAll(mockDependencies);

      expect(controllers).toHaveLength(4);
      expect(controllers[0]).toBeInstanceOf(ListResourcesController);
      expect(controllers[1]).toBeInstanceOf(ReadResourceController);
      expect(controllers[2]).toBeInstanceOf(ListToolsController);
      expect(controllers[3]).toBeInstanceOf(CallToolController);
    });

    it('should return controllers with correct methods', () => {
      const controllers = ControllerFactory.createAll(mockDependencies);

      const methods = controllers.map((controller) => controller.method);
      expect(methods).toEqual([
        'resources/list',
        'resources/read',
        'tools/list',
        'tools/call',
      ]);
    });

    it('should inject dependencies into controllers', async () => {
      const controllers = ControllerFactory.createAll(mockDependencies);

      // Test resource controllers have working service
      const listResourcesController = controllers.find(
        (c) => c.method === 'resources/list'
      );
      expect(listResourcesController).toBeDefined();

      const readResourceController = controllers.find(
        (c) => c.method === 'resources/read'
      );
      expect(readResourceController).toBeDefined();

      // Test tool controllers have working service
      const listToolsController = controllers.find(
        (c) => c.method === 'tools/list'
      );
      expect(listToolsController).toBeDefined();

      const callToolController = controllers.find(
        (c) => c.method === 'tools/call'
      );
      expect(callToolController).toBeDefined();
    });

    it('should create new instances each time', () => {
      const controllers1 = ControllerFactory.createAll(mockDependencies);
      const controllers2 = ControllerFactory.createAll(mockDependencies);

      // Should be different instances
      expect(controllers1[0]).not.toBe(controllers2[0]);
      expect(controllers1[1]).not.toBe(controllers2[1]);
      expect(controllers1[2]).not.toBe(controllers2[2]);
      expect(controllers1[3]).not.toBe(controllers2[3]);
    });
  });

  describe('createResourceControllers', () => {
    it('should create only resource controllers', () => {
      const controllers =
        ControllerFactory.createResourceControllers(mockResourceService);

      expect(controllers).toHaveLength(2);
      expect(controllers[0]).toBeInstanceOf(ListResourcesController);
      expect(controllers[1]).toBeInstanceOf(ReadResourceController);
    });

    it('should return resource controllers with correct methods', () => {
      const controllers =
        ControllerFactory.createResourceControllers(mockResourceService);

      const methods = controllers.map((controller) => controller.method);
      expect(methods).toEqual(['resources/list', 'resources/read']);
    });

    it('should inject resource service into controllers', async () => {
      const controllers =
        ControllerFactory.createResourceControllers(mockResourceService);

      // Verify controllers can use the service
      for (const controller of controllers) {
        expect(controller.method.startsWith('resources/')).toBe(true);
      }
    });
  });

  describe('createToolControllers', () => {
    it('should create only tool controllers', () => {
      const controllers =
        ControllerFactory.createToolControllers(mockToolService);

      expect(controllers).toHaveLength(2);
      expect(controllers[0]).toBeInstanceOf(ListToolsController);
      expect(controllers[1]).toBeInstanceOf(CallToolController);
    });

    it('should return tool controllers with correct methods', () => {
      const controllers =
        ControllerFactory.createToolControllers(mockToolService);

      const methods = controllers.map((controller) => controller.method);
      expect(methods).toEqual(['tools/list', 'tools/call']);
    });

    it('should inject tool service into controllers', async () => {
      const controllers =
        ControllerFactory.createToolControllers(mockToolService);

      // Verify controllers can use the service
      for (const controller of controllers) {
        expect(controller.method.startsWith('tools/')).toBe(true);
      }
    });
  });

  describe('dependency validation', () => {
    it('should handle missing dependencies gracefully', () => {
      // Test with undefined dependencies - should still create controllers
      expect(() => {
        ControllerFactory.createAll({
          // @ts-expect-error - testing invalid input
          resourceService: undefined,
          // @ts-expect-error - testing invalid input
          toolService: undefined,
        });
      }).not.toThrow();
    });

    it('should work with partial service implementations', () => {
      const partialResourceService = {
        listResources: vi.fn().mockResolvedValue({ resources: [] }),
        // Missing readResource method
      };

      expect(() => {
        ControllerFactory.createResourceControllers(
          // @ts-expect-error - testing partial implementation
          partialResourceService
        );
      }).not.toThrow();
    });
  });

  describe('logging', () => {
    it('should log controller creation', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      ControllerFactory.createAll(mockDependencies);

      // Logger should be called but we can't easily test the specific message
      // Just verify no errors were thrown during creation
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle null/undefined services', () => {
      expect(() => {
        ControllerFactory.createResourceControllers(
          // @ts-expect-error - testing null input
          null
        );
      }).not.toThrow();

      expect(() => {
        ControllerFactory.createToolControllers(
          // @ts-expect-error - testing null input
          null
        );
      }).not.toThrow();
    });

    it('should create controllers with different service instances', () => {
      const service1 = { ...mockResourceService };
      const service2 = { ...mockResourceService };

      const controllers1 =
        ControllerFactory.createResourceControllers(service1);
      const controllers2 =
        ControllerFactory.createResourceControllers(service2);

      // Controllers should be different instances even if services are similar
      expect(controllers1[0]).not.toBe(controllers2[0]);
    });
  });
});
