import { useEffect, useState } from "react";
import {
  getLowStockProducts,
  getTodaySalesCount,
  getTodaySalesTotal,
  type LowStockProduct,
} from "../../db";

type DashboardPageProps = {
  dbReady: boolean;
  dbError: string | null;
};

const moneyFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

export function DashboardPage({ dbReady, dbError }: DashboardPageProps) {
  const [todaySalesTotal, setTodaySalesTotal] = useState<number>(0);
  const [todaySalesCount, setTodaySalesCount] = useState<number>(0);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      if (!dbReady || dbError) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [salesTotal, salesCount, lowStock] = await Promise.all([
          getTodaySalesTotal(),
          getTodaySalesCount(),
          getLowStockProducts(),
        ]);

        if (mounted) {
          setTodaySalesTotal(salesTotal);
          setTodaySalesCount(salesCount);
          setLowStockProducts(lowStock);
        }
      } catch (loadError) {
        if (mounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load dashboard data.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      mounted = false;
    };
  }, [dbError, dbReady]);

  return (
    <section className="page">
      <h1>Dashboard</h1>
      <p>Günlük özet.</p>

      {!dbReady && !dbError && <p className="status">Yerel veritabanı hazırlanıyor...</p>}
      {dbError && <p className="status error">Veritabanı hatası: {dbError}</p>}
      {loading && dbReady && !dbError && <p className="status">Dashboard yükleniyor...</p>}
      {error && <p className="status error">{error}</p>}

      {dbReady && !dbError && !loading && !error && (
        <>
          <div className="dashboard-cards" aria-label="Dashboard günlük özet kartları">
            <article className="summary-card">
              <h2>Bugünkü Toplam Satış</h2>
              <p>{moneyFormatter.format(todaySalesTotal)}</p>
            </article>

            <article className="summary-card">
              <h2>Bugünkü Satış Sayısı</h2>
              <p>{todaySalesCount}</p>
            </article>
          </div>

          <h2>Düşük Stok Ürünleri</h2>
          {lowStockProducts.length === 0 ? (
            <p>Düşük stokta ürün yok.</p>
          ) : (
            <div className="card" style={{ marginTop: "0.75rem" }}>
              <table>
                <thead>
                  <tr>
                    <th>Ürün Adı</th>
                    <th>Kalan Stok</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockProducts.map((product) => (
                    <tr key={product.id}>
                      <td>{product.name}</td>
                      <td>{product.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
