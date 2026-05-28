import { chatCompletion, getAiConfig } from './ai.service.js';
import { createDatabase, createProperty, deleteDatabase } from '../databases/databases.service.js';

const VALID_TYPES = [
  'TEXT',
  'NUMBER',
  'SELECT',
  'MULTI_SELECT',
  'DATE',
  'CHECKBOX',
  'URL',
  'EMAIL',
  'PHONE',
] as const;

type SimplePropertyType = (typeof VALID_TYPES)[number];

export interface GeneratedProperty {
  name: string;
  type: SimplePropertyType;
  config?: Record<string, unknown>;
}

export interface GeneratedSchema {
  name: string;
  properties: GeneratedProperty[];
}

const SYSTEM_PROMPT = `You are a database schema designer. Given a description, return ONLY a JSON object with:
- "name": string — the database name
- "properties": array of { "name": string, "type": one of TEXT|NUMBER|SELECT|MULTI_SELECT|DATE|CHECKBOX|URL|EMAIL|PHONE, "config"?: object }

For SELECT/MULTI_SELECT include "config": { "options": [{ "label": string }] }.
Return ONLY valid JSON. No explanation, no markdown fences.`;

export async function generateDatabaseSchema(description: string): Promise<GeneratedSchema> {
  const config = await getAiConfig();

  const raw = (await chatCompletion(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: description },
    ],
    { model: config.model, temperature: 0.3 }
  )) as { choices: [{ message: { content: string } }] };

  // Strip optional markdown code fences — models sometimes wrap JSON in ```json ... ``` despite the prompt
  const rawContent = raw.choices[0].message.content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');

  const json = JSON.parse(rawContent) as {
    name?: unknown;
    properties?: unknown[];
  };

  const schema: GeneratedSchema = {
    name: String(json.name ?? 'AI Database').slice(0, 200),
    properties: (json.properties ?? [])
      .filter(
        (p): p is { name: unknown; type: string; config?: Record<string, unknown> } =>
          typeof p === 'object' &&
          p !== null &&
          VALID_TYPES.includes((p as { type: string }).type as SimplePropertyType)
      )
      .slice(0, 20)
      .map((p, i) => ({
        name: String(p.name ?? `Column ${i + 1}`).slice(0, 100),
        type: p.type as SimplePropertyType,
        config: typeof p.config === 'object' && p.config !== null ? p.config : undefined,
      })),
  };

  if (!schema.properties.length) {
    schema.properties = [{ name: 'Name', type: 'TEXT' }];
  }

  return schema;
}

export async function createAiDatabase(orgId: string, userId: string, description: string) {
  const schema = await generateDatabaseSchema(description);

  const database = await createDatabase(orgId, userId, { name: schema.name });

  try {
    for (const [i, prop] of schema.properties.entries()) {
      // Skip auto-created default "Title" TEXT property (position 0)
      if (i === 0 && prop.type === 'TEXT' && prop.name.toLowerCase() === 'title') continue;

      await createProperty(orgId, database.id, {
        name: prop.name,
        type: prop.type,
        config: prop.config,
      });
    }
  } catch (err) {
    // Roll back the database so the user doesn't see an orphaned incomplete schema
    await deleteDatabase(orgId, database.id).catch(() => undefined);
    throw err;
  }

  return {
    databaseId: database.id,
    name: database.name,
    propertyCount: schema.properties.length,
  };
}
