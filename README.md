# Archer Components Web

Web port of the **Archer Components D1x Configuration App** (v2.0.1), reverse-engineered from the Android APK.

## What it does

Configure Archer D1x electronic bike shifters:

- **Shift point configuration** — set gear count and PWM positions per cog
- **Quick Shift** — multi-gear jumps with adjustable button delay
- **Auto shutdown & wake-up force** — idle timer and motion threshold (Gen 2)
- **Get Me Home Gear** — emergency gear when battery is low
- **Overshoot mode** — motor overshoot tuning for worn cassettes
- **Metrics** — shift counter, odometer, firmware versions, voltages
- **Saved Wheel Library** — store/load cassette profiles (localStorage)
- **Manual shift, pair remote, cable change** guides

## Requirements

- **Chrome or Edge** (Web Bluetooth API)
- **HTTPS or localhost**
- Archer D1x shifter powered on, or use **Demo Mode**

## GitHub Pages (static HTML/JS)

The deployable site lives in **`docs/`** — plain HTML, CSS, and ES modules. No build step.

1. Push the repo to GitHub
2. Go to **Settings → Pages**
3. Set **Source** to **Deploy from a branch**
4. Choose branch `main` (or `master`) and folder **`/docs`**
5. Your site will be at `https://<username>.github.io/<repo>/`

Open the site and use **Try Demo Mode** to explore without hardware.

### Run locally

```bash
# Static site (GitHub Pages version)
npx serve docs
# or: python -m http.server 8080 --directory docs

# React dev version (optional)
cd web && npm install && npm run dev
```

## BLE protocol

Reverse-engineered from `com.archercomponents.archer`:

| Service | `0001A000-8808-6B4C-27CF-5B4FC0000000` |
|---------|----------------------------------------|
| Device name | `Archer_Components` |

Characteristics use **big-endian** encoding for multi-byte values, matching the original Android app.

## Project structure

```
web/                  React + Vite web app
decompiled/           jadx output from APK (reference)
apk_extracted/        Raw APK contents
tools/jadx/           Decompiler tool
```

## Demo mode

Use **Try Demo Mode** on the connect screen to explore the UI without a physical shifter. All settings update in simulated state.

## Note

This is an independent reimplementation for educational purposes. Not affiliated with Archer Components.
