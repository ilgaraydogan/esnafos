import { useEffect, useMemo, useState } from "react";
import { getCashSummary, getDashboardSummary } from "../../db";

type DashboardPageProps = {
  dbReady: boolean;
  dbError: string | null;
};

type Summary = {
  totalCustomers: number;
  totalDebt: number;
  totalPayment: number;
};

type CashSummary = {
  todayCashTotal: number;
  todayCardTotal: number;
  todayCreditTotal: number;
  todayTotalSales: number;
};

const initialSummary: Summary = {
  totalCustomers: 0,
  totalDebt: 0,
  totalPayment: 0,
};

const initialCashSummary: CashSummary = {
  todayCashTotal: 0,
  todayCardTotal: 0,
  todayCreditTotal: 0,
  todayTotalSales: 0,
};

const moneyFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

export function DashboardPage({ dbReady, dbError }: DashboardPageProps) {
  const [summary, setSummary] = useState<Summary>(initialSummary);
  const [cashSummary, setCashSummary] = useState<CashSummary>(initialCashSummary);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadSummary = async () => {
      if (!dbReady || dbError) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [dashboardSummary, todayCashSummary] = await Promise.all([
          getDashboardSummary(),
          getCashSummary(),
        ]);

        if (mounted) {
          setSummary(dashboardSummary);
          setCashSummary(todayCashSummary);
        }
      } catch (loadError) {
        if (mounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load dashboard summary.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadSummary();

    return () => {
      mounted = false;
    };
  }, [dbError, dbReady]);

  const netReceivable = useMemo(
    () => summary.totalDebt - summary.totalPayment,
    [summary.totalDebt, summary.totalPayment],
  );

  return (
    <section className="page">
      <h1>Genel Bakış</h1>
      <p>Yerel verilerden işletme özeti.</p>

      {!dbReady && !dbError && <p className="status">Yerel veritabanı hazırlanıyor...</p>}
      {dbError && <p className="status error">Veritabanı hatası: {dbError}</p>}
      {loading && dbReady && !dbError && <p className="status">Özet yükleniyor...</p>}
      {error && <p className="status error">{error}</p>}

      {dbReady && !dbError && !loading && !error && (
        <div className="dashboard-cards" aria-label="Genel Bakış summary cards">
          <article className="summary-card">
            <h2>Toplam Müşteri</h2>
            <p>{summary.totalCustomers}</p>
          </article>

          <article className="summary-card">
            <h2>Toplam Borç</h2>
            <p>{moneyFormatter.format(summary.totalDebt)}</p>
          </article>

          <article className="summary-card">
            <h2>Toplam Ödeme</h2>
            <p>{moneyFormatter.format(summary.totalPayment)}</p>
          </article>

          <article className="summary-card">
            <h2>Net Alacak</h2>
            <p>{moneyFormatter.format(netReceivable)}</p>
          </article>
        </div>
      )}

      {dbReady && !dbError && !loading && !error && (
        <>
          <h2>Bugünkü Kasa Özeti</h2>
          <div className="dashboard-cards" aria-label="Kasa özeti kartları">
            <article className="summary-card">
              <h2>Nakit</h2>
              <p>{moneyFormatter.format(cashSummary.todayCashTotal)}</p>
            </article>
            <article className="summary-card">
              <h2>Kart</h2>
              <p>{moneyFormatter.format(cashSummary.todayCardTotal)}</p>
            </article>
            <article className="summary-card">
              <h2>Veresiye</h2>
              <p>{moneyFormatter.format(cashSummary.todayCreditTotal)}</p>
            </article>
            <article className="summary-card">
              <h2>Toplam Satış</h2>
              <p>{moneyFormatter.format(cashSummary.todayTotalSales)}</p>
            </article>
          </div>
        </>
      )}
    </section>
  );
}
