import { api } from './api';

export const SUPPORTED_LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Dutch',
  'Russian',
  'Chinese (Simplified)',
  'Chinese (Traditional)',
  'Japanese',
  'Korean',
  'Arabic',
  'Hindi',
  'Turkish',
  'Polish',
  'Swedish',
  'Danish',
  'Norwegian',
  'Finnish',
  'Czech',
  'Greek',
  'Romanian',
  'Hungarian',
  'Thai',
  'Vietnamese',
  'Indonesian',
  'Malay',
  'Filipino',
  'Ukrainian',
  'Punjabi',
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export async function translateText(
  orgId: string,
  text: string,
  targetLanguage: SupportedLanguage
): Promise<{ translatedText: string }> {
  return api.post(`/organizations/${orgId}/ai/translate`, { text, targetLanguage });
}
