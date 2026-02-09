import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';

export interface AiConfig {
  enabled: boolean;
  apiKey: string | null;
  baseUrl: string;
  model: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  model?: string;
}

export async function getAiConfig(): Promise<AiConfig> {
  const settings = await prisma.systemSettings.findUnique({
    where: { id: 'system' },
  });

  return {
    enabled: settings?.aiEnabled ?? false,
    apiKey: settings?.openrouterApiKey ?? env.OPENROUTER_API_KEY ?? null,
    baseUrl: env.OPENROUTER_BASE_URL,
    model: settings?.openrouterModel ?? env.AI_DEFAULT_MODEL,
  };
}

export function maskApiKey(key: string): string {
  if (key.length <= 4) return '****';
  return `****${key.substring(key.length - 4)}`;
}

export async function chatCompletion(
  messages: ChatMessage[],
  opts?: ChatCompletionOptions
): Promise<unknown> {
  const config = await getAiConfig();

  if (!config.enabled) {
    throw new Error('AI is disabled');
  }

  if (!config.apiKey) {
    throw new Error('No API key configured');
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: opts?.model ?? config.model,
      messages,
      ...(opts?.temperature !== undefined && { temperature: opts.temperature }),
      ...(opts?.maxTokens !== undefined && { max_tokens: opts.maxTokens }),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${body}`);
  }

  return response.json();
}

export async function testConnection(): Promise<TestConnectionResult> {
  try {
    const result = (await chatCompletion([{ role: 'user', content: 'ping' }], {
      maxTokens: 5,
    })) as { model?: string };

    return {
      success: true,
      message: 'Connection successful',
      model: result.model,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
