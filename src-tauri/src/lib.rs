use std::fs;
use std::path::{Path, PathBuf};

use tauri::Manager;

fn possible_db_paths(app: &tauri::AppHandle) -> Result<Vec<PathBuf>, String> {
    let mut paths = Vec::new();

    if let Ok(app_data_dir) = app.path().app_data_dir() {
        paths.push(app_data_dir.join("esnafos.db"));
        paths.push(app_data_dir.join("sqlite").join("esnafos.db"));
    }

    if let Ok(app_config_dir) = app.path().app_config_dir() {
        paths.push(app_config_dir.join("esnafos.db"));
        paths.push(app_config_dir.join("sqlite").join("esnafos.db"));
    }

    if let Ok(app_local_data_dir) = app.path().app_local_data_dir() {
        paths.push(app_local_data_dir.join("esnafos.db"));
        paths.push(app_local_data_dir.join("sqlite").join("esnafos.db"));
    }

    if paths.is_empty() {
        return Err("Veritabanı yolu bulunamadı.".to_string());
    }

    Ok(paths)
}

fn resolve_db_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let paths = possible_db_paths(app)?;

    if let Some(existing) = paths.iter().find(|p| p.exists()) {
        return Ok(existing.to_path_buf());
    }

    Ok(paths[0].clone())
}

#[tauri::command]
fn backup_database(app: tauri::AppHandle, backup_path: String) -> Result<(), String> {
    let db_path = resolve_db_path(&app)?;
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

    let db_path = resolve_db_path(&app)?;

    if let Some(parent) = db_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Veritabanı klasörü oluşturulamadı: {e}"))?;
    }

    fs::copy(source_path, &db_path).map_err(|e| format!("Yedek yüklenemedi: {e}"))?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![backup_database, restore_database])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
