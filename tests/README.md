# Test Suite Structure and MCP Protocol Testing Approach

## Overview

This project uses a layered test structure to ensure robust security and protocol compliance for the MCP Terminal Server. All tests are written in TypeScript and executed using the Vitest test runner.

## Test Directory Structure

- `tests/`
  - `integration/`
    - `MCPProtocolTests.test.ts` — Integration tests for MCP protocol compliance and tool invocation.
  - `security/`
    - `SecurityBoundaryTests.test.ts` — Security boundary tests using the MCP protocol interface.
  - `unit/` — (Reserved for future unit tests)

## MCP Protocol Testing Approach

- **All security and integration tests use the MCP protocol interface** (`handleCallTool`), never direct method calls.
- **Test cases**:
  - Validate command whitelisting and blocking of dangerous commands
  - Enforce directory boundary restrictions
  - Validate argument count and input sanitization
  - Ensure protocol-compliant tool invocation
- **Test runner**: Only files with the `.test.ts` extension are executed.
- **Environment**: Tests are run in a sandboxed environment with strict resource and path controls.

## Adding New Tests

- Place new integration or security tests in the appropriate subdirectory.
- Use the MCP protocol interface for all tool invocations.
- Follow the structure and patterns in existing test files for consistency.

## References
- See `docs/booker/refactor-01/iteration-01-plan-review.md` for the security refactor review and rationale.
