# Testing Recommendations - Terminal MCP Server

## **Current State Analysis**

**Project Overview:**
- Model Context Protocol server for terminal command execution
- 270 lines of TypeScript code in single file (`src/index.ts`)
- **No existing tests or testing infrastructure**
- Complex async command execution logic with state management
- High-risk production code that executes arbitrary shell commands

---

## **Testing Framework Setup**

### **Recommended Stack:**
- **Jest** - Primary testing framework (mature, excellent TypeScript support)
- **ts-jest** - TypeScript preprocessor for Jest
- **@types/jest** - TypeScript definitions

### **Installation:**
```bash
npm install --save-dev jest @types/jest ts-jest
```

### **Configuration Files:**

**jest.config.js:**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};
```

**package.json additions:**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false"
  }
}
```

---

## **Priority Testing Areas**

### **1. Critical Functions (High Priority)**

#### **`executeCommand()` Method**
**Location:** Lines 136-167
**Risk Level:** CRITICAL - Executes arbitrary shell commands

**Test Cases:**
```typescript
describe('executeCommand', () => {
  beforeEach(() => {
    // Mock child_process.exec
    jest.mock('child_process');
  });

  it('should execute simple commands successfully')
  it('should handle command with arguments')
  it('should respect working directory option')
  it('should pass environment variables correctly')
  it('should handle command timeouts')
  it('should capture both stdout and stderr')
  it('should track exit codes correctly')
  it('should handle command failures gracefully')
  it('should update server state after execution')
});
```

#### **`formatCommandOutput()` Method**
**Location:** Lines 119-135
**Risk Level:** LOW - Pure function, easy to test

**Test Cases:**
```typescript
describe('formatCommandOutput', () => {
  it('should format stdout only')
  it('should format stderr only')
  it('should format both stdout and stderr')
  it('should include exit code')
  it('should handle empty outputs')
  it('should handle null exit code')
  it('should trim whitespace correctly')
});
```

### **2. Request Handlers (High Priority)**

#### **`handleCallTool()` Method**
**Location:** Lines 152-248
**Risk Level:** HIGH - Main request processing logic

**Test Cases:**
```typescript
describe('handleCallTool', () => {
  describe('execute_command tool', () => {
    it('should validate input schema')
    it('should reject invalid arguments')
    it('should execute command with default options')
    it('should execute command with custom options')
    it('should return formatted output')
  });
  
  describe('change_directory tool', () => {
    it('should change directory successfully')
    it('should update server state')
    it('should handle invalid paths')
    it('should resolve relative paths')
  });
  
  describe('get_current_directory tool', () => {
    it('should return current directory')
  });
  
  describe('get_terminal_info tool', () => {
    it('should return comprehensive system info')
    it('should include last command and exit code')
  });
  
  it('should handle unknown tools')
  it('should handle schema validation errors')
  it('should wrap non-MCP errors properly')
});
```

### **3. State Management (Medium Priority)**

#### **ServerState Interface**
**Location:** Lines 39-43
**Risk Level:** MEDIUM - State consistency important

**Test Cases:**
```typescript
describe('ServerState', () => {
  it('should initialize with correct defaults')
  it('should update currentDirectory on change')
  it('should track lastExitCode correctly')
  it('should track lastCommand correctly')
  it('should maintain state between commands')
});
```

### **4. Server Lifecycle (Medium Priority)**

#### **Constructor and Setup**
**Location:** Lines 49-68
**Risk Level:** MEDIUM - Server initialization

**Test Cases:**
```typescript
describe('TerminalServer lifecycle', () => {
  it('should initialize with correct default state')
  it('should setup request handlers correctly')
  it('should setup error handling')
  it('should handle SIGINT gracefully')
});
```

---

## **Mocking Strategy**

### **External Dependencies to Mock:**

1. **child_process module:**
```typescript
jest.mock('child_process', () => ({
  exec: jest.fn()
}));
```

2. **MCP SDK:**
```typescript
jest.mock('@modelcontextprotocol/sdk/server/index.js');
jest.mock('@modelcontextprotocol/sdk/server/stdio.js');
```

3. **Node.js built-ins:**
```typescript
jest.mock('path');
jest.mock('os');
jest.mock('process');
```

---

## **Test File Structure**

```
__tests__/
├── unit/
│   ├── terminal-server.test.ts        # Main server class tests
│   ├── command-execution.test.ts      # Command execution logic
│   ├── output-formatting.test.ts      # Output formatting tests
│   └── state-management.test.ts       # State management tests
├── integration/
│   ├── tool-handlers.test.ts          # End-to-end tool testing
│   └── server-lifecycle.test.ts       # Server startup/shutdown
└── fixtures/
    ├── mock-commands.ts               # Mock command responses
    └── test-data.ts                   # Test data constants
```

---

## **Security Testing Considerations**

### **Command Injection Prevention:**
```typescript
describe('Security', () => {
  it('should handle malicious command injection attempts')
  it('should sanitize command arguments')
  it('should prevent path traversal in directory changes')
  it('should limit command execution time')
  it('should prevent environment variable injection')
});
```

### **Error Information Leakage:**
```typescript
describe('Error Handling', () => {
  it('should not leak sensitive information in error messages')
  it('should sanitize error outputs')
  it('should handle permission denied errors gracefully')
});
```

---

## **Integration Testing**

### **Real Command Execution Tests:**
```typescript
describe('Integration Tests', () => {
  it('should execute safe commands in test environment')
  it('should handle directory navigation')
  it('should work with environment variables')
  it('should timeout long-running commands')
});
```

---

## **Coverage Goals**

- **Target Coverage:** 90%+ for critical paths
- **Minimum Coverage:** 80% overall
- **Focus Areas:**
  - Command execution: 100%
  - Error handling: 95%
  - State management: 90%
  - Request handlers: 95%

---

## **CI/CD Integration**

### **GitHub Actions Example:**
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
      - uses: codecov/codecov-action@v3
```

---

## **Implementation Timeline**

### **Phase 1 (Week 1):** Foundation
- Setup Jest configuration
- Create basic test structure
- Test pure functions (`formatCommandOutput`)

### **Phase 2 (Week 2):** Core Logic
- Mock child_process and test `executeCommand`
- Test state management
- Basic error handling tests

### **Phase 3 (Week 3):** Request Handlers
- Test all tool handlers
- Schema validation tests
- Error scenario coverage

### **Phase 4 (Week 4):** Integration & Security
- Integration tests with real commands
- Security testing
- Performance testing
- CI/CD setup

---

## **Risk Mitigation**

**High-Risk Areas Requiring Immediate Testing:**
1. Command execution logic (arbitrary shell command execution)
2. Directory traversal prevention
3. Timeout handling
4. Error information leakage prevention

**Testing in Isolated Environment:**
- Use Docker containers for integration tests
- Implement command whitelisting for tests
- Monitor resource usage during tests
- Implement cleanup procedures for test artifacts 
