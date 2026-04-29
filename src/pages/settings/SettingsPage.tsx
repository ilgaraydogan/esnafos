import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { closeDatabase } from "../../db";

export function SettingsPage() {
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [statusType, setStatusType] = useState<"success" | "error" | "idle">("idle");

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
    <section className="page">
      <h1>Ayarlar</h1>
      <p>Yerel veritabanı yedekleme ve geri yükleme işlemlerini buradan yapabilirsiniz.</p>

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button type="button" onClick={handleBackup}>
          Yedek Al
        </button>

        <button type="button" onClick={handleRestore}>
          Yedek Yükle
        </button>

      </div>

      {statusType !== "idle" && (
        <p style={{ marginTop: 12, color: statusType === "success" ? "#0f9d58" : "#d93025" }}>
          {statusMessage}
        </p>
      )}
    </section>
  );
}
