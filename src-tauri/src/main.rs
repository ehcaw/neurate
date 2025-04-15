// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod docker;
mod fs;

fn main() {
  let image = "qdrant/qdrant".to_string();
  let container_name = "jot_qdrant_instance".to_string();
  let ports = vec![
    ("6333".to_string(), "6333".to_string()),
    ("6334".to_string(), "6334".to_string()),
  ];
  match docker::setup_and_start_container(image, container_name, ports) {
    Ok(()) => {
      println!("Container started successfully");
    }
    Err(e) => {
      eprintln!("Failed to set up container: {}", e)
    }
  }
  elab_lib::run()
}
