import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { closeDatabase } from "../../db";

const BUSINESS_NAME_KEY = "esnafos_business_name";
const THEME_KEY = "esnafos_theme";
const ACCENT_KEY = "esnafos_accent";
const APP_VERSION = "0.1.0";

type SettingsPageProps = {
  onRestartOnboarding: () => void;
};

export function SettingsPage({ onRestartOnboarding }: SettingsPageProps) {
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [statusType, setStatusType] = useState<"success" | "error" | "idle">("idle");
  const [businessName, setBusinessName] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [accent, setAccent] = useState("#4f46e5");

  useEffect(() => {
    setBusinessName(localStorage.getItem(BUSINESS_NAME_KEY) ?? "");
    setTheme((localStorage.getItem(THEME_KEY) as "light" | "dark") ?? "light");
    setAccent(localStorage.getItem(ACCENT_KEY) ?? "#4f46e5");
  }, []);

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.body.style.setProperty("--accent-color", accent);
    localStorage.setItem(ACCENT_KEY, accent);
  }, [accent]);

  const handleBackup = async () => {
    try {
      const backupPath = await save({
        title: "Yedek dosyasını kaydet",
        filters: [{ name: "SQLite", extensions: ["db", "sqlite"] }],
      });

      if (!backupPath) {
        return;
      }

      await invoke("backup_database", { backupPath });
      setStatusType("success");
      setStatusMessage("Yedek başarıyla alındı.");
    } catch (error) {
      setStatusType("error");
      setStatusMessage(`Yedek alınırken hata oluştu: ${String(error)}`);
    }
  };

  const handleRestore = async () => {
    try {
      const selected = await open({
        title: "Yedek dosyası seç",
        multiple: false,
        filters: [{ name: "SQLite", extensions: ["db", "sqlite"] }],
      });

      if (!selected || Array.isArray(selected)) {
        return;
      }

      const confirmed = window.confirm("Mevcut veriler silinecek, emin misiniz?");
      if (!confirmed) {
        return;
      }

      await closeDatabase();
      await invoke("restore_database", { backupPath: selected });

      setStatusType("success");
      setStatusMessage("Yedek başarıyla yüklendi. Uygulama yeniden başlatılıyor...");

      try {
        await invoke("relaunch_app");
      } catch {
        alert(
          "Yedek yüklendi. Değişikliklerin aktif olması için uygulamayı tamamen kapatıp yeniden açın.",
        );
        setStatusType("error");
        setStatusMessage(
          "Yedek yüklendi ancak otomatik yeniden başlatma yapılamadı. Lütfen uygulamayı tamamen kapatıp yeniden açın.",
        );
      }
    } catch (error) {
      setStatusType("error");
      setStatusMessage(`Yedek yüklenirken hata oluştu: ${String(error)}`);
    }
  };

  return (
    <section className="page glass-card">
      <h1>Ayarlar</h1>
      <p>Uygulama görünümünü ve yerel ayarları buradan yönetebilirsiniz.</p>

      <div className="settings-grid">
        <label>
          İşletme Adı
          <input
            value={businessName}
            onChange={(event) => {
              setBusinessName(event.target.value);
              localStorage.setItem(BUSINESS_NAME_KEY, event.target.value);
            }}
            placeholder="Örn. Yıldız Market"
          />
        </label>

        <label>
          Tema
          <select value={theme} onChange={(event) => setTheme(event.target.value as "light" | "dark")}>
            <option value="light">Açık</option>
            <option value="dark">Koyu</option>
          </select>
        </label>

        <div>
          <p>Vurgu Rengi</p>
          <div className="accent-palette">
            {["#4f46e5", "#0284c7", "#059669", "#d97706", "#dc2626"].map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Vurgu rengi ${color}`}
                className={`accent-swatch ${accent === color ? "selected" : ""}`}
                style={{ backgroundColor: color }}
                onClick={() => setAccent(color)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="settings-actions">
        <button type="button" onClick={handleBackup}>
          Yedek Al
        </button>
        <button type="button" className="secondary" onClick={handleRestore}>
          Yedek Yükle
        </button>
        <button type="button" className="secondary" onClick={onRestartOnboarding}>
          Onboarding'i Yeniden Göster
        </button>
      </div>

      <p className="status">Sürüm: v{APP_VERSION}</p>

      {statusType !== "idle" && (
        <p className="status" style={{ color: statusType === "success" ? "#0f9d58" : "#d93025" }}>
          {statusMessage}
        </p>
      )}
    </section>
  );
}
