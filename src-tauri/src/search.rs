use tantivy::{Document, Index};

#[tauri::command]
pub fn index_notes(app_handle: tauri::AppHandle) -> Result<(), String> {
  // Build search index
}

#[tauri::command]
pub fn search_notes(query: &str) -> Result<Vec<String>, String> {
  // Search indexed notes
}
