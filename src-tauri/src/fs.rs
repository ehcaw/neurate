use array_list::ArrayList;
use chrono::{DateTime, Utc};
use directories::ProjectDirs;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::{HashMap, VecDeque};
use std::fs;
use std::io::{self, Error as IoError};
use std::path::{Path, PathBuf};
use tauri::{command, AppHandle, Runtime, Window};
use uuid::Uuid;

// Define the structures
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "snake_case")]
pub enum NoteType {
  FreeNote,
  Notebook,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Metadata {
  pub created_at: DateTime<Utc>,
  pub last_accessed: DateTime<Utc>,
  pub note_type: String, // Changed to String to simplify
  pub tags: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PageContent {
  pub id: String,
  pub content: String,
  pub drawings: Vec<DrawingData>,
  pub created_at: DateTime<Utc>,
  pub last_modified: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DrawingData {
  pub tool: String,
  pub points: Vec<f64>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Note {
  pub title: String,
  pub metadata: Metadata,
  pub pages: Vec<PageContent>,
}

fn get_app_data_dir() -> Result<PathBuf, String> {
  if let Some(proj_dirs) = ProjectDirs::from("com", "ehcaw", "jot") {
    // Get the data directory path
    let data_dir = proj_dirs.data_dir();

    // Create the directory if it doesn't exist (create_dir_all handles this)
    fs::create_dir_all(data_dir).map_err(|e| format!("Failed to create data directory: {}", e))?;

    Ok(data_dir.to_path_buf())
  } else {
    Err("Could not determine app data directory".to_string())
  }
}

// Read a file's contents
#[tauri::command]
pub fn read_file(path: &str) -> Result<String, String> {
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
  fs::rename(
    std::path::Path::new(source),
    std::path::Path::new(destination),
  )
  .map_err(|err| format!("Failed to rename {} to {}: {}", source, destination, err))
}

// Delete a file or directory
#[tauri::command]
pub fn delete_path(path: &str, recursive: bool) -> Result<(), String> {
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
#[tauri::command]
pub fn calculate_directory_size(path: &str) -> Result<u64, String> {
  let mut total_size: u64 = 0;
  let path_obj = std::path::Path::new(path);

  if path_obj.is_dir() {
    let entries = fs::read_dir(path_obj)
      .map_err(|err| format!("Failed to read directory {}: {}", path, err))?;

    for entry_result in entries {
      let entry = entry_result.map_err(|err| format!("Failed to read directory entry: {}", err))?;
      let child_path = entry.path();

      if child_path.is_dir() {
        let child_path_str = child_path
          .to_str()
          .ok_or_else(|| format!("Invalid path encoding"))?;
        total_size += calculate_directory_size(child_path_str)?;
      } else {
        let metadata = fs::metadata(&child_path)
          .map_err(|err| format!("Failed to get metadata for {:?}: {}", child_path, err))?;

        total_size += metadata.len();
      }
    }
  } else if path_obj.is_file() {
    let metadata = fs::metadata(path_obj)
      .map_err(|err| format!("Failed to get metadata for {}: {}", path, err))?;

    total_size += metadata.len();
  } else {
    return Err(format!("Path {} does not exist or is not accessible", path));
  }

  Ok(total_size)
}

#[tauri::command]
pub fn save_note(path: &str, note: &str) -> Result<(), String> {
  // Parse the note string to JSON

  let json: Value = serde_json::from_str(note).map_err(|e| e.to_string())?;

  // Convert JSON back to a formatted string
  let json_string = serde_json::to_string_pretty(&json).map_err(|e| e.to_string())?;

  // Write to file
  fs::write(path, json_string).map_err(|e| e.to_string())?;

  Ok(())
}

pub fn add_page(note: &mut Note, content: String, drawings: Vec<DrawingData>) {
  let now = Utc::now();
  let page = PageContent {
    id: Uuid::new_v4().to_string(),
    content,
    drawings,
    created_at: now,
    last_modified: now,
  };
  note.pages.push(page);
}

#[tauri::command]
pub fn create_new_note(title: &str, note_type: &str) -> Result<String, String> {
  let now = Utc::now();
  let app_dir = get_app_data_dir()?;
  let notes_dir = app_dir.join("notes");
  let file_name = format!("{}.json", Uuid::new_v4());
  let file_path = notes_dir.join(&file_name);
  let note: serde_json::Value;
  if note_type == &String::from("notebook") {
    note = json!({
        "id": file_path,
        "title": title,
        "metadata": {
            "created_at": now,
            "last_accessed": now,
            "note_type": note_type,
            "tags": []
        },
        "pages": [{
            "id": Uuid::new_v4().to_string(),
            "content": "<p>hello</p>",
            "created_at": now,
            "last_modified": now
        }]
    });
  } else {
    note = json!({
        "id": file_path,
        "title": title,
        "metadata": {
            "created_at": now,
            "last_accessed": now,
            "note_type": note_type,
            "tags": [],
        },
        "pages": [{
          "id": Uuid::new_v4().to_string(),
          "text_layer":  "",
          "drawing_layer": "",
          "last_modified": now
        }]
    });
  }
  let path_str = file_path
    .to_str()
    .ok_or_else(|| "Invalid path encoding".to_string())?;

  let note_str =
    serde_json::to_string_pretty(&note).map_err(|e| format!("Failed to create new note: {}", e))?;
  // Write the file
  write_file(path_str, &note_str)?;
  Ok(
    file_path
      .to_str()
      .ok_or_else(|| "invalid path encoding".to_string())?
      .to_string(),
  )
}

// Additional functionality to update an existing note
#[tauri::command]
pub fn update_notebook_content(path: &str, page_id: &str, content: &str) -> Result<(), String> {
  // Read the current note
  let note_str = read_file(path)?;

  // Parse to JSON
  let mut note: Value =
    serde_json::from_str(&note_str).map_err(|e| format!("Failed to parse note JSON: {}", e))?;

  // Find and update the specified page
  if let Some(pages) = note["pages"].as_array_mut() {
    let now = Utc::now();

    for page in pages.iter_mut() {
      if let Some(id) = page["id"].as_str() {
        if id == page_id {
          page["content"] = json!(content);
          page["last_modified"] = json!(now);
          break;
        }
      }
    }
  }
  // Update the last_accessed field
  if let Some(metadata) = note["metadata"].as_object_mut() {
    let now = Utc::now();
    metadata.insert("last_accessed".to_string(), json!(now));
  }

  // Save the updated note
  let updated_str =
    serde_json::to_string_pretty(&note).map_err(|e| format!("Failed to serialize note: {}", e))?;

  write_file(path, &updated_str)
}

#[tauri::command]
pub fn update_freenote_content(
  path: &str,
  page_id: &str,
  content: &str,
  lines: &str,
) -> Result<(), String> {
  let note_str = read_file(path)?;
  let mut note: Value =
    serde_json::from_str(&note_str).map_err(|e| format!("Failed to parse note JSON: {}", e))?;
  if let Some(pages) = note["pages"].as_array_mut() {
    let now = Utc::now();

    for page in pages.iter_mut() {
      if let Some(id) = page["id"].as_str() {
        if id == page_id {
          page["content"] = json!(content);
          page["lines"] = json!(lines);
          page["last_modified"] = json!(now);
          break;
        }
      }
    }
  }

  if let Some(metadata) = note["metadata"].as_object_mut() {
    let now = Utc::now();
    metadata.insert("last_accessed".to_string(), json!(now));
  }
  let updated_str =
    serde_json::to_string_pretty(&note).map_err(|e| format!("Failed to serialize note: {}", e))?;
  write_file(path, &updated_str)
}

#[tauri::command]
pub fn gather_notes() -> Result<Vec<String>, String> {
  let pathname = get_app_data_dir()?;
  let notes_dir = pathname.join("notes");
  if !notes_dir.exists() {
    return Ok(Vec::new());
  }
  let mut files = Vec::new(); // ArrayList is not a standard Rust type
  let mut q = VecDeque::new();

  q.push_back(notes_dir);

  while let Some(curr) = q.pop_front() {
    if curr.is_dir() {
      let entries =
        fs::read_dir(&curr).map_err(|e| format!("Failed to read directory {:?}: {}", curr, e))?; // Add ? to propagate error

      for entry_result in entries {
        let entry = entry_result.map_err(|e| format!("Failed to read entry: {}", e))?;

        let path = entry.path();

        if path.is_dir() {
          q.push_back(path);
        } else if path.is_file() && path.extension().and_then(|ext| ext.to_str()) == Some("json") {
          if let Some(path_str) = path.to_str() {
            let content = read_file(path_str)?;
            files.push(content); // Use push() for Vec, not push_back()
          }
        }
      }
    }
  }
  Ok(files)
}

#[tauri::command]
pub fn get_notes_tree() -> Result<Value, String> {
  let app_dir = get_app_data_dir()?;
  let notes_dir = app_dir.join("notes");
  if !notes_dir.exists() {
    fs::create_dir_all(&notes_dir)
      .map_err(|e| format!("Failed to create notes directory: {}", e))?;
  }
  let notes_dir_str = notes_dir
    .to_str()
    .ok_or_else(|| "Invalid path encoding".to_string())?;

  let tree = build_notes_tree(notes_dir_str)?;
  Ok(tree)
}

fn build_notes_tree(root_path: &str) -> Result<Value, String> {
  let mut tree = json!({ "root": { "children": {} } });
  let root = Path::new(root_path);

  process_directory(&root, &mut tree["root"]["children"], root_path)?;

  Ok(tree)
}

fn process_directory(
  dir_path: &Path,
  current_node: &mut Value,
  root_path: &str,
) -> Result<(), String> {
  let entries = fs::read_dir(dir_path)
    .map_err(|e| format!("Failed to read directory {:?}: {}", dir_path, e))?;

  for entry in entries {
    let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
    let path = entry.path();

    if path.is_dir() {
      let folder_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown");

      (*current_node)[folder_name] = json!({
          "type": "folder",
          "name": folder_name,
          "children": {}
      });

      process_directory(
        &path,
        &mut (*current_node)[folder_name]["children"],
        root_path,
      )?;
    } else if path.is_file() && path.extension().map_or(false, |ext| ext == "json") {
      let filename = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown");

      // Strip the .json extension to get the clean ID
      let clean_id = if filename.ends_with(".json") {
        filename[0..filename.len() - 5].to_string()
      } else {
        filename.to_string()
      };

      match fs::read_to_string(&path) {
        Ok(content) => {
          if let Ok(note_json) = serde_json::from_str::<Value>(&content) {
            let title = note_json["title"].as_str().unwrap_or(&clean_id);

            (*current_node)[clean_id] = json!({  // Use clean_id as the key
                "type": "note",
                "id": clean_id,
                "fileId": filename,  // Keep the full filename for file operations
                "title": title,
                "isModified": false,
                "isPinned": false
            });
          }
        }
        Err(_) => {} // Skip files that can't be read
      }
    }
  }

  Ok(())
}

#[tauri::command]
pub fn update_title(path: &str, new_title: &str) -> Result<(), String> {
  let note = read_file(path)?;

  let mut json: Value = serde_json::from_str(&note).map_err(|e| e.to_string())?;
  json["title"] = json!(new_title);

  let updated_json = serde_json::to_string_pretty(&json).map_err(|e| e.to_string())?;
  write_file(path, &updated_json)?;
  Ok(())
}
