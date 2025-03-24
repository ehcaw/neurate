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
