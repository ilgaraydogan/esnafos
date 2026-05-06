import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  createCustomer,
  Customer,
  getCustomers,
} from "../../db";
import { Button, Card, Input, Label } from "../../components/ui";

type CustomersPageProps = {
  dbReady: boolean;
  dbError: string | null;
};

type CustomerFormState = {
  name: string;
  phone: string;
  note: string;
};

const initialFormState: CustomerFormState = {
  name: "",
  phone: "",
  note: "",
};

function formatCreatedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export function CustomersPage({ dbReady, dbError }: CustomersPageProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [formState, setFormState] = useState<CustomerFormState>(initialFormState);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const rows = await getCustomers();
      setCustomers(rows);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load customers.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!dbReady || dbError) {
      return;
    }

    void loadCustomers();
  }, [dbError, dbReady, loadCustomers]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formState.name.trim()) {
      setErrorMessage("Customer name is required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createCustomer({
        name: formState.name,
        phone: formState.phone || undefined,
        note: formState.note || undefined,
      });

      setFormState(initialFormState);
      await loadCustomers();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create customer.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const normalizedSearch = searchText.trim().toLocaleLowerCase("tr-TR");
  const filteredCustomers = customers.filter((customer) => {
    if (!normalizedSearch) {
      return true;
    }

    const name = customer.name.toLocaleLowerCase("tr-TR");
    const phone = (customer.phone ?? "").toLocaleLowerCase("tr-TR");
    return name.includes(normalizedSearch) || phone.includes(normalizedSearch);
  });

  return (
    <section className="page page-grid">
      <header className="page-header"><h1>Müşteriler</h1><p>Müşteri listenizi yönetin ve hızlıca arayın.</p></header>

      {dbError && <p className="status error">Veritabanı hatası: {dbError}</p>}
      {!dbError && !dbReady && <p className="status">Veritabanı hazırlanıyor…</p>}

      <Card className="glass-card"><form className="customer-form field-grid" onSubmit={handleSubmit}>
        <Label>
          Ad Soyad *
          <Input
            type="text"
            value={formState.name}
            onChange={(event) =>
              setFormState((previous) => ({
                ...previous,
                name: event.target.value,
              }))
            }
            required
            disabled={!dbReady || !!dbError || isSubmitting}
          />
        </Label>

        <Label>
          Telefon
          <Input
            type="text"
            value={formState.phone}
            onChange={(event) =>
              setFormState((previous) => ({
                ...previous,
                phone: event.target.value,
              }))
            }
            disabled={!dbReady || !!dbError || isSubmitting}
          />
        </Label>

        <Label>
          Not
          <textarea
            rows={3}
            value={formState.note}
            onChange={(event) =>
              setFormState((previous) => ({
                ...previous,
                note: event.target.value,
              }))
            }
            disabled={!dbReady || !!dbError || isSubmitting}
          />
        </Label>

        <Button
          type="submit"
          disabled={!dbReady || !!dbError || isSubmitting}
        >
          {isSubmitting ? "Kaydediliyor..." : "Müşteri Ekle"}
        </Button>
      </form></Card>

      <Card className="glass-card"><Label className="search-input-wrap">
        Müşteri Ara
        <Input
          type="text"
          placeholder="Ad veya telefon ile ara"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          disabled={!dbReady || !!dbError || isLoading}
        />
      </Label></Card>

      {errorMessage && <p className="status error">{errorMessage}</p>}
      {isLoading && <p className="status">Müşteriler hazırlanıyor, lütfen bekleyin…</p>}

      {!isLoading && customers.length === 0 && dbReady && !dbError && (
        <p className="status">Henüz müşteri yok. İlk müşterinizi ekleyin.</p>
      )}

      {!isLoading && customers.length > 0 && filteredCustomers.length === 0 && (
        <p className="status">Aramanızla eşleşen müşteri bulunamadı.</p>
      )}

      {filteredCustomers.length > 0 && (
        <div className="table-wrap">
          <table className="customers-table table-clean">
            <thead>
              <tr>
                <th>Ad Soyad</th>
                <th>Telefon</th>
                <th>Not</th>
                <th>Oluşturulma</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td>{customer.name}</td>
                  <td>{customer.phone || "-"}</td>
                  <td>{customer.note || "-"}</td>
                  <td>{formatCreatedAt(customer.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
