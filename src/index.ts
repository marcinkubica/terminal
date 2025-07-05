// --- BOUNDARY DIR ENFORCEMENT HELPERS ---
function getBoundaryDir(): string {
  return process.env.BOUNDARY_DIR || '/tmp';
}

/**
 * Resolves a user-supplied path against the current directory and ensures it stays within the boundary dir.
 * Throws McpError if the resolved path is outside the boundary.
 */
function resolveAndValidatePath(currentDir: string, userPath: string): string {
  const boundary = path.resolve(getBoundaryDir());
  const resolved = path.resolve(currentDir, userPath);
  // Ensure resolved path is within boundary (prefix match, with trailing slash or exact)
  if (
    resolved === boundary ||
    resolved.startsWith(boundary + path.sep)
  ) {
    return resolved;
  }
  throw new McpError(
    ErrorCode.InvalidParams,
    `🔒 SECURITY BLOCK: Path '${resolved}' is outside the allowed boundary (${boundary})`
  );
}


import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
  ErrorCode,
  McpError
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

// Safe command whitelist - only these commands are allowed
interface CommandConfig {
  allowedArgs: readonly string[];
  description: string;
  requiresFile?: boolean;
}

const ALLOWED_COMMANDS: Record<string, CommandConfig> = {
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
};

// Dangerous patterns that should never be allowed
const FORBIDDEN_PATTERNS = [
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
];

interface CommandValidationResult {
  isValid: boolean;
  sanitizedCommand?: string;
  sanitizedArgs?: string[];
  error?: string;
}

function validateAndSanitizeCommand(command: string, args: string[]): CommandValidationResult {
  // Basic input validation
  if (!command || typeof command !== 'string') {
    return { isValid: false, error: 'Command must be a non-empty string' };
  }

  // Normalize command (remove leading/trailing whitespace, convert to lowercase)
  const normalizedCommand = command.trim().toLowerCase();
  
  // Check if command is in whitelist
  if (!(normalizedCommand in ALLOWED_COMMANDS)) {
    return { 
      isValid: false, 
      error: `Command '${normalizedCommand}' is not in the allowed whitelist. Allowed commands: ${Object.keys(ALLOWED_COMMANDS).join(', ')}` 
    };
  }

  const commandConfig = ALLOWED_COMMANDS[normalizedCommand as keyof typeof ALLOWED_COMMANDS];

  // Check for forbidden patterns in command and args
  const fullCommandString = `${normalizedCommand} ${args.join(' ')}`;
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(fullCommandString)) {
      return { 
        isValid: false, 
        error: `Command contains forbidden pattern: ${pattern.source}` 
      };
    }
  }

  // Validate and strictly enforce allowed arguments
  const sanitizedArgs: string[] = [];
  for (const arg of args) {
    if (typeof arg !== 'string') {
      return { isValid: false, error: 'All arguments must be strings' };
    }
    const trimmedArg = arg.trim();
    if (!trimmedArg) continue; // Skip empty args

    // Strict: Only allow arguments explicitly in allowedArgs, or file paths if requiresFile
    let isAllowed = false;
    if (commandConfig.allowedArgs.length > 0) {
      isAllowed = commandConfig.allowedArgs.includes(trimmedArg);
    }
    // Allow file paths for commands that require a file, but only if the arg does not start with '-'
    if (commandConfig.requiresFile && !trimmedArg.startsWith('-')) {
      // Only allow safe file path patterns
      if (/^\/?[a-zA-Z0-9._\/-]+$/.test(trimmedArg)) {
        isAllowed = true;
      } else {
        return { isValid: false, error: `File path argument '${trimmedArg}' is not allowed` };
      }
    }
    if (!isAllowed) {
      return { isValid: false, error: `Argument '${trimmedArg}' not allowed for command '${normalizedCommand}'` };
    }
    sanitizedArgs.push(trimmedArg);
  }

  // Limit argument count to prevent abuse
  if (sanitizedArgs.length > 10) {
    return { 
      isValid: false, 
      error: 'Too many arguments (maximum 10 allowed)' 
    };
  }

  return {
    isValid: true,
    sanitizedCommand: normalizedCommand,
    sanitizedArgs
  };
}

const ExecuteCommandSchema = z.object({
  command: z.string().describe("The command to execute (must be from whitelist)"),
  args: z.array(z.string()).optional().default([]).describe("Command arguments (validated)"),
  options: z.object({
    cwd: z.string().optional().describe("Working directory"),
    timeout: z.number().optional().describe("Command timeout in milliseconds (max 10s)"),
    env: z.record(z.string()).optional().describe("Additional environment variables")
  }).optional().default({})
});

const ChangeDirectorySchema = z.object({
  path: z.string().describe("Directory path to change to")
});

const GetCurrentDirectorySchema = z.object({});

const GetTerminalInfoSchema = z.object({});

const ListAllowedCommandsSchema = z.object({});

interface ServerState {
  currentDirectory: string;
  lastExitCode: number | null;
  lastCommand: string | null;
}

class TerminalServer {
  private server: Server;
  private state: ServerState;

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

    this.setupHandlers();
    this.setupErrorHandling();
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

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, this.handleListTools.bind(this));
    this.server.setRequestHandler(CallToolRequestSchema, this.handleCallTool.bind(this));
  }

  private async handleListTools() {
    const ToolInputSchema = ToolSchema.shape.inputSchema;
    type ToolInput = z.infer<typeof ToolInputSchema>;

    return {
      tools: [
        {
          name: "execute_command",
          description: "🔒 Execute a WHITELISTED terminal command with validated arguments only.",
          inputSchema: zodToJsonSchema(ExecuteCommandSchema) as ToolInput,
        },
        {
          name: "change_directory",
          description: "🔒 Change working directory (RESTRICTED to home and /tmp only).",
          inputSchema: zodToJsonSchema(ChangeDirectorySchema) as ToolInput,
        },
        {
          name: "get_current_directory",
          description: "Get the current working directory path.",
          inputSchema: zodToJsonSchema(GetCurrentDirectorySchema) as ToolInput,
        },
        {
          name: "get_terminal_info",
          description: "Get terminal environment info and security status.",
          inputSchema: zodToJsonSchema(GetTerminalInfoSchema) as ToolInput,
        },
        {
          name: "list_allowed_commands",
          description: "🔒 List all commands allowed by the security whitelist.",
          inputSchema: zodToJsonSchema(ListAllowedCommandsSchema) as ToolInput,
        }
      ]
    };
  }

  private formatCommandOutput(stdout: string, stderr: string, exitCode: number | null): string {
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
    
    return output.trim();
  }

  private async executeCommand(
    command: string,
    args: string[],
    options: {
      cwd?: string;
      timeout?: number;
      env?: Record<string, string>;
    } = {}
  ) {
    // 🔒 SECURITY: Validate and sanitize the command first
    const validation = validateAndSanitizeCommand(command, args);
    if (!validation.isValid) {
      throw new McpError(ErrorCode.InvalidParams, `🔒 SECURITY BLOCK: ${validation.error}`);
    }

    const { sanitizedCommand, sanitizedArgs } = validation;
    const fullCommand = `${sanitizedCommand} ${sanitizedArgs!.join(' ')}`;
    
    // 🔒 SECURITY: Enforce strict execution limits
    const execOptions = {
      cwd: options.cwd || this.state.currentDirectory,
      timeout: Math.min(options.timeout || 10000, 10000), // Max 10 seconds
      env: {
        // 🔒 SECURITY: Only pass essential environment variables
        PATH: (globalThis as any).process.env.PATH,
        HOME: (globalThis as any).process.env.HOME,
        USER: (globalThis as any).process.env.USER,
        SHELL: (globalThis as any).process.env.SHELL,
        ...options.env // Allow specific additional env vars
      },
      // Additional security options
      windowsHide: true // Hide windows on Windows
    };

    try {
      console.error(`🔒 [SECURITY] Executing whitelisted command: ${fullCommand}`);
      const { stdout, stderr } = await execAsync(fullCommand, execOptions);
      this.state.lastExitCode = 0;
      this.state.lastCommand = fullCommand;
      return this.formatCommandOutput(stdout, stderr, 0);
    } catch (error: any) {
      this.state.lastExitCode = error.code || 1;
      this.state.lastCommand = fullCommand;
      console.error(`🔒 [SECURITY] Command failed: ${fullCommand}, Error: ${error.message}`);
      return this.formatCommandOutput(
        error.stdout || '',
        error.stderr || error.message,
        error.code || 1
      );
    }
  }

  public async handleCallTool(request: z.infer<typeof CallToolRequestSchema>) {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "execute_command": {
          const parsed = ExecuteCommandSchema.safeParse(args);
          if (!parsed.success) {
            throw new McpError(ErrorCode.InvalidParams, `Invalid arguments: ${parsed.error}`);
          }

          // 🔒 SECURITY: Validate command and arguments before execution
          const validation = validateAndSanitizeCommand(parsed.data.command, parsed.data.args);
          if (!validation.isValid) {
            throw new McpError(ErrorCode.InvalidParams, `🔒 SECURITY BLOCK: ${validation.error}`);
          }

          const result = await this.executeCommand(
            parsed.data.command,
            parsed.data.args,
            parsed.data.options
          );

          return {
            content: [{ type: "text", text: result }]
          };
        }

        case "change_directory": {
          const parsed = ChangeDirectorySchema.safeParse(args);
          if (!parsed.success) {
            throw new McpError(ErrorCode.InvalidParams, `Invalid arguments: ${parsed.error}`);
          }
          // 🔒 SECURITY: Enforce boundary dir
          let newPath: string;
          try {
            newPath = resolveAndValidatePath(this.state.currentDirectory, parsed.data.path);
          } catch (err) {
            throw err;
          }
          // 🔒 SECURITY: Directory must exist
          try {
            if (!require('fs').existsSync(newPath)) {
              throw new McpError(
                ErrorCode.InvalidParams,
                `🔒 SECURITY BLOCK: Directory does not exist: ${newPath}`
              );
            }
            (globalThis as any).process.chdir(newPath);
            this.state.currentDirectory = (globalThis as any).process.cwd();
            console.error(`🔒 [SECURITY] Directory changed to: ${this.state.currentDirectory}`);
            return {
              content: [{
                type: "text",
                text: `Current directory changed to: ${this.state.currentDirectory}`
              }]
            };
          } catch (error: any) {
            if (error instanceof McpError) throw error;
            throw new McpError(
              ErrorCode.InternalError,
              `Failed to change directory: ${error.message}`
            );
          }
        }

        case "get_current_directory": {
          return {
            content: [{
              type: "text",
              text: `Current directory: ${this.state.currentDirectory}`
            }]
          };
        }

        case "get_terminal_info": {
          const info = {
            shell: (globalThis as any).process.env.SHELL || 'unknown',
            user: (globalThis as any).process.env.USER || os.userInfo().username,
            home: os.homedir(),
            platform: (globalThis as any).process.platform,
            currentDirectory: this.state.currentDirectory,
            lastCommand: this.state.lastCommand,
            lastExitCode: this.state.lastExitCode,
            securityMode: '🔒 WHITELIST_ENABLED',
            allowedCommands: Object.keys(ALLOWED_COMMANDS).length
          };

          return {
            content: [{
              type: "text",
              text: Object.entries(info)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n')
            }]
          };
        }

        case "list_allowed_commands": {
          const commandList = Object.entries(ALLOWED_COMMANDS)
            .map(([cmd, config]) => `🔒 ${cmd}: ${config.description}`)
            .join('\n');

          return {
            content: [{
              type: "text",
              text: `🔒 SECURITY: Whitelisted Commands Only\n\nAllowed commands:\n${commandList}\n\n🔒 Note: All commands are validated against security patterns and argument restrictions.\n🔒 Dangerous commands like rm, curl, sudo, etc. are BLOCKED.`
            }]
          };
        }

        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new McpError(ErrorCode.InternalError, `Error executing tool: ${errorMessage}`);
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("🔒 SECURE Terminal MCP Server running on stdio");
    console.error("🔒 Security: Command whitelist ENABLED");
    console.error(`🔒 Allowed commands: ${Object.keys(ALLOWED_COMMANDS).length}`);
    console.error("🔒 Current directory:", this.state.currentDirectory);
    console.error("🔒 Dangerous commands BLOCKED (rm, curl, sudo, etc.)");
  }
}

const server = new TerminalServer();
server.run().catch((error) => {
  console.error("Fatal error running server:", error);
  (globalThis as any).process.exit(1);
});

// Export for testing
export { TerminalServer };
