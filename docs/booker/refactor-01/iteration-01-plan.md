# Iteration 1: Security Test Refactor Plan (MCP-Compliant)

## What I've Learned from modelcontextprotocol Repo
- **Model Context Protocol (MCP)** is a JSON-RPC-based protocol for model server/client communication, with schemas defined in TypeScript and exported as JSON Schema.
- The protocol is versioned and extensible, with types for requests, notifications, results, and errors.
- The intended usage is via protocol-compliant request/response, not direct method calls.
- Your terminal server must expose its functionality (e.g., command execution, directory change) via MCP tool handlers, not as public methods.
- All validation and security logic should be enforced at the protocol handler level, before any system calls.

## Best Plan of Action

1. **Refactor SecurityBoundaryTests for MCP Protocol Compliance**
   - Update all tests to use the MCP protocol interface (`handleCallTool`), not direct method calls.
   - This ensures tests reflect real-world, protocol-driven usage and catch MCP compliance issues early.

2. **Enforce Pre-Execution Validation in Handlers**
   - Move all argument and security validation to occur before any shell/system call, inside the MCP tool handler logic.
   - This guarantees invalid or dangerous requests are blocked at the protocol layer.

3. **Rerun and Validate All Security Tests**
   - Run the full security test suite after refactoring.
   - All tests must pass, confirming both security and MCP protocol compliance.

4. **Document and Fix Any Gaps**
   - If any test fails due to protocol or handler gaps, document and fix the implementation immediately.

### Why This Plan
- Aligns code and tests with actual MCP usage model.
- Enforces security at the correct layer.
- Provides immediate, actionable feedback on protocol compliance and security posture.


---

## Iteration 1: Results and Implementation Notes (2025-07-05)

### Actions Completed

1. **Refactored SecurityBoundaryTests for MCP Protocol Compliance**
   - All security tests now use the MCP protocol interface (`handleCallTool`), not direct method calls.
   - Tests reflect real-world, protocol-driven usage and catch MCP compliance issues early.

2. **Enforced Pre-Execution Validation in Handlers**
   - All argument and security validation now occurs before any shell/system call, inside the MCP tool handler logic.
   - Directory and file operations are strictly restricted to a configurable boundary directory (`BOUNDARY_DIR`, default `/tmp`).
   - Implemented helpers: `getBoundaryDir()` and `resolveAndValidatePath()` in `src/index.ts`.
   - All path-based operations are validated to ensure they do not escape the boundary.
   - Argument validation is strict: only allowed arguments and file paths are accepted, and argument count is limited.

3. **Reran and Validated All Security Tests**
   - Security tests updated to use only directories within the allowed boundary and to create `/tmp/test` before running.
   - All security tests now pass, confirming both security and MCP protocol compliance.

4. **Documented and Fixed All Gaps**
   - Fixed test setup to ensure required directories exist before testing.
   - Strengthened argument validation logic to block invalid or excessive arguments at the protocol handler level.

### Outcome

- Security, maintainability, and MCP protocol compliance are now enforced at the protocol handler level.
- All security tests pass, confirming the implementation is robust and correct for Iteration 1.
- The code is ready for documentation, commit, and further iterations.
