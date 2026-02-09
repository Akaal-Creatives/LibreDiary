export {
  getAiConfig,
  maskApiKey,
  chatCompletion,
  testConnection,
  type AiConfig,
  type ChatMessage,
  type ChatCompletionOptions,
  type TestConnectionResult,
} from './ai.service.js';

export { translateText, type TranslateInput, type TranslateResult } from './translation.service.js';

export { default as translationRoutes } from './translation.routes.js';
export { SUPPORTED_LANGUAGES } from './translation.routes.js';

export {
  writeText,
  type WritingAction,
  type WriteTextInput,
  type WriteTextResult,
} from './writing.service.js';

export { default as writingRoutes } from './writing.routes.js';
export { WRITING_ACTIONS } from './writing.routes.js';
