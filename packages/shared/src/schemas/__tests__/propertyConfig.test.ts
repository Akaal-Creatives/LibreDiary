import { describe, it, expect } from 'vitest';
import {
  validatePropertyConfig,
  selectConfigSchema,
  numberConfigSchema,
  durationConfigSchema,
  filesConfigSchema,
  relationConfigSchema,
  rollupConfigSchema,
  formulaConfigSchema,
} from '../index';

describe('validatePropertyConfig', () => {
  // --- Types that accept no config ---

  it('returns null for TEXT type', () => {
    expect(validatePropertyConfig('TEXT', { foo: 'bar' })).toBeNull();
  });

  it('returns null for DATE type', () => {
    expect(validatePropertyConfig('DATE', {})).toBeNull();
  });

  it('returns null for CHECKBOX type', () => {
    expect(validatePropertyConfig('CHECKBOX', null)).toBeNull();
  });

  it('returns null for CREATED_TIME type', () => {
    expect(validatePropertyConfig('CREATED_TIME', undefined)).toBeNull();
  });

  // --- SELECT / MULTI_SELECT ---

  it('validates SELECT config with valid options', () => {
    const config = { options: [{ label: 'High' }, { label: 'Low', colour: '#ff0000' }] };
    const result = validatePropertyConfig('SELECT', config);
    expect(result).toEqual(config);
  });

  it('validates MULTI_SELECT config', () => {
    const config = { options: [{ label: 'Tag A' }] };
    expect(validatePropertyConfig('MULTI_SELECT', config)).toEqual(config);
  });

  it('rejects SELECT config with empty label', () => {
    expect(() => validatePropertyConfig('SELECT', { options: [{ label: '' }] })).toThrow();
  });

  it('rejects SELECT config without options array', () => {
    expect(() => validatePropertyConfig('SELECT', { options: 'not-an-array' })).toThrow();
  });

  // --- NUMBER ---

  it('validates NUMBER config with format', () => {
    const config = { format: 'percent' };
    expect(validatePropertyConfig('NUMBER', config)).toEqual(config);
  });

  it('rejects NUMBER config with invalid format', () => {
    expect(() => validatePropertyConfig('NUMBER', { format: 'invalid' })).toThrow();
  });

  // --- DURATION ---

  it('validates DURATION config with precision and format', () => {
    const config = { precision: 'minutes', format: 'hms' };
    expect(validatePropertyConfig('DURATION', config)).toEqual(config);
  });

  it('rejects DURATION config with invalid precision', () => {
    expect(() => validatePropertyConfig('DURATION', { precision: 'milliseconds' })).toThrow();
  });

  // --- FILES ---

  it('validates FILES config with allowedMimeTypes', () => {
    const config = { allowedMimeTypes: ['image/png', 'application/pdf'] };
    expect(validatePropertyConfig('FILES', config)).toEqual(config);
  });

  it('validates FILES config without allowedMimeTypes', () => {
    expect(validatePropertyConfig('FILES', {})).toEqual({});
  });

  // --- RELATION ---

  it('validates RELATION config with targetDatabaseId', () => {
    const config = { targetDatabaseId: 'db-123' };
    expect(validatePropertyConfig('RELATION', config)).toEqual(config);
  });

  it('rejects RELATION config without targetDatabaseId', () => {
    expect(() => validatePropertyConfig('RELATION', {})).toThrow();
  });

  // --- ROLLUP ---

  it('validates ROLLUP config', () => {
    const config = {
      relationPropertyId: 'prop-1',
      targetPropertyId: 'prop-2',
      aggregation: 'SUM',
    };
    expect(validatePropertyConfig('ROLLUP', config)).toEqual(config);
  });

  it('rejects ROLLUP config with invalid aggregation', () => {
    expect(() =>
      validatePropertyConfig('ROLLUP', {
        relationPropertyId: 'p1',
        targetPropertyId: 'p2',
        aggregation: 'MEDIAN',
      })
    ).toThrow();
  });

  it('rejects ROLLUP config with missing fields', () => {
    expect(() => validatePropertyConfig('ROLLUP', { aggregation: 'COUNT' })).toThrow();
  });

  // --- FORMULA ---

  it('validates FORMULA config with expression', () => {
    const config = { expression: 'prop("A") + prop("B")' };
    expect(validatePropertyConfig('FORMULA', config)).toEqual(config);
  });

  it('rejects FORMULA config with expression exceeding max length', () => {
    expect(() => validatePropertyConfig('FORMULA', { expression: 'x'.repeat(5001) })).toThrow();
  });

  // --- Null/undefined config for types that have schemas ---

  it('returns null when config is null for a type with a schema', () => {
    expect(validatePropertyConfig('SELECT', null)).toBeNull();
  });

  it('returns null when config is undefined for a type with a schema', () => {
    expect(validatePropertyConfig('DURATION', undefined)).toBeNull();
  });
});

// Schema unit tests for direct validation
describe('selectConfigSchema', () => {
  it('strips unknown keys', () => {
    const result = selectConfigSchema.parse({ options: [{ label: 'A' }], evil: 'data' });
    expect(result).toEqual({ options: [{ label: 'A' }] });
  });
});

describe('numberConfigSchema', () => {
  it('accepts empty object (all optional)', () => {
    expect(numberConfigSchema.parse({})).toEqual({});
  });
});

describe('durationConfigSchema', () => {
  it('accepts partial config', () => {
    expect(durationConfigSchema.parse({ precision: 'hours' })).toEqual({ precision: 'hours' });
  });
});

describe('filesConfigSchema', () => {
  it('rejects too many mime types', () => {
    const types = Array.from({ length: 51 }, (_, i) => `type/${i}`);
    expect(() => filesConfigSchema.parse({ allowedMimeTypes: types })).toThrow();
  });
});

describe('relationConfigSchema', () => {
  it('rejects empty targetDatabaseId', () => {
    expect(() => relationConfigSchema.parse({ targetDatabaseId: '' })).toThrow();
  });
});

describe('rollupConfigSchema', () => {
  it('accepts all valid aggregation types', () => {
    for (const agg of ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX']) {
      expect(
        rollupConfigSchema.parse({
          relationPropertyId: 'r',
          targetPropertyId: 't',
          aggregation: agg,
        })
      ).toBeTruthy();
    }
  });
});

describe('formulaConfigSchema', () => {
  it('accepts empty expression', () => {
    expect(formulaConfigSchema.parse({ expression: '' })).toEqual({ expression: '' });
  });
});
