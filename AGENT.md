# AGENTS.md

# Mithra Whole Foods AI Development System

Version: 1.0

---

# Purpose

This repository is developed using AI-assisted software engineering.

Every coding agent working on this repository MUST follow this document before making any changes.

This document defines:

- Development workflow
- Coding standards
- Documentation requirements
- Architecture principles
- Communication rules
- Definition of Done

No task is considered complete unless the documentation has also been updated.

---

# Project Overview

Project Name

Mithra Whole Foods

Type

Premium Grocery & Traditional Foods E-commerce Platform

Primary Stack

Frontend
- Next.js 15
- React
- TypeScript
- TailwindCSS
- shadcn/ui

Backend

- Medusa.js v2

Database

- PostgreSQL

Cache

- Redis

Storage

- Cloudinary

Payments

- Razorpay
- Stripe

Deployment

- Vercel
- Railway

---

# Project Philosophy

This project values

✔ Maintainability

✔ Scalability

✔ Reusability

✔ Simplicity

✔ Documentation

✔ Performance

✔ Accessibility

✔ Clean Architecture

Never optimize for speed at the expense of architecture.

---

# Product Philosophy

The experience should feel like

Apple
+
Nature Mills
+
Bliss Tree
+
Flipkart Grocery

Meaning

- Premium
- Clean
- Fast
- Trustworthy
- Easy to browse

Not

- Cluttered
- Generic
- Template-like

---

# Before Starting Any Task

Read these files in order

1.
PROJECT.md

2.
ARCHITECTURE.md

3.
AI_CONTEXT.md

4.
ROADMAP.md

5.
TECH_STACK.md

Then

Locate the module being edited.

Read

modules/<module>/MODULE.md

Then

Read

modules/<module>/TODO.md

Then

Read

modules/<module>/BUGS.md

Then

Read

modules/<module>/DECISIONS.md

Only after understanding the module should implementation begin.

---

# Development Workflow

Every task follows

User Request

↓

Understand Requirement

↓

Read Documentation

↓

Identify Module

↓

Understand Existing Code

↓

Plan

↓

Implement

↓

Test

↓

Update Documentation

↓

Commit

Never skip documentation.

---

# Architecture Rules

Never bypass Medusa.

Business logic belongs inside Medusa.

Frontend should consume APIs.

Never duplicate business logic.

Never create multiple implementations of the same feature.

Always extend existing modules before creating new ones.

---

# Component Rules

Components must be

Reusable

Composable

Small

Single Responsibility

Avoid gigantic components.

Split by responsibility.

Example

Hero

HeroImage

HeroContent

HeroCTA

instead of

Hero.tsx with 1200 lines.

---

# Folder Rules

Never create random folders.

Every feature belongs inside

features/

or

modules/

Every component belongs inside

components/

Every API belongs inside

services/

Every hook belongs inside

hooks/

---

# Naming Convention

Components

PascalCase

ProductCard.tsx

Hooks

camelCase

useCart.ts

Utilities

camelCase

formatPrice.ts

Constants

UPPER_CASE

API Keys

Never commit.

Always use environment variables.

---

# UI Rules

Apple Inspired

Meaning

Large whitespace

Minimal clutter

Strong typography

Soft shadows

Subtle animations

Premium imagery

Do NOT copy Apple.

Follow the design principles.

---

# Styling Rules

Use Tailwind.

Avoid inline styles.

Avoid CSS files unless necessary.

Prefer utility classes.

Shared styles belong inside

globals.css

or

design tokens.

---

# Animation Rules

Use

Framer Motion

Animation duration

200ms–400ms

Never animate everything.

Animations should support usability.

Not decoration.

---

# State Management

Global

Zustand

Server State

TanStack Query

Forms

React Hook Form

Validation

Zod

Never store server state in Zustand.

---

# Backend Rules

Commerce logic

↓

Medusa

UI logic

↓

Next.js

Authentication

↓

Medusa Auth

Payments

↓

Medusa Providers

Never recreate features Medusa already provides.

---

# Database Rules

Never write raw SQL unless necessary.

Prefer Medusa services.

Keep migrations reversible.

Never modify production data manually.

---

# Search Rules

Use Medusa Search initially.

Upgrade to Typesense later.

Search should support

Products

Categories

Collections

Autocomplete

---

# Performance Rules

Server Components first.

Client Components only when needed.

Lazy load

Heavy images

Carousels

Charts

Editors

Always optimize images.

Never load unnecessary JS.

---

# Accessibility

Every page should support

Keyboard navigation

Screen readers

ARIA labels

Focus states

Contrast ratio

Accessibility is not optional.

---

# Security

Never expose secrets.

Never trust frontend validation.

Validate everything.

Escape user input.

Use HTTPS.

Never log sensitive data.

---

# Error Handling

Never swallow errors.

Always log meaningful messages.

Provide user-friendly messages.

Do not expose stack traces.

---

# Testing

Every feature should include

Happy path

Edge cases

Error handling

Regression checks

---

# Documentation Rules

Every completed task MUST update

MODULE.md

TODO.md

CHANGELOG.md

AI_CONTEXT.md

Additionally

If architecture changed

↓

DECISIONS.md

If bug fixed

↓

BUGS.md

If something important was learned

↓

LESSONS.md

Documentation is mandatory.

---

# Commit Rules

Commit messages

feat:

fix:

refactor:

docs:

style:

perf:

test:

chore:

Examples

feat(cart): add persistent guest cart

fix(products): resolve image loading issue

---

# Definition of Done

A task is complete only if

✔ Feature works

✔ No TypeScript errors

✔ No lint errors

✔ Responsive

✔ Accessible

✔ Documentation updated

✔ Tested

✔ No duplicated code

---

# AI Behaviour Rules

Always explain architectural changes.

Never generate placeholder implementations without stating they are placeholders.

Never invent APIs.

Never assume data exists.

Ask questions if requirements are ambiguous.

Prefer reading over guessing.

Never rewrite unrelated files.

Keep changes minimal.

---

# Module Memory

Every module has its own memory.

Read

MODULE.md

before editing.

Update it afterwards.

The module documentation is considered the source of truth.

---

# Lessons

Whenever a mistake is discovered

Record it.

Never repeat the same mistake twice.

Update

LESSONS.md

Future agents should learn from previous work.

---

# Long-term Goal

This repository should become

Self-documenting.

A new AI agent should understand the project by reading documentation instead of scanning the entire codebase.

Documentation is part of the product.

Treat it with the same importance as source code.