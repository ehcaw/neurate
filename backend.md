# FastNotes Backend Architecture

## 1. File System Core (Already Implemented)
- ✅ Reading files
- ✅ Writing files
- ✅ Creating directories
- ✅ Path existence checks
- ✅ Moving files/directories
- ✅ Deleting files/directories
- ✅ Directory size calculation

## 2. Note Management System
- Note CRUD operations
- Note metadata handling
- Version history management
- Tags and categorization

## 3. Media Handling
- Image processing and optimization
- File conversion utilities
- Drawing storage and SVG handling
- Media caching

## 4. Search and Indexing
- Full-text indexing engine
- Metadata indexing
- Real-time index updates
- Tag-based filtering system

## 5. Sync Engine
- Change detection
- Conflict resolution
- Delta-based synchronization
- Encryption layer

## 6. Collaboration Services
- WebSocket server management
- Operational transform handling
- Presence detection
- Permission management

## 7. AI Integration Layer
- Embedding generation
- Vectorization of notes
- Similarity search
- Local LLM integration

## 8. User Preferences & Configuration
- Settings management
- Theme handling
- Keyboard shortcuts configuration
- UI state persistence

## 9. Template System
- Template storage and retrieval
- Template instantiation
- Custom template variables
```

## Implementation Progression

I recommend implementing these modules in the following order:

### Phase 1: Foundation (Focus on Efficiency)

1. **Note Management System**
   ```rust
   // src-tauri/src/notes.rs

   use serde::{Deserialize, Serialize};
   use std::path::{Path, PathBuf};

   #[derive(Debug, Serialize, Deserialize)]
   pub struct Note {
       id: String,
       title: String,
       content: String,
       created_at: String,
       updated_at: String,
       tags: Vec<String>,
       // Add fields as needed
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
   pub fn list_notes(app_handle: tauri::AppHandle, folder_path: Option<&str>) -> Result<Vec<Note>, String> {
       // List all notes in a directory
   }
   ```

2. **User Preferences & Configuration**
   ```rust
   // src-tauri/src/config.rs

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
   ```

### Phase 2: Enhanced File Management

3. **File Tree Management**
   ```rust
   // src-tauri/src/filetree.rs

   use serde::{Deserialize, Serialize};

   #[derive(Debug, Serialize, Deserialize)]
   pub struct FileTreeNode {
       name: String,
       path: String,
       is_dir: bool,
       children: Option<Vec<FileTreeNode>>,
   }

   #[tauri::command]
   pub fn get_file_tree(root_path: &str, depth: Option<u32>) -> Result<FileTreeNode, String> {
       // Generate file tree structure
   }

   #[tauri::command]
   pub fn create_file_structure(structure: FileTreeNode) -> Result<(), String> {
       // Create directory structure based on tree
   }
   ```

4. **Search and Indexing**
   ```rust
   // src-tauri/src/search.rs

   use tantivy::{Index, Document};

   #[tauri::command]
   pub fn index_notes(app_handle: tauri::AppHandle) -> Result<(), String> {
       // Build search index
   }

   #[tauri::command]
   pub fn search_notes(query: &str) -> Result<Vec<String>, String> {
       // Search indexed notes
   }
   ```

### Phase 3: Rich Media Support

5. **Media Handling**
   ```rust
   // src-tauri/src/media.rs

   #[derive(Debug, Serialize, Deserialize)]
   pub struct ImageMetadata {
       width: u32,
       height: u32,
       format: String,
   }

   #[tauri::command]
   pub fn optimize_image(path: &str, quality: u8) -> Result<(), String> {
       // Optimize image for storage
   }

   #[tauri::command]
   pub fn extract_image_metadata(path: &str) -> Result<ImageMetadata, String> {
       // Get image dimensions and format
   }
   ```

### Phase 4: Collaboration and Sync

6. **Sync Engine**
   ```rust
   // src-tauri/src/sync.rs

   #[tauri::command]
   pub fn detect_changes(local_dir: &str, remote_dir: &str) -> Result<Vec<String>, String> {
       // Identify files that need syncing
   }

   #[tauri::command]
   pub fn sync_files(app_handle: tauri::AppHandle, files: Vec<String>) -> Result<(), String> {
       // Perform synchronization
   }
   ```

7. **WebSocket Handler**
   ```rust
   // src-tauri/src/websocket.rs

   #[tauri::command]
   pub fn start_collaboration_server(note_id: &str) -> Result<String, String> {
       // Start WebSocket server for collaboration
   }

   #[tauri::command]
   pub fn join_collaboration_session(session_id: &str) -> Result<(), String> {
       // Connect to existing session
   }
   ```

### Phase 5: AI Integration

8. **LLM Integration**
   ```rust
   // src-tauri/src/llm.rs

   #[tauri::command]
   pub fn generate_embeddings(text: &str) -> Result<Vec<f32>, String> {
       // Generate vector embeddings for semantic search
   }

   #[tauri::command]
   pub fn suggest_connections(note_id: &str) -> Result<Vec<String>, String> {
       // Find related notes based on content
   }
