use ollama_rs::{generation::embeddings::request::GenerateEmbeddingsRequest, Ollama};
use std::sync::OnceLock;

use thiserror::Error; // Using thiserror for cleaner error handling

// Define a custom error type for this function
#[derive(Error, Debug)]
pub enum EmbeddingError {
  #[error("Ollama API error: {0}")]
  OllamaError(#[from] ollama_rs::error::OllamaError),
  #[error("Embeddings not found in Ollama response")]
  EmbeddingsNotFound,
}

static OLLAMA_CLIENT: OnceLock<Ollama> = OnceLock::new();
fn get_ollama_client() -> &'static Ollama {
  OLLAMA_CLIENT.get_or_init(|| Ollama::new("http://localhost".to_string(), 11434))
}

pub async fn embed_note(content: &str) -> Result<Vec<Vec<f32>>, EmbeddingError> {
  let request = GenerateEmbeddingsRequest::new("granite-embedding:30m".to_string(), content.into());
  let ollama = get_ollama_client();
  let res = ollama.generate_embeddings(request).await.unwrap();
  Ok(res.embeddings)
}
