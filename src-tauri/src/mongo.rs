use mongodb::{
  options::{ClientOptions, ServerApi, ServerApiVersion},
  Client,
};
use once_cell::sync::OnceCell;
use std::sync::Arc;

static MONGO_CLIENT: OnceCell<Arc<Client>> = OnceCell::new();
async fn get_client() -> mongodb::error::Result<&'static Arc<Client>> {
  if let Some(client) = MONGO_CLIENT.get() {
    return Ok(client);
  }

  let uri = "uri here";
  let mut client_options = ClientOptions::parse(uri).await?;
  let server_api = ServerApi::builder().version(ServerApiVersion::V1).build();
  client_options.server_api = Some(server_api);
  let client = Client::with_options(client_options)?;

  // Initialize it only once
  match MONGO_CLIENT.set(Arc::new(client)) {
    Ok(_) => Ok(MONGO_CLIENT.get().unwrap()),
    Err(_) => Ok(MONGO_CLIENT.get().unwrap()), // Someone else initialized it first
  }
}
