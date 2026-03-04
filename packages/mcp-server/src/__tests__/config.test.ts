import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, isHelpFlag, HELP_TEXT } from '../config.js';

describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env['LIBREDIARY_API_URL'];
    delete process.env['LIBREDIARY_API_TOKEN'];
    delete process.env['LIBREDIARY_ORG_ID'];
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('loadConfig', () => {
    describe('from environment variables', () => {
      it('should load all config from env vars', () => {
        process.env['LIBREDIARY_API_URL'] = 'http://localhost:3000/api';
        process.env['LIBREDIARY_API_TOKEN'] = 'ld_test123';
        process.env['LIBREDIARY_ORG_ID'] = 'org_abc';

        const config = loadConfig([]);

        expect(config).toEqual({
          apiUrl: 'http://localhost:3000/api',
          apiToken: 'ld_test123',
          orgId: 'org_abc',
        });
      });

      it('should strip trailing slashes from API URL', () => {
        process.env['LIBREDIARY_API_URL'] = 'http://localhost:3000/api///';
        process.env['LIBREDIARY_API_TOKEN'] = 'ld_test123';
        process.env['LIBREDIARY_ORG_ID'] = 'org_abc';

        const config = loadConfig([]);

        expect(config.apiUrl).toBe('http://localhost:3000/api');
      });

      it('should strip single trailing slash from API URL', () => {
        process.env['LIBREDIARY_API_URL'] = 'http://localhost:3000/api/';
        process.env['LIBREDIARY_API_TOKEN'] = 'ld_test123';
        process.env['LIBREDIARY_ORG_ID'] = 'org_abc';

        const config = loadConfig([]);

        expect(config.apiUrl).toBe('http://localhost:3000/api');
      });

      it('should not modify URL without trailing slash', () => {
        process.env['LIBREDIARY_API_URL'] = 'http://localhost:3000/api';
        process.env['LIBREDIARY_API_TOKEN'] = 'ld_test123';
        process.env['LIBREDIARY_ORG_ID'] = 'org_abc';

        const config = loadConfig([]);

        expect(config.apiUrl).toBe('http://localhost:3000/api');
      });
    });

    describe('from CLI arguments', () => {
      it('should load config from space-separated CLI args', () => {
        const args = [
          '--api-url',
          'http://localhost:3000/api',
          '--api-token',
          'ld_test123',
          '--org-id',
          'org_abc',
        ];

        const config = loadConfig(args);

        expect(config).toEqual({
          apiUrl: 'http://localhost:3000/api',
          apiToken: 'ld_test123',
          orgId: 'org_abc',
        });
      });

      it('should load config from equals-sign CLI args', () => {
        const args = [
          '--api-url=http://localhost:3000/api',
          '--api-token=ld_test123',
          '--org-id=org_abc',
        ];

        const config = loadConfig(args);

        expect(config).toEqual({
          apiUrl: 'http://localhost:3000/api',
          apiToken: 'ld_test123',
          orgId: 'org_abc',
        });
      });

      it('should handle equals signs in values', () => {
        const args = [
          '--api-url=http://localhost:3000/api',
          '--api-token=ld_test=with=equals',
          '--org-id=org_abc',
        ];

        const config = loadConfig(args);

        expect(config.apiToken).toBe('ld_test=with=equals');
      });
    });

    describe('CLI args override env vars', () => {
      it('should prefer CLI args over env vars', () => {
        process.env['LIBREDIARY_API_URL'] = 'http://env-url/api';
        process.env['LIBREDIARY_API_TOKEN'] = 'ld_env_token';
        process.env['LIBREDIARY_ORG_ID'] = 'org_env';

        const config = loadConfig([
          '--api-url',
          'http://cli-url/api',
          '--api-token',
          'ld_cli_token',
          '--org-id',
          'org_cli',
        ]);

        expect(config).toEqual({
          apiUrl: 'http://cli-url/api',
          apiToken: 'ld_cli_token',
          orgId: 'org_cli',
        });
      });

      it('should fall back to env vars for missing CLI args', () => {
        process.env['LIBREDIARY_API_URL'] = 'http://env-url/api';
        process.env['LIBREDIARY_API_TOKEN'] = 'ld_env_token';
        process.env['LIBREDIARY_ORG_ID'] = 'org_env';

        const config = loadConfig(['--api-url', 'http://cli-url/api']);

        expect(config.apiUrl).toBe('http://cli-url/api');
        expect(config.apiToken).toBe('ld_env_token');
        expect(config.orgId).toBe('org_env');
      });
    });

    describe('validation errors', () => {
      it('should throw if all config is missing', () => {
        expect(() => loadConfig([])).toThrow('Missing required configuration');
      });

      it('should list all missing values', () => {
        expect(() => loadConfig([])).toThrow('LIBREDIARY_API_URL');
        expect(() => loadConfig([])).toThrow('LIBREDIARY_API_TOKEN');
        expect(() => loadConfig([])).toThrow('LIBREDIARY_ORG_ID');
      });

      it('should throw if only API URL is missing', () => {
        process.env['LIBREDIARY_API_TOKEN'] = 'ld_test123';
        process.env['LIBREDIARY_ORG_ID'] = 'org_abc';

        expect(() => loadConfig([])).toThrow('LIBREDIARY_API_URL');
      });

      it('should throw if only API token is missing', () => {
        process.env['LIBREDIARY_API_URL'] = 'http://localhost:3000/api';
        process.env['LIBREDIARY_ORG_ID'] = 'org_abc';

        expect(() => loadConfig([])).toThrow('LIBREDIARY_API_TOKEN');
      });

      it('should throw if only org ID is missing', () => {
        process.env['LIBREDIARY_API_URL'] = 'http://localhost:3000/api';
        process.env['LIBREDIARY_API_TOKEN'] = 'ld_test123';

        expect(() => loadConfig([])).toThrow('LIBREDIARY_ORG_ID');
      });

      it('should not throw when all values are provided', () => {
        process.env['LIBREDIARY_API_URL'] = 'http://localhost:3000/api';
        process.env['LIBREDIARY_API_TOKEN'] = 'ld_test123';
        process.env['LIBREDIARY_ORG_ID'] = 'org_abc';

        expect(() => loadConfig([])).not.toThrow();
      });
    });
  });

  describe('isHelpFlag', () => {
    it('should return true for --help', () => {
      expect(isHelpFlag(['--help'])).toBe(true);
    });

    it('should return true for -h', () => {
      expect(isHelpFlag(['-h'])).toBe(true);
    });

    it('should return true when help is among other args', () => {
      expect(isHelpFlag(['--api-url', 'http://test', '--help'])).toBe(true);
    });

    it('should return false when no help flag', () => {
      expect(isHelpFlag(['--api-url', 'http://test'])).toBe(false);
    });

    it('should return false for empty args', () => {
      expect(isHelpFlag([])).toBe(false);
    });
  });

  describe('HELP_TEXT', () => {
    it('should contain the server name', () => {
      expect(HELP_TEXT).toContain('LibreDiary MCP Server');
    });

    it('should document all three config options', () => {
      expect(HELP_TEXT).toContain('--api-url');
      expect(HELP_TEXT).toContain('--api-token');
      expect(HELP_TEXT).toContain('--org-id');
    });

    it('should document environment variables', () => {
      expect(HELP_TEXT).toContain('LIBREDIARY_API_URL');
      expect(HELP_TEXT).toContain('LIBREDIARY_API_TOKEN');
      expect(HELP_TEXT).toContain('LIBREDIARY_ORG_ID');
    });

    it('should not have leading or trailing whitespace', () => {
      expect(HELP_TEXT).toBe(HELP_TEXT.trim());
    });
  });
});
