import { useEffect, useMemo, useState } from "react";
import { getCustomers, getTransactionsByCustomer } from "../../db";

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
        const customers = await getCustomers();
        let totalDebt = 0;
        let totalPayment = 0;

        for (const customer of customers) {
          const transactions = await getTransactionsByCustomer(customer.id);

          for (const transaction of transactions) {
            if (transaction.type === "debt") {
              totalDebt += transaction.amount;
            } else {
              totalPayment += transaction.amount;
            }
          }
        }

        if (mounted) {
          setSummary({
            totalCustomers: customers.length,
            totalDebt,
            totalPayment,
          });
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
      <h1>Dashboard</h1>
      <p>Business summary from local SQLite data.</p>

      {!dbReady && !dbError && <p className="status">Preparing local database...</p>}
      {dbError && <p className="status error">Database error: {dbError}</p>}
      {loading && dbReady && !dbError && <p className="status">Loading summary...</p>}
      {error && <p className="status error">{error}</p>}

      {dbReady && !dbError && !loading && !error && (
        <div className="dashboard-cards" aria-label="Dashboard summary cards">
          <article className="summary-card">
            <h2>Total Customers</h2>
            <p>{summary.totalCustomers}</p>
          </article>

          <article className="summary-card">
            <h2>Total Debt</h2>
            <p>{moneyFormatter.format(summary.totalDebt)}</p>
          </article>

          <article className="summary-card">
            <h2>Total Payment</h2>
            <p>{moneyFormatter.format(summary.totalPayment)}</p>
          </article>

          <article className="summary-card">
            <h2>Net Receivable</h2>
            <p>{moneyFormatter.format(netReceivable)}</p>
          </article>
        </div>
      )}
    </section>
  );
}
