# Metur TV Remote Lab (Termux + TCL Android TV)

This is a local, user-operated ADB test harness for an OPPO Android 12 phone running Termux and a TCL Android 11 TV.

## Safety model
- ADB stays on your trusted home LAN. Do not port-forward TCP 5555 or expose it to the internet.
- The script never stores Wi-Fi passwords, GitHub tokens, app credentials, or server credentials.
- Logcat and UI hierarchy may contain private information. Review and redact the report before sharing it.
- Revoke the TV's debugging authorization and turn off Network debugging when finished testing.

## 1. Install prerequisites in Termux

Install Termux from F-Droid or its official GitHub releases. Then run:

```bash
pkg update -y && pkg upgrade -y
pkg install android-tools git curl jq zip -y
```

## 2. Get the test harness

```bash
mkdir -p ~/metur-tv-lab
cd ~/metur-tv-lab
git clone https://github.com/chayapolpmpropertyphuket-lgtm/Metur-TV.git source
cd source
git checkout feature/blank-first-run-foundation
chmod +x tools/termux/metur-lab.sh
./tools/termux/metur-lab.sh
```

If the repository is already cloned, use `git pull` in its folder instead of cloning again.

## 3. Connect TCL

Keep OPPO and TCL on the same trusted Wi-Fi. On TCL, enable Developer Options > Network debugging. In the menu choose **1**, enter the TV's LAN IP address, then choose **2**.

Expected ADB state: `device`. If it says `unauthorized`, accept the prompt on the TV. If it says `offline` or connection fails, stop and troubleshoot; do not open router port forwarding.

## 4. Test and collect evidence

- Choose **3** to launch Metur TV.
- Choose **5** for a controlled D-pad smoke test. Watch the TV while it sends UP, DOWN, LEFT, RIGHT, OK, BACK; it saves screenshots and focus snapshots.
- Choose **6** to collect a ZIP containing recent Logcat, app/activity/window/input state, screenshot and UI hierarchy.
- Reports are stored in `~/metur-tv-lab/reports/`.

You can list reports with:

```bash
ls -lh ~/metur-tv-lab/reports/
```

## 5. Install an APK

Download a test APK from the relevant GitHub Actions artifact or approved GitHub Release to the phone. In the menu choose **7** and enter its full file path. Confirm the APK source and version before installation.

## Current limitations
- This harness controls the TV and collects evidence; it does not grant ChatGPT direct terminal access.
- D-pad smoke test sends keys in sequence; it is not yet a full visual pass/fail test. A human should observe the screen and report unexpected behavior.
- Automated APK builds remain in GitHub Actions. The release workflow only publishes from `main`; do not merge the Draft PR merely to obtain an APK.
