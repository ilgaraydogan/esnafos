use std::fs;
use std::path::{Path, PathBuf};

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize)]
struct CashEntry {
    id: i64,
    r#type: String,
    amount: f64,
    note: Option<String>,
    #[serde(rename = "createdAt")]
    created_at: String,
}

#[derive(Debug, Deserialize)]
struct NewCashEntryInput {
    r#type: String,
    amount: f64,
    note: Option<String>,
}

fn ensure_cash_entries_table(connection: &Connection) -> Result<(), String> {
    connection
        .execute(
            "CREATE TABLE IF NOT EXISTS cash_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
                amount REAL NOT NULL,
                note TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );",
            [],
        )
        .map_err(|e| format!("Kasa tablosu hazırlanamadı: {e}"))?;

    Ok(())
}

fn canonical_db_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Uygulama veri klasörü alınamadı: {e}"))?;

    Ok(app_data_dir.join("esnafos.db"))
}

#[tauri::command]
fn get_database_url(app: tauri::AppHandle) -> Result<String, String> {
    let db_path = canonical_db_path(&app)?;

    if let Some(parent) = db_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Veritabanı klasörü oluşturulamadı: {e}"))?;
    }

    Ok(format!("sqlite:{}", db_path.to_string_lossy()))
}

#[tauri::command]
fn backup_database(app: tauri::AppHandle, backup_path: String) -> Result<(), String> {
    let db_path = canonical_db_path(&app)?;
    if !db_path.exists() {
        return Err("Yedek alınacak veritabanı bulunamadı.".to_string());
    }

    let target_path = Path::new(&backup_path);

    if let Some(parent) = target_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Klasör oluşturulamadı: {e}"))?;
    }

    fs::copy(&db_path, target_path).map_err(|e| format!("Yedek alınamadı: {e}"))?;

    Ok(())
}

#[tauri::command]
fn restore_database(app: tauri::AppHandle, backup_path: String) -> Result<(), String> {
    let source_path = Path::new(&backup_path);
    if !source_path.exists() {
        return Err("Seçilen yedek dosyası bulunamadı.".to_string());
    }

    let db_path = canonical_db_path(&app)?;

    if let Some(parent) = db_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Veritabanı klasörü oluşturulamadı: {e}"))?;
    }

    fs::copy(source_path, &db_path).map_err(|e| format!("Yedek yüklenemedi: {e}"))?;

    Ok(())
}


#[tauri::command]
fn relaunch_app(app: tauri::AppHandle) -> Result<(), String> {
    app.restart();
}

#[tauri::command]
fn insert_cash_entry(app: tauri::AppHandle, input: NewCashEntryInput) -> Result<i64, String> {
    if input.r#type != "income" && input.r#type != "expense" {
        return Err("Kasa hareket tipi income veya expense olmalıdır.".to_string());
    }

    if !input.amount.is_finite() || input.amount <= 0.0 {
        return Err("Kasa tutarı 0'dan büyük olmalıdır.".to_string());
    }

    let db_path = canonical_db_path(&app)?;
    let connection = Connection::open(db_path).map_err(|e| format!("Veritabanı açılamadı: {e}"))?;
    ensure_cash_entries_table(&connection)?;

    connection
        .execute(
            "INSERT INTO cash_entries (type, amount, note) VALUES (?1, ?2, ?3);",
            params![input.r#type, input.amount, input.note],
        )
        .map_err(|e| format!("Kasa hareketi kaydedilemedi: {e}"))?;

    Ok(connection.last_insert_rowid())
}

#[tauri::command]
fn get_all_cash_entries(app: tauri::AppHandle) -> Result<Vec<CashEntry>, String> {
    let db_path = canonical_db_path(&app)?;
    let connection = Connection::open(db_path).map_err(|e| format!("Veritabanı açılamadı: {e}"))?;
    ensure_cash_entries_table(&connection)?;

    let mut statement = connection
        .prepare(
            "SELECT id, type, amount, note, created_at
             FROM cash_entries
             ORDER BY created_at DESC, id DESC;",
        )
        .map_err(|e| format!("Kasa hareketleri alınamadı: {e}"))?;

    let rows = statement
        .query_map([], |row| {
            Ok(CashEntry {
                id: row.get(0)?,
                r#type: row.get(1)?,
                amount: row.get(2)?,
                note: row.get(3)?,
                created_at: row.get(4)?,
            })
        })
        .map_err(|e| format!("Kasa hareketleri işlenemedi: {e}"))?;

    let mut entries = Vec::new();
    for entry in rows {
        entries.push(entry.map_err(|e| format!("Kasa hareketi okunamadı: {e}"))?);
    }

    Ok(entries)
}

#[tauri::command]
fn get_cash_balance(app: tauri::AppHandle) -> Result<f64, String> {
    let db_path = canonical_db_path(&app)?;
    let connection = Connection::open(db_path).map_err(|e| format!("Veritabanı açılamadı: {e}"))?;
    ensure_cash_entries_table(&connection)?;

    let total: Option<f64> = connection
        .query_row(
            "SELECT SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) FROM cash_entries;",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("Kasa bakiyesi hesaplanamadı: {e}"))?;

    Ok(total.unwrap_or(0.0))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            get_database_url,
            backup_database,
            restore_database,
            relaunch_app,
            insert_cash_entry,
            get_all_cash_entries,
            get_cash_balance
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
