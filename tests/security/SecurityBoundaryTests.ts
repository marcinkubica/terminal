import { describe, it, expect, beforeEach } from 'vitest';
import { TerminalServer } from '../../src/index.js';

describe('Security Boundary Tests', () => {
  let server: TerminalServer;

  beforeEach(() => {
    server = new TerminalServer();
  });

  describe('Command Whitelisting', () => {
    it('should block dangerous commands', async () => {
      const dangerousCommands = ['rm', 'sudo', 'curl', 'wget', 'ssh'];
      for (const cmd of dangerousCommands) {
        await expect(server.executeCommand(cmd, [])).rejects.toThrow('SECURITY BLOCK');
      }
    });

    it('should allow whitelisted commands', async () => {
      const safeCommands = ['ls', 'pwd', 'whoami', 'date'];
      for (const cmd of safeCommands) {
        await expect(server.executeCommand(cmd, [])).resolves.not.toThrow();
      }
    });
  });

  describe('Directory Traversal Protection', () => {
    it('should block directory traversal attempts', async () => {
      const maliciousPaths = ['../../../etc/passwd', '/etc/shadow', '..\\..\\windows\\system32'];
      for (const path of maliciousPaths) {
        await expect(server.changeDirectory(path)).rejects.toThrow('SECURITY BLOCK');
      }
    });

    it('should allow safe directory changes', async () => {
      const safePaths = ['./subdir', '/tmp/test', '~/documents'];
      for (const path of safePaths) {
        await expect(server.changeDirectory(path)).resolves.not.toThrow();
      }
    });
  });

  describe('Argument Validation', () => {
    it('should validate command arguments', async () => {
      await expect(server.executeCommand('ls', ['--invalid-arg'])).rejects.toThrow('SECURITY');
    });

    it('should limit argument count', async () => {
      const manyArgs = new Array(20).fill('arg');
      await expect(server.executeCommand('ls', manyArgs)).rejects.toThrow('Too many arguments');
    });
  });
});
