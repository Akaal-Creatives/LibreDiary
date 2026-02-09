import { api } from './api';

export const WRITING_ACTIONS = ['generate', 'expand', 'summarise', 'improve'] as const;

export type WritingAction = (typeof WRITING_ACTIONS)[number];

export async function writeText(
  orgId: string,
  action: WritingAction,
  text: string
): Promise<{ content: string }> {
  return api.post('/organizations/' + orgId + '/ai/write', { action, text });
}
