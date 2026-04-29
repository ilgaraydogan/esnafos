use std::fs;
use std::path::{Path, PathBuf};

use tauri::Manager;

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
            relaunch_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
