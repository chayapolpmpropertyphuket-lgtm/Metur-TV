#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

APP_ID="com.meturtv.app"
DEFAULT_PORT="5555"
REPORT_ROOT="$HOME/metur-tv-lab/reports"
mkdir -p "$REPORT_ROOT"

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1"; exit 1; }; }
adb_ready() {
  need adb
  local state
  state="$(adb get-state 2>/dev/null || true)"
  if [ "$state" != "device" ]; then
    echo "ADB device is not authorized/connected."
    echo "Connect TV first: adb connect TV_IP:$DEFAULT_PORT"
    adb devices -l
    return 1
  fi
}
choose_device() {
  local count
  count="$(adb devices | awk 'NR>1 && $2=="device" {n++} END {print n+0}')"
  if [ "$count" -gt 1 ]; then
    echo "More than one ADB device. Set ANDROID_SERIAL explicitly."
    adb devices -l
    return 1
  fi
  adb_ready
}
stamp() { date '+%Y%m%d-%H%M%S'; }

connect_tv() {
  read -r -p "TCL TV IP address (example 192.168.1.115): " ip
  [[ "$ip" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] || { echo "Invalid IPv4 address"; return 1; }
  adb connect "$ip:$DEFAULT_PORT"
  adb devices -l
}

device_info() {
  choose_device
  echo "=== Device ==="
  adb shell getprop ro.product.manufacturer
  adb shell getprop ro.product.model
  echo "Android: $(adb shell getprop ro.build.version.release | tr -d '\r')"
  echo "Serial: $(adb get-serialno)"
  echo "=== Metur package ==="
  adb shell pm path "$APP_ID" || true
  adb shell dumpsys package "$APP_ID" | grep -E 'versionName=|versionCode=|firstInstallTime|lastUpdateTime' | head -n 8 || true
}

launch_app() {
  choose_device
  adb shell monkey -p "$APP_ID" -c android.intent.category.LEANBACK_LAUNCHER 1
}

stop_app() {
  choose_device
  adb shell am force-stop "$APP_ID"
}

nav_test() {
  choose_device
  local dir="$REPORT_ROOT/nav-test-$(stamp)"
  mkdir -p "$dir"
  echo "Starting 4-way/OK/Back smoke test. Watch the TV; press Ctrl+C to stop."
  adb logcat -c
  for key in 19 20 21 22 23 4; do
    case "$key" in 19) name=UP;;20) name=DOWN;;21) name=LEFT;;22) name=RIGHT;;23) name=OK;;4) name=BACK;; esac
    echo "Sending $name"
    adb shell input keyevent "$key"
    sleep 1
    adb exec-out screencap -p > "$dir/$name.png" || true
    adb shell dumpsys window | grep -E 'mCurrentFocus|mFocusedApp' | head -n 2 > "$dir/$name-focus.txt" || true
  done
  adb logcat -d -v threadtime > "$dir/logcat.txt"
  echo "Saved test evidence: $dir"
}

collect_report() {
  choose_device
  local dir="$REPORT_ROOT/report-$(stamp)"
  mkdir -p "$dir"
  echo "Collecting device diagnostics..."
  {
    echo "Metur TV Remote Lab report"
    echo "Collected: $(date -Iseconds)"
    echo "Device model: $(adb shell getprop ro.product.model | tr -d '\r')"
    echo "Manufacturer: $(adb shell getprop ro.product.manufacturer | tr -d '\r')"
    echo "Android: $(adb shell getprop ro.build.version.release | tr -d '\r')"
    echo "Serial: $(adb get-serialno)"
    echo "App package: $APP_ID"
    adb shell dumpsys package "$APP_ID" | grep -E 'versionName=|versionCode=|firstInstallTime|lastUpdateTime' | head -n 8 || true
  } > "$dir/summary.txt"
  adb logcat -d -v threadtime -t 5000 > "$dir/logcat.txt"
  adb shell dumpsys activity activities > "$dir/activities.txt"
  adb shell dumpsys window windows > "$dir/windows.txt"
  adb shell dumpsys input > "$dir/input.txt"
  adb exec-out screencap -p > "$dir/screen.png" || true
  adb shell uiautomator dump /sdcard/metur-window.xml >/dev/null 2>&1 || true
  adb pull /sdcard/metur-window.xml "$dir/ui-hierarchy.xml" >/dev/null 2>&1 || true
  (cd "$dir" && zip -q -r "../$(basename "$dir").zip" .)
  echo "Report folder: $dir"
  echo "ZIP report: $REPORT_ROOT/$(basename "$dir").zip"
  echo "IMPORTANT: Inspect logs/screenshots and redact personal data or credentials before sharing."
}

install_apk() {
  choose_device
  read -r -p "APK file path on OPPO: " apk
  [ -f "$apk" ] || { echo "File not found: $apk"; return 1; }
  adb install -r "$apk"
}

show_menu() {
  echo
  echo "=== METUR TV REMOTE LAB ==="
  echo "1) Connect TCL TV"
  echo "2) Check connection and app"
  echo "3) Launch Metur TV"
  echo "4) Stop Metur TV"
  echo "5) D-pad smoke test (UP/DOWN/LEFT/RIGHT/OK/BACK)"
  echo "6) Collect diagnostics report (ZIP)"
  echo "7) Install APK from OPPO storage"
  echo "0) Exit"
  read -r -p "Choose: " choice
  case "$choice" in
    1) connect_tv;;
    2) device_info;;
    3) launch_app;;
    4) stop_app;;
    5) nav_test;;
    6) collect_report;;
    7) install_apk;;
    0) exit 0;;
    *) echo "Unknown choice";;
  esac
}

if [ "${1:-}" = "--once" ]; then
  case "${2:-}" in
    connect) connect_tv;;
    info) device_info;;
    launch) launch_app;;
    stop) stop_app;;
    test) nav_test;;
    report) collect_report;;
    install) install_apk;;
    *) echo "Usage: $0 --once {connect|info|launch|stop|test|report|install}"; exit 2;;
  esac
else
  while true; do show_menu; done
fi
