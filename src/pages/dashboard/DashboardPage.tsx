import { useEffect, useMemo, useState } from "react";
import { getDashboardSummary } from "../../db";

type DashboardPageProps = {
  dbReady: boolean;
  dbError: string | null;
};

type Summary = {
  totalCustomers: number;
  totalDebt: number;
  totalPayment: number;
};

const initialSummary: Summary = {
  totalCustomers: 0,
  totalDebt: 0,
  totalPayment: 0,
};

const moneyFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

export function DashboardPage({ dbReady, dbError }: DashboardPageProps) {
  const [summary, setSummary] = useState<Summary>(initialSummary);
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
        const dashboardSummary = await getDashboardSummary();

        if (mounted) {
          setSummary(dashboardSummary);
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
    </section>
  );
}
