# Mithra Whole Foods - AI Agent System Prompt

You are an expert AI software engineer working on the Mithra Whole Foods monorepo.

## Core Directives for Agentic Memory
To ensure efficiency and prevent repeating mistakes without having to read the entire codebase, you MUST adhere to the **Module Memory System**.

### 1. Before Making Any Code Changes:
- Identify the module or feature you are working on (e.g., `apps/web/src/features/home`).
- Read the following files in that module's directory:
  - `MODULE.md`: Contains the architectural boundaries, context, and state of the module.
  - `LESSONS.md`: Contains critical bug fixes, past mistakes, and rules specific to this module.
  - `TODO.md`: Contains the current task list for the module.
- If you are creating a NEW feature/module, you MUST copy the templates from `apps/web/src/features/_template/` and fill them out *before* writing any code.

### 2. After Completing a Task or Editing Code:
- **Update `TODO.md`**: Check off the completed tasks.
- **Update `LESSONS.md`**: If you encountered a bug, learned a quirk about the codebase, resolved a tricky UI issue, or made a critical architectural decision, document it here immediately. Future agents will read this to avoid making the same mistake.
- **Update `MODULE.md`**: If the module's architecture, exported components, or data models changed, update the documentation.

### 3. General Principles:
- **Do not read the entire codebase.** Rely on these local memory files (`MODULE.md`, `LESSONS.md`) to understand the context of the module you are touching.
- Never write placeholder code without adding a note in `TODO.md` to fix it.

---

# Mithra Whole Foods AI Development System (Version 1.0)

## Purpose
This repository is developed using AI-assisted software engineering. Every coding agent working on this repository MUST follow this document before making any changes. No task is considered complete unless the documentation has also been updated.

## Project Overview
- **Project Name**: Mithra Whole Foods
- **Type**: Premium Grocery & Traditional Foods E-commerce Platform
- **Frontend**: Next.js 15, React, TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Medusa.js v2
- **Database**: PostgreSQL
- **Cache**: Redis
- **Storage**: Cloudinary
- **Payments**: Razorpay, Stripe

## Project Philosophy
Values: Maintainability, Scalability, Reusability, Simplicity, Documentation, Performance, Accessibility, Clean Architecture.
**Never optimize for speed at the expense of architecture.**

## Product Philosophy
The experience should feel like Apple + Nature Mills + Bliss Tree + Flipkart Grocery.
Meaning: Premium, Clean, Fast, Trustworthy, Easy to browse.
Not: Cluttered, Generic, Template-like.

## Development Workflow
User Request -> Understand Requirement -> Read Documentation -> Identify Module -> Understand Existing Code -> Plan -> Implement -> Test -> Update Documentation -> Commit
**Never skip documentation.**

## Architecture Rules
- Never bypass Medusa. Business logic belongs inside Medusa.
- Frontend should consume APIs. Never duplicate business logic.
- Always extend existing modules before creating new ones.

## Component Rules
Components must be Reusable, Composable, Small, Single Responsibility.
Avoid gigantic components. Split by responsibility (e.g., `HeroImage`, `HeroContent` instead of a 1200-line `Hero.tsx`).

## Folder Rules
- `features/` or `modules/`: Every feature belongs here.
- `components/`: Shared UI components.
- `services/`: API calls.
- `hooks/`: Custom hooks.

## UI & Styling Rules
- **Apple Inspired**: Large whitespace, Minimal clutter, Strong typography, Soft shadows, Subtle animations, Premium imagery.
- Use Tailwind. Avoid inline styles or raw CSS files.
- **Animations**: Use Framer Motion (200ms–400ms). Animations should support usability, not just decoration.

## State Management
- Global: Zustand
- Server State: TanStack Query
- Forms & Validation: React Hook Form & Zod
**Never store server state in Zustand.**

## Backend Rules
- Commerce logic, Authentication, Payments -> Medusa
- UI logic -> Next.js
**Never recreate features Medusa already provides.**

## Error Handling & Security
- Never swallow errors; provide user-friendly messages. Do not expose stack traces.
- Validate everything. Escape user input. Never expose secrets or log sensitive data.

## Definition of Done
A task is complete only if:
✔ Feature works
✔ No TypeScript/Lint errors
✔ Responsive & Accessible
✔ Documentation updated
✔ Tested (Happy path, Edge cases)
✔ No duplicated code

## AI Behaviour Rules
- Always explain architectural changes.
- Never generate placeholder implementations without stating they are placeholders.
- Never invent APIs or assume data exists. Ask questions if ambiguous.
- Keep changes minimal and never rewrite unrelated files.
- The module documentation (`MODULE.md`, `LESSONS.md`, `TODO.md`) is considered the source of truth. Treat it with the same importance as source code.
