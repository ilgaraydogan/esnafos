import { FormEvent, useCallback, useEffect, useState } from "react";
import { createProduct, getProducts, Product, updateProduct } from "../../db";
import { Button, Card, Input, Label } from "../../components/ui";

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

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  try {
    return JSON.stringify(error);
  } catch {
    return fallback;
  }
}

function formatMoney(value: number | null): string {
  if (value == null) return "-";
  return value.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
}

export function InventoryPage({ dbReady, dbError }: InventoryPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [productInputs, setProductInputs] = useState<
    Record<number, { name: string; sku: string; stock: string; unitPrice: string }>
  >({});
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
      setProductInputs(
        nextProducts.reduce<Record<number, { name: string; sku: string; stock: string; unitPrice: string }>>(
          (acc, product) => {
            acc[product.id] = {
            name: product.name,
            sku: product.sku ?? "",
            stock: String(product.stock),
            unitPrice: product.unit_price == null ? "" : String(product.unit_price),
            };
            return acc;
          },
          {},
        ),
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Ürünler yüklenemedi."));
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
      setErrorMessage(getErrorMessage(error, "Ürün kaydedilemedi."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProductUpdate = async (productId: number) => {
    const input = productInputs[productId];
    if (!input) return;
    const stock = Number(input.stock);
    const unitPrice = input.unitPrice.trim() ? Number(input.unitPrice) : undefined;

    if (!input.name.trim()) {
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

    try {
      await updateProduct(productId, {
        name: input.name,
        sku: input.sku.trim() || undefined,
        stock,
        unitPrice,
      });
      await loadProducts();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Ürün güncellenemedi."));
    }
  };

  return (
    <section className="page page-grid">
      <h1>Stok Yönetimi</h1>
      <p>Ürünlerinizi ekleyin ve düşük stokları takip edin.</p>

      {dbError && <p className="status error">Veritabanı hatası: {dbError}</p>}
      {!dbError && !dbReady && <p className="status">Veritabanı hazırlanıyor…</p>}

      <Card className="glass-card"><form className="customer-form field-grid" onSubmit={handleSubmit}>
        <Label>
          Ürün Adı *
          <Input
            type="text"
            value={formState.name}
            onChange={(event) =>
              setFormState((previous) => ({ ...previous, name: event.target.value }))
            }
            disabled={!dbReady || !!dbError || isSubmitting}
          />
        </Label>

        <Label>
          SKU
          <Input
            type="text"
            value={formState.sku}
            onChange={(event) =>
              setFormState((previous) => ({ ...previous, sku: event.target.value }))
            }
            disabled={!dbReady || !!dbError || isSubmitting}
          />
        </Label>

        <Label>
          Stok Adedi *
          <Input
            type="number"
            min="0"
            step="1"
            value={formState.stock}
            onChange={(event) =>
              setFormState((previous) => ({ ...previous, stock: event.target.value }))
            }
            disabled={!dbReady || !!dbError || isSubmitting}
          />
        </Label>

        <Label>
          Birim Fiyat (₺)
          <Input
            type="number"
            min="0"
            step="0.01"
            value={formState.unitPrice}
            onChange={(event) =>
              setFormState((previous) => ({ ...previous, unitPrice: event.target.value }))
            }
            disabled={!dbReady || !!dbError || isSubmitting}
          />
        </Label>

        <Button type="submit" disabled={!dbReady || !!dbError || isSubmitting}>
          {isSubmitting ? "Kaydediliyor..." : "Ürün Ekle"}
        </Button>
      </form></Card>

      {errorMessage && <p className="status error">{errorMessage}</p>}
      {isLoading && <p className="status">Ürünler yükleniyor…</p>}

      {products.length > 0 && (
        <div className="table-wrap">
          <table className="customers-table table-clean">
            <thead>
              <tr>
                <th>Ürün</th>
                <th>SKU</th>
                <th>Stok</th>
                <th>Birim Fiyat</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const productInput = productInputs[product.id] ?? {
                  name: product.name,
                  sku: product.sku ?? "",
                  stock: String(product.stock),
                  unitPrice: product.unit_price == null ? "" : String(product.unit_price),
                };
                const isLowStock = product.stock <= 5;
                return (
                  <tr key={product.id} className={isLowStock ? "low-stock-row" : undefined}>
                    <td>
                      <Input
                        type="text"
                        value={productInput.name}
                        onChange={(event) =>
                          setProductInputs((previous) => ({
                            ...previous,
                            [product.id]: { ...productInput, name: event.target.value },
                          }))
                        }
                      />
                    </td>
                    <td>
                      <Input
                        type="text"
                        value={productInput.sku}
                        onChange={(event) =>
                          setProductInputs((previous) => ({
                            ...previous,
                            [product.id]: { ...productInput, sku: event.target.value },
                          }))
                        }
                      />
                    </td>
                    <td>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={productInput.stock}
                        onChange={(event) =>
                          setProductInputs((previous) => ({
                            ...previous,
                            [product.id]: { ...productInput, stock: event.target.value },
                          }))
                        }
                      />
                      {isLowStock && <span className="low-stock-label">Düşük stok</span>}
                    </td>
                    <td>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={productInput.unitPrice}
                        placeholder={formatMoney(product.unit_price)}
                        onChange={(event) =>
                          setProductInputs((previous) => ({
                            ...previous,
                            [product.id]: { ...productInput, unitPrice: event.target.value },
                          }))
                        }
                      />
                    </td>
                    <td>
                      <Button type="button" onClick={() => void handleProductUpdate(product.id)}>
                        Güncelle
                      </Button>
                    </td>
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
