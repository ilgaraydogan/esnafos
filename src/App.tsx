import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { getLowStockProducts, initializeDatabase } from "./db";
import { CustomersPage } from "./pages/customers/CustomersPage";
import { CashPage } from "./pages/cash/CashPage";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { InventoryPage } from "./pages/inventory/InventoryPage";
import { LandingPage } from "./pages/landing/LandingPage";
import { LedgerPage } from "./pages/ledger/LedgerPage";
import { OrdersPage } from "./pages/orders/OrdersPage";
import { SalesPage } from "./pages/sales/SalesPage";
import { SalesHistoryPage } from "./pages/sales-history/SalesHistoryPage";
import { SettingsPage } from "./pages/settings/SettingsPage";

type NavItem = {
  key: string;
  label: string;
};

const navItems: NavItem[] = [
  { key: "dashboard", label: "Genel Bakış" },
  { key: "landing", label: "Tanıtım" },
  { key: "customers", label: "Müşteriler" },
  { key: "ledger", label: "Veresiye" },
  { key: "sales", label: "Satış" },
  { key: "sales-history", label: "Satış Geçmişi" },
  { key: "cash", label: "Kasa" },
  { key: "orders", label: "Siparişler" },
  { key: "inventory", label: "Stok" },
  { key: "settings", label: "Ayarlar" },
];

export default function App() {
  const [activePage, setActivePage] = useState<string>("dashboard");
  const [dbReady, setDbReady] = useState<boolean>(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [showLowStockWarning, setShowLowStockWarning] = useState(false);
  const [lowStockWarningShown, setLowStockWarningShown] = useState(false);

  useEffect(() => {
    let mounted = true;

    const setupDatabase = async () => {
      try {
        await initializeDatabase();

        if (mounted) {
          setDbReady(true);
          setDbError(null);
        }
      } catch (error) {
        if (mounted) {
          setDbReady(false);
          setDbError(
            error instanceof Error
              ? error.message
              : "Failed to initialize database.",
          );
        }
      }
    };

    void setupDatabase();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!dbReady || dbError || lowStockWarningShown) return;

    let mounted = true;

    const checkLowStock = async () => {
      try {
        const lowStockProducts = await getLowStockProducts(5);
        if (mounted && lowStockProducts.length > 0) {
          setShowLowStockWarning(true);
          setLowStockWarningShown(true);
        }
      } catch {
        // Keep warning silent if low-stock check fails.
      }
    };

    void checkLowStock();

    return () => {
      mounted = false;
    };
  }, [dbReady, dbError, lowStockWarningShown]);

  const pageContent = useMemo(() => {
    switch (activePage) {
      case "landing":
        return <LandingPage />;
      case "customers":
        return <CustomersPage dbReady={dbReady} dbError={dbError} />;
      case "ledger":
        return <LedgerPage dbReady={dbReady} dbError={dbError} />;
      case "sales":
        return <SalesPage dbReady={dbReady} dbError={dbError} />;
      case "cash":
        return <CashPage dbReady={dbReady} dbError={dbError} />;
      case "sales-history":
        return <SalesHistoryPage dbReady={dbReady} dbError={dbError} />;
      case "orders":
        return <OrdersPage />;
      case "inventory":
        return <InventoryPage dbReady={dbReady} dbError={dbError} />;
      case "settings":
        return <SettingsPage />;
      case "dashboard":
      default:
        return <DashboardPage dbReady={dbReady} dbError={dbError} />;
    }
  }, [activePage, dbError, dbReady]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <h2>EsnafOS</h2>
          <p>Offline-first desktop app</p>
        </div>

        <nav className="nav-list" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive = item.key === activePage;
            return (
              <button
                key={item.key}
                type="button"
                className={`nav-button ${isActive ? "active" : ""}`}
                onClick={() => setActivePage(item.key)}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="content">
        {showLowStockWarning && <p className="status warning">Düşük stokta ürünler var</p>}
        {pageContent}
      </main>
    </div>
  );
}
