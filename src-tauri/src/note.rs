use serde::{Deserialize, Serialize};
// Define a structure for file metadata that can be serialized/deserialized
#[derive(Debug, Serialize, Deserialize)]
pub struct FileMetadata {
  name: String,
  path: String,
  is_dir: bool,
  size: u64,
  // You could add more fields like creation_time, modified_time, etc.
}

#[tauri::command]
pub fn save_note(app_handle: tauri::AppHandle, note: Note) -> Result<(), String> {
  // Implementation details
  // Should use write_file from fs.rs
}

#[tauri::command]
pub fn load_note(app_handle: tauri::AppHandle, id: &str) -> Result<Note, String> {
  // Implementation details
  // Should use read_file from fs.rs
}

#[tauri::command]
pub fn list_notes(
  app_handle: tauri::AppHandle,
  folder_path: Option<&str>,
) -> Result<Vec<Note>, String> {
  // List all notes in a directory
}
