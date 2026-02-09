import { prisma } from '../../lib/prisma.js';
import { chatCompletion } from './ai.service.js';

export interface TranslateInput {
  text: string;
  targetLanguage: string;
  organizationId: string;
}

export interface TranslateResult {
  translatedText: string;
}

const SYSTEM_PROMPT_TEMPLATE = `You are a professional translator. Translate the following text to {targetLanguage}. Rules:
- Return ONLY the translated text, nothing else
- Preserve all formatting, line breaks, and punctuation style
- Do not add explanations, notes, or alternatives
- If the text is already in the target language, return it unchanged
- Maintain the original tone and register`;

export async function translateText(input: TranslateInput): Promise<TranslateResult> {
  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { aiEnabled: true },
  });

  if (!org || !org.aiEnabled) {
    throw new Error('AI_DISABLED');
  }

  const systemPrompt = SYSTEM_PROMPT_TEMPLATE.replace('{targetLanguage}', input.targetLanguage);

  let result: unknown;
  try {
    result = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: input.text },
      ],
      { temperature: 0.3 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    // Propagate known errors as-is
    if (message === 'AI is disabled' || message === 'No API key configured') {
      throw error;
    }
    throw new Error('TRANSLATION_FAILED');
  }

  const choices = (result as { choices?: Array<{ message?: { content?: string } }> })?.choices;
  const content = choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error('TRANSLATION_FAILED');
  }

  return { translatedText: content };
}
