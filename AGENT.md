# EsnafOS – AGENT.md

## Project Overview
EsnafOS is a simple desktop POS (Point of Sale) system built with:
- Frontend: React + TypeScript
- Backend: Tauri (Rust)
- Database: SQLite

Goal:
Build a minimal, fast, offline-first POS for small businesses.

---

## Project Structure

- src/pages → frontend UI
- src-tauri → backend (Rust + database)
- src-tauri/src/lib.rs → backend logic
- src-tauri/src/main.rs → app entrypoint

---

## Core Features (Priority Order)

1. Sales (receipt creation)
2. Cash system (kasa)
3. Sales history
4. Inventory (basic)

---

## Rules for AI Agents

- Do NOT change database schema unless explicitly requested
- Do NOT modify build workflows unless requested
- Do NOT refactor unrelated files
- Keep PR scope small and focused
- One task per PR

---

## Development Principles

- Always prefer simple solutions
- Avoid over-engineering
- Do not introduce new dependencies unless necessary
- Keep UI minimal and functional

---

## Critical Flow

Sale creation must follow:

createSale → save to SQLite → refresh UI

---

## Forbidden Actions

- Do NOT add cloud features
- Do NOT add authentication
- Do NOT redesign UI
- Do NOT introduce complex architecture

---

## Expected Behavior

- After saving a sale, UI must update instantly
- Data must persist in SQLite
- App must work offline
