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
  return value.toLocaleString("tr-TR", {
    style: "currency",
    currency: "TRY",
  });
}

function formatCreatedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("tr-TR");
}

function formatTransactionType(type: TransactionType): string {
  return type === "debt" ? "Borç" : "Ödeme";
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
  const [customerSearchText, setCustomerSearchText] = useState<string>("");

  const selectedCustomerId = Number(formState.customerId);
  const selectedCustomer = customers.find(
    (customer) => customer.id === selectedCustomerId,
  );
  const normalizedSearch = customerSearchText.trim().toLocaleLowerCase("tr-TR");
  const filteredCustomers = customers.filter((customer) => {
    if (!normalizedSearch) return true;
    const name = customer.name.toLocaleLowerCase("tr-TR");
    const phone = (customer.phone ?? "").toLocaleLowerCase("tr-TR");
    return name.includes(normalizedSearch) || phone.includes(normalizedSearch);
  });

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
          : "Seçili müşteri işlemleri yüklenemedi.",
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
        error instanceof Error ? error.message : "Müşteriler yüklenemedi.",
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
      setErrorMessage("Lütfen bir müşteri seçin.");
      return;
    }

    const parsedAmount = Number(formState.amount);
    if (
      !Number.isFinite(parsedAmount) ||
      Number.isNaN(parsedAmount) ||
      parsedAmount <= 0
    ) {
      setErrorMessage("Tutar 0'dan büyük olmalıdır.");
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
        error instanceof Error ? error.message : "İşlem kaydedilemedi.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="page">
      <h1>Veresiye</h1>

      {dbError && <p className="status error">Veritabanı hatası: {dbError}</p>}
      {!dbError && !dbReady && <p className="status">Veritabanı hazırlanıyor…</p>}

      <form className="customer-form" onSubmit={(event) => event.preventDefault()}>
        <label>
          Müşteri Ara
          <input
            type="text"
            placeholder="Ad veya telefon ile ara"
            value={customerSearchText}
            onChange={(event) => setCustomerSearchText(event.target.value)}
            disabled={!dbReady || !!dbError || isLoadingCustomers || isSubmitting}
          />
        </label>

        <label>
          Müşteri *
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
            <option value="">Müşteri seçin</option>
            {filteredCustomers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Tutar *
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
        </label>

        <div className="ledger-actions">
          <button
            type="button"
            disabled={!dbReady || !!dbError || isSubmitting || !customers.length}
            onClick={() => {
              void handleAddTransaction("debt");
            }}
          >
            {isSubmitting ? "Kaydediliyor..." : "Borç Ekle"}
          </button>
          <button
            type="button"
            className="secondary"
            disabled={!dbReady || !!dbError || isSubmitting || !customers.length}
            onClick={() => {
              void handleAddTransaction("payment");
            }}
          >
            {isSubmitting ? "Kaydediliyor..." : "Ödeme Al"}
          </button>
        </div>
      </form>

      {errorMessage && <p className="status error">{errorMessage}</p>}
      {isLoadingCustomers && <p className="status">Müşteri listesi hazırlanıyor…</p>}

      {!isLoadingCustomers && customers.length > 0 && filteredCustomers.length === 0 && (
        <p className="status">Arama kriterine uygun müşteri bulunamadı.</p>
      )}

      {!isLoadingCustomers && customers.length === 0 && dbReady && !dbError && (
        <p className="status">Henüz müşteri yok. Önce müşteri ekleyin.</p>
      )}

      {formState.customerId && customers.length > 0 && selectedCustomer && (
        <>
          <p className="ledger-balance">
            {selectedCustomer.name} için bakiye: <strong>{formatAmount(balance)}</strong>
          </p>

          {isLoadingTransactions && <p className="status">İşlemler yükleniyor…</p>}

          {!isLoadingTransactions && transactions.length === 0 && (
            <p className="status">Bu müşteri için henüz işlem yok.</p>
          )}

          {transactions.length > 0 && (
            <div className="table-wrap">
              <table className="customers-table">
                <thead>
                  <tr>
                    <th>Tür</th>
                    <th>Tutar</th>
                    <th>Not</th>
                    <th>Oluşturulma</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{formatTransactionType(transaction.type)}</td>
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
