import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  createSale,
  Customer,
  getCustomers,
  getSaleItems,
  getSales,
  PaymentType,
  Sale,
  SaleItem,
} from "../../db";

type SalesPageProps = {
  dbReady: boolean;
  dbError: string | null;
};

type SalesFormState = {
  customerId: string;
  itemName: string;
  quantity: string;
  unitPrice: string;
  paymentType: PaymentType;
  note: string;
};

const initialFormState: SalesFormState = {
  customerId: "",
  itemName: "",
  quantity: "",
  unitPrice: "",
  paymentType: "cash",
  note: "",
};

function formatAmount(value: number): string {
  return value.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
}

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("tr-TR");
}

function formatPaymentType(value: PaymentType): string {
  if (value === "cash") return "Nakit";
  if (value === "card") return "Kart";
  return "Veresiye";
}

export function SalesPage({ dbReady, dbError }: SalesPageProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [formState, setFormState] = useState<SalesFormState>(initialFormState);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const [selectedSaleItem, setSelectedSaleItem] = useState<SaleItem | null>(null);
  const selectedSale = sales.find((sale) => sale.id === selectedSaleId) ?? null;

  const total = useMemo(() => {
    const quantity = Number(formState.quantity);
    const unitPrice = Number(formState.unitPrice);
    if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return 0;
    if (quantity <= 0 || unitPrice <= 0) return 0;
    return quantity * unitPrice;
  }, [formState.quantity, formState.unitPrice]);

  const refreshSales = useCallback(async () => {
    const saleRows = await getSales();
    setSales(saleRows);
    setSelectedSaleId((previous) =>
      previous && saleRows.some((sale) => sale.id === previous)
        ? previous
        : saleRows[0]?.id ?? null,
    );
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const customerRows = await getCustomers();
      setCustomers(customerRows);
      await refreshSales();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Satış verileri yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!dbReady || dbError) return;
    void loadData();
  }, [dbReady, dbError, loadData]);

  useEffect(() => {
    if (!selectedSaleId) {
      setSelectedSaleItem(null);
      return;
    }

    void getSaleItems(selectedSaleId)
      .then((items) => setSelectedSaleItem(items[0] ?? null))
      .catch(() => setSelectedSaleItem(null));
  }, [selectedSaleId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const quantity = Number(formState.quantity);
    const unitPrice = Number(formState.unitPrice);

    if (!formState.itemName.trim()) {
      setErrorMessage("Ürün/Hizmet adı zorunludur.");
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setErrorMessage("Miktar 0'dan büyük olmalıdır.");
      return;
    }

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      setErrorMessage("Birim fiyat 0'dan büyük olmalıdır.");
      return;
    }

    if (formState.paymentType === "credit" && !formState.customerId) {
      setErrorMessage("Veresiye satış için müşteri seçimi zorunludur.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await createSale({
        customerId: formState.customerId ? Number(formState.customerId) : undefined,
        paymentType: formState.paymentType,
        note: formState.note.trim() || undefined,
        itemName: formState.itemName,
        quantity,
        unitPrice,
      });

      setFormState(initialFormState);
      await refreshSales();
      setSuccessMessage("Satış başarıyla kaydedildi.");
    } catch (error) {
      setSuccessMessage(null);
      setErrorMessage(error instanceof Error ? error.message : "Satış kaydedilemedi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="page">
      <h1>Satış Fişi</h1>
      <p className="status warning">Bu fiş resmi mali belge değildir.</p>

      {dbError && <p className="status error">Veritabanı hatası: {dbError}</p>}
      {!dbError && !dbReady && <p className="status">Veritabanı hazırlanıyor…</p>}

      <form className="customer-form" onSubmit={handleSubmit}>
        <label>
          Müşteri (Opsiyonel)
          <select
            value={formState.customerId}
            onChange={(event) =>
              setFormState((previous) => ({ ...previous, customerId: event.target.value }))
            }
            disabled={!dbReady || !!dbError || isSubmitting}
          >
            <option value="">Müşteri seçilmedi</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Ürün/Hizmet Adı *
          <input
            type="text"
            value={formState.itemName}
            onChange={(event) =>
              setFormState((previous) => ({ ...previous, itemName: event.target.value }))
            }
            disabled={!dbReady || !!dbError || isSubmitting}
          />
        </label>

        <label>
          Miktar *
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={formState.quantity}
            onChange={(event) =>
              setFormState((previous) => ({ ...previous, quantity: event.target.value }))
            }
            disabled={!dbReady || !!dbError || isSubmitting}
          />
        </label>

        <label>
          Birim Fiyat *
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={formState.unitPrice}
            onChange={(event) =>
              setFormState((previous) => ({ ...previous, unitPrice: event.target.value }))
            }
            disabled={!dbReady || !!dbError || isSubmitting}
          />
        </label>

        <label>
          Ödeme Tipi *
          <select
            value={formState.paymentType}
            onChange={(event) =>
              setFormState((previous) => ({
                ...previous,
                paymentType: event.target.value as PaymentType,
              }))
            }
            disabled={!dbReady || !!dbError || isSubmitting}
          >
            <option value="cash">Nakit</option>
            <option value="card">Kart</option>
            <option value="credit">Veresiye</option>
          </select>
        </label>

        <label>
          Not
          <textarea
            rows={3}
            value={formState.note}
            onChange={(event) =>
              setFormState((previous) => ({ ...previous, note: event.target.value }))
            }
            disabled={!dbReady || !!dbError || isSubmitting}
          />
        </label>

        <p className="ledger-balance">Toplam: <strong>{formatAmount(total)}</strong></p>

        <button type="submit" disabled={!dbReady || !!dbError || isSubmitting}>
          {isSubmitting ? "Kaydediliyor..." : "Satış Oluştur"}
        </button>
      </form>

      {errorMessage && <p className="status error">{errorMessage}</p>}
      {successMessage && <p className="status">{successMessage}</p>}
      {isLoading && <p className="status">Satış verileri hazırlanıyor…</p>}

      {!isLoading && sales.length === 0 && dbReady && !dbError && (
        <p className="status">Henüz satış yok. İlk satış kaydını oluşturun.</p>
      )}

      {sales.length > 0 && (
        <div className="table-wrap">
          <table className="customers-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Müşteri</th>
                <th>Ödeme Tipi</th>
                <th>Tutar</th>
                <th>Not</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr
                  key={sale.id}
                  className={sale.id === selectedSaleId ? "is-selected" : undefined}
                  onClick={() => setSelectedSaleId(sale.id)}
                >
                  <td>{formatCreatedAt(sale.created_at)}</td>
                  <td>{sale.customer_name ?? "-"}</td>
                  <td>{formatPaymentType(sale.payment_type)}</td>
                  <td>{formatAmount(sale.total_amount)}</td>
                  <td>{sale.note || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedSale && (
        <section className="detail-card">
          <h2>Satış Detayı</h2>
          <p><strong>Ürün/Hizmet:</strong> {selectedSaleItem?.item_name ?? "-"}</p>
          <p><strong>Miktar:</strong> {selectedSaleItem?.quantity ?? "-"}</p>
          <p><strong>Birim Fiyat:</strong> {selectedSaleItem ? formatAmount(selectedSaleItem.unit_price) : "-"}</p>
          <p><strong>Toplam:</strong> {formatAmount(selectedSale.total_amount)}</p>
          <p><strong>Ödeme Tipi:</strong> {formatPaymentType(selectedSale.payment_type)}</p>
          <p><strong>Müşteri:</strong> {selectedSale.customer_name ?? "-"}</p>
          <p><strong>Not:</strong> {selectedSale.note || "-"}</p>
          <p><strong>Tarih:</strong> {formatCreatedAt(selectedSale.created_at)}</p>
        </section>
      )}
    </section>
  );
}
