import { FormEvent, useCallback, useEffect, useState } from "react";
import { addCashEntry, CashEntry, CashEntryType, getCashEntries, getTotalCashBalance } from "../../db";
import { Button, Card, Input, Label } from "../../components/ui";

type CashPageProps = {
  dbReady: boolean;
  dbError: string | null;
};

type CashFormState = {
  type: CashEntryType;
  amount: string;
  note: string;
};

const initialFormState: CashFormState = {
  type: "income",
  amount: "",
  note: "",
};

function formatAmount(value: number): string {
  return value.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
}

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("tr-TR");
}

export function CashPage({ dbReady, dbError }: CashPageProps) {
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [formState, setFormState] = useState<CashFormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadCashData = useCallback(async () => {
    const [entryRows, balance] = await Promise.all([getCashEntries(), getTotalCashBalance()]);
    setEntries(entryRows);
    setTotalBalance(balance);
  }, []);

  useEffect(() => {
    if (!dbReady || dbError) return;

    void loadCashData().catch((error) => {
      setErrorMessage(error instanceof Error ? error.message : "Kasa verileri yüklenemedi.");
    });
  }, [dbReady, dbError, loadCashData]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(formState.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMessage("Tutar 0'dan büyük olmalıdır.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await addCashEntry({
        type: formState.type,
        amount,
        note: formState.note,
      });

      setFormState(initialFormState);
      await loadCashData();
      setSuccessMessage("Kasa hareketi kaydedildi.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Kasa hareketi kaydedilemedi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="page page-grid">
      <h1>Kasa</h1>
      <p className="ledger-balance">Toplam Bakiye: <strong>{formatAmount(totalBalance)}</strong></p>

      {dbError && <p className="status error">Veritabanı hatası: {dbError}</p>}
      {!dbError && !dbReady && <p className="status">Veritabanı hazırlanıyor…</p>}
      {errorMessage && <p className="status error">{errorMessage}</p>}
      {successMessage && <p className="status success">{successMessage}</p>}

      <Card className="glass-card"><form className="customer-form field-grid" onSubmit={handleSubmit}>
        <Label>
          Tür
          <select
            value={formState.type}
            onChange={(event) =>
              setFormState((previous) => ({ ...previous, type: event.target.value as CashEntryType }))
            }
            disabled={!dbReady || !!dbError || isSubmitting}
          >
            <option value="income">Gelir</option>
            <option value="expense">Gider</option>
          </select>
        </Label>

        <Label>
          Tutar *
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={formState.amount}
            onChange={(event) => setFormState((previous) => ({ ...previous, amount: event.target.value }))}
            disabled={!dbReady || !!dbError || isSubmitting}
          />
        </Label>

        <Label>
          Not
          <textarea
            rows={3}
            value={formState.note}
            onChange={(event) => setFormState((previous) => ({ ...previous, note: event.target.value }))}
            disabled={!dbReady || !!dbError || isSubmitting}
          />
        </Label>

        <Button type="submit" disabled={!dbReady || !!dbError || isSubmitting}>
          {isSubmitting ? "Kaydediliyor..." : "Kasa Hareketi Ekle"}
        </Button>
      </form></Card>

      <Card className="glass-card">
        <h2>Kasa Hareketleri</h2>
        {entries.length === 0 ? (
          <p>Henüz kasa hareketi yok.</p>
        ) : (
          <ul className="history-list">
            {entries.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.type === "income" ? "Gelir" : "Gider"}</strong> · {formatAmount(entry.amount)}
                <br />
                <small>{formatCreatedAt(entry.created_at)}</small>
                {entry.note ? <p>{entry.note}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
