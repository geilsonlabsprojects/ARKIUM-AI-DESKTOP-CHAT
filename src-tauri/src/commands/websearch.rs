use serde::{Deserialize, Serialize};
use reqwest::Client;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SearchResult {
    pub title: String,
    pub url: String,
    pub snippet: String,
    pub domain: String,
    pub published_date: Option<String>,
    pub source: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SearchResponse {
    pub query: String,
    pub results: Vec<SearchResult>,
    pub engine: String,
    pub total_results: u32,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FetchResult {
    pub url: String,
    pub title: String,
    pub content: String,
    pub status_code: u16,
    pub success: bool,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn search_web(
    query: String,
    engine: Option<String>,
    max_results: Option<u32>,
    language: Option<String>,
) -> Result<SearchResponse, String> {
    let engine_name = engine.unwrap_or_else(|| "duckduckgo".to_string());
    let max = max_results.unwrap_or(10);
    let lang = language.unwrap_or_else(|| "en".to_string());

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .user_agent("Mozilla/5.0 (compatible; ARKIUM-AI/1.0; +https://arkium.ai)")
        .build()
        .map_err(|e| format!("HTTP client error: {}", e))?;

    match engine_name.as_str() {
        "duckduckgo" => search_duckduckgo(&client, &query, max, &lang).await,
        "brave" => search_brave(&client, &query, max, &lang).await,
        "searxng" => search_searxng(&client, &query, max).await,
        _ => search_duckduckgo(&client, &query, max, &lang).await,
    }
}

async fn search_duckduckgo(
    client: &Client,
    query: &str,
    max_results: u32,
    lang: &str,
) -> Result<SearchResponse, String> {
    // Use DuckDuckGo HTML endpoint for scraping
    let url = format!(
        "https://html.duckduckgo.com/html/?q={}&kl={}&kp=-1",
        urlencoding::encode(query),
        lang
    );

    let response = client
        .get(&url)
        .header("Accept", "text/html")
        .send()
        .await
        .map_err(|e| format!("Search request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Search returned status: {}", response.status()));
    }

    let html = response.text().await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    let results = parse_duckduckgo_html(&html, max_results);

    Ok(SearchResponse {
        query: query.to_string(),
        results,
        engine: "duckduckgo".to_string(),
        total_results: 0,
        error: None,
    })
}

fn parse_duckduckgo_html(html: &str, max: u32) -> Vec<SearchResult> {
    let mut results = Vec::new();
    let mut count = 0;

    // Simple HTML parsing using regex-like approach
    let result_blocks: Vec<&str> = html.split("class=\"result\"").collect();

    for block in result_blocks.iter().skip(1) {
        if count >= max {
            break;
        }

        // Extract URL
        let url = extract_between(block, "href=\"", "\"")
            .unwrap_or_default()
            .to_string();

        if url.is_empty() || url.starts_with('/') {
            continue;
        }

        // Extract title
        let title = extract_between(block, "class=\"result__a\"", "</a>")
            .and_then(|s| extract_between(s, ">", ""))
            .unwrap_or("Unknown Title")
            .to_string();

        // Extract snippet
        let snippet = extract_between(block, "class=\"result__snippet\"", "</a>")
            .and_then(|s| extract_between(s, ">", ""))
            .unwrap_or("")
            .to_string();

        // Clean HTML entities
        let title = clean_html(&title);
        let snippet = clean_html(&snippet);

        if url.starts_with("http") {
            let domain = extract_domain(&url);
            results.push(SearchResult {
                title: if title.is_empty() { url.clone() } else { title },
                url: url.clone(),
                snippet,
                domain,
                published_date: None,
                source: "duckduckgo".to_string(),
            });
            count += 1;
        }
    }

    results
}

async fn search_brave(
    client: &Client,
    query: &str,
    max_results: u32,
    lang: &str,
) -> Result<SearchResponse, String> {
    let url = format!(
        "https://search.brave.com/search?q={}&count={}",
        urlencoding::encode(query),
        max_results
    );

    let response = client
        .get(&url)
        .header("Accept", "text/html")
        .send()
        .await
        .map_err(|e| format!("Brave search failed: {}", e))?;

    let html = response.text().await
        .map_err(|e| format!("Failed to read Brave response: {}", e))?;

    // Basic parsing of Brave results
    let results = parse_brave_html(&html, max_results);

    Ok(SearchResponse {
        query: query.to_string(),
        results,
        engine: "brave".to_string(),
        total_results: 0,
        error: None,
    })
}

fn parse_brave_html(html: &str, max: u32) -> Vec<SearchResult> {
    let mut results = Vec::new();
    let mut count = 0;

    let blocks: Vec<&str> = html.split("class=\"snippet\"").collect();

    for block in blocks.iter().skip(1) {
        if count >= max { break; }

        let url = extract_between(block, "href=\"", "\"")
            .unwrap_or_default()
            .to_string();

        if url.starts_with("http") {
            let title = extract_between(block, "<span class=\"snippet-title\">", "</span>")
                .unwrap_or("Result")
                .to_string();
            let snippet = extract_between(block, "<p class=\"snippet-description\">", "</p>")
                .unwrap_or("")
                .to_string();
            let domain = extract_domain(&url);

            results.push(SearchResult {
                title: clean_html(&title),
                url,
                snippet: clean_html(&snippet),
                domain,
                published_date: None,
                source: "brave".to_string(),
            });
            count += 1;
        }
    }

    results
}

async fn search_searxng(
    client: &Client,
    query: &str,
    max_results: u32,
) -> Result<SearchResponse, String> {
    // Use public SearXNG instance
    let url = format!(
        "https://searx.be/search?q={}&format=json&categories=general",
        urlencoding::encode(query)
    );

    let response = client
        .get(&url)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| format!("SearXNG search failed: {}", e))?;

    let json: serde_json::Value = response.json().await
        .map_err(|e| format!("Failed to parse SearXNG response: {}", e))?;

    let mut results = Vec::new();
    if let Some(items) = json["results"].as_array() {
        for (i, item) in items.iter().enumerate() {
            if i as u32 >= max_results { break; }

            let url = item["url"].as_str().unwrap_or("").to_string();
            let title = item["title"].as_str().unwrap_or("Result").to_string();
            let content = item["content"].as_str().unwrap_or("").to_string();
            let domain = extract_domain(&url);

            if !url.is_empty() {
                results.push(SearchResult {
                    title,
                    url,
                    snippet: content,
                    domain,
                    published_date: item["publishedDate"].as_str().map(|s| s.to_string()),
                    source: "searxng".to_string(),
                });
            }
        }
    }

    Ok(SearchResponse {
        query: query.to_string(),
        results,
        engine: "searxng".to_string(),
        total_results: json["number_of_results"].as_u64().unwrap_or(0) as u32,
        error: None,
    })
}

#[tauri::command]
pub async fn fetch_url_content(url: String, max_chars: Option<usize>) -> Result<FetchResult, String> {
    let max = max_chars.unwrap_or(10000);

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(20))
        .user_agent("Mozilla/5.0 (compatible; ARKIUM-AI/1.0)")
        .build()
        .map_err(|e| format!("HTTP client error: {}", e))?;

    match client.get(&url).send().await {
        Ok(response) => {
            let status = response.status().as_u16();
            let success = response.status().is_success();

            let html = response.text().await
                .unwrap_or_default();

            let title = extract_html_title(&html);
            let content = extract_text_from_html(&html, max);

            Ok(FetchResult {
                url,
                title,
                content,
                status_code: status,
                success,
                error: None,
            })
        }
        Err(e) => Ok(FetchResult {
            url,
            title: String::new(),
            content: String::new(),
            status_code: 0,
            success: false,
            error: Some(e.to_string()),
        }),
    }
}

fn extract_html_title(html: &str) -> String {
    extract_between(html, "<title>", "</title>")
        .map(|s| clean_html(s))
        .unwrap_or_default()
}

fn extract_text_from_html(html: &str, max_chars: usize) -> String {
    // Remove script and style tags
    let mut text = html.to_string();

    // Remove common non-content sections
    for tag in &["script", "style", "nav", "header", "footer", "iframe", "noscript"] {
        while let Some(start) = text.find(&format!("<{}", tag)) {
            if let Some(end) = text[start..].find(&format!("</{}>", tag)) {
                text.drain(start..start + end + tag.len() + 3);
            } else {
                break;
            }
        }
    }

    // Remove all remaining HTML tags
    let mut result = String::new();
    let mut in_tag = false;
    let mut last_was_space = false;

    for ch in text.chars() {
        match ch {
            '<' => in_tag = true,
            '>' => {
                in_tag = false;
                if !last_was_space {
                    result.push(' ');
                    last_was_space = true;
                }
            }
            _ if !in_tag => {
                if ch.is_whitespace() {
                    if !last_was_space {
                        result.push(' ');
                        last_was_space = true;
                    }
                } else {
                    result.push(ch);
                    last_was_space = false;
                }
            }
            _ => {}
        }
    }

    // Decode HTML entities
    let result = clean_html(&result);

    // Trim and truncate
    let trimmed = result.trim().to_string();
    if trimmed.len() > max_chars {
        trimmed[..max_chars].to_string() + "..."
    } else {
        trimmed
    }
}

fn extract_between<'a>(text: &'a str, start: &str, end: &str) -> Option<&'a str> {
    let start_pos = text.find(start)? + start.len();
    let end_pos = text[start_pos..].find(end).map(|p| start_pos + p)?;
    Some(&text[start_pos..end_pos])
}

fn clean_html(text: &str) -> String {
    text.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&nbsp;", " ")
        .replace("&#x27;", "'")
        .replace("&#x2F;", "/")
        .trim()
        .to_string()
}

fn extract_domain(url: &str) -> String {
    url.split("://")
        .nth(1)
        .unwrap_or(url)
        .split('/')
        .next()
        .unwrap_or(url)
        .split('?')
        .next()
        .unwrap_or(url)
        .to_string()
}
