mod commands;
mod database;
mod tools;

use tauri::Manager;
use log::info;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();
    info!("Starting ARKIUM AI Desktop Chat");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_upload::init())
        .invoke_handler(tauri::generate_handler![
            // System commands
            commands::system::get_system_info,
            commands::system::check_ollama_status,
            commands::system::get_hardware_info,
            // File commands
            commands::files::read_file_content,
            commands::files::write_file_content,
            commands::files::list_directory_contents,
            commands::files::create_directory_cmd,
            commands::files::delete_file_cmd,
            commands::files::delete_directory_cmd,
            commands::files::copy_file_cmd,
            commands::files::file_exists,
            commands::files::get_file_metadata,
            commands::files::search_files,
            // ZIP commands
            commands::zip::create_zip_archive,
            commands::zip::extract_zip_archive,
            commands::zip::list_zip_contents,
            // Terminal commands
            commands::terminal::execute_command,
            commands::terminal::get_command_history,
            // Security commands
            commands::security::check_permission,
            commands::security::request_permission,
            // Database commands
            commands::db::init_database,
            commands::db::execute_query,
            commands::db::fetch_query,
            // Web search commands
            commands::websearch::search_web,
            commands::websearch::fetch_url_content,
            // Ollama commands
            commands::ollama::list_ollama_models,
            commands::ollama::pull_ollama_model,
            commands::ollama::delete_ollama_model,
            commands::ollama::get_ollama_model_info,
            commands::ollama::chat_ollama,
            commands::ollama::generate_ollama,
            commands::ollama::generate_embeddings,
            // RAG commands
            commands::rag::index_document,
            commands::rag::search_documents,
            commands::rag::list_indexed_documents,
            commands::rag::delete_indexed_document,
        ])
        .setup(|app| {
            info!("ARKIUM AI Desktop Chat setup complete");
            let app_handle = app.handle().clone();
            tokio::spawn(async move {
                if let Err(e) = database::init_app_database(&app_handle).await {
                    log::error!("Database init error: {}", e);
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
