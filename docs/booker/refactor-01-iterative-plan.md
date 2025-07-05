# Terminal MCP Server - Security-Focused Iterative Refactoring Plan

**Date:** 5 July 2025  
**Project:** Terminal MCP Server  
**Plan Type:** Iterative Security-Aware Refactoring  
**Based on:** refactor-01-proper.md Analysis  
**Status:** EXECUTION READY

## 🎯 **PLAN OVERVIEW**

This plan executes a **security-first iterative refactoring** of the 488-line Terminal MCP Server while preserving all security boundaries. Each iteration is designed to be **atomic, testable, and non-breaking**.

### **Core Principles**
1. **Security boundaries are sacred** - Never compromise security for code cleanliness
2. **Atomic iterations** - Each step can be completed and tested independently
3. **Continuous validation** - Security tests run after each iteration
4. **Rollback capability** - Each iteration can be reverted if needed
5. **Incremental improvement** - Gradual elimination of duplication without breaking changes

## 🔄 **ITERATION STRUCTURE**

Each iteration follows this pattern:
1. **Pre-iteration Security Test** - Validate current security posture
2. **Implementation** - Make the specific change
3. **Post-iteration Security Test** - Validate security preservation
4. **Regression Test** - Ensure no functionality broken
5. **Commit Point** - Save progress with rollback capability

## 📋 **ITERATION 1: Security Testing Foundation**
**Goal:** Establish comprehensive security testing before any refactoring  
**Duration:** 4-6 hours  
**Risk Level:** LOW  
**Breaking Changes:** None  

### **Step 1.1: Create Security Test Structure**
```bash
mkdir -p tests/security
mkdir -p tests/integration
mkdir -p tests/unit
```

### **Step 1.2: Implement Security Boundary Tests**
```typescript
// tests/security/SecurityBoundaryTests.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { TerminalServer } from '../src/index.js';

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
```

### **Step 1.3: Implement Integration Tests**
```typescript
// tests/integration/MCPProtocolTests.ts
import { describe, it, expect } from 'vitest';
import { TerminalServer } from '../src/index.js';

describe('MCP Protocol Integration Tests', () => {
  it('should list all tools correctly', async () => {
    const server = new TerminalServer();
    const tools = await server.handleListTools();
    
    expect(tools.tools).toHaveLength(5);
    expect(tools.tools.map(t => t.name)).toEqual([
      'execute_command',
      'change_directory', 
      'get_current_directory',
      'get_terminal_info',
      'list_allowed_commands'
    ]);
  });

  it('should handle invalid tool calls', async () => {
    const server = new TerminalServer();
    await expect(server.handleCallTool({ params: { name: 'invalid_tool', arguments: {} } }))
      .rejects.toThrow('Unknown tool');
  });
});
```

### **Step 1.4: Setup Test Configuration**
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/']
    }
  }
});
```

### **Step 1.5: Validation Checkpoint**
```bash
# Run all security tests
npm test -- --reporter=verbose

# Expected: All tests pass, security boundaries validated
# If any test fails, fix security issues before proceeding
```

**✅ Iteration 1 Complete:** Security testing foundation established

---

## 📋 **ITERATION 2: Extract Security Validator**
**Goal:** Eliminate validation pattern duplication (5 instances)  
**Duration:** 2-3 hours  
**Risk Level:** LOW  
**Breaking Changes:** None  

### **Step 2.1: Create Security Validator Utility**
```typescript
// src/utils/SecurityValidator.ts
import { z } from 'zod';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

export class SecurityValidator {
  /**
   * Validates schema with security-aware error messages
   */
  static validateSchema<T>(schema: z.ZodSchema<T>, args: any, context: string = 'unknown'): T {
    const parsed = schema.safeParse(args);
    if (!parsed.success) {
      throw new McpError(
        ErrorCode.InvalidParams, 
        `🔒 SECURITY: Invalid arguments for ${context}: ${parsed.error.message}`
      );
    }
    return parsed.data;
  }

  /**
   * Validates command against security whitelist
   */
  static validateCommand(command: string, args: string[]): CommandValidationResult {
    // This will be moved from the main file
    return validateAndSanitizeCommand(command, args);
  }

  /**
   * Validates directory access permissions
   */
  static validateDirectoryAccess(path: string): void {
    const resolvedPath = require('path').resolve(path);
    const homedir = require('os').homedir();
    
    const allowedPaths = [homedir, '/tmp', '/var/tmp'];
    const isAllowed = allowedPaths.some(allowed => resolvedPath.startsWith(allowed));
    
    if (!isAllowed) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `🔒 SECURITY BLOCK: Directory access denied: ${resolvedPath}. Only home directory and /tmp are allowed.`
      );
    }
  }
}
```

### **Step 2.2: Create Unit Tests for Security Validator**
```typescript
// tests/unit/SecurityValidatorTests.ts
import { describe, it, expect } from 'vitest';
import { SecurityValidator } from '../../src/utils/SecurityValidator.js';
import { z } from 'zod';

describe('SecurityValidator', () => {
  describe('validateSchema', () => {
    const testSchema = z.object({
      name: z.string(),
      value: z.number()
    });

    it('should validate correct schema', () => {
      const result = SecurityValidator.validateSchema(testSchema, { name: 'test', value: 42 }, 'test');
      expect(result).toEqual({ name: 'test', value: 42 });
    });

    it('should throw security error for invalid schema', () => {
      expect(() => SecurityValidator.validateSchema(testSchema, { name: 'test' }, 'test'))
        .toThrow('🔒 SECURITY: Invalid arguments for test');
    });
  });

  describe('validateDirectoryAccess', () => {
    it('should allow access to home directory', () => {
      expect(() => SecurityValidator.validateDirectoryAccess('~/test')).not.toThrow();
    });

    it('should allow access to /tmp', () => {
      expect(() => SecurityValidator.validateDirectoryAccess('/tmp/test')).not.toThrow();
    });

    it('should block access to system directories', () => {
      expect(() => SecurityValidator.validateDirectoryAccess('/etc/passwd'))
        .toThrow('🔒 SECURITY BLOCK: Directory access denied');
    });
  });
});
```

### **Step 2.3: Update Main File to Use Security Validator**
```typescript
// src/index.ts - Replace validation patterns
import { SecurityValidator } from './utils/SecurityValidator.js';

// Replace in handleCallTool method:
// OLD:
// const parsed = ExecuteCommandSchema.safeParse(args);
// if (!parsed.success) {
//   throw new McpError(ErrorCode.InvalidParams, `Invalid arguments: ${parsed.error}`);
// }

// NEW:
const parsed = SecurityValidator.validateSchema(ExecuteCommandSchema, args, 'execute_command');
```

### **Step 2.4: Apply to All 5 Validation Locations**
- Line 349: Execute command validation
- Line 365: Change directory validation  
- Line 413: Get current directory validation
- Line 418: Get terminal info validation
- Line 447: List allowed commands validation

### **Step 2.5: Validation Checkpoint**
```bash
# Run security tests
npm test tests/security/ -- --reporter=verbose

# Run unit tests
npm test tests/unit/SecurityValidatorTests.ts -- --reporter=verbose

# Run integration tests
npm test tests/integration/ -- --reporter=verbose

# Expected: All tests pass, validation duplication eliminated
```

**✅ Iteration 2 Complete:** Security validator extracted, 5 validation duplications eliminated

---

## 📋 **ITERATION 3: Extract Security Logger**
**Goal:** Eliminate security logging duplication (6+ instances)  
**Duration:** 2-3 hours  
**Risk Level:** LOW  
**Breaking Changes:** None  

### **Step 3.1: Create Security Logger Utility**
```typescript
// src/utils/SecurityLogger.ts
export class SecurityLogger {
  private static readonly PREFIX = '🔒 [SECURITY]';

  static logCommandExecution(command: string, args: string[]): void {
    const fullCommand = `${command} ${args.join(' ')}`.trim();
    console.error(`${this.PREFIX} Executing whitelisted command: ${fullCommand}`);
  }

  static logCommandFailure(command: string, args: string[], error: string): void {
    const fullCommand = `${command} ${args.join(' ')}`.trim();
    console.error(`${this.PREFIX} Command failed: ${fullCommand}, Error: ${error}`);
  }

  static logDirectoryChange(oldPath: string, newPath: string): void {
    console.error(`${this.PREFIX} Directory changed from ${oldPath} to ${newPath}`);
  }

  static logSecurityBlock(action: string, reason: string): void {
    console.error(`${this.PREFIX} BLOCKED: ${action} - ${reason}`);
  }

  static logServerStart(config: {
    commandCount: number;
    currentDirectory: string;
    securityFeatures: string[];
  }): void {
    console.error(`${this.PREFIX} SECURE Terminal MCP Server running on stdio`);
    console.error(`${this.PREFIX} Command whitelist ENABLED`);
    console.error(`${this.PREFIX} Allowed commands: ${config.commandCount}`);
    console.error(`${this.PREFIX} Current directory: ${config.currentDirectory}`);
    console.error(`${this.PREFIX} Security features: ${config.securityFeatures.join(', ')}`);
    console.error(`${this.PREFIX} Dangerous commands BLOCKED (rm, curl, sudo, etc.)`);
  }

  static logSecurityEvent(event: string, details: Record<string, any>): void {
    const detailsStr = Object.entries(details)
      .map(([key, value]) => `${key}=${value}`)
      .join(', ');
    console.error(`${this.PREFIX} ${event}: ${detailsStr}`);
  }
}
```

### **Step 3.2: Create Unit Tests for Security Logger**
```typescript
// tests/unit/SecurityLoggerTests.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SecurityLogger } from '../../src/utils/SecurityLogger.js';

describe('SecurityLogger', () => {
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should log command execution with security prefix', () => {
    SecurityLogger.logCommandExecution('ls', ['-la']);
    expect(consoleSpy).toHaveBeenCalledWith('🔒 [SECURITY] Executing whitelisted command: ls -la');
  });

  it('should log command failure with details', () => {
    SecurityLogger.logCommandFailure('ls', ['-la'], 'Permission denied');
    expect(consoleSpy).toHaveBeenCalledWith('🔒 [SECURITY] Command failed: ls -la, Error: Permission denied');
  });

  it('should log directory changes', () => {
    SecurityLogger.logDirectoryChange('/old/path', '/new/path');
    expect(consoleSpy).toHaveBeenCalledWith('🔒 [SECURITY] Directory changed from /old/path to /new/path');
  });

  it('should log security blocks', () => {
    SecurityLogger.logSecurityBlock('rm command', 'Dangerous command blocked');
    expect(consoleSpy).toHaveBeenCalledWith('🔒 [SECURITY] BLOCKED: rm command - Dangerous command blocked');
  });

  it('should log server start with configuration', () => {
    const config = {
      commandCount: 25,
      currentDirectory: '/home/user',
      securityFeatures: ['whitelist', 'directory-protection']
    };
    SecurityLogger.logServerStart(config);
    expect(consoleSpy).toHaveBeenCalledTimes(6); // 6 log messages
  });
});
```

### **Step 3.3: Update Main File to Use Security Logger**
```typescript
// src/index.ts - Replace logging patterns
import { SecurityLogger } from './utils/SecurityLogger.js';

// Replace all instances of:
// console.error(`🔒 [SECURITY] ...`);
// with appropriate SecurityLogger method calls
```

### **Step 3.4: Apply to All 6+ Logging Locations**
- Line 330: Command execution logging
- Line 336: Command failure logging
- Line 395: Directory change logging
- Line 471: Server startup logging
- Line 472: Security status logging
- Line 475: Directory initialization logging

### **Step 3.5: Validation Checkpoint**
```bash
# Run security tests
npm test tests/security/ -- --reporter=verbose

# Run unit tests
npm test tests/unit/SecurityLoggerTests.ts -- --reporter=verbose

# Expected: All tests pass, logging duplication eliminated
```

**✅ Iteration 3 Complete:** Security logger extracted, 6+ logging duplications eliminated

---

## 📋 **ITERATION 4: Extract Security Response Builder**
**Goal:** Eliminate response structure duplication (5 instances)  
**Duration:** 1-2 hours  
**Risk Level:** LOW  
**Breaking Changes:** None  

### **Step 4.1: Create Security Response Builder Utility**
```typescript
// src/utils/SecurityResponseBuilder.ts
export class SecurityResponseBuilder {
  /**
   * Builds standard MCP text response
   */
  static buildTextResponse(text: string) {
    return {
      content: [{ type: "text", text }]
    };
  }

  /**
   * Builds security error response with consistent formatting
   */
  static buildSecurityErrorResponse(error: string) {
    return {
      content: [{ type: "text", text: `🔒 SECURITY ERROR: ${error}` }]
    };
  }

  /**
   * Builds command execution response with formatted output
   */
  static buildCommandResponse(stdout: string, stderr: string, exitCode: number | null): any {
    let output = '';
    
    if (stdout) {
      output += `STDOUT:\n${stdout}\n`;
    }
    
    if (stderr) {
      output += `STDERR:\n${stderr}\n`;
    }
    
    if (exitCode !== null) {
      output += `Exit Code: ${exitCode}\n`;
    }
    
    return this.buildTextResponse(output.trim());
  }

  /**
   * Builds directory change confirmation response
   */
  static buildDirectoryChangeResponse(newPath: string) {
    return this.buildTextResponse(`🔒 Current directory changed to: ${newPath}`);
  }

  /**
   * Builds terminal info response with security status
   */
  static buildTerminalInfoResponse(info: Record<string, any>) {
    const infoText = Object.entries(info)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    
    return this.buildTextResponse(infoText);
  }

  /**
   * Builds allowed commands list response
   */
  static buildAllowedCommandsResponse(commands: Record<string, any>) {
    const commandList = Object.entries(commands)
      .map(([cmd, config]) => `🔒 ${cmd}: ${config.description}`)
      .join('\n');

    const responseText = `🔒 SECURITY: Whitelisted Commands Only\n\nAllowed commands:\n${commandList}\n\n🔒 Note: All commands are validated against security patterns and argument restrictions.\n🔒 Dangerous commands like rm, curl, sudo, etc. are BLOCKED.`;

    return this.buildTextResponse(responseText);
  }
}
```

### **Step 4.2: Create Unit Tests for Security Response Builder**
```typescript
// tests/unit/SecurityResponseBuilderTests.ts
import { describe, it, expect } from 'vitest';
import { SecurityResponseBuilder } from '../../src/utils/SecurityResponseBuilder.js';

describe('SecurityResponseBuilder', () => {
  describe('buildTextResponse', () => {
    it('should create proper MCP text response', () => {
      const result = SecurityResponseBuilder.buildTextResponse('test message');
      expect(result).toEqual({
        content: [{ type: "text", text: 'test message' }]
      });
    });
  });

  describe('buildSecurityErrorResponse', () => {
    it('should create security error response with prefix', () => {
      const result = SecurityResponseBuilder.buildSecurityErrorResponse('Invalid command');
      expect(result).toEqual({
        content: [{ type: "text", text: '🔒 SECURITY ERROR: Invalid command' }]
      });
    });
  });

  describe('buildCommandResponse', () => {
    it('should format command output correctly', () => {
      const result = SecurityResponseBuilder.buildCommandResponse('output', 'error', 0);
      expect(result.content[0].text).toContain('STDOUT:\noutput');
      expect(result.content[0].text).toContain('STDERR:\nerror');
      expect(result.content[0].text).toContain('Exit Code: 0');
    });

    it('should handle empty output', () => {
      const result = SecurityResponseBuilder.buildCommandResponse('', '', null);
      expect(result.content[0].text).toBe('');
    });
  });

  describe('buildDirectoryChangeResponse', () => {
    it('should format directory change response', () => {
      const result = SecurityResponseBuilder.buildDirectoryChangeResponse('/new/path');
      expect(result.content[0].text).toBe('🔒 Current directory changed to: /new/path');
    });
  });
});
```

### **Step 4.3: Update Main File to Use Security Response Builder**
```typescript
// src/index.ts - Replace response patterns
import { SecurityResponseBuilder } from './utils/SecurityResponseBuilder.js';

// Replace all instances of:
// return { content: [{ type: "text", text: value }] };
// with appropriate SecurityResponseBuilder method calls
```

### **Step 4.4: Apply to All 5 Response Locations**
- Line 356-358: Execute command response
- Line 398-402: Change directory response
- Line 412-416: Get current directory response
- Line 426-432: Get terminal info response
- Line 447-451: List allowed commands response

### **Step 4.5: Validation Checkpoint**
```bash
# Run all tests
npm test -- --reporter=verbose

# Expected: All tests pass, response duplication eliminated
```

**✅ Iteration 4 Complete:** Security response builder extracted, 5 response duplications eliminated

---

## 📋 **ITERATION 5: Extract Security Tool Builder**
**Goal:** Eliminate schema conversion duplication (5 instances)  
**Duration:** 1-2 hours  
**Risk Level:** LOW  
**Breaking Changes:** None  

### **Step 5.1: Create Security Tool Builder Utility**
```typescript
// src/utils/SecurityToolBuilder.ts
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import { ToolSchema } from '@modelcontextprotocol/sdk/types.js';

type ToolInput = z.infer<typeof ToolSchema.shape.inputSchema>;

export class SecurityToolBuilder {
  /**
   * Builds tool schema with security-aware description
   */
  static buildToolSchema(name: string, description: string, schema: z.ZodSchema): any {
    return {
      name,
      description: `🔒 ${description}`,
      inputSchema: zodToJsonSchema(schema) as ToolInput,
    };
  }

  /**
   * Builds complete security tool list
   */
  static buildSecurityToolList(schemas: {
    ExecuteCommandSchema: z.ZodSchema;
    ChangeDirectorySchema: z.ZodSchema;
    GetCurrentDirectorySchema: z.ZodSchema;
    GetTerminalInfoSchema: z.ZodSchema;
    ListAllowedCommandsSchema: z.ZodSchema;
  }): any[] {
    return [
      this.buildToolSchema(
        "execute_command",
        "Execute a WHITELISTED terminal command with validated arguments only.",
        schemas.ExecuteCommandSchema
      ),
      this.buildToolSchema(
        "change_directory",
        "Change working directory (RESTRICTED to home and /tmp only).",
        schemas.ChangeDirectorySchema
      ),
      this.buildToolSchema(
        "get_current_directory",
        "Get the current working directory path.",
        schemas.GetCurrentDirectorySchema
      ),
      this.buildToolSchema(
        "get_terminal_info",
        "Get terminal environment info and security status.",
        schemas.GetTerminalInfoSchema
      ),
      this.buildToolSchema(
        "list_allowed_commands",
        "List all commands allowed by the security whitelist.",
        schemas.ListAllowedCommandsSchema
      )
    ];
  }
}
```

### **Step 5.2: Create Unit Tests for Security Tool Builder**
```typescript
// tests/unit/SecurityToolBuilderTests.ts
import { describe, it, expect } from 'vitest';
import { SecurityToolBuilder } from '../../src/utils/SecurityToolBuilder.js';
import { z } from 'zod';

describe('SecurityToolBuilder', () => {
  const testSchema = z.object({
    test: z.string()
  });

  describe('buildToolSchema', () => {
    it('should create tool schema with security prefix', () => {
      const result = SecurityToolBuilder.buildToolSchema('test_tool', 'Test tool', testSchema);
      
      expect(result.name).toBe('test_tool');
      expect(result.description).toBe('🔒 Test tool');
      expect(result.inputSchema).toBeDefined();
    });
  });

  describe('buildSecurityToolList', () => {
    it('should create complete tool list', () => {
      const schemas = {
        ExecuteCommandSchema: testSchema,
        ChangeDirectorySchema: testSchema,
        GetCurrentDirectorySchema: testSchema,
        GetTerminalInfoSchema: testSchema,
        ListAllowedCommandsSchema: testSchema
      };

      const result = SecurityToolBuilder.buildSecurityToolList(schemas);
      
      expect(result).toHaveLength(5);
      expect(result[0].name).toBe('execute_command');
      expect(result[0].description).toContain('🔒');
      expect(result[1].name).toBe('change_directory');
      expect(result[2].name).toBe('get_current_directory');
      expect(result[3].name).toBe('get_terminal_info');
      expect(result[4].name).toBe('list_allowed_commands');
    });
  });
});
```

### **Step 5.3: Update Main File to Use Security Tool Builder**
```typescript
// src/index.ts - Replace tool schema building
import { SecurityToolBuilder } from './utils/SecurityToolBuilder.js';

// Replace the entire handleListTools method with:
private async handleListTools() {
  const schemas = {
    ExecuteCommandSchema,
    ChangeDirectorySchema,
    GetCurrentDirectorySchema,
    GetTerminalInfoSchema,
    ListAllowedCommandsSchema
  };

  return {
    tools: SecurityToolBuilder.buildSecurityToolList(schemas)
  };
}
```

### **Step 5.4: Validation Checkpoint**
```bash
# Run all tests
npm test -- --reporter=verbose

# Expected: All tests pass, tool schema duplication eliminated
```

**✅ Iteration 5 Complete:** Security tool builder extracted, 5 schema conversion duplications eliminated

---

## 📋 **ITERATION 6: Extract Security Configuration**
**Goal:** Centralize security policy configuration  
**Duration:** 2-3 hours  
**Risk Level:** LOW  
**Breaking Changes:** None  

### **Step 6.1: Create Security Configuration**
```typescript
// src/security/SecurityConfig.ts
import os from 'os';

export interface CommandConfig {
  allowedArgs: readonly string[];
  description: string;
  requiresFile?: boolean;
}

export interface SecurityConfig {
  allowedCommands: Record<string, CommandConfig>;
  forbiddenPatterns: RegExp[];
  maxExecutionTime: number;
  maxArguments: number;
  allowedDirectories: string[];
  requiredEnvironmentVars: string[];
}

export const SECURITY_CONFIG: SecurityConfig = {
  allowedCommands: {
    // File operations (read-only)
    'ls': { allowedArgs: ['-l', '-a', '-la', '-h', '-R', '--help'], description: 'List directory contents' },
    'cat': { allowedArgs: ['--help'], description: 'Display file contents', requiresFile: true },
    'head': { allowedArgs: ['-n', '--help'], description: 'Display first lines of file', requiresFile: true },
    'tail': { allowedArgs: ['-n', '--help'], description: 'Display last lines of file', requiresFile: true },
    'file': { allowedArgs: ['--help'], description: 'Determine file type', requiresFile: true },
    'wc': { allowedArgs: ['-l', '-w', '-c', '--help'], description: 'Word, line, character count', requiresFile: true },
    
    // Directory operations (safe)
    'pwd': { allowedArgs: ['--help'], description: 'Print working directory' },
    'find': { allowedArgs: ['-name', '-type', '-maxdepth', '--help'], description: 'Find files and directories' },
    'tree': { allowedArgs: ['-L', '-a', '--help'], description: 'Display directory tree' },
    
    // System information (read-only)
    'whoami': { allowedArgs: ['--help'], description: 'Show current user' },
    'id': { allowedArgs: ['--help'], description: 'Show user and group IDs' },
    'uname': { allowedArgs: ['-a', '-r', '-s', '--help'], description: 'System information' },
    'date': { allowedArgs: ['--help'], description: 'Show current date and time' },
    'uptime': { allowedArgs: ['--help'], description: 'Show system uptime' },
    'df': { allowedArgs: ['-h', '--help'], description: 'Show disk space usage' },
    'free': { allowedArgs: ['-h', '--help'], description: 'Show memory usage' },
    'ps': { allowedArgs: ['aux', '--help'], description: 'Show running processes' },
    
    // Development tools (safe operations)
    'node': { allowedArgs: ['--version', '--help'], description: 'Node.js version' },
    'npm': { allowedArgs: ['--version', 'list', '--help'], description: 'NPM operations (limited)' },
    'git': { allowedArgs: ['status', 'log', '--oneline', 'branch', 'diff', '--help'], description: 'Git operations (read-only)' },
    'which': { allowedArgs: ['--help'], description: 'Locate command' },
    'type': { allowedArgs: ['--help'], description: 'Display command type' },
    
    // Text processing (safe)
    'grep': { allowedArgs: ['-n', '-i', '-r', '--help'], description: 'Search text patterns', requiresFile: true },
    'sort': { allowedArgs: ['-n', '-r', '--help'], description: 'Sort lines', requiresFile: true },
    'uniq': { allowedArgs: ['-c', '--help'], description: 'Report unique lines', requiresFile: true },
    
    // Help and documentation
    'man': { allowedArgs: ['--help'], description: 'Manual pages', requiresFile: true },
    'help': { allowedArgs: [], description: 'Help command' },
    'echo': { allowedArgs: ['--help'], description: 'Display text (limited)' }
  },

  forbiddenPatterns: [
    // Command injection attempts
    /[;&|`$(){}]/,
    // File operations
    /\brm\b|\bmv\b|\bcp\b|\btouch\b|\bmkdir\b|\brmdir\b/,
    // Network operations
    /\bcurl\b|\bwget\b|\bssh\b|\bscp\b|\brsync\b|\bftp\b|\btelnet\b/,
    // System modification
    /\bsudo\b|\bsu\b|\bchmod\b|\bchown\b|\bmount\b|\bumount\b/,
    // Process control
    /\bkill\b|\bkillall\b|\bnohup\b|\bbg\b|\bfg\b|\bjobs\b/,
    // Package management
    /\bapt\b|\byum\b|\bpip\b|\binstall\b|\bremove\b|\bupdate\b|\bupgrade\b/,
    // Editors and interactive tools
    /\bvi\b|\bvim\b|\bnano\b|\bemacs\b|\btop\b|\bhtop\b|\bless\b|\bmore\b/,
    // Shell features
    /\bsource\b|\b\.\b|\bexport\b|\balias\b|\bunalias\b|\bhistory\b/,
    // Redirection and pipes
    /[<>]/,
    // Dangerous characters
    /[*?[\]]/
  ],

  maxExecutionTime: 10000,
  maxArguments: 10,
  allowedDirectories: [
    os.homedir(),
    '/tmp',
    '/var/tmp'
  ],
  requiredEnvironmentVars: ['PATH', 'HOME', 'USER', 'SHELL']
};
```

### **Step 6.2: Create Security Configuration Tests**
```typescript
// tests/unit/SecurityConfigTests.ts
import { describe, it, expect } from 'vitest';
import { SECURITY_CONFIG } from '../../src/security/SecurityConfig.js';

describe('SecurityConfig', () => {
  it('should have valid command configuration', () => {
    expect(SECURITY_CONFIG.allowedCommands).toBeDefined();
    expect(Object.keys(SECURITY_CONFIG.allowedCommands).length).toBeGreaterThan(0);
    
    // Check that all commands have required properties
    Object.entries(SECURITY_CONFIG.allowedCommands).forEach(([cmd, config]) => {
      expect(config.allowedArgs).toBeDefined();
      expect(config.description).toBeDefined();
      expect(config.description.length).toBeGreaterThan(0);
    });
  });

  it('should have forbidden patterns', () => {
    expect(SECURITY_CONFIG.forbiddenPatterns).toBeDefined();
    expect(SECURITY_CONFIG.forbiddenPatterns.length).toBeGreaterThan(0);
    
    // Test that dangerous patterns are caught
    const dangerousCommands = ['rm -rf', 'sudo su', 'curl http://evil.com'];
    dangerousCommands.forEach(cmd => {
      const isBlocked = SECURITY_CONFIG.forbiddenPatterns.some(pattern => pattern.test(cmd));
      expect(isBlocked).toBe(true);
    });
  });

  it('should have reasonable security limits', () => {
    expect(SECURITY_CONFIG.maxExecutionTime).toBeLessThanOrEqual(10000);
    expect(SECURITY_CONFIG.maxArguments).toBeLessThanOrEqual(20);
    expect(SECURITY_CONFIG.allowedDirectories.length).toBeGreaterThan(0);
    expect(SECURITY_CONFIG.requiredEnvironmentVars.length).toBeGreaterThan(0);
  });
});
```

### **Step 6.3: Update Main File to Use Security Configuration**
```typescript
// src/index.ts - Replace hardcoded security config
import { SECURITY_CONFIG } from './security/SecurityConfig.js';

// Replace all references to ALLOWED_COMMANDS and FORBIDDEN_PATTERNS
// with SECURITY_CONFIG.allowedCommands and SECURITY_CONFIG.forbiddenPatterns
```

### **Step 6.4: Validation Checkpoint**
```bash
# Run all tests
npm test -- --reporter=verbose

# Expected: All tests pass, security configuration centralized
```

**✅ Iteration 6 Complete:** Security configuration extracted and centralized

---

## 📋 **ITERATION 7: Extract Security Handlers**
**Goal:** Separate security logic from business logic  
**Duration:** 4-5 hours  
**Risk Level:** MEDIUM  
**Breaking Changes:** Internal only  

### **Step 7.1: Create Security Command Handler**
```typescript
// src/handlers/SecureCommandHandler.ts
import { SecurityValidator } from '../utils/SecurityValidator.js';
import { SecurityLogger } from '../utils/SecurityLogger.js';
import { SecurityResponseBuilder } from '../utils/SecurityResponseBuilder.js';
import { SECURITY_CONFIG } from '../security/SecurityConfig.js';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

export class SecureCommandHandler {
  private currentDirectory: string;
  private lastExitCode: number | null = null;
  private lastCommand: string | null = null;

  constructor(currentDirectory: string) {
    this.currentDirectory = currentDirectory;
  }

  async handleExecuteCommand(args: any): Promise<any> {
    const parsed = SecurityValidator.validateSchema(ExecuteCommandSchema, args, 'execute_command');
    
    const result = await this.executeCommand(
      parsed.command,
      parsed.args,
      parsed.options
    );

    return SecurityResponseBuilder.buildCommandResponse(result.stdout, result.stderr, result.exitCode);
  }

  private async executeCommand(
    command: string,
    args: string[],
    options: {
      cwd?: string;
      timeout?: number;
      env?: Record<string, string>;
    } = {}
  ): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
    // Security validation
    const validation = SecurityValidator.validateCommand(command, args);
    if (!validation.isValid) {
      SecurityLogger.logSecurityBlock('Command execution', validation.error || 'Unknown error');
      throw new McpError(ErrorCode.InvalidParams, `🔒 SECURITY BLOCK: ${validation.error}`);
    }

    const { sanitizedCommand, sanitizedArgs } = validation;
    const fullCommand = `${sanitizedCommand} ${sanitizedArgs!.join(' ')}`;
    
    // Execute with security constraints
    const execOptions = {
      cwd: options.cwd || this.currentDirectory,
      timeout: Math.min(options.timeout || SECURITY_CONFIG.maxExecutionTime, SECURITY_CONFIG.maxExecutionTime),
      env: this.buildSecureEnvironment(options.env),
      windowsHide: true
    };

    try {
      SecurityLogger.logCommandExecution(sanitizedCommand!, sanitizedArgs!);
      const { stdout, stderr } = await execAsync(fullCommand, execOptions);
      
      this.lastExitCode = 0;
      this.lastCommand = fullCommand;
      
      return { stdout, stderr, exitCode: 0 };
    } catch (error: any) {
      this.lastExitCode = error.code || 1;
      this.lastCommand = fullCommand;
      
      SecurityLogger.logCommandFailure(sanitizedCommand!, sanitizedArgs!, error.message);
      
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.code || 1
      };
    }
  }

  private buildSecureEnvironment(additionalEnv?: Record<string, string>): Record<string, string> {
    const secureEnv: Record<string, string> = {};
    
    // Only include required environment variables
    SECURITY_CONFIG.requiredEnvironmentVars.forEach(varName => {
      const value = (globalThis as any).process.env[varName];
      if (value) {
        secureEnv[varName] = value;
      }
    });

    // Add additional environment variables if provided
    if (additionalEnv) {
      Object.assign(secureEnv, additionalEnv);
    }

    return secureEnv;
  }

  getLastExitCode(): number | null {
    return this.lastExitCode;
  }

  getLastCommand(): string | null {
    return this.lastCommand;
  }
}
```

### **Step 7.2: Create Security Directory Handler**
```typescript
// src/handlers/SecureDirectoryHandler.ts
import { SecurityValidator } from '../utils/SecurityValidator.js';
import { SecurityLogger } from '../utils/SecurityLogger.js';
import { SecurityResponseBuilder } from '../utils/SecurityResponseBuilder.js';
import path from 'path';

export class SecureDirectoryHandler {
  private currentDirectory: string;

  constructor(currentDirectory: string) {
    this.currentDirectory = currentDirectory;
  }

  async handleChangeDirectory(args: any): Promise<any> {
    const parsed = SecurityValidator.validateSchema(ChangeDirectorySchema, args, 'change_directory');
    
    const oldPath = this.currentDirectory;
    const newPath = path.resolve(this.currentDirectory, parsed.path);
    
    // Security validation
    SecurityValidator.validateDirectoryAccess(newPath);
    
    try {
      (globalThis as any).process.chdir(newPath);
      this.currentDirectory = (globalThis as any).process.cwd();
      
      SecurityLogger.logDirectoryChange(oldPath, this.currentDirectory);
      
      return SecurityResponseBuilder.buildDirectoryChangeResponse(this.currentDirectory);
    } catch (error: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `🔒 SECURITY: Failed to change directory: ${error.message}`
      );
    }
  }

  async handleGetCurrentDirectory(): Promise<any> {
    return SecurityResponseBuilder.buildTextResponse(`Current directory: ${this.currentDirectory}`);
  }

  getCurrentDirectory(): string {
    return this.currentDirectory;
  }

  updateCurrentDirectory(newPath: string): void {
    this.currentDirectory = newPath;
  }
}
```

### **Step 7.3: Create Handler Tests**
```typescript
// tests/unit/SecureCommandHandlerTests.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { SecureCommandHandler } from '../../src/handlers/SecureCommandHandler.js';

describe('SecureCommandHandler', () => {
  let handler: SecureCommandHandler;

  beforeEach(() => {
    handler = new SecureCommandHandler('/tmp');
  });

  describe('handleExecuteCommand', () => {
    it('should execute safe commands', async () => {
      const result = await handler.handleExecuteCommand({
        command: 'pwd',
        args: [],
        options: {}
      });
      
      expect(result.content[0].text).toContain('STDOUT:');
    });

    it('should reject dangerous commands', async () => {
      await expect(handler.handleExecuteCommand({
        command: 'rm',
        args: ['-rf', '/'],
        options: {}
      })).rejects.toThrow('🔒 SECURITY BLOCK');
    });
  });
});
```

### **Step 7.4: Update Main File to Use Handlers**
```typescript
// src/index.ts - Replace handler logic
import { SecureCommandHandler } from './handlers/SecureCommandHandler.js';
import { SecureDirectoryHandler } from './handlers/SecureDirectoryHandler.js';

// In TerminalServer class:
private commandHandler: SecureCommandHandler;
private directoryHandler: SecureDirectoryHandler;

constructor() {
  // ...existing code...
  this.commandHandler = new SecureCommandHandler(this.state.currentDirectory);
  this.directoryHandler = new SecureDirectoryHandler(this.state.currentDirectory);
}

// Replace handler methods with delegation to handlers
```

### **Step 7.5: Validation Checkpoint**
```bash
# Run all tests
npm test -- --reporter=verbose

# Expected: All tests pass, handlers properly separated
```

**✅ Iteration 7 Complete:** Security handlers extracted, business logic separated

---

## 📋 **ITERATION 8: Create Multi-File Structure**
**Goal:** Organize code into logical modules  
**Duration:** 3-4 hours  
**Risk Level:** MEDIUM  
**Breaking Changes:** None (internal structure only)  

### **Step 8.1: Create Directory Structure**
```bash
mkdir -p src/security
mkdir -p src/handlers
mkdir -p src/utils
mkdir -p src/server
mkdir -p src/schemas
mkdir -p src/types
```

### **Step 8.2: Extract Schemas**
```typescript
// src/schemas/SecuritySchemas.ts
import { z } from 'zod';

export const ExecuteCommandSchema = z.object({
  command: z.string().describe("The command to execute (must be from whitelist)"),
  args: z.array(z.string()).optional().default([]).describe("Command arguments (validated)"),
  options: z.object({
    cwd: z.string().optional().describe("Working directory"),
    timeout: z.number().optional().describe("Command timeout in milliseconds (max 10s)"),
    env: z.record(z.string()).optional().describe("Additional environment variables")
  }).optional().default({})
});

export const ChangeDirectorySchema = z.object({
  path: z.string().describe("Directory path to change to")
});

export const GetCurrentDirectorySchema = z.object({});

export const GetTerminalInfoSchema = z.object({});

export const ListAllowedCommandsSchema = z.object({});
```

### **Step 8.3: Extract Types**
```typescript
// src/types/SecurityTypes.ts
export interface CommandValidationResult {
  isValid: boolean;
  sanitizedCommand?: string;
  sanitizedArgs?: string[];
  error?: string;
}

export interface ServerState {
  currentDirectory: string;
  lastExitCode: number | null;
  lastCommand: string | null;
}

export interface TerminalInfo {
  shell: string;
  user: string;
  home: string;
  platform: string;
  currentDirectory: string;
  lastCommand: string | null;
  lastExitCode: number | null;
  securityMode: string;
  allowedCommands: number;
}
```

### **Step 8.4: Extract Main Server Class**
```typescript
// src/server/SecureTerminalServer.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { SecurityToolBuilder } from '../utils/SecurityToolBuilder.js';
import { SecurityLogger } from '../utils/SecurityLogger.js';
import { SecureCommandHandler } from '../handlers/SecureCommandHandler.js';
import { SecureDirectoryHandler } from '../handlers/SecureDirectoryHandler.js';
import { SECURITY_CONFIG } from '../security/SecurityConfig.js';
import { ServerState } from '../types/SecurityTypes.js';
import * as schemas from '../schemas/SecuritySchemas.js';

export class SecureTerminalServer {
  private server: Server;
  private state: ServerState;
  private commandHandler: SecureCommandHandler;
  private directoryHandler: SecureDirectoryHandler;

  constructor() {
    this.server = new Server({
      name: "secure-terminal-server",
      version: "0.2.0-secure"
    }, {
      capabilities: {
        tools: {}
      }
    });

    this.state = {
      currentDirectory: (globalThis as any).process.cwd(),
      lastExitCode: null,
      lastCommand: null
    };

    this.commandHandler = new SecureCommandHandler(this.state.currentDirectory);
    this.directoryHandler = new SecureDirectoryHandler(this.state.currentDirectory);

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, this.handleListTools.bind(this));
    this.server.setRequestHandler(CallToolRequestSchema, this.handleCallTool.bind(this));
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error: unknown) => {
      console.error("[MCP Error]", error);
    };

    (globalThis as any).process.on('SIGINT', async () => {
      await this.server.close();
      (globalThis as any).process.exit(0);
    });
  }

  private async handleListTools() {
    return {
      tools: SecurityToolBuilder.buildSecurityToolList(schemas)
    };
  }

  private async handleCallTool(request: any) {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "execute_command":
          return await this.commandHandler.handleExecuteCommand(args);
        
        case "change_directory":
          const result = await this.directoryHandler.handleChangeDirectory(args);
          this.state.currentDirectory = this.directoryHandler.getCurrentDirectory();
          return result;
        
        case "get_current_directory":
          return await this.directoryHandler.handleGetCurrentDirectory();
        
        // ... other cases
      }
    } catch (error) {
      // Error handling
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    SecurityLogger.logServerStart({
      commandCount: Object.keys(SECURITY_CONFIG.allowedCommands).length,
      currentDirectory: this.state.currentDirectory,
      securityFeatures: ['whitelist', 'directory-protection', 'environment-isolation']
    });
  }
}
```

### **Step 8.5: Update Entry Point**
```typescript
// src/index.ts - Simplified entry point
#!/usr/bin/env node

import { SecureTerminalServer } from './server/SecureTerminalServer.js';

const server = new SecureTerminalServer();
server.run().catch((error) => {
  console.error("Fatal error running server:", error);
  (globalThis as any).process.exit(1);
});
```

### **Step 8.6: Validation Checkpoint**
```bash
# Run all tests
npm test -- --reporter=verbose

# Expected: All tests pass, clean multi-file structure
```

**✅ Iteration 8 Complete:** Multi-file structure implemented, code properly organized

---

## 📋 **ITERATION 9: Comprehensive Testing**
**Goal:** Achieve 85%+ test coverage with security focus  
**Duration:** 4-5 hours  
**Risk Level:** LOW  
**Breaking Changes:** None  

### **Step 9.1: Security Integration Tests**
```typescript
// tests/integration/SecurityIntegrationTests.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { SecureTerminalServer } from '../../src/server/SecureTerminalServer.js';

describe('Security Integration Tests', () => {
  let server: SecureTerminalServer;

  beforeEach(() => {
    server = new SecureTerminalServer();
  });

  describe('End-to-End Security Flow', () => {
    it('should maintain security through complete workflow', async () => {
      // Test complete security workflow
      const tools = await server.handleListTools();
      expect(tools.tools).toHaveLength(5);

      // Test command execution security
      const result = await server.handleCallTool({
        params: { name: 'execute_command', arguments: { command: 'pwd', args: [] } }
      });
      expect(result.content[0].text).toContain('STDOUT:');

      // Test directory change security
      await expect(server.handleCallTool({
        params: { name: 'change_directory', arguments: { path: '/etc' } }
      })).rejects.toThrow('🔒 SECURITY BLOCK');
    });
  });
});
```

### **Step 9.2: Performance Tests**
```typescript
// tests/performance/SecurityPerformanceTests.ts
import { describe, it, expect } from 'vitest';
import { SecureTerminalServer } from '../../src/server/SecureTerminalServer.js';

describe('Security Performance Tests', () => {
  it('should validate commands quickly', async () => {
    const server = new SecureTerminalServer();
    
    const start = Date.now();
    for (let i = 0; i < 100; i++) {
      await server.handleCallTool({
        params: { name: 'execute_command', arguments: { command: 'pwd', args: [] } }
      });
    }
    const end = Date.now();
    
    const avgTime = (end - start) / 100;
    expect(avgTime).toBeLessThan(50); // Should be under 50ms per command
  });
});
```

### **Step 9.3: Coverage Report**
```bash
# Generate coverage report
npm run test:coverage

# Expected: 85%+ coverage with focus on security-critical paths
```

### **Step 9.4: Final Validation**
```bash
# Run complete test suite
npm test

# Run security-specific tests
npm test tests/security/

# Run integration tests
npm test tests/integration/

# Expected: All tests pass, comprehensive coverage achieved
```

**✅ Iteration 9 Complete:** Comprehensive testing achieved, security validated

---

## 📋 **ITERATION 10: Final Validation & Documentation**
**Goal:** Validate refactoring success and update documentation  
**Duration:** 2-3 hours  
**Risk Level:** LOW  
**Breaking Changes:** None  

### **Step 10.1: Final Code Quality Check**
```bash
# Run linting
npm run lint

# Check TypeScript types
npm run type-check

# Run build
npm run build

# Expected: No errors, clean build
```

### **Step 10.2: Security Audit**
```bash
# Run security audit
npm audit

# Check for vulnerabilities
npm audit fix

# Expected: No high-severity vulnerabilities
```

### **Step 10.3: Performance Validation**
```bash
# Run performance tests
npm run test:performance

# Expected: Performance maintained or improved
```

### **Step 10.4: Update Documentation**
```markdown
# Update README.md with new structure
# Update TESTING_RECOMMENDATIONS.md with new test approach
# Create SECURITY.md with security documentation
```

**✅ Iteration 10 Complete:** Final validation passed, documentation updated

---

## 📊 **FINAL RESULTS**

### **Duplication Elimination**
- ✅ **Schema Validation:** 5 duplications → 0 duplications
- ✅ **Response Structure:** 5 duplications → 0 duplications  
- ✅ **Schema Conversion:** 5 duplications → 0 duplications
- ✅ **Security Logging:** 6+ duplications → 0 duplications

### **Code Organization**
- ✅ **Single File:** 488 lines → **Entry Point:** 15 lines
- ✅ **Multi-File Structure:** 15+ focused modules
- ✅ **Security Separation:** Clear security boundaries
- ✅ **Test Coverage:** 85%+ with security focus

### **Security Preservation**
- ✅ **Command Whitelisting:** Preserved and improved
- ✅ **Directory Protection:** Maintained and centralized
- ✅ **Environment Isolation:** Enhanced with configuration
- ✅ **Audit Trail:** Comprehensive and consistent

### **Maintainability Improvements**
- ✅ **Clean Code Compliance:** All violations resolved
- ✅ **Single Responsibility:** Each module has clear purpose
- ✅ **Testability:** All components unit testable
- ✅ **Documentation:** Comprehensive and updated

## 🎯 **SUCCESS METRICS**

- **Code Duplication:** 20+ instances → 0 instances
- **File Organization:** 1 massive file → 15+ focused modules
- **Test Coverage:** 0% → 85%+
- **Security Risk:** HIGH → LOW
- **Maintainability:** CRITICAL → HIGH
- **Performance:** Maintained or improved

**Total Estimated Time:** 25-30 hours across 10 iterations
**Risk Level:** LOW (with comprehensive testing)
**Breaking Changes:** None (internal structure only)
**Security Impact:** POSITIVE (better security through separation)
