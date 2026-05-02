# CLAUDE.md – EsnafOS AI Guide

## Source of Truth
Always follow `AGENT.md` for full project rules and structure.

This file is a focused guide for fast and correct decision-making.

---

## Project Context

EsnafOS is a **minimal offline-first desktop POS system**.

Stack:
- Frontend: React + TypeScript
- Backend: Tauri (Rust)
- Database: SQLite

Target:
Small business owners (esnaf) who need simple and fast sales tracking.

---

## Core Philosophy

- Simplicity over complexity
- Working features over perfect architecture
- Small, safe changes over large risky refactors

---

## Development Priorities (STRICT ORDER)

1. Sales (receipt creation and display)
2. Cash (kasa system)
3. Sales history
4. Inventory (basic)

If a task does not directly improve these, question it.

---

## Critical Flow (DO NOT BREAK)

Sale flow must always be:

createSale → save to SQLite → update UI immediately

If UI does not reflect DB instantly, it is a bug.

---

## Strict Rules

- Do NOT change database schema unless explicitly instructed
- Do NOT modify build workflows unless asked
- Do NOT refactor unrelated code
- Do NOT introduce new architecture
- Do NOT add unnecessary dependencies

---

## UI Rules

- Keep UI minimal and functional
- Do not redesign existing layouts
- Only fix behavior or small UX improvements

---

## PR Discipline

- One purpose per PR
- Keep changes small
- Avoid mixing fixes and features
- Clearly describe what changed

---

## What NOT to Do

Avoid:

- Cloud features
- Authentication systems
- Multi-device sync
- Complex state management rewrites
- Over-engineered abstractions

---

## Preferred Approach

When solving problems:

1. Check existing structure
2. Apply the smallest possible fix
3. Avoid touching unrelated files
4. Keep logic simple and readable

---

## Decision Heuristics

If unsure:

- Choose the simpler solution
- Choose the safer change
- Choose the smaller scope

---

## Expected Quality

- Features must work immediately (no refresh needed)
- Data must persist correctly
- App must remain stable and fast

---

## Summary

This project values:
- Speed
- Simplicity
- Stability

Over:
- Perfection
- Complexity
- Scalability (for now)
