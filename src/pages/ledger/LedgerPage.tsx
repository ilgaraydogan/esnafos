import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addTransaction,
  Customer,
  getCustomers,
  getTransactionsByCustomer,
  Transaction,
  TransactionType,
} from "../../db";

type LedgerPageProps = {
  dbReady: boolean;
  dbError: string | null;
};

type LedgerFormState = {
  customerId: string;
  amount: string;
  note: string;
};

const initialLedgerFormState: LedgerFormState = {
  customerId: "",
  amount: "",
  note: "",
};

function formatAmount(value: number): string {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

function formatCreatedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export function LedgerPage({ dbReady, dbError }: LedgerPageProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [formState, setFormState] = useState<LedgerFormState>(
    initialLedgerFormState,
  );
  const [isLoadingCustomers, setIsLoadingCustomers] = useState<boolean>(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedCustomerId = Number(formState.customerId);

  const balance = useMemo(
    () =>
      transactions.reduce((total, transaction) => {
        const signedAmount =
          transaction.type === "debt" ? transaction.amount : -transaction.amount;
        return total + signedAmount;
      }, 0),
    [transactions],
  );

  const loadTransactions = useCallback(async (customerId: number) => {
    setIsLoadingTransactions(true);
    setErrorMessage(null);

    try {
      const rows = await getTransactionsByCustomer(customerId);
      setTransactions(rows);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load transactions for the selected customer.",
      );
      setTransactions([]);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    setIsLoadingCustomers(true);
    setErrorMessage(null);

    try {
      const rows = await getCustomers();
      setCustomers(rows);

      if (rows.length === 0) {
        setFormState(initialLedgerFormState);
        setTransactions([]);
        return;
      }

      setFormState((previous) => {
        const hasCurrentSelection = rows.some(
          (customer) => customer.id === Number(previous.customerId),
        );

        return {
          ...previous,
          customerId: hasCurrentSelection
            ? previous.customerId
            : String(rows[0].id),
        };
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load customers.",
      );
      setCustomers([]);
      setTransactions([]);
    } finally {
      setIsLoadingCustomers(false);
    }
  }, []);

  useEffect(() => {
    if (!dbReady || dbError) {
      return;
    }

    void loadCustomers();
  }, [dbError, dbReady, loadCustomers]);

  useEffect(() => {
    if (!dbReady || dbError || !formState.customerId) {
      setTransactions([]);
      return;
    }

    void loadTransactions(Number(formState.customerId));
  }, [dbError, dbReady, formState.customerId, loadTransactions]);

  const handleAddTransaction = async (type: TransactionType) => {

    const parsedCustomerId = Number(formState.customerId);
    if (!parsedCustomerId) {
      setErrorMessage("Please select a customer.");
      return;
    }

    const parsedAmount = Number(formState.amount);
    if (!Number.isFinite(parsedAmount) || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage("Amount must be greater than 0.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await addTransaction({
        customerId: parsedCustomerId,
        type,
        amount: parsedAmount,
        note: formState.note.trim() || undefined,
      });

      setFormState((previous) => ({
        ...previous,
        amount: "",
        note: "",
      }));
      await loadTransactions(parsedCustomerId);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save transaction.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="page">
      <h1>Ledger</h1>

      {dbError && <p className="status error">Database error: {dbError}</p>}
      {!dbError && !dbReady && <p className="status">Initializing database…</p>}

      <form className="customer-form" onSubmit={(event) => event.preventDefault()}>
        <label>
          Customer *
          <select
            value={formState.customerId}
            onChange={(event) =>
              setFormState((previous) => ({
                ...previous,
                customerId: event.target.value,
              }))
            }
            disabled={!dbReady || !!dbError || isLoadingCustomers || isSubmitting}
          >
            <option value="">Select a customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Amount *
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={formState.amount}
            onChange={(event) =>
              setFormState((previous) => ({
                ...previous,
                amount: event.target.value,
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

        <div className="ledger-actions">
          <button
            type="button"
            disabled={!dbReady || !!dbError || isSubmitting || !customers.length}
            onClick={() => {
              void handleAddTransaction("debt");
            }}
          >
            {isSubmitting ? "Saving..." : "Add Debt"}
          </button>
          <button
            type="button"
            className="secondary"
            disabled={!dbReady || !!dbError || isSubmitting || !customers.length}
            onClick={() => {
              void handleAddTransaction("payment");
            }}
          >
            {isSubmitting ? "Saving..." : "Add Payment"}
          </button>
        </div>
      </form>

      {errorMessage && <p className="status error">{errorMessage}</p>}
      {isLoadingCustomers && <p className="status">Loading customers…</p>}

      {!isLoadingCustomers && customers.length === 0 && dbReady && !dbError && (
        <p className="status">No customers yet. Add a customer first.</p>
      )}

      {formState.customerId && customers.length > 0 && (
        <>
          <p className="ledger-balance">
            Balance for customer #{selectedCustomerId}: <strong>{formatAmount(balance)}</strong>
          </p>

          {isLoadingTransactions && <p className="status">Loading transactions…</p>}

          {!isLoadingTransactions && transactions.length === 0 && (
            <p className="status">No transactions yet for this customer.</p>
          )}

          {transactions.length > 0 && (
            <div className="table-wrap">
              <table className="customers-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Note</th>
                    <th>Created at</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{transaction.type}</td>
                      <td>{formatAmount(transaction.amount)}</td>
                      <td>{transaction.note || "-"}</td>
                      <td>{formatCreatedAt(transaction.created_at)}</td>
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
