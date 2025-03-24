use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct UserConfig {
  theme: String,
  default_save_location: String,
  autosave_interval: u32,
  // Add fields as needed
}

#[tauri::command]
pub fn load_config(app_handle: tauri::AppHandle) -> Result<UserConfig, String> {
  // Load config from app data directory
}

#[tauri::command]
pub fn save_config(app_handle: tauri::AppHandle, config: UserConfig) -> Result<(), String> {
  // Save config to app data directory
}
