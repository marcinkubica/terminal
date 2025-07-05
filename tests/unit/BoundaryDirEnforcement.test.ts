import { TerminalServer } from '../../src/index.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';

// Helper to set/reset BOUNDARY_DIR
function defineEnv(key: string, value: string) {
  beforeEach(() => {
    process.env[key] = value;
  });
  afterEach(() => {
    delete process.env[key];
  });
}

describe('Boundary Directory Enforcement', () => {
  it('should start in /tmp if BOUNDARY_DIR is not set', async () => {
    delete process.env.BOUNDARY_DIR;
    const server = new TerminalServer();
    // Handle the fact that /tmp might be a symlink to /private/tmp on macOS
    const expectedPath = fs.realpathSync('/tmp');
    expect(process.cwd()).toBe(expectedPath);
  });

  it('should start in BOUNDARY_DIR if set', async () => {
    // Use a directory that exists on the system
    const testDir = fs.realpathSync('/tmp');
    process.env.BOUNDARY_DIR = testDir;
    const server = new TerminalServer();
    expect(process.cwd()).toBe(testDir);
  });

  it('should not throw if cannot chdir (invalid boundary)', async () => {
    process.env.BOUNDARY_DIR = '/doesnotexist';
    expect(() => new TerminalServer()).not.toThrow();
    // Should warn, but not crash
  });

  it('should not change directory when BOUNDARY_ESCAPE is enabled', async () => {
    const originalCwd = process.cwd();
    process.env.BOUNDARY_ESCAPE = 'true';
    process.env.BOUNDARY_DIR = '/tmp';
    
    const server = new TerminalServer();
    // Should remain in original directory when escape is enabled
    expect(process.cwd()).toBe(originalCwd);
    
    // Clean up
    delete process.env.BOUNDARY_ESCAPE;
    delete process.env.BOUNDARY_DIR;
  });

  it('should disable boundary enforcement when BOUNDARY_ESCAPE is true', async () => {
    const originalCwd = process.cwd();
    process.env.BOUNDARY_ESCAPE = 'true';
    
    const server = new TerminalServer();
    // Should remain in original directory
    expect(process.cwd()).toBe(originalCwd);
    
    // Clean up
    delete process.env.BOUNDARY_ESCAPE;
  });

  it('should enforce boundary when BOUNDARY_ESCAPE is false or not set', async () => {
    delete process.env.BOUNDARY_ESCAPE;
    const server = new TerminalServer();
    const expectedPath = fs.realpathSync('/tmp');
    expect(process.cwd()).toBe(expectedPath);
  });

  it('should bypass path validation when BOUNDARY_ESCAPE is enabled', async () => {
    const originalCwd = process.cwd();
    process.env.BOUNDARY_ESCAPE = 'true';
    
    // This test verifies that path validation is bypassed
    // We can't easily test the actual path resolution without mocking,
    // but we can verify the server starts without changing directories
    const server = new TerminalServer();
    expect(process.cwd()).toBe(originalCwd);
    
    // Clean up
    delete process.env.BOUNDARY_ESCAPE;
  });
});
