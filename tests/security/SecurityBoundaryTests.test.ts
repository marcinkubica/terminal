import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { TerminalServer } from '../../src/index.js';


describe('Security Boundary Tests (MCP Protocol)', () => {
  let server: TerminalServer;

  beforeAll(() => {
    const fs = require('fs');
    const safeDir = '/tmp/test';
    if (!fs.existsSync(safeDir)) {
      fs.mkdirSync(safeDir, { recursive: true });
    }
  });

  beforeEach(() => {
    server = new TerminalServer();
  });

  describe('Command Whitelisting', () => {
    it('should block dangerous commands', async () => {
      const dangerousCommands = ['rm', 'sudo', 'curl', 'wget', 'ssh'];
      for (const cmd of dangerousCommands) {
        await expect(
          server.handleCallTool({
            method: 'tools/call',
            params: { name: 'execute_command', arguments: { command: cmd, args: [] } }
          })
        ).rejects.toThrow(/SECURITY BLOCK/);
      }
    });

    it('should allow whitelisted commands', async () => {
      const safeCommands = ['ls', 'pwd', 'whoami', 'date'];
      for (const cmd of safeCommands) {
        await expect(
          server.handleCallTool({
            method: 'tools/call',
            params: { name: 'execute_command', arguments: { command: cmd, args: [] } }
          })
        ).resolves.toHaveProperty('content');
      }
    });
  });

  describe('Directory Traversal Protection', () => {
    it('should block directory traversal attempts', async () => {
      const maliciousPaths = ['../../../etc/passwd', '/etc/shadow', '..\\..\\windows\\system32'];
      for (const path of maliciousPaths) {
        await expect(
          server.handleCallTool({
            method: 'tools/call',
            params: { name: 'change_directory', arguments: { path } }
          })
        ).rejects.toThrow(/SECURITY BLOCK/);
      }
    });

    it('should allow safe directory changes', async () => {
      const safePaths = ['/tmp/test'];
      for (const path of safePaths) {
        await expect(
          server.handleCallTool({
            method: 'tools/call',
            params: { name: 'change_directory', arguments: { path } }
          })
        ).resolves.toHaveProperty('content');
      }
    });
  });

  describe('Argument Validation', () => {
    it('should validate command arguments', async () => {
      await expect(
        server.handleCallTool({
          method: 'tools/call',
          params: { name: 'execute_command', arguments: { command: 'ls', args: ['--invalid-arg'] } }
        })
      ).rejects.toThrow(/SECURITY|Invalid arguments/);
    });

    it('should limit argument count', async () => {
      // Use a valid argument repeated >10 times
      const manyArgs = new Array(20).fill('-l');
      await expect(
        server.handleCallTool({
          method: 'tools/call',
          params: { name: 'execute_command', arguments: { command: 'ls', args: manyArgs } }
        })
      ).rejects.toThrow(/Too many arguments/);
    });
  });
});
