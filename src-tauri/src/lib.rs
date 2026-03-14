#[tauri::command]
async fn get_server_time() -> String {
    // Attempt to get time from WorldTimeAPI (Asia/Seoul timezone)
    let client = reqwest::Client::new();
    if let Ok(res) = client.get("http://worldtimeapi.org/api/timezone/Asia/Seoul").send().await {
        if let Ok(json) = res.json::<serde_json::Value>().await {
            if let Some(datetime) = json["datetime"].as_str() {
                // "2026-03-13T10:20:30.123456+09:00"
                if datetime.len() >= 10 {
                    return datetime[0..10].to_string();
                }
            }
        }
    }
    
    // Return empty string if HTTP fetch fails; frontend will handle fallback
    "".to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![get_server_time])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .plugin(tauri_plugin_fs::init())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
