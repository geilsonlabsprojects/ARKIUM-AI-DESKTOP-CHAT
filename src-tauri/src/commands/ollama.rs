use serde::{Deserialize, Serialize};
use reqwest::Client;
use serde_json::{json, Value};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OllamaModel {
    pub name: String,
    pub modified_at: String,
    pub size: u64,
    pub digest: String,
    pub details: Option<ModelDetails>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModelDetails {
    pub format: Option<String>,
    pub family: Option<String>,
    pub families: Option<Vec<String>>,
    pub parameter_size: Option<String>,
    pub quantization_level: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
    pub images: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    pub stream: bool,
    pub options: Option<ModelOptions>,
    pub system: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModelOptions {
    pub temperature: Option<f64>,
    pub top_p: Option<f64>,
    pub top_k: Option<i64>,
    pub num_ctx: Option<i64>,
    pub num_predict: Option<i64>,
    pub stop: Option<Vec<String>>,
    pub seed: Option<i64>,
    pub repeat_penalty: Option<f64>,
    pub presence_penalty: Option<f64>,
    pub frequency_penalty: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatResponse {
    pub model: String,
    pub created_at: String,
    pub message: ChatMessage,
    pub done: bool,
    pub done_reason: Option<String>,
    pub total_duration: Option<u64>,
    pub load_duration: Option<u64>,
    pub prompt_eval_count: Option<u64>,
    pub eval_count: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GenerateRequest {
    pub model: String,
    pub prompt: String,
    pub system: Option<String>,
    pub stream: bool,
    pub options: Option<ModelOptions>,
    pub context: Option<Vec<i64>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GenerateResponse {
    pub model: String,
    pub created_at: String,
    pub response: String,
    pub done: bool,
    pub context: Option<Vec<i64>>,
    pub total_duration: Option<u64>,
    pub eval_count: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PullProgress {
    pub status: String,
    pub digest: Option<String>,
    pub total: Option<u64>,
    pub completed: Option<u64>,
}

#[tauri::command]
pub async fn list_ollama_models(api_url: Option<String>) -> Result<Vec<OllamaModel>, String> {
    let base_url = api_url.unwrap_or_else(|| "http://localhost:11434".to_string());
    let client = build_client()?;

    let response = client
        .get(&format!("{}/api/tags", base_url))
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Ollama: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Ollama API error: {}", response.status()));
    }

    let data: Value = response.json().await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let models: Vec<OllamaModel> = data["models"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .map(|m| OllamaModel {
            name: m["name"].as_str().unwrap_or("").to_string(),
            modified_at: m["modified_at"].as_str().unwrap_or("").to_string(),
            size: m["size"].as_u64().unwrap_or(0),
            digest: m["digest"].as_str().unwrap_or("").to_string(),
            details: m["details"].as_object().map(|d| ModelDetails {
                format: d["format"].as_str().map(|s| s.to_string()),
                family: d["family"].as_str().map(|s| s.to_string()),
                families: d["families"].as_array().map(|a| {
                    a.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect()
                }),
                parameter_size: d["parameter_size"].as_str().map(|s| s.to_string()),
                quantization_level: d["quantization_level"].as_str().map(|s| s.to_string()),
            }),
        })
        .collect();

    Ok(models)
}

#[tauri::command]
pub async fn get_ollama_model_info(
    model_name: String,
    api_url: Option<String>,
) -> Result<Value, String> {
    let base_url = api_url.unwrap_or_else(|| "http://localhost:11434".to_string());
    let client = build_client()?;

    let response = client
        .post(&format!("{}/api/show", base_url))
        .json(&json!({ "name": model_name }))
        .send()
        .await
        .map_err(|e| format!("Failed to get model info: {}", e))?;

    response.json::<Value>().await
        .map_err(|e| format!("Failed to parse model info: {}", e))
}

#[tauri::command]
pub async fn pull_ollama_model(
    model_name: String,
    api_url: Option<String>,
) -> Result<String, String> {
    let base_url = api_url.unwrap_or_else(|| "http://localhost:11434".to_string());
    let client = build_client()?;

    // Initiate pull - returns streaming progress
    let response = client
        .post(&format!("{}/api/pull", base_url))
        .json(&json!({
            "name": model_name,
            "stream": false
        }))
        .timeout(std::time::Duration::from_secs(3600)) // 1 hour timeout for large models
        .send()
        .await
        .map_err(|e| format!("Failed to pull model: {}", e))?;

    if response.status().is_success() {
        Ok(format!("Model '{}' pull initiated successfully", model_name))
    } else {
        let err = response.text().await.unwrap_or_default();
        Err(format!("Failed to pull model: {}", err))
    }
}

#[tauri::command]
pub async fn delete_ollama_model(
    model_name: String,
    api_url: Option<String>,
) -> Result<bool, String> {
    let base_url = api_url.unwrap_or_else(|| "http://localhost:11434".to_string());
    let client = build_client()?;

    let response = client
        .delete(&format!("{}/api/delete", base_url))
        .json(&json!({ "name": model_name }))
        .send()
        .await
        .map_err(|e| format!("Failed to delete model: {}", e))?;

    Ok(response.status().is_success())
}

#[tauri::command]
pub async fn chat_ollama(
    request: ChatRequest,
    api_url: Option<String>,
) -> Result<ChatResponse, String> {
    let base_url = api_url.unwrap_or_else(|| "http://localhost:11434".to_string());
    let client = build_client()?;

    let mut body = json!({
        "model": request.model,
        "messages": request.messages,
        "stream": false,
    });

    if let Some(options) = &request.options {
        body["options"] = serde_json::to_value(options).unwrap_or_default();
    }
    if let Some(system) = &request.system {
        body["system"] = json!(system);
    }

    let response = client
        .post(&format!("{}/api/chat", base_url))
        .json(&body)
        .timeout(std::time::Duration::from_secs(300))
        .send()
        .await
        .map_err(|e| format!("Chat request failed: {}", e))?;

    if !response.status().is_success() {
        let err = response.text().await.unwrap_or_default();
        return Err(format!("Ollama chat error: {}", err));
    }

    response.json::<ChatResponse>().await
        .map_err(|e| format!("Failed to parse chat response: {}", e))
}

#[tauri::command]
pub async fn generate_ollama(
    request: GenerateRequest,
    api_url: Option<String>,
) -> Result<GenerateResponse, String> {
    let base_url = api_url.unwrap_or_else(|| "http://localhost:11434".to_string());
    let client = build_client()?;

    let mut body = json!({
        "model": request.model,
        "prompt": request.prompt,
        "stream": false,
    });

    if let Some(system) = &request.system {
        body["system"] = json!(system);
    }
    if let Some(options) = &request.options {
        body["options"] = serde_json::to_value(options).unwrap_or_default();
    }
    if let Some(context) = &request.context {
        body["context"] = json!(context);
    }

    let response = client
        .post(&format!("{}/api/generate", base_url))
        .json(&body)
        .timeout(std::time::Duration::from_secs(300))
        .send()
        .await
        .map_err(|e| format!("Generate request failed: {}", e))?;

    if !response.status().is_success() {
        let err = response.text().await.unwrap_or_default();
        return Err(format!("Ollama generate error: {}", err));
    }

    response.json::<GenerateResponse>().await
        .map_err(|e| format!("Failed to parse generate response: {}", e))
}

#[tauri::command]
pub async fn generate_embeddings(
    model: String,
    text: String,
    api_url: Option<String>,
) -> Result<Vec<f64>, String> {
    let base_url = api_url.unwrap_or_else(|| "http://localhost:11434".to_string());
    let client = build_client()?;

    let response = client
        .post(&format!("{}/api/embeddings", base_url))
        .json(&json!({
            "model": model,
            "prompt": text,
        }))
        .timeout(std::time::Duration::from_secs(60))
        .send()
        .await
        .map_err(|e| format!("Embeddings request failed: {}", e))?;

    if !response.status().is_success() {
        let err = response.text().await.unwrap_or_default();
        return Err(format!("Embeddings error: {}", err));
    }

    let data: Value = response.json().await
        .map_err(|e| format!("Failed to parse embeddings response: {}", e))?;

    data["embedding"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_f64())
                .collect()
        })
        .ok_or_else(|| "No embeddings in response".to_string())
}

fn build_client() -> Result<Client, String> {
    Client::builder()
        .timeout(std::time::Duration::from_secs(300))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))
}
