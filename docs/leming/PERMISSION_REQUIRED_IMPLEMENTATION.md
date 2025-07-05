# PERMISSION_REQUIRED Flag Implementation Recommendations

## Executive Summary

The `PERMISSION_REQUIRED` flag is currently defined in the Claude Desktop configuration but **has no actual implementation in the code**. This document outlines recommendations for properly implementing this security feature to ensure users are prompted for permission before terminal commands are executed.

## Current State Analysis

### Configuration
```json
{
  "mcpServers": {
    "terminal": {
      "command": "node",
      "args": ["[PATH_TO_REPO]/dist/index.js"],
      "env": {
        "PERMISSION_REQUIRED": "true"  // Flag exists in configuration
      }
    }
  }
}
```

### Documentation Claims
From README.md:
> "The server requires explicit user permission through Claude Desktop for command execution"

### Actual Implementation
The flag is **not used anywhere in the codebase**. Commands are executed without any permission checks:

```typescript
// src/index.ts - executeCommand method
private async executeCommand(command: string, args: string[], options = {}) {
  const fullCommand = `${command} ${args.join(' ')}`;
  const execOptions = {
    cwd: options.cwd || this.state.currentDirectory,
    timeout: options.timeout || 30000,
    env: {
      ...process.env,
      ...options.env
    }
  };

  // Commands execute directly without permission checks
  const { stdout, stderr } = await execAsync(fullCommand, execOptions);
  // ...
}
```

## Security Implications

1. **False Security Claims**: Users believe commands require permission when they don't
2. **Arbitrary Command Execution**: Any command can be executed without user consent
3. **Privilege Escalation Risk**: Commands run with the same privileges as the MCP server
4. **Sensitive Data Access**: Commands could access, modify, or exfiltrate sensitive data

## Implementation Recommendations

### 1. Command Permission Protocol

Implement a permission protocol between the MCP server and Claude Desktop:

```typescript
interface PermissionRequest {
  command: string;
  args: string[];
  cwd: string;
}

interface PermissionResponse {
  granted: boolean;
  modifiedCommand?: string;
  modifiedArgs?: string[];
}
```

### 2. Code Implementation

```typescript
private async executeCommand(command: string, args: string[], options = {}) {
  const fullCommand = `${command} ${args.join(' ')}`;
  
  // Check if permission is required
  if (process.env.PERMISSION_REQUIRED === 'true') {
    try {
      // Send permission request to Claude Desktop
      const permissionResponse = await this.requestPermission({
        command,
        args,
        cwd: options.cwd || this.state.currentDirectory
      });
      
      // If permission denied, throw error
      if (!permissionResponse.granted) {
        throw new McpError(
          ErrorCode.PermissionDenied,
          `User denied permission to execute command: ${fullCommand}`
        );
      }
      
      // Use potentially modified command/args from user response
      if (permissionResponse.modifiedCommand) {
        command = permissionResponse.modifiedCommand;
      }
      if (permissionResponse.modifiedArgs) {
        args = permissionResponse.modifiedArgs;
      }
    } catch (error) {
      // Handle communication errors
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to request command execution permission: ${error.message}`
      );
    }
  }
  
  // Rest of existing execution logic
  const execOptions = {
    cwd: options.cwd || this.state.currentDirectory,
    timeout: options.timeout || 30000,
    env: {
      ...process.env,
      ...options.env
    }
  };

  try {
    const { stdout, stderr } = await execAsync(
      `${command} ${args.join(' ')}`, 
      execOptions
    );
    // ... rest of method
  } catch (error) {
    // ... error handling
  }
}

// New method to request permission
private async requestPermission(request: PermissionRequest): Promise<PermissionResponse> {
  // Implementation depends on how Claude Desktop handles permission requests
  // This might use a special MCP message type or a custom protocol
  
  // Example implementation using a hypothetical MCP permission API
  return await this.server.requestPermission({
    type: 'command_execution',
    details: request
  });
}
```

### 3. Command Classification

Implement a command classification system to determine risk levels:

```typescript
enum CommandRiskLevel {
  LOW = 'low',      // e.g., ls, pwd, echo
  MEDIUM = 'medium', // e.g., cp, mv, mkdir
  HIGH = 'high'     // e.g., rm -rf, chmod, chown
}

function classifyCommand(command: string, args: string[]): CommandRiskLevel {
  // Logic to classify commands based on potential risk
  // Could use a combination of allow/deny lists and pattern matching
  
  // Example implementation
  const fullCommand = `${command} ${args.join(' ')}`;
  
  // High-risk patterns
  const highRiskPatterns = [
    /\brm\s+-rf\b/,
    /\bchmod\b.*777/,
    /\bsudo\b/,
    /\bdd\b/,
    // etc.
  ];
  
  // Check for high-risk patterns
  if (highRiskPatterns.some(pattern => pattern.test(fullCommand))) {
    return CommandRiskLevel.HIGH;
  }
  
  // Medium-risk commands
  const mediumRiskCommands = ['cp', 'mv', 'mkdir', 'touch', 'wget', 'curl'];
  if (mediumRiskCommands.includes(command)) {
    return CommandRiskLevel.MEDIUM;
  }
  
  // Default to low risk
  return CommandRiskLevel.LOW;
}
```

### 4. Enhanced Permission UI

Work with Claude Desktop team to implement a permission UI that:

1. Shows the command to be executed
2. Displays the working directory
3. Indicates the risk level
4. Allows command modification before approval
5. Provides "Remember this decision" option for trusted commands

## Implementation Phases

### Phase 1: Basic Permission Checking
- Implement environment variable check
- Add simple permission request mechanism
- Block execution if permission denied

### Phase 2: Command Risk Classification
- Implement command classification system
- Provide risk level information with permission requests
- Add command allow/deny lists

### Phase 3: Enhanced User Experience
- Allow command modification in permission UI
- Implement permission caching for repeated commands
- Add detailed command explanations for non-technical users

## Testing Recommendations

1. **Unit Tests**:
   - Test permission checking logic
   - Test command classification system
   - Test permission request/response handling

2. **Integration Tests**:
   - Test communication with Claude Desktop
   - Test permission UI interactions
   - Test command execution with/without permissions

3. **Security Tests**:
   - Test command injection attempts
   - Test permission bypass attempts
   - Test privilege escalation scenarios

## Conclusion

Implementing the `PERMISSION_REQUIRED` flag is critical for the security of the terminal MCP server. Without proper permission checks, the server poses significant security risks to users' systems. This implementation should be prioritized before any production use of the terminal MCP server. 
