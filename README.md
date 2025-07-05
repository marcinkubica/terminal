# Terminal MCP Server

A Model Context Protocol (MCP) server that enables execution of terminal commands through Claude Desktop.

## Features

- Execute any terminal command with arguments and options
- Navigate between directories while maintaining state
- Get terminal environment information
- Full output capture (stdout, stderr, exit codes)
- Proper error handling and formatting
- **🔒 Automatic Boundary Directory Enforcement**: Server automatically starts in a secure boundary directory (`/tmp` by default) to contain all operations

## Prerequisites

- Node.js v18 or higher
- TypeScript
- Claude Desktop

## Installation

1. Clone the repository:
```bash
git clone https://github.com/stat-guy/terminal.git
cd terminal
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Local Development Setup

1. Create or edit your Claude Desktop configuration file:

   - On macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - On Windows: `%APPDATA%\\Claude\\claude_desktop_config.json`

Add the following configuration:

```json
{
  "mcpServers": {
    "terminal": {
      "command": "node",
      "args": [
        "[PATH_TO_REPO]/dist/index.js"
      ],
      "env": {
        "PERMISSION_REQUIRED": "true"
      }
    }
  }
}
```

Replace `[PATH_TO_REPO]` with the actual path to your cloned repository.

2. Restart Claude Desktop

## Available Tools

### execute_command
- Execute any terminal command
- Supports command arguments and options
- Captures full output and exit codes

### change_directory
- Change the current working directory
- Maintains state between commands
- Supports relative and absolute paths

### get_current_directory
- Get the current working directory path

### get_terminal_info
- Get information about the terminal environment
- Shows shell, user, platform, and recent command history

## Usage Examples

Ask Claude to execute terminal commands like:

```
Can you check what's in my current directory?
-> Executes: ls -la

Can you tell me the current directory?
-> Executes: pwd

Can you change to the Downloads folder?
-> Executes: cd ~/Downloads
```

## Security Features

### Automatic Boundary Directory Enforcement

The server automatically enforces a secure working directory boundary:

- **Default Boundary**: Server starts in `/tmp` directory by default
- **Environment Override**: Set `BOUNDARY_DIR` environment variable to use a different boundary directory
- **Escape Override**: Set `BOUNDARY_ESCAPE=true` to disable boundary enforcement entirely
- **Automatic Startup**: Process automatically changes to the boundary directory on startup (unless escape is enabled)
- **Safe Fallback**: If the boundary directory doesn't exist, the server warns but continues running
- **Directory Restrictions**: All `change_directory` operations are restricted to within the boundary (unless escape is enabled)

#### Configuration Examples

**Default behavior (uses `/tmp`):**
```json
{
  "mcpServers": {
    "terminal": {
      "command": "node",
      "args": ["[PATH_TO_REPO]/dist/index.js"]
    }
  }
}
```

**Custom boundary directory:**
```json
{
  "mcpServers": {
    "terminal": {
      "command": "node",
      "args": ["[PATH_TO_REPO]/dist/index.js"],
      "env": {
        "BOUNDARY_DIR": "/home/user/sandbox"
      }
    }
  }
}
```

**Disable boundary enforcement (⚠️ Use with caution):**
```json
{
  "mcpServers": {
    "terminal": {
      "command": "node",
      "args": ["[PATH_TO_REPO]/dist/index.js"],
      "env": {
        "BOUNDARY_ESCAPE": "true"
      }
    }
  }
}
```

### Additional Security Considerations

- The server requires explicit user permission through Claude Desktop for command execution
- Environment variables can be controlled through the configuration
- Command execution includes timeouts and error handling

## Environment Variables

The Terminal MCP server supports several environment variables for configuration and security control:

### Security & Boundary Control

#### `BOUNDARY_DIR`
- **Type**: String (directory path)
- **Default**: `/tmp`
- **Description**: Sets the boundary directory where all terminal operations are contained
- **Example**: `BOUNDARY_DIR="/home/user/sandbox"`
- **Security**: Restricts all file operations to within this directory

#### `BOUNDARY_ESCAPE`
- **Type**: Boolean (`"true"` or `"false"`)
- **Default**: `"false"` (boundary enforcement enabled)
- **Description**: Disables boundary directory enforcement entirely
- **Example**: `BOUNDARY_ESCAPE="true"`
- **⚠️ Warning**: Use with extreme caution - disables all directory security restrictions

### System Environment Variables

The server also reads and reports standard system environment variables for informational purposes:

#### `PATH`
- **Type**: String (colon-separated paths)
- **Description**: System PATH for command execution
- **Usage**: Read-only, used for command discovery

#### `HOME`
- **Type**: String (directory path)
- **Description**: User's home directory
- **Usage**: Read-only, reported in terminal info

#### `USER`
- **Type**: String (username)
- **Description**: Current user name
- **Usage**: Read-only, reported in terminal info

#### `SHELL`
- **Type**: String (shell path)
- **Description**: Default shell executable
- **Usage**: Read-only, reported in terminal info

### Configuration Examples

**Maximum Security (default):**
```json
{
  "mcpServers": {
    "terminal": {
      "command": "node",
      "args": ["[PATH_TO_REPO]/dist/index.js"]
    }
  }
}
```

**Custom Sandbox Directory:**
```json
{
  "mcpServers": {
    "terminal": {
      "command": "node",
      "args": ["[PATH_TO_REPO]/dist/index.js"],
      "env": {
        "BOUNDARY_DIR": "/home/user/projects"
      }
    }
  }
}
```

**Unrestricted Access (⚠️ Use with extreme caution):**
```json
{
  "mcpServers": {
    "terminal": {
      "command": "node",
      "args": ["[PATH_TO_REPO]/dist/index.js"],
      "env": {
        "BOUNDARY_ESCAPE": "true"
      }
    }
  }
}
```

### Environment Variable Precedence

1. **Security Override**: `BOUNDARY_ESCAPE="true"` disables all boundary enforcement
2. **Custom Boundary**: `BOUNDARY_DIR` sets custom boundary (if escape not enabled)
3. **Default Boundary**: Falls back to `/tmp` if no custom boundary set
4. **System Variables**: Standard environment variables are read-only and informational

## Development

### Development Workflow

1. **Watch for changes** (recommended for active development):
```bash
npm run watch
```
This runs TypeScript compiler in watch mode (`tsc --watch`) which:
- Monitors all TypeScript files for changes
- Automatically recompiles when you save changes
- Provides real-time feedback on TypeScript errors
- Eliminates the need to manually run `npm run build` after each change
- Runs continuously until stopped (Ctrl+C)

2. **Alternative: Manual build**:
```bash
npm run build
```
Use this for one-time builds or when you don't need continuous compilation.

3. **Test changes**:
- Make changes to source files in `src/`
- With watch mode: Changes are automatically compiled
- Without watch mode: Run `npm run build` manually
- Restart Claude Desktop to load the updated server

### Recommended Development Setup

For efficient development, use two terminal windows:
- **Terminal 1**: Run `npm run watch` (keeps TypeScript compiling)
- **Terminal 2**: Run tests with `npm test` or other commands as needed

## Project Structure

```
/
├── src/
│   └── index.ts    # Main server implementation
├── package.json    # Project configuration and dependencies
├── tsconfig.json  # TypeScript configuration
└── README.md      # This file
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License
