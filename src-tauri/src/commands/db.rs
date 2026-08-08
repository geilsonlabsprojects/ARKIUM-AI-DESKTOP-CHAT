use serde::{Deserialize, Serialize};
use serde_json::Value;
use rusqlite::Connection;
use std::sync::Mutex;
use once_cell::sync::Lazy;

static DB_CONNECTION: Lazy<Mutex<Option<Connection>>> = Lazy::new(|| Mutex::new(None));

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryResult {
    pub rows: Vec<serde_json::Map<String, Value>>,
    pub rows_affected: usize,
    pub last_insert_id: i64,
}

#[tauri::command]
pub async fn init_database(db_path: String) -> Result<bool, String> {
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    conn.execute_batch(crate::database::CREATE_TABLES_SQL)
        .map_err(|e| format!("Failed to create tables: {}", e))?;

    if let Ok(mut db) = DB_CONNECTION.lock() {
        *db = Some(conn);
    }
    Ok(true)
}

#[tauri::command]
pub async fn execute_query(sql: String, params_json: Vec<Value>) -> Result<QueryResult, String> {
    let sql_lower = sql.to_lowercase();
    let trimmed = sql_lower.trim();
    if trimmed.starts_with("drop ") || trimmed.starts_with("truncate ") {
        return Err("DROP and TRUNCATE are not allowed via this API".to_string());
    }

    if let Ok(db) = DB_CONNECTION.lock() {
        if let Some(conn) = db.as_ref() {
            // Convert JSON values to rusqlite-compatible strings for binding
            let bound: Vec<Box<dyn rusqlite::types::ToSql>> = params_json
                .iter()
                .map(|v| -> Box<dyn rusqlite::types::ToSql> {
                    match v {
                        Value::Null => Box::new(rusqlite::types::Null),
                        Value::Bool(b) => Box::new(*b as i64),
                        Value::Number(n) => {
                            if let Some(i) = n.as_i64() {
                                Box::new(i)
                            } else {
                                Box::new(n.as_f64().unwrap_or(0.0))
                            }
                        }
                        Value::String(s) => Box::new(s.clone()),
                        other => Box::new(other.to_string()),
                    }
                })
                .collect();

            let refs: Vec<&dyn rusqlite::types::ToSql> =
                bound.iter().map(|b| b.as_ref()).collect();

            let rows_affected = conn
                .execute(&sql, refs.as_slice())
                .map_err(|e| format!("SQL execute error: {}", e))?;

            return Ok(QueryResult {
                rows: vec![],
                rows_affected,
                last_insert_id: conn.last_insert_rowid(),
            });
        }
    }

    Err("Database not initialized".to_string())
}

#[tauri::command]
pub async fn fetch_query(sql: String) -> Result<Vec<serde_json::Map<String, Value>>, String> {
    if let Ok(db) = DB_CONNECTION.lock() {
        if let Some(conn) = db.as_ref() {
            let mut stmt = conn
                .prepare(&sql)
                .map_err(|e| format!("SQL prepare error: {}", e))?;

            let col_names: Vec<String> = stmt
                .column_names()
                .iter()
                .map(|s| s.to_string())
                .collect();

            let rows = stmt
                .query_map([], |row| {
                    let mut map = serde_json::Map::new();
                    for (i, name) in col_names.iter().enumerate() {
                        let val: rusqlite::types::Value = row.get(i)?;
                        map.insert(name.clone(), rusqlite_value_to_json(val));
                    }
                    Ok(map)
                })
                .map_err(|e| format!("SQL query error: {}", e))?;

            let mut result = Vec::new();
            for row in rows {
                result.push(row.map_err(|e| format!("Row error: {}", e))?);
            }
            return Ok(result);
        }
    }

    Err("Database not initialized".to_string())
}

fn rusqlite_value_to_json(val: rusqlite::types::Value) -> Value {
    match val {
        rusqlite::types::Value::Null => Value::Null,
        rusqlite::types::Value::Integer(i) => Value::Number(i.into()),
        rusqlite::types::Value::Real(f) => serde_json::Number::from_f64(f)
            .map(Value::Number)
            .unwrap_or(Value::Null),
        rusqlite::types::Value::Text(s) => Value::String(s),
        rusqlite::types::Value::Blob(b) => {
            use base64::Engine as _;
            Value::String(base64::engine::general_purpose::STANDARD.encode(&b))
        }
    }
}
