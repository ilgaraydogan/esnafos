# EsnafOS

**Türkçe Özet:** EsnafOS; küçük işletmeler, esnaf, nalbur ve yerel dükkanlar için geliştirilen ücretsiz, açık kaynak ve offline-first bir masaüstü uygulamasıdır. Müşteri, veresiye/borç-alacak, ödeme, satış-sipariş fişleri, stok, günlük kasa özeti ve yerel yedek süreçlerini internet zorunluluğu olmadan yönetmeyi hedefler.

EsnafOS is a free, open-source, offline-first desktop app for local businesses such as small shops, tradesmen, and hardware stores.

The product is focused on practical day-to-day operations:

- Customer tracking
- Credit/debt ledger
- Payments
- Internal sales slips
- Internal order slips
- Stock/inventory
- Daily cash summary
- Local backup and restore

> ⚠️ Generated slips are **internal business records only** and are **not official financial documents**.

## Offline-First Principle

EsnafOS is designed to run without internet.

- No SaaS architecture
- No cloud sync
- No backend server
- No forced accounts/authentication
- Data stays on the user’s own computer

## Technology Stack

- Tauri v2
- React
- TypeScript
- SQLite (planned, not implemented yet)
- Rust (Tauri runtime)

## Development Setup

### Prerequisites

Follow official Tauri prerequisite instructions for your operating system:

- https://tauri.app/start/prerequisites/

### Run locally

```bash
npm install
npm run tauri dev
```

### Build

```bash
npm run build
npm run tauri build
```

## Current Status

This repository currently contains the initial application shell:

- Sidebar navigation
- Empty pages for core modules
- Basic frontend structure for next feature tasks

No database implementation and no business logic are included yet.

## License

AGPL-3.0
