use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{self, Read, Write};
use std::path::Path;
use tauri::{command, AppHandle, Runtime, Window};

// Define a structure for file metadata that can be serialized/deserialized
#[derive(Debug, Serialize, Deserialize)]
pub struct FileMetadata {
  name: String,
  path: String,
  is_dir: bool,
  size: u64,
  // You could add more fields like creation_time, modified_time, etc.
}

// Read a file's contents
#[tauri::command]
pub fn read_file(path: &str) -> Result<String, String> {
  // TODO: Implement reading a file's contents
  // Hint: Use fs::read_to_string and handle potential errors

  // This is just a starter structure:
  match fs::read_to_string(path) {
    Ok(content) => Ok(content),
    Err(err) => Err(format!("Failed to read file: {}", err)),
  }
}

// Write content to a file
#[tauri::command]
pub fn write_file(path: &str, content: &str) -> Result<(), String> {
  let path_obj = std::path::Path::new(path);
  if let Some(parent) = path_obj.parent() {
    fs::create_dir_all(parent)
      .map_err(|err| format!("Failed to create directory structure: {}", err))?;
  }
  fs::write(path, content).map_err(|err| format!("Failed to write to path {}: {}", path, err))
}

// Create a directory
#[tauri::command]
pub fn create_directory(path: &str) -> Result<(), String> {
  // TODO: Implement directory creation
  // Hint: Use fs::create_dir_all for nested directories
  match fs::create_dir_all(path) {
    Ok(_) => Ok(()),
    Err(err) => Err(format!("Failed to create directory, {}", err)),
  }
}

// Check if a file or directory exists
#[tauri::command]
pub fn path_exists(path: &str) -> bool {
  std::path::Path::new(path).exists()
}

// Move a file or directory
#[tauri::command]
pub fn move_path(source: &str, destination: &str) -> Result<(), String> {
  // TODO: Implement moving a file or directory
  // Hint: fs::rename works for both files and directories
  fs::rename(
    std::path::Path::new(&source),
    std::path::Path::new(&destination),
  )
  .map_err(|err| format!("Failed to rename {} to {}: {}", source, destination, err))
}

// Delete a file or directory
#[tauri::command]
pub fn delete_path(path: &str, recursive: bool) -> Result<(), String> {
  // TODO: Implement deleting a file or directory
  // For directories: if recursive is true, use remove_dir_all, otherwise use remove_dir
  // For files: use remove_file
  let file_path = std::path::Path::new(path);
  if file_path.is_dir() {
    if recursive {
      fs::remove_dir_all(file_path)
        .map_err(|err| format!("Failed to remove path {}: {}", path, err))
    } else {
      fs::remove_dir(file_path).map_err(|err| format!("Failed to remove path {}: {}", path, err))
    }
  } else if file_path.is_file() {
    fs::remove_file(file_path).map_err(|err| format!("Failed to remove path {}: {}", path, err))
  } else {
    Err(format!("Path {} does not exist", path))
  }
}

// Calculate the size of a directory
// This is a more complex operation that requires recursion
#[tauri::command]
pub fn calculate_directory_size(path: &str) -> Result<u64, String> {
  let mut total_size: u64 = 0;
  let path_obj = std::path::Path::new(path);

  if path_obj.is_dir() {
    // Use map_err to convert io::Error to String
    let entries = fs::read_dir(path_obj)
      .map_err(|err| format!("Failed to read directory {}: {}", path, err))?;

    for entry_result in entries {
      // Handle each entry result separately
      let entry = entry_result.map_err(|err| format!("Failed to read directory entry: {}", err))?;

      let child_path = entry.path();

      if child_path.is_dir() {
        // Recursive call for subdirectories
        let child_path_str = child_path
          .to_str()
          .ok_or_else(|| format!("Invalid path encoding"))?;

        total_size += calculate_directory_size(child_path_str)?;
      } else {
        // Get file size
        let metadata = fs::metadata(&child_path)
          .map_err(|err| format!("Failed to get metadata for {:?}: {}", child_path, err))?;

        total_size += metadata.len();
      }
    }
  } else if path_obj.is_file() {
    // Get size of a single file
    let metadata = fs::metadata(path_obj)
      .map_err(|err| format!("Failed to get metadata for {}: {}", path, err))?;

    total_size += metadata.len();
  } else {
    return Err(format!("Path {} does not exist or is not accessible", path));
  }

  Ok(total_size)
}
