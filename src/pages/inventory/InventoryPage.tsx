import { FormEvent, useCallback, useEffect, useState } from "react";
import { createProduct, getProducts, Product, updateProductStock } from "../../db";

type InventoryPageProps = {
  dbReady: boolean;
  dbError: string | null;
};

type ProductFormState = {
  name: string;
  sku: string;
  stock: string;
  unitPrice: string;
};

const initialFormState: ProductFormState = {
  name: "",
  sku: "",
  stock: "0",
  unitPrice: "",
};

function formatMoney(value: number | null): string {
  if (value == null) return "-";
  return value.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
}

export function InventoryPage({ dbReady, dbError }: InventoryPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [stockInputs, setStockInputs] = useState<Record<number, string>>({});
  const [formState, setFormState] = useState<ProductFormState>(initialFormState);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextProducts = await getProducts();
      setProducts(nextProducts);
      setStockInputs(
        nextProducts.reduce<Record<number, string>>((acc, product) => {
          acc[product.id] = String(product.stock);
          return acc;
        }, {}),
      );
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

    const stock = Number(formState.stock);
    const unitPrice = formState.unitPrice.trim() ? Number(formState.unitPrice) : undefined;

    if (!formState.name.trim()) {
      setErrorMessage("Ürün adı zorunludur.");
      return;
    }

    if (!Number.isInteger(stock) || stock < 0) {
      setErrorMessage("Stok adedi 0 veya daha büyük olmalıdır.");
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
        stock,
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

  const handleStockChange = async (productId: number, value: string) => {
    const stock = Number(value);
    if (!Number.isInteger(stock) || stock < 0) return;
    try {
      await updateProductStock(productId, stock);
      await loadProducts();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Stok güncellenemedi.");
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
            value={formState.stock}
            onChange={(event) =>
              setFormState((previous) => ({ ...previous, stock: event.target.value }))
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
                <th>Stok</th>
                <th>Birim Fiyat</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                return (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={stockInputs[product.id] ?? String(product.stock)}
                        onChange={(event) =>
                          setStockInputs((previous) => ({
                            ...previous,
                            [product.id]: event.target.value,
                          }))
                        }
                        onBlur={(event) => void handleStockChange(product.id, event.target.value)}
                      />
                    </td>
                    <td>{formatMoney(product.unit_price)}</td>
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
