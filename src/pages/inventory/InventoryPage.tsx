import { FormEvent, useCallback, useEffect, useState } from "react";
import { createProduct, getProducts, Product } from "../../db";

type InventoryPageProps = {
  dbReady: boolean;
  dbError: string | null;
};

type ProductFormState = {
  name: string;
  sku: string;
  stockQuantity: string;
  lowStockThreshold: string;
  unitPrice: string;
};

const initialFormState: ProductFormState = {
  name: "",
  sku: "",
  stockQuantity: "0",
  lowStockThreshold: "5",
  unitPrice: "",
};

function formatMoney(value: number | null): string {
  if (value == null) return "-";
  return value.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
}

export function InventoryPage({ dbReady, dbError }: InventoryPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [formState, setFormState] = useState<ProductFormState>(initialFormState);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      setProducts(await getProducts());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Ürünler yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!dbReady || dbError) return;
    void loadProducts();
  }, [dbReady, dbError, loadProducts]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const stockQuantity = Number(formState.stockQuantity);
    const lowStockThreshold = Number(formState.lowStockThreshold);
    const unitPrice = formState.unitPrice.trim() ? Number(formState.unitPrice) : undefined;

    if (!formState.name.trim()) {
      setErrorMessage("Ürün adı zorunludur.");
      return;
    }

    if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
      setErrorMessage("Stok adedi 0 veya daha büyük olmalıdır.");
      return;
    }

    if (!Number.isFinite(lowStockThreshold) || lowStockThreshold < 0) {
      setErrorMessage("Kritik stok eşiği 0 veya daha büyük olmalıdır.");
      return;
    }

    if (unitPrice != null && (!Number.isFinite(unitPrice) || unitPrice < 0)) {
      setErrorMessage("Birim fiyat 0 veya daha büyük olmalıdır.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createProduct({
        name: formState.name,
        sku: formState.sku.trim() || undefined,
        stockQuantity,
        lowStockThreshold,
        unitPrice,
      });

      setFormState(initialFormState);
      await loadProducts();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Ürün kaydedilemedi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="page">
      <h1>Stok Yönetimi</h1>
      <p>Ürünlerinizi ekleyin ve düşük stokları takip edin.</p>

      {dbError && <p className="status error">Veritabanı hatası: {dbError}</p>}
      {!dbError && !dbReady && <p className="status">Veritabanı hazırlanıyor…</p>}

      <form className="customer-form" onSubmit={handleSubmit}>
        <label>
          Ürün Adı *
          <input
            type="text"
            value={formState.name}
            onChange={(event) =>
              setFormState((previous) => ({ ...previous, name: event.target.value }))
            }
            disabled={!dbReady || !!dbError || isSubmitting}
          />
        </label>

        <label>
          SKU
          <input
            type="text"
            value={formState.sku}
            onChange={(event) =>
              setFormState((previous) => ({ ...previous, sku: event.target.value }))
            }
            disabled={!dbReady || !!dbError || isSubmitting}
          />
        </label>

        <label>
          Stok Adedi *
          <input
            type="number"
            min="0"
            step="1"
            value={formState.stockQuantity}
            onChange={(event) =>
              setFormState((previous) => ({ ...previous, stockQuantity: event.target.value }))
            }
            disabled={!dbReady || !!dbError || isSubmitting}
          />
        </label>

        <label>
          Kritik Stok Eşiği *
          <input
            type="number"
            min="0"
            step="1"
            value={formState.lowStockThreshold}
            onChange={(event) =>
              setFormState((previous) => ({ ...previous, lowStockThreshold: event.target.value }))
            }
            disabled={!dbReady || !!dbError || isSubmitting}
          />
        </label>

        <label>
          Birim Fiyat (₺)
          <input
            type="number"
            min="0"
            step="0.01"
            value={formState.unitPrice}
            onChange={(event) =>
              setFormState((previous) => ({ ...previous, unitPrice: event.target.value }))
            }
            disabled={!dbReady || !!dbError || isSubmitting}
          />
        </label>

        <button type="submit" disabled={!dbReady || !!dbError || isSubmitting}>
          {isSubmitting ? "Kaydediliyor..." : "Ürün Ekle"}
        </button>
      </form>

      {errorMessage && <p className="status error">{errorMessage}</p>}
      {isLoading && <p className="status">Ürünler yükleniyor…</p>}

      {products.length > 0 && (
        <div className="table-wrap">
          <table className="customers-table">
            <thead>
              <tr>
                <th>Ürün</th>
                <th>SKU</th>
                <th>Stok</th>
                <th>Kritik Eşik</th>
                <th>Birim Fiyat</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const isLowStock = product.stock_quantity <= product.low_stock_threshold;
                return (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.sku ?? "-"}</td>
                    <td>{product.stock_quantity}</td>
                    <td>{product.low_stock_threshold}</td>
                    <td>{formatMoney(product.unit_price)}</td>
                    <td>{isLowStock ? "⚠️ Kritik Stok" : "Normal"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
