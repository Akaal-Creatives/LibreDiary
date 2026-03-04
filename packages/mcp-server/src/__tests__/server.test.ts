import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createServer } from '../server.js';
import type { McpConfig } from '../config.js';

// Mock all tool/resource registration modules to avoid side effects
vi.mock('../tools/pages.js', () => ({ registerPageTools: vi.fn() }));
vi.mock('../tools/databases.js', () => ({ registerDatabaseTools: vi.fn() }));
vi.mock('../tools/organisations.js', () => ({ registerOrganisationTools: vi.fn() }));
vi.mock('../tools/search.js', () => ({ registerSearchTools: vi.fn() }));
vi.mock('../tools/files.js', () => ({ registerFileTools: vi.fn() }));
vi.mock('../resources/page-tree.js', () => ({ registerPageTreeResource: vi.fn() }));
vi.mock('../resources/databases-list.js', () => ({ registerDatabasesListResource: vi.fn() }));

import { registerPageTools } from '../tools/pages.js';
import { registerDatabaseTools } from '../tools/databases.js';
import { registerOrganisationTools } from '../tools/organisations.js';
import { registerSearchTools } from '../tools/search.js';
import { registerFileTools } from '../tools/files.js';
import { registerPageTreeResource } from '../resources/page-tree.js';
import { registerDatabasesListResource } from '../resources/databases-list.js';

describe('createServer', () => {
  const config: McpConfig = {
    apiUrl: 'http://localhost:3000/api',
    apiToken: 'ld_test',
    orgId: 'org_test',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return an McpServer instance', () => {
    const server = createServer(config);
    expect(server).toBeDefined();
    expect(typeof server.connect).toBe('function');
  });

  it('should register all tool groups', () => {
    createServer(config);

    expect(registerPageTools).toHaveBeenCalledOnce();
    expect(registerDatabaseTools).toHaveBeenCalledOnce();
    expect(registerOrganisationTools).toHaveBeenCalledOnce();
    expect(registerSearchTools).toHaveBeenCalledOnce();
    expect(registerFileTools).toHaveBeenCalledOnce();
  });

  it('should register all resource providers', () => {
    createServer(config);

    expect(registerPageTreeResource).toHaveBeenCalledOnce();
    expect(registerDatabasesListResource).toHaveBeenCalledOnce();
  });

  it('should pass the McpServer and LibreDiaryClient to each registrar', () => {
    createServer(config);

    // All registrars should receive the server and a client instance
    for (const mockFn of [
      registerPageTools,
      registerDatabaseTools,
      registerOrganisationTools,
      registerSearchTools,
      registerFileTools,
      registerPageTreeResource,
      registerDatabasesListResource,
    ]) {
      const args = vi.mocked(mockFn).mock.calls[0]!;
      expect(args).toHaveLength(2);
      // First arg: McpServer
      expect(args[0]).toBeDefined();
      // Second arg: LibreDiaryClient
      expect(args[1]).toBeDefined();
    }
  });
});
