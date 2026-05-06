import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import "./App.css";
import { getLowStockProducts, initializeDatabase } from "./db";
import { CustomersPage } from "./pages/customers/CustomersPage";
import { CashPage } from "./pages/cash/CashPage";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { InventoryPage } from "./pages/inventory/InventoryPage";
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
  { key: "customers", label: "Müşteriler" },
  { key: "ledger", label: "Veresiye" },
  { key: "sales", label: "Satış" },
  { key: "sales-history", label: "Satış Geçmişi" },
  { key: "cash", label: "Kasa" },
  { key: "orders", label: "Siparişler" },
  { key: "inventory", label: "Stok" },
  { key: "settings", label: "Ayarlar" },
];

const ONBOARDING_KEY = "esnafos_onboarding_done";

export default function App() {
  const [activePage, setActivePage] = useState<string>("dashboard");
  const [dbReady, setDbReady] = useState<boolean>(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [showLowStockWarning, setShowLowStockWarning] = useState(false);
  const [lowStockWarningShown, setLowStockWarningShown] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [refreshOnboardingFlag, setRefreshOnboardingFlag] = useState(0);

  useEffect(() => {
    const isDone = localStorage.getItem(ONBOARDING_KEY) === "1";
    setShowOnboarding(!isDone);
  }, [refreshOnboardingFlag]);

  useEffect(() => {
    const storedTheme = localStorage.getItem("esnafos_theme") ?? "light";
    const storedAccent = localStorage.getItem("esnafos_accent") ?? "#4f46e5";
    document.body.dataset.theme = storedTheme;
    document.body.style.setProperty("--accent-color", storedAccent);
  }, []);

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
              : "Veritabanı başlatılamadı.",
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
        return (
          <SettingsPage
            onRestartOnboarding={() => {
              localStorage.removeItem(ONBOARDING_KEY);
              setRefreshOnboardingFlag((prev) => prev + 1);
            }}
          />
        );
      case "dashboard":
      default:
        return <DashboardPage dbReady={dbReady} dbError={dbError} />;
    }
  }, [activePage, dbError, dbReady]);

  const finishOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, "1");
    setActivePage("dashboard");
    setShowOnboarding(false);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar glass-card">
        <div className="brand">
          <h2>EsnafOS</h2>
          <p>Hızlı ve sade masaüstü satış yönetimi</p>
        </div>

        <nav className="nav-list" aria-label="Ana gezinme">
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
        {showOnboarding ? (
          <Onboarding onFinish={finishOnboarding} />
        ) : (
          <>
            {showLowStockWarning && <p className="status warning">Düşük stokta ürünler var</p>}
            <AnimatePresence mode="wait">
              <motion.div
                key={activePage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {pageContent}
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </main>
    </div>
  );
}

function Onboarding({ onFinish }: { onFinish: () => void }) {
  const steps = [
    {
      title: "Hoş geldiniz",
      text: "EsnafOS ile satış ve günlük işlemlerinizi tek ekrandan kolayca takip edin.",
    },
    {
      title: "Satış, stok ve kasa",
      text: "Satış kaydı oluşturun, stok durumunu görün ve kasadaki hareketleri pratik şekilde yönetin.",
    },
    {
      title: "Başla",
      text: "Hazırsanız Genel Bakış ekranına geçip işletmenizi yönetmeye başlayabilirsiniz.",
    },
  ];
  const [step, setStep] = useState(0);
  const isLastStep = step === steps.length - 1;

  return (
    <section className="page glass-card onboarding-page">
      <p className="onboarding-step">Adım {step + 1} / {steps.length}</p>
      <h1>{steps[step].title}</h1>
      <p>{steps[step].text}</p>

      <div className="onboarding-actions">
        {step > 0 && (
          <button type="button" className="secondary" onClick={() => setStep((prev) => prev - 1)}>
            Geri
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            if (isLastStep) {
              onFinish();
              return;
            }
            setStep((prev) => prev + 1);
          }}
        >
          {isLastStep ? "Genel Bakış'a Geç" : "Devam"}
        </button>
      </div>
    </section>
  );
}
