import { describe, it, expect } from 'vitest';
import { TerminalServer } from '../../src/index.js';

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
