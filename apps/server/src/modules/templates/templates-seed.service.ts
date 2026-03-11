/**
 * Service for seeding built-in templates into an organisation.
 *
 * Called during onboarding or manually via admin/API.
 * Idempotent: skips templates that already exist (matched by name + isBuiltIn).
 */
import { prisma } from '../../lib/prisma.js';
import { tiptapJsonToYjsState } from '../../utils/tiptap-to-yjs.js';
import { BUILTIN_TEMPLATES } from './builtin-templates.js';

/**
 * Seed all built-in templates for an organisation.
 * Returns the number of templates created (skips duplicates).
 */
export async function seedBuiltInTemplates(orgId: string, userId: string): Promise<number> {
  // Find existing built-in templates for this org
  const existing = await prisma.template.findMany({
    where: {
      organizationId: orgId,
      isBuiltIn: true,
    },
    select: { name: true },
  });

  const existingNames = new Set(existing.map((t) => t.name));

  let created = 0;

  for (const template of BUILTIN_TEMPLATES) {
    if (existingNames.has(template.name)) {
      continue;
    }

    const yjsState = tiptapJsonToYjsState(template.content);

    await prisma.template.create({
      data: {
        organizationId: orgId,
        createdById: userId,
        name: template.name,
        description: template.description,
        icon: template.icon,
        category: template.category,
        isBuiltIn: true,
        yjsState,
      },
    });

    created++;
  }

  return created;
}
