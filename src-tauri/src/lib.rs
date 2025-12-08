use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::task;

type PID = u32;

struct PtySession {
  master: Box<dyn MasterPty + Send>,
  writer: Box<dyn Write + Send>,
}

type ShellMap = Mutex<HashMap<PID, PtySession>>;

#[derive(Default)]
struct AppStateInner {
  shells: ShellMap,
}

type AppState = Mutex<AppStateInner>;

#[tauri::command]
fn open_shell(
  state: State<'_, AppState>,
  app_handle: AppHandle,
  shell: &str,
  cols: u16,
  rows: u16,
) -> Result<PID, String> {
  // Use the native pty implementation for the system
  let pty_system = native_pty_system();

  // Create a new pty
  let pair = pty_system
    .openpty(PtySize {
      rows,
      cols,
      // Not all systems support pixel_width, pixel_height,
      // but it is good practice to set it to something
      // that matches the size of the selected font.  That
      // is more complex than can be shown here in this
      // brief example though!
      pixel_width: 0,
      pixel_height: 0,
    })
    .map_err(|e| format!("Failed to open pty: {}", e))?;

  // Spawn a shell into the pty
  let cmd = CommandBuilder::new(shell);
  let child = pair
    .slave
    .spawn_command(cmd)
    .map_err(|e| format!("Failed to spawn shell: {}", e))?;

  let pid = child
    .process_id()
    .ok_or("Failed to get process ID".to_string())?;

  let mut reader = pair
    .master
    .try_clone_reader()
    .map_err(|e| format!("Failed to clone reader: {}", e))?;

  let writer = pair
    .master
    .take_writer()
    .map_err(|e| format!("Failed to take writer: {}", e))?;

  let event_name = format!("shell-output-{}", pid);

  task::spawn_blocking(move || {
    let mut buffer = [0u8; 4096];

    loop {
      match reader.read(&mut buffer) {
        Ok(0) => break, // EOF
        Ok(count) => {
          let data = &buffer[..count];

          if let Ok(text) = std::str::from_utf8(data) {
            if let Err(e) = app_handle.emit(&event_name, text) {
              eprintln!("Error emitting data for PID {}: {}", pid, e);
              break;
            }
          }
        }
        Err(e) => {
          eprintln!("Error reading from PTY: {}", e);
          break;
        }
      }
    }

    // Clean up the session state when the shell exits
    let _ = app_handle.emit("shell_closed", pid);
  });

  state.lock().unwrap().shells.lock().unwrap().insert(
    pid,
    PtySession {
      master: pair.master,
      writer,
    },
  );

  return Ok(pid);
}

#[tauri::command]
fn write_to_shell(state: State<'_, AppState>, pid: PID, text: &str) -> Result<(), String> {
  let state_guard = state.lock().unwrap();
  let mut shells = state_guard.shells.lock().unwrap();

  let session = shells
    .get_mut(&pid)
    .ok_or_else(|| format!("No shell found with PID {}", pid))?;

  session
    .writer
    .write_all(text.as_bytes())
    .map_err(|e| format!("Failed to write to shell: {}", e))?;

  return Ok(());
}

#[tauri::command]
fn resize_shell(state: State<'_, AppState>, pid: PID, cols: u16, rows: u16) -> Result<(), String> {
  let state_guard = state.lock().unwrap();
  let mut shells = state_guard.shells.lock().unwrap();

  let session = shells
    .get_mut(&pid)
    .ok_or_else(|| format!("No shell found with PID {}", pid))?;

  session
    .master
    .resize(PtySize {
      rows,
      cols,
      pixel_width: 0,
      pixel_height: 0,
    })
    .map_err(|e| format!("Failed to resize shell: {}", e))?;

  Ok(())
}

#[tauri::command]
async fn close_shell(state: State<'_, AppState>, pid: PID) -> Result<(), String> {
  let state_guard = state.lock().unwrap();
  let mut shells = state_guard.shells.lock().unwrap();

  let session = shells
    .remove(&pid)
    .ok_or_else(|| format!("No shell found with PID {}", pid))?;
  drop(session);

  Ok(())
}

pub fn run() {
  // Initialise tokio runtime for async tasks
  tokio::runtime::Builder::new_multi_thread()
    .enable_all()
    .build()
    .unwrap()
    .block_on(async {
      tauri::Builder::default()
        .setup(|app| {
          app.manage(AppState::default());
          return Ok(());
        })
        .plugin(tauri_plugin_os::init())
        // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
        .invoke_handler(tauri::generate_handler![
          open_shell,
          close_shell,
          write_to_shell,
          resize_shell
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
    });
}
