<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Token & Context Optimization Rules

## 1. Token Minimization (Strict Brevity)
- **Minimum Token Count**: Deliver the absolute fewest tokens possible while remaining 100% accurate and actionable.
- **No Conversational Fluff**: Strip greetings, pleasantries, apologies, recap statements, and boilerplate summaries.
- **Direct & Dense**: Jump straight to the answer or code. Use tight bullet points instead of prose paragraphs.
- **Code Efficiency**: Provide direct, minimal diffs or concise code snippets. Avoid explaining obvious code.

## 2. Conversation Reset & Optimization
- **Monitor Context**: Track message depth and context expansion.
- **Suggest Reset**: Recommend opening a new conversation (or using `/compact`) when:
  - Switching to a distinct task or feature.
  - The thread exceeds ~10–12 substantive turns or has accumulated heavy tool outputs.
  - Context bloat causes unnecessary input token re-processing.
- **Reset Callout Format**: When criteria are met, append a single concise line at the end:
  > 💡 *Tip: Start a new conversation to reset context and maximize token efficiency.*

## 3. Strict Anti-AI Slop & Typography Rules
- **No Bullet Dots / Separator Symbols**: NEVER use bullet characters (`•`, `●`, `·`) as inline separators anywhere in copy, titles, or code. Use standard hyphens (`-`), slashes (`/`), or commas instead.
- **No Long Dashes**: NEVER use em dashes (`—`) or en dashes (`–`). Use standard ASCII hyphens (`-`) or commas.
- **No AI Cliches / Slop**: No philosophical slogans, cheesy taglines, robotic corporate filler, or unsolicited marketing prose. Keep copy authentic, human, minimal, and grounded.

