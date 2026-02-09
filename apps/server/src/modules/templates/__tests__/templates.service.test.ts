import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
const { mockPrisma, resetMocks } = vi.hoisted(() => {
  const mockPrisma = {
    template: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    page: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  };

  function resetMocks() {
    for (const model of Object.values(mockPrisma)) {
      for (const method of Object.values(model)) {
        (method as ReturnType<typeof vi.fn>).mockReset();
      }
    }
  }

  return { mockPrisma, resetMocks };
});

vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));
vi.mock('../../audit/audit.service.js', () => ({ logAudit: vi.fn() }));

import {
  createTemplate,
  createTemplateFromPage,
  getTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  createPageFromTemplate,
} from '../templates.service.js';

describe('Templates Service', () => {
  beforeEach(() => {
    resetMocks();
  });

  // ===========================================
  // CREATE
  // ===========================================

  describe('createTemplate', () => {
    it('should create a template in the organisation', async () => {
      const mockTemplate = {
        id: 'tpl-1',
        organizationId: 'org-1',
        name: 'Meeting Notes',
        description: 'A template for meeting notes',
        icon: null,
        category: 'Meeting',
        isBuiltIn: false,
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.template.create.mockResolvedValue(mockTemplate);

      const result = await createTemplate('org-1', 'user-1', {
        name: 'Meeting Notes',
        description: 'A template for meeting notes',
        category: 'Meeting',
      });

      expect(result).toEqual(mockTemplate);
      expect(mockPrisma.template.create).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-1',
          createdById: 'user-1',
          name: 'Meeting Notes',
          description: 'A template for meeting notes',
          icon: undefined,
          category: 'Meeting',
        },
      });
    });
  });

  // ===========================================
  // CREATE FROM PAGE
  // ===========================================

  describe('createTemplateFromPage', () => {
    it('should copy page yjsState to template', async () => {
      const mockPage = {
        id: 'page-1',
        organizationId: 'org-1',
        title: 'My Meeting',
        icon: '📝',
        yjsState: Buffer.from('yjs-data'),
      };

      const mockTemplate = {
        id: 'tpl-1',
        organizationId: 'org-1',
        name: 'Custom Template',
        icon: '📝',
        yjsState: Buffer.from('yjs-data'),
      };

      mockPrisma.page.findFirst.mockResolvedValue(mockPage);
      mockPrisma.template.create.mockResolvedValue(mockTemplate);

      const result = await createTemplateFromPage('org-1', 'user-1', 'page-1', {
        name: 'Custom Template',
      });

      expect(result).toEqual(mockTemplate);
      expect(mockPrisma.template.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Custom Template',
          yjsState: Buffer.from('yjs-data'),
          icon: '📝',
        }),
      });
    });

    it('should use page title as name when no name provided', async () => {
      const mockPage = {
        id: 'page-1',
        organizationId: 'org-1',
        title: 'Sprint Retro',
        icon: null,
        yjsState: null,
      };

      mockPrisma.page.findFirst.mockResolvedValue(mockPage);
      mockPrisma.template.create.mockResolvedValue({ id: 'tpl-1', name: 'Sprint Retro' });

      await createTemplateFromPage('org-1', 'user-1', 'page-1');

      expect(mockPrisma.template.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Sprint Retro',
        }),
      });
    });

    it('should throw PAGE_NOT_FOUND when page does not exist', async () => {
      mockPrisma.page.findFirst.mockResolvedValue(null);

      await expect(createTemplateFromPage('org-1', 'user-1', 'page-999')).rejects.toThrow(
        'PAGE_NOT_FOUND'
      );
    });
  });

  // ===========================================
  // GET TEMPLATES
  // ===========================================

  describe('getTemplates', () => {
    it('should return all organisation templates', async () => {
      const mockTemplates = [
        { id: 'tpl-1', name: 'Meeting Notes' },
        { id: 'tpl-2', name: 'Project Plan' },
      ];

      mockPrisma.template.findMany.mockResolvedValue(mockTemplates);

      const result = await getTemplates('org-1');

      expect(result).toEqual(mockTemplates);
      expect(mockPrisma.template.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        select: {
          id: true,
          organizationId: true,
          name: true,
          description: true,
          icon: true,
          category: true,
          isBuiltIn: true,
          createdById: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ isBuiltIn: 'desc' }, { name: 'asc' }],
      });
    });

    it('should filter by category', async () => {
      mockPrisma.template.findMany.mockResolvedValue([]);

      await getTemplates('org-1', { category: 'Meeting' });

      expect(mockPrisma.template.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          category: 'Meeting',
        },
        select: expect.any(Object),
        orderBy: [{ isBuiltIn: 'desc' }, { name: 'asc' }],
      });
    });

    it('should filter by search query', async () => {
      mockPrisma.template.findMany.mockResolvedValue([]);

      await getTemplates('org-1', { search: 'meeting' });

      expect(mockPrisma.template.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          name: { contains: 'meeting', mode: 'insensitive' },
        },
        select: expect.any(Object),
        orderBy: [{ isBuiltIn: 'desc' }, { name: 'asc' }],
      });
    });
  });

  // ===========================================
  // GET SINGLE TEMPLATE
  // ===========================================

  describe('getTemplate', () => {
    it('should return a single template', async () => {
      const mockTemplate = { id: 'tpl-1', name: 'Meeting Notes', organizationId: 'org-1' };
      mockPrisma.template.findFirst.mockResolvedValue(mockTemplate);

      const result = await getTemplate('org-1', 'tpl-1');

      expect(result).toEqual(mockTemplate);
    });

    it('should throw TEMPLATE_NOT_FOUND for wrong organisation', async () => {
      mockPrisma.template.findFirst.mockResolvedValue(null);

      await expect(getTemplate('org-1', 'tpl-999')).rejects.toThrow('TEMPLATE_NOT_FOUND');
    });
  });

  // ===========================================
  // UPDATE TEMPLATE
  // ===========================================

  describe('updateTemplate', () => {
    it('should update name, description, and category', async () => {
      const mockTemplate = {
        id: 'tpl-1',
        organizationId: 'org-1',
        isBuiltIn: false,
      };

      const updatedTemplate = {
        ...mockTemplate,
        name: 'Updated Name',
        description: 'Updated desc',
        category: 'Project',
      };

      mockPrisma.template.findFirst.mockResolvedValue(mockTemplate);
      mockPrisma.template.update.mockResolvedValue(updatedTemplate);

      const result = await updateTemplate('org-1', 'tpl-1', {
        name: 'Updated Name',
        description: 'Updated desc',
        category: 'Project',
      });

      expect(result).toEqual(updatedTemplate);
      expect(mockPrisma.template.update).toHaveBeenCalledWith({
        where: { id: 'tpl-1' },
        data: {
          name: 'Updated Name',
          description: 'Updated desc',
          category: 'Project',
        },
      });
    });

    it('should throw TEMPLATE_NOT_FOUND when template does not exist', async () => {
      mockPrisma.template.findFirst.mockResolvedValue(null);

      await expect(updateTemplate('org-1', 'tpl-999', { name: 'New' })).rejects.toThrow(
        'TEMPLATE_NOT_FOUND'
      );
    });
  });

  // ===========================================
  // DELETE TEMPLATE
  // ===========================================

  describe('deleteTemplate', () => {
    it('should remove template', async () => {
      const mockTemplate = { id: 'tpl-1', organizationId: 'org-1', isBuiltIn: false };
      mockPrisma.template.findFirst.mockResolvedValue(mockTemplate);
      mockPrisma.template.delete.mockResolvedValue(mockTemplate);

      await deleteTemplate('org-1', 'tpl-1');

      expect(mockPrisma.template.delete).toHaveBeenCalledWith({
        where: { id: 'tpl-1' },
      });
    });

    it('should throw CANNOT_DELETE_BUILTIN for built-in templates', async () => {
      const mockTemplate = { id: 'tpl-1', organizationId: 'org-1', isBuiltIn: true };
      mockPrisma.template.findFirst.mockResolvedValue(mockTemplate);

      await expect(deleteTemplate('org-1', 'tpl-1')).rejects.toThrow('CANNOT_DELETE_BUILTIN');
    });

    it('should throw TEMPLATE_NOT_FOUND when template does not exist', async () => {
      mockPrisma.template.findFirst.mockResolvedValue(null);

      await expect(deleteTemplate('org-1', 'tpl-999')).rejects.toThrow('TEMPLATE_NOT_FOUND');
    });
  });

  // ===========================================
  // CREATE PAGE FROM TEMPLATE
  // ===========================================

  describe('createPageFromTemplate', () => {
    it('should create a page with template yjsState', async () => {
      const mockTemplate = {
        id: 'tpl-1',
        organizationId: 'org-1',
        name: 'Meeting Notes',
        icon: '📝',
        yjsState: Buffer.from('template-yjs-data'),
      };

      const mockPage = {
        id: 'page-new',
        title: 'Meeting Notes',
        icon: '📝',
        yjsState: Buffer.from('template-yjs-data'),
      };

      mockPrisma.template.findFirst.mockResolvedValue(mockTemplate);
      mockPrisma.page.create.mockResolvedValue(mockPage);

      const result = await createPageFromTemplate('org-1', 'user-1', 'tpl-1');

      expect(result).toEqual(mockPage);
      expect(mockPrisma.page.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: 'org-1',
          createdById: 'user-1',
          title: 'Meeting Notes',
          icon: '📝',
          yjsState: Buffer.from('template-yjs-data'),
        }),
      });
    });

    it('should use custom title when provided', async () => {
      const mockTemplate = {
        id: 'tpl-1',
        organizationId: 'org-1',
        name: 'Meeting Notes',
        icon: '📝',
        yjsState: null,
      };

      mockPrisma.template.findFirst.mockResolvedValue(mockTemplate);
      mockPrisma.page.create.mockResolvedValue({ id: 'page-new', title: 'My Custom Title' });

      await createPageFromTemplate('org-1', 'user-1', 'tpl-1', { title: 'My Custom Title' });

      expect(mockPrisma.page.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'My Custom Title',
        }),
      });
    });

    it('should throw TEMPLATE_NOT_FOUND when template does not exist', async () => {
      mockPrisma.template.findFirst.mockResolvedValue(null);

      await expect(createPageFromTemplate('org-1', 'user-1', 'tpl-999')).rejects.toThrow(
        'TEMPLATE_NOT_FOUND'
      );
    });
  });
});
