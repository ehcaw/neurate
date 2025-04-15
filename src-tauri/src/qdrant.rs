use crate::{fs::get_app_data_dir, ollama::embed_note};
use notify::{
  Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Result as NotifyResult, Watcher,
};
use qdrant_client::{
  qdrant::{
    CreateCollectionBuilder, Distance, PointStruct, UpsertPointsBuilder, VectorParamsBuilder,
  },
  Qdrant, QdrantError,
};
use std::error::Error;
use std::fs::read_to_string;
use std::sync::OnceLock;
use tokio::{spawn, sync::mpsc};

static QDRANT_CLIENT: OnceLock<Qdrant> = OnceLock::new();
fn get_qdrant_client() -> &'static Qdrant {
  QDRANT_CLIENT.get_or_init(|| Qdrant::from_url("http://localhost:6334").build().unwrap())
}

pub async fn check_collection_existence(name: &str) -> Result<bool, QdrantError> {
  let client = get_qdrant_client();
  // The '?' operator now correctly propagates QdrantError
  let result = client.collection_exists(name).await?;
  // Wrap the boolean result in Ok
  Ok(result)
}

pub async fn add_embedding(vectors: Vec<PointStruct>) -> Result<(), Box<dyn Error>> {
  let qdrant_client = get_qdrant_client(); // Propagate error if client creation fails
  let response = qdrant_client
    .upsert_points(UpsertPointsBuilder::new("notes", vectors).wait(true))
    .await?;
  println!("Successfully upserted points: {:?}", response);
  Ok(())
}

pub async fn create_collection(name: &str) -> Result<(), String> {
  let client = get_qdrant_client();
  client
    .create_collection(
      CreateCollectionBuilder::new(name)
        .vectors_config(VectorParamsBuilder::new(384, Distance::Dot)),
    )
    .await
    .unwrap();
  Ok(())
}
async fn setup_directory_watcher_task() -> Result<(), String> {
  let app_dir = get_app_data_dir()?; // Use ? for error handling
  let (tx, mut rx) = mpsc::channel::<Event>(100); // Use tokio's mpsc channel

  let mut watcher = RecommendedWatcher::new(
    move |res: NotifyResult<Event>| {
      match res {
        Ok(event) => {
          // Use try_send to avoid blocking the watcher thread
          if let Err(e) = tx.try_send(event) {
            eprintln!("Error sending event (channel full or closed): {}", e);
          }
        }
        Err(e) => {
          eprintln!("Watcher error: {}", e);
        }
      }
    },
    Config::default(),
  )
  .map_err(|e| format!("Failed to create directory watcher: {}", e))?;

  watcher
    .watch(&app_dir, RecursiveMode::Recursive)
    .map_err(|e| {
      format!(
        "Failed to start watching path '{}': {}",
        app_dir.display(),
        e
      )
    })?;

  println!("Directory watcher started for: {}", app_dir.display());

  tokio::spawn(async move {
    // Keep the watcher alive for the duration of the task
    let _watcher = watcher;
    let client = get_qdrant_client();

    while let Some(event) = rx.recv().await {
      // Consider handling multiple paths more efficiently if needed
      // (e.g., sequential processing or bounded concurrency)
      match event.kind {
        EventKind::Create(_) | EventKind::Modify(_) => {
          // Handle Modify too? Decide if re-embedding is needed.
          for pathbuf in event.paths {
            // Spawn a task for each file to process concurrently
            tokio::spawn(async move {
              let path_str = pathbuf.to_string_lossy().into_owned();
              let content = read_to_string(&pathbuf).unwrap();
              match embed_note(&content).await {
                Ok(result) => {
                  let mut points = Vec::new();
                  for n in 1..result.len() {
                    let point_id = format!("{}-{}", path_str, n.to_string());
                    let payload_data = [("index", (n as i64).into())];
                    points.push(PointStruct::new(point_id, result[n].clone(), payload_data));
                  }
                  let response = client
                    .upsert_points(UpsertPointsBuilder::new("notes", points).wait(true))
                    .await;
                  dbg!(response);
                }
                Err(e) => eprintln!("Error embedding this note: {}", &path_str),
              }
            });
          }
        }
        EventKind::Remove(_) => {
          for pathbuf in event.paths {
            let path_str = pathbuf.to_string_lossy().into_owned();
            println!(
              "File removed, potentially remove embedding for: {}",
              path_str
            );
            // Add logic here to remove the corresponding embedding from your index
          }
        }
        _ => {
          // Ignore other event types (Access, Other, etc.)
        }
      }
    }
    println!("Directory watcher channel closed.");
  });

  Ok(())
}

#[tauri::command]
async fn start_watching(window: tauri::Window) -> Result<(), String> {
  setup_directory_watcher_task().await
}
