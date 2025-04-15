// src-tauri/src/docker.rs
use std::process::Command;

// --- Helper functions ---

pub fn start_container(container_name: &str) -> Result<(), String> {
  let output = Command::new("docker")
    .args(["start", container_name])
    .output()
    .map_err(|e| format!("Failed to execute docker command: {}", e))?;

  if output.status.success() {
    Ok(())
  } else {
    let error = String::from_utf8_lossy(&output.stderr);
    Err(format!("Docker start failed: {}", error))
  }
}

pub fn stop_container(container_name: &str) -> Result<(), String> {
  println!("Attempting to stop container: {}", container_name); // For debugging
  let output = Command::new("docker")
    .args(["stop", container_name])
    .output()
    .map_err(|e| format!("Failed to execute docker stop command: {}", e))?;

  if output.status.success() {
    println!("Successfully stopped container: {}", container_name); // For debugging
    Ok(())
  } else {
    // It's possible the container was already stopped, which might show in stderr.
    // You could check stderr for specific messages if needed, but often just logging is okay.
    let stderr = String::from_utf8_lossy(&output.stderr);
    // Don't necessarily return an error if it was already stopped.
    // Depending on requirements, you might ignore certain errors.
    eprintln!(
      "Docker stop command for '{}' finished with status: {:?}. Stderr: {}",
      container_name,
      output.status.code(),
      stderr
    );
    // For now, let's return Ok even if it failed, as it might already be stopped.
    // Adjust error handling based on whether you *need* it to be running before stopping.
    Ok(())
    // Or, if you want to propagate the error strictly:
    // Err(format!("Docker stop failed: {}", stderr))
  }
}

pub fn check_container_exists(container_name: &str) -> bool {
  let output = Command::new("docker")
    .args([
      "ps",
      "-a",
      "--filter",
      &format!("name={}", container_name),
      "--format",
      "{{.Names}}",
    ])
    .output();

  match output {
    Ok(output) => {
      let stdout = String::from_utf8_lossy(&output.stdout);
      !stdout.trim().is_empty()
    }
    Err(_) => false,
  }
}

pub fn create_container_if_needed(
  image: &str,
  container_name: &str,
  ports: &[(&str, &str)],
) -> Result<(), String> {
  if !check_container_exists(container_name) {
    let port_mappings: Vec<String> = ports
      .iter()
      .map(|(host, container)| format!("{}:{}", host, container))
      .collect();
    let mut args = vec!["run", "-d", "--name", container_name];

    // Add port mappings
    for mapping in &port_mappings {
      args.push("-p");
      args.push(mapping.as_str());
    }

    args.push(image);

    let output = Command::new("docker")
      .args(&args)
      .output()
      .map_err(|e| format!("Failed to create container: {}", e))?;

    if !output.status.success() {
      let error = String::from_utf8_lossy(&output.stderr);
      return Err(format!("Container creation failed: {}", error));
    }
  } else {
    // If container exists, try to start it
    start_container(container_name)?;
  }

  Ok(())
}

// --- Tauri commands ---

#[tauri::command]
pub fn start_docker_container(container_name: String) -> Result<(), String> {
  // Call the helper function directly
  start_container(&container_name)
}

#[tauri::command]
pub fn setup_and_start_container(
  image: String,
  container_name: String,
  ports: Vec<(String, String)>,
) -> Result<(), String> {
  let ports_ref: Vec<(&str, &str)> = ports
    .iter()
    .map(|(host, container)| (host.as_str(), container.as_str()))
    .collect();

  // Call the helper function directly
  create_container_if_needed(&image, &container_name, &ports_ref)
}
