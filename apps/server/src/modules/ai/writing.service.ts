import { prisma } from '../../lib/prisma.js';
import { chatCompletion } from './ai.service.js';

export type WritingAction = 'generate' | 'expand' | 'summarise' | 'improve' | 'schedule' | 'todos';

export interface WriteTextInput {
  action: WritingAction;
  text: string;
  organizationId: string;
}

export interface WriteTextResult {
  content: string;
}

const SYSTEM_PROMPTS: Record<WritingAction, string> = {
  generate: `Generate well-structured content based on the user's prompt. Rules:
- Return ONLY the generated content, nothing else
- Do not add meta-commentary, explanations, or notes
- Preserve the tone implied by the prompt
- Use clear, well-organised formatting`,
  expand: `Expand the following text with more detail and depth. Rules:
- Return ONLY the expanded text, nothing else
- Do not add meta-commentary, explanations, or notes
- Preserve the original tone, style, and formatting
- Add relevant detail, examples, or elaboration`,
  summarise: `Summarise the following text concisely. Rules:
- Return ONLY the summary, nothing else
- Do not add meta-commentary, explanations, or notes
- Preserve the original tone and key points
- Be concise but comprehensive`,
  improve: `Improve the following text for grammar, clarity, and readability. Rules:
- Return ONLY the improved text, nothing else
- Do not add meta-commentary, explanations, or notes
- Preserve the original tone and meaning
- Fix grammar, spelling, and punctuation
- Improve sentence structure and flow`,
  schedule: `You are a scheduling assistant. Generate a clear weekly or daily schedule as an HTML table. Rules:
- Use <table>, <thead>, <tbody>, <tr>, <th>, <td> tags only
- No prose, headings, or explanation outside the table
- Return ONLY the HTML table`,
  todos: `You are a task planning assistant. Generate an actionable task checklist. Rules:
- Use this exact format: <ul data-type="taskList"><li data-type="taskItem" data-checked="false">task text</li></ul>
- Each task on its own <li> element
- No prose or explanation outside the list
- Return ONLY the HTML`,
};

const TEMPERATURE: Record<WritingAction, number> = {
  generate: 0.7,
  expand: 0.3,
  summarise: 0.3,
  improve: 0.3,
  schedule: 0.5,
  todos: 0.5,
};

export async function writeText(input: WriteTextInput): Promise<WriteTextResult> {
  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { aiEnabled: true },
  });

  if (!org || !org.aiEnabled) {
    throw new Error('AI_DISABLED');
  }

  const systemPrompt = SYSTEM_PROMPTS[input.action];
  const temperature = TEMPERATURE[input.action];

  let result: unknown;
  try {
    result = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: input.text },
      ],
      { temperature }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'AI is disabled' || message === 'No API key configured') {
      throw error;
    }
    throw new Error('WRITING_FAILED', { cause: error });
  }

  const choices = (result as { choices?: Array<{ message?: { content?: string } }> })?.choices;
  const content = choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error('WRITING_FAILED');
  }

  return { content };
}
