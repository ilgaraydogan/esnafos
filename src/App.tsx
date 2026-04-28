import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { initializeDatabase } from "./db";
import { CustomersPage } from "./pages/customers/CustomersPage";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { InventoryPage } from "./pages/inventory/InventoryPage";
import { LedgerPage } from "./pages/ledger/LedgerPage";
import { OrdersPage } from "./pages/orders/OrdersPage";
import { SalesPage } from "./pages/sales/SalesPage";
import { SettingsPage } from "./pages/settings/SettingsPage";

type NavItem = {
  key: string;
  label: string;
};

const navItems: NavItem[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "customers", label: "Customers" },
  { key: "ledger", label: "Ledger" },
  { key: "sales", label: "Sales" },
  { key: "orders", label: "Orders" },
  { key: "inventory", label: "Inventory" },
  { key: "settings", label: "Settings" },
];

export default function App() {
  const [activePage, setActivePage] = useState<string>("dashboard");
  const [dbReady, setDbReady] = useState<boolean>(false);
  const [dbError, setDbError] = useState<string | null>(null);

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

  const pageContent = useMemo(() => {
    switch (activePage) {
      case "customers":
        return <CustomersPage dbReady={dbReady} dbError={dbError} />;
      case "ledger":
        return <LedgerPage dbReady={dbReady} dbError={dbError} />;
      case "sales":
        return <SalesPage dbReady={dbReady} dbError={dbError} />;
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

      <main className="content">{pageContent}</main>
    </div>
  );
}
