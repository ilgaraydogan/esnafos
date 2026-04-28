import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  createCustomer,
  Customer,
  getCustomers,
} from "../../db";

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

  return (
    <section className="page">
      <h1>Customers</h1>

      {dbError && <p className="status error">Database error: {dbError}</p>}
      {!dbError && !dbReady && <p className="status">Initializing database…</p>}

      <form className="customer-form" onSubmit={handleSubmit}>
        <label>
          Name *
          <input
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
        </label>

        <label>
          Phone
          <input
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
        </label>

        <label>
          Note
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
        </label>

        <button
          type="submit"
          disabled={!dbReady || !!dbError || isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Add customer"}
        </button>
      </form>

      {errorMessage && <p className="status error">{errorMessage}</p>}
      {isLoading && <p className="status">Loading customers…</p>}

      {!isLoading && customers.length === 0 && dbReady && !dbError && (
        <p className="status">No customers yet.</p>
      )}

      {customers.length > 0 && (
        <div className="table-wrap">
          <table className="customers-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Note</th>
                <th>Created at</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
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
