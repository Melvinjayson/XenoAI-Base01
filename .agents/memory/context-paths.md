---
name: Context paths
description: React context files use `context/` (singular) not `contexts/` — import alias path matters
---

React context files are at `client/src/context/<name>.tsx`, aliased as `@/context/<name>`.

**Why:** Using `@/contexts/` (plural) causes a Vite import resolution error at runtime even though TypeScript may not catch it at compile time.

**How to apply:** Any import of `KnowledgeGraphProvider`, `useKnowledgeGraph`, `useChat`, etc. must use `@/context/knowledge-graph-context` and `@/context/chat-context`.
