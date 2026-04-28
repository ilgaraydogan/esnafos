import { useMemo, useState } from "react";
import "./App.css";
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

  const pageContent = useMemo(() => {
    switch (activePage) {
      case "customers":
        return <CustomersPage />;
      case "ledger":
        return <LedgerPage />;
      case "sales":
        return <SalesPage />;
      case "orders":
        return <OrdersPage />;
      case "inventory":
        return <InventoryPage />;
      case "settings":
        return <SettingsPage />;
      case "dashboard":
      default:
        return <DashboardPage />;
    }
  }, [activePage]);

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
