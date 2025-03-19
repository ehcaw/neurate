// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::time::{SystemTime, UNIX_EPOCH};

mod fs;

// Re-export the functions from the fs module
use fs::{
  calculate_directory_size, create_directory, delete_path, move_path, path_exists, read_file,
  write_file,
};

#[tauri::command]
fn greet() -> String {
  let now = SystemTime::now();
  let epoch_ms = now.duration_since(UNIX_EPOCH).unwrap().as_millis();
  format!("Hello world from Rust! Current epoch: {}", epoch_ms)
}

#[tauri::command]
fn my_test_command() {
  println!("Hello Ryan")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .invoke_handler(tauri::generate_handler![
      greet,
      my_test_command,
      read_file,
      write_file,
      create_directory,
      path_exists,
      move_path,
      delete_path,
      calculate_directory_size
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
