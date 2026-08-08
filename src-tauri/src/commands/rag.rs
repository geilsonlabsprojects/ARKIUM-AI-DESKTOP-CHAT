use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use once_cell::sync::Lazy;
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DocumentChunk {
    pub id: String,
    pub document_id: String,
    pub content: String,
    pub chunk_index: usize,
    pub metadata: HashMap<String, String>,
    pub embedding: Vec<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IndexedDocument {
    pub id: String,
    pub name: String,
    pub path: String,
    pub doc_type: String,
    pub chunks_count: usize,
    pub indexed_at: String,
    pub size: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SearchResultRag {
    pub chunk: DocumentChunk,
    pub score: f64,
    pub document_name: String,
    pub document_path: String,
}

// In-memory vector store
static VECTOR_STORE: Lazy<Mutex<Vec<DocumentChunk>>> =
    Lazy::new(|| Mutex::new(Vec::new()));

static INDEXED_DOCS: Lazy<Mutex<Vec<IndexedDocument>>> =
    Lazy::new(|| Mutex::new(Vec::new()));

#[tauri::command]
pub async fn index_document(
    path: String,
    name: String,
    content: String,
    doc_type: String,
    embeddings: Vec<Vec<f64>>,
    chunks: Vec<String>,
) -> Result<IndexedDocument, String> {
    let doc_id = uuid::Uuid::new_v4().to_string();
    let indexed_at = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    // Store chunks with embeddings
    if let Ok(mut store) = VECTOR_STORE.lock() {
        for (i, (chunk, embedding)) in chunks.iter().zip(embeddings.iter()).enumerate() {
            store.push(DocumentChunk {
                id: uuid::Uuid::new_v4().to_string(),
                document_id: doc_id.clone(),
                content: chunk.clone(),
                chunk_index: i,
                metadata: {
                    let mut m = HashMap::new();
                    m.insert("path".to_string(), path.clone());
                    m.insert("name".to_string(), name.clone());
                    m.insert("type".to_string(), doc_type.clone());
                    m
                },
                embedding: embedding.clone(),
            });
        }
    }

    let doc = IndexedDocument {
        id: doc_id,
        name: name.clone(),
        path: path.clone(),
        doc_type,
        chunks_count: chunks.len(),
        indexed_at,
        size: content.len() as u64,
    };

    if let Ok(mut docs) = INDEXED_DOCS.lock() {
        docs.push(doc.clone());
    }

    Ok(doc)
}

#[tauri::command]
pub async fn search_documents(
    query_embedding: Vec<f64>,
    max_results: Option<usize>,
    threshold: Option<f64>,
) -> Result<Vec<SearchResultRag>, String> {
    let max = max_results.unwrap_or(5);
    let min_score = threshold.unwrap_or(0.3);

    let store = VECTOR_STORE.lock()
        .map_err(|e| format!("Lock error: {}", e))?;

    let indexed = INDEXED_DOCS.lock()
        .map_err(|e| format!("Lock error: {}", e))?;

    let mut scored: Vec<(f64, DocumentChunk)> = store
        .iter()
        .map(|chunk| {
            let score = cosine_similarity(&query_embedding, &chunk.embedding);
            (score, chunk.clone())
        })
        .filter(|(score, _)| *score >= min_score)
        .collect();

    scored.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));
    scored.truncate(max);

    let results = scored.into_iter().map(|(score, chunk)| {
        let doc_name = chunk.metadata.get("name").cloned().unwrap_or_default();
        let doc_path = chunk.metadata.get("path").cloned().unwrap_or_default();
        SearchResultRag {
            chunk,
            score,
            document_name: doc_name,
            document_path: doc_path,
        }
    }).collect();

    Ok(results)
}

#[tauri::command]
pub async fn list_indexed_documents() -> Result<Vec<IndexedDocument>, String> {
    let docs = INDEXED_DOCS.lock()
        .map_err(|e| format!("Lock error: {}", e))?;
    Ok(docs.clone())
}

#[tauri::command]
pub async fn delete_indexed_document(document_id: String) -> Result<bool, String> {
    if let Ok(mut store) = VECTOR_STORE.lock() {
        store.retain(|chunk| chunk.document_id != document_id);
    }

    if let Ok(mut docs) = INDEXED_DOCS.lock() {
        let len_before = docs.len();
        docs.retain(|doc| doc.id != document_id);
        return Ok(docs.len() < len_before);
    }

    Ok(false)
}

fn cosine_similarity(a: &[f64], b: &[f64]) -> f64 {
    if a.len() != b.len() || a.is_empty() {
        return 0.0;
    }

    let dot_product: f64 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let magnitude_a: f64 = a.iter().map(|x| x * x).sum::<f64>().sqrt();
    let magnitude_b: f64 = b.iter().map(|x| x * x).sum::<f64>().sqrt();

    if magnitude_a == 0.0 || magnitude_b == 0.0 {
        return 0.0;
    }

    dot_product / (magnitude_a * magnitude_b)
}
