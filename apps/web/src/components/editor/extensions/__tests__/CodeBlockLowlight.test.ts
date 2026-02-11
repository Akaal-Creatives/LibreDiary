import { describe, it, expect } from 'vitest';
import { CodeBlockLowlightExtension } from '../CodeBlockLowlight';

describe('CodeBlockLowlightExtension', () => {
  it('has name "codeBlock"', () => {
    expect(CodeBlockLowlightExtension.name).toBe('codeBlock');
  });

  it('is a Node type', () => {
    expect(CodeBlockLowlightExtension.type).toBe('node');
  });

  it('has defaultLanguage set to "plaintext"', () => {
    expect(CodeBlockLowlightExtension.options.defaultLanguage).toBe('plaintext');
  });

  it('has a lowlight instance configured', () => {
    expect(CodeBlockLowlightExtension.options.lowlight).toBeDefined();
    expect(typeof CodeBlockLowlightExtension.options.lowlight.highlight).toBe('function');
  });

  it('lowlight instance can highlight JavaScript', () => {
    const lowlight = CodeBlockLowlightExtension.options.lowlight;
    const result = lowlight.highlight('javascript', 'const x = 1;');
    expect(result).toBeDefined();
    expect(result.children.length).toBeGreaterThan(0);
  });

  it('lowlight instance supports common languages', () => {
    const lowlight = CodeBlockLowlightExtension.options.lowlight;
    const registered = lowlight.listLanguages();
    expect(registered).toContain('javascript');
    expect(registered).toContain('typescript');
    expect(registered).toContain('python');
    expect(registered).toContain('css');
    expect(registered).toContain('xml');
  });
});
