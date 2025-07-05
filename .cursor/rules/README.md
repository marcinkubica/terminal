# Cursor Rules Organization

This directory contains organized `.mdc` rules files for intelligent code assistance in Cursor IDE, specifically optimized for the AI Watchman project and LangChain development.

## 📁 Directory Structure

```
.cursor/rules/
├── project/                         # AI Watchman project-specific context
│   ├── ai-watchman-overview.mdc    # Project overview and goals (Always)
│   ├── tech-environment.mdc        # Technical stack and tools (Always)
│   └── project-structure.mdc       # Architecture guidelines (Agent Requested)
├── langchain/                       # LangChain framework knowledge base
│   ├── langchain-core-architecture.mdc      # Framework fundamentals (Always)
│   ├── langchain-agents-langgraph.mdc       # Multi-agent systems (Agent Requested)
│   ├── langchain-rag-retrieval.mdc          # RAG patterns (Agent Requested)
│   ├── langchain-tools-functions.mdc        # Tool creation (Auto Attached)
│   ├── langchain-prompts-output-parsers.mdc # Prompt engineering (Auto Attached)
│   ├── langchain-production-patterns.mdc    # Production deployment (Agent Requested)
│   ├── langchain-testing-debugging.mdc      # Testing strategies (Agent Requested)
│   ├── langchain-quick-reference.mdc        # Essential patterns (Manual)
│   └── README.md                             # LangChain KB documentation
└── README.md                        # This file
```

## 🎯 Rule Type Strategy

### Always Rules (4 files)
**Load in every conversation** - Core knowledge needed for all interactions:

| File | Purpose | Content |
|------|---------|---------|
| `ai-watchman-overview.mdc` | Project context | AI Watchman goals, architecture, constraints |
| `tech-environment.mdc` | Technical stack | Available tools, versions, infrastructure |
| `langchain-core-architecture.mdc` | Framework basics | Core concepts, imports, package structure |

### Auto Attached Rules (2 files)
**Activate when editing Python files** - Language-specific patterns:

| File | Purpose | Triggers |
|------|---------|----------|
| `langchain-tools-functions.mdc` | Tool creation patterns | Working with `**/*.py` files |
| `langchain-prompts-output-parsers.mdc` | Prompt engineering | Working with `**/*.py` files |

### Agent Requested Rules (5 files)
**AI chooses when relevant** - Specialized knowledge:

| File | Purpose | When Applied |
|------|---------|--------------|
| `project-structure.mdc` | Architecture guidance | Discussing project organization, code structure |
| `langchain-agents-langgraph.mdc` | Multi-agent systems | Building agent systems, workflows |
| `langchain-rag-retrieval.mdc` | RAG implementation | Search functionality, knowledge bases |
| `langchain-production-patterns.mdc` | Production deployment | Scaling, monitoring, security |
| `langchain-testing-debugging.mdc` | Testing strategies | Writing tests, debugging issues |

### Manual Rules (1 file)
**Available on @mention** - Reference materials:

| File | Purpose | Access Method |
|------|---------|---------------|
| `langchain-quick-reference.mdc` | Essential patterns | `@langchain-quick-reference` |

## 🚀 Usage Guide

### For AI Watchman Development
- **Always available**: Project context, technical environment, LangChain core
- **Python development**: Tool and prompt patterns activate automatically
- **Architecture decisions**: Project structure guidance available when needed
- **Specialized tasks**: Agent, RAG, production, testing knowledge on-demand

### For Team Collaboration
- **Consistent context**: All team members get same project understanding
- **Efficient loading**: Only relevant rules activate to save context window
- **Scalable structure**: Easy to add new framework knowledge or project rules

## ⚙️ Configuration Examples

### Always Rule Configuration
```yaml
---
description: 
globs: 
alwaysApply: true
---
```

### Auto Attached Rule Configuration
```yaml
---
description: 
globs: **/*.py
alwaysApply: false
---
```

### Agent Requested Rule Configuration
```yaml
---
description: Detailed context about when to apply this rule, including specific scenarios and use cases that indicate relevance.
globs: 
alwaysApply: false
---
```

### Manual Rule Configuration
```yaml
---
description: 
globs: 
alwaysApply: false
---
```

## 📈 Benefits

### Performance Optimization
- **Reduced context usage**: Only 4 Always rules (vs 8+ previously)
- **Contextual loading**: Specialized knowledge only when needed
- **Faster responses**: Less processing overhead

### Better Organization
- **Clear separation**: Project vs framework knowledge
- **Logical grouping**: Related rules together
- **Easy maintenance**: Simple to update or extend

### Team Efficiency
- **Consistent guidance**: Same context for all developers
- **Specialized assistance**: Right knowledge at the right time
- **Scalable architecture**: Room for growth and new frameworks

## 🔧 Maintenance

### Adding New Rules
1. Choose appropriate directory (`project/` or `langchain/`)
2. Select correct Rule Type based on usage pattern
3. Add proper frontmatter configuration
4. Update this documentation

### Modifying Existing Rules
1. Consider impact on Rule Type (Always rules affect all conversations)
2. Test changes in development environment
3. Update documentation if behavior changes

### Performance Monitoring
- Monitor context window usage
- Adjust Rule Types if patterns change
- Consider splitting large rules into smaller, focused ones

---

*This organized structure provides optimal performance and contextual relevance for AI Watchman development with LangChain.* 
