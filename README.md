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
- SQLite (local, offline)
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

Database foundation is now included; business logic and UI wiring are still in progress.

## License

AGPL-3.0


## Database (SQLite, local-only)

The app now includes a lightweight SQLite database layer under `src/db/`.

- Uses local SQLite file: `sqlite:esnafos.db`
- No cloud database
- Works offline

### Initialize the database

Call `initializeDatabase()` once during app startup (before using customer/transaction queries).

```ts
import { initializeDatabase } from "./db";

await initializeDatabase();
```

### Available database functions

- `createCustomer`
- `getCustomers`
- `addTransaction`
- `getTransactionsByCustomer`

The schema includes:

- `customers`
- `transactions`

with a foreign key from `transactions.customer_id` to `customers.id`.

## Yedekleme ve Geri Yükleme

Ayarlar sayfasında **Yedek Al** ve **Yedek Yükle** butonları bulunur.

- Yedek Al: Yerel SQLite veritabanını `.db` / `.sqlite` dosyası olarak dışa aktarır.
- Yedek Yükle: Seçilen yedeği onay sonrası mevcut veritabanının yerine koyar ve uygulamayı yeniler.

