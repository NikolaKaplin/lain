use tauri::{AppHandle, Manager};

#[tauri::command]
fn lain_window_toggle(visible: bool, app: AppHandle) {
    let lain_window = app.get_webview_window("lain").unwrap();
    if visible {
        lain_window.show().unwrap();
    } else {
        lain_window.hide().unwrap();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let _lain_windo_init = tauri::WebviewWindowBuilder::new(
                app,
                "lain",
                tauri::WebviewUrl::App("/lain".into()),
            )
            .transparent(true)
            .decorations(false)
            .maximized(true)
            .skip_taskbar(true)
            .visible(true)
            .always_on_top(true)
            .fullscreen(true)
            .build()
            .unwrap();

            let _lain_window = app
                .get_webview_window("lain")
                .unwrap()
                .set_ignore_cursor_events(true);

            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![lain_window_toggle])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
