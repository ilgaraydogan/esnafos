import { useCallback, useEffect, useState } from "react";
import { getAllSales, getSaleById, SaleHistoryItem } from "../../db";

type SalesHistoryPageProps = {
  dbReady: boolean;
  dbError: string | null;
};

function formatAmount(value: number): string {
  return value.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
}

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("tr-TR");
}

export function SalesHistoryPage({ dbReady, dbError }: SalesHistoryPageProps) {
  const [sales, setSales] = useState<SaleHistoryItem[]>([]);
  const [selectedSale, setSelectedSale] = useState<SaleHistoryItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshSales = useCallback(async () => {
    const rows = await getAllSales();
    setSales(rows);
    setSelectedSale((previous) => {
      if (!rows.length) return null;
      if (!previous) return rows[0];
      return rows.find((row) => row.id === previous.id) ?? rows[0];
    });
  }, []);

  const loadSales = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await refreshSales();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Satış geçmişi yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }, [refreshSales]);

  useEffect(() => {
    if (!dbReady || dbError) return;
    void loadSales();
  }, [dbReady, dbError, loadSales]);

  useEffect(() => {
    const onSalesUpdated = () => {
      if (dbReady && !dbError) {
        void refreshSales();
      }
    };

    window.addEventListener("sales:updated", onSalesUpdated);
    return () => window.removeEventListener("sales:updated", onSalesUpdated);
  }, [dbError, dbReady, refreshSales]);

  const handleSelect = async (id: number) => {
    try {
      const sale = await getSaleById(id);
      setSelectedSale(sale);
    } catch {
      setSelectedSale(null);
    }
  };

  return (
    <section className="page">
      <h1>Satış Geçmişi</h1>
      {dbError && <p className="status error">Veritabanı hatası: {dbError}</p>}
      {!dbError && !dbReady && <p className="status">Veritabanı hazırlanıyor…</p>}
      {errorMessage && <p className="status error">{errorMessage}</p>}
      {isLoading && <p className="status">Satış geçmişi hazırlanıyor…</p>}

      {!isLoading && sales.length === 0 && dbReady && !dbError && (
        <p className="status">Henüz satış geçmişi yok.</p>
      )}

      {sales.length > 0 && (
        <div className="table-wrap">
          <table className="customers-table">
            <thead>
              <tr>
                <th>Ürün</th>
                <th>Miktar</th>
                <th>Toplam</th>
                <th>Tarih</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} onClick={() => void handleSelect(sale.id)}>
                  <td>{sale.product_name}</td>
                  <td>{sale.quantity}</td>
                  <td>{formatAmount(sale.total)}</td>
                  <td>{formatCreatedAt(sale.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedSale && (
        <section className="detail-card">
          <h2>Fiş Detayı</h2>
          <p><strong>Ürün:</strong> {selectedSale.product_name}</p>
          <p><strong>Miktar:</strong> {selectedSale.quantity}</p>
          <p><strong>Birim Fiyat:</strong> {formatAmount(selectedSale.unit_price)}</p>
          <p><strong>Toplam:</strong> {formatAmount(selectedSale.total)}</p>
          <p><strong>Tarih:</strong> {formatCreatedAt(selectedSale.created_at)}</p>
        </section>
      )}
    </section>
  );
}
