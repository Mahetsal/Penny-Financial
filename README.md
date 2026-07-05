# Penny (ثراء) - Intelligent Financial Companion

Penny is a premium, offline-first intelligent financial management application featuring local-first AI, advanced decision simulation, automated bank SMS parsing, and Shariah-compliant stock screening.

## Setup & Running on Another Device

To run Penny on your other device, follow these quick steps:

### Prerequisites
1. **Node.js**: Ensure you have Node.js installed (v18 or higher is recommended).
   - [Download Node.js](https://nodejs.org/)
2. **Cloudflare CLI (`cloudflared`)**: Ensure Cloudflare Tunnel CLI is installed on your system.
   - **Windows**: Download the binary from the [Cloudflare Releases page](https://github.com/cloudflare/cloudflared/releases) and add it to your system **PATH**.
   - **macOS**: Install via Homebrew: `brew install cloudflared`
   - **Linux**: Install via apt/yum as described in the official docs.

---

### How to Start (One-Click Launch)

Once you've cloned or downloaded this repository to your other device:

1. **Double-click `start_tunnel.bat`** (or run `node start_tunnel.js` from your terminal).
2. The script will automatically:
   - Run `npm install` in the root directory to install backend dependencies.
   - Run `npm install` in the `frontend` directory to install React/Vite dependencies.
   - Boot both the Express backend and Vite client concurrently.
   - Initialize the local SQLite database.
   - Generate a secure public **Cloudflare Quick Tunnel** link.
   - **Automatically open the tunnel URL** in your default web browser!

---

## Features
- **Decision Simulator**: Run what-if financial decisions (e.g. car purchase, monthly savings allocation) with dynamic risk scoring and available cash estimations.
- **Local AI Coach**: 100% offline intelligence running completely on-device. Ask it financial questions or get help allocating budgets.
- **SAMA Open Banking Gateway**: Mocked Open Banking link sandbox.
- **SMS Parser & Statement Importer**: Import bank statement sheets or copy-paste text notifications to log transactions instantly.
- **Gamified Badges & Targets**: Track achievements (e.g. Tuwaiq Peak) based on your savings performance.
