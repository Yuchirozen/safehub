# SAFEHUB — n8n Automation & Telegram Emergency Dispatch

This system connects SAFEHUB's disaster response engine with **n8n** and **Telegram** to dispatch instant alerts, victim coordinates, and new evacuee check-ins directly to your Telegram chat or rescue group.

---

## 1. Architecture Flow

```
+-------------------------------------------------------------------------+
|                              SAFEHUB GRID                               |
|                                                                         |
|  [Citizen SOS Modal]   [New Evacuee Login]   [ESP32 Physical SOS Kiosk] |
+------------------------------------+------------------------------------+
                                     |
                                     v HTTP POST
                  +--------------------------------------+
                  |   SAFEHUB Backend API (:5001)        |
                  |   /api/webhook/sos                   |
                  |   /api/webhook/checkin               |
                  +------------------+-------------------+
                                     |
                                     v Webhook Payload
                  +--------------------------------------+
                  |           n8n Automation             |
                  |  POST /webhook/safehub-events        |
                  |  [Route Event Switch Node]           |
                  +------------------+-------------------+
                                     |
            +------------------------+------------------------+
            |                                                 |
            v (Event: sos_dispatch)                           v (Event: user_checkin)
+---------------------------------------+ +---------------------------------------+
|        🚨 Telegram SOS Alert          | |      👤 Evacuee Check-in Alert        |
| - Victim Name & Phone                 | | - Evacuee Name & Role                 |
| - Emergency Category & Priority       | | - GPS Coordinates & Reported Area     |
| - Exact Lat / Lng Coordinates         | | - Mobility / Medical Requirements     |
| - Direct Google Maps Navigation Link  | | - Google Maps Pin Link                |
| - Interactive Buttons:                | | - Interactive Action:                 |
|   [🗺️ Navigate on Google Maps]         | |   [📍 View Position on Google Maps]   |
|   [📞 Call Victim Directly]           | |   [🤝 Assign Helper in SAFEHUB]       |
|   [🚑 Open SAFEHUB Rescue Desk]       | +---------------------------------------+
+---------------------------------------+
```

---

## 2. Quick Setup Guide

### Step 1: Create a Telegram Bot & Get Credentials
1. Open Telegram and search for **`@BotFather`**.
2. Send `/newbot`, choose a name (e.g., `SafeHub Dispatcher`), and a username (e.g., `SafeHubRescue_bot`).
3. Copy the HTTP API **Bot Token** (looks like `7123456789:ABCdefGhIJKlmNoPQRstuVWXyz`).
4. Search for **`@userinfobot`** in Telegram and start it to get your numeric **Chat ID** (e.g., `123456789`).
5. Send a quick `/start` message to your new bot so it has permission to message you.

### Step 2: Configure SAFEHUB Environment (`.env`)
Add your Telegram credentials to `safehub/.env`:

```env
# n8n Automation & Telegram Dispatch
N8N_WEBHOOK_URL=http://localhost:5678/webhook/safehub-events
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN_HERE
TELEGRAM_CHAT_ID=YOUR_TELEGRAM_CHAT_ID_HERE
```

*(Note: SAFEHUB features **dual dispatch** — it sends to your n8n workflow AND can send directly via Telegram Bot API as a fail-safe backup!)*

---

## 3. Running n8n & Importing the Workflow

### Option A: Run n8n with npx (Instant)
```bash
npx n8n
```

### Option B: Run n8n with Docker
```bash
docker run -it --rm --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
```

### Option C: Import Workflow
1. Open the n8n UI at **http://localhost:5678**.
2. Click **Add workflow** → Click the `...` menu (top right) → **Import from File**.
3. Select `safehub/n8n/safehub-telegram-workflow.json`.
4. Double-click the **Telegram** nodes:
   - Select or create your **Telegram API** credential using your Bot Token.
5. Click **Save** and toggle the workflow to **Active**.

---

## 4. Testing the Automation

### 1. Instant Test via API Endpoint
Run from any terminal:
```bash
curl -X POST http://localhost:5001/api/webhook/test
```
You will immediately receive a simulated SOS dispatch in Telegram with Google Maps direct navigation links and quick-action buttons!

### 2. Live Citizen SOS Modal
1. Open [http://localhost:5173/](http://localhost:5173/).
2. Click the red **SOS** button in the navbar or the **DISPATCH EMERGENCY SOS** button on the home page.
3. Grant location permission (or use default coordinates), choose a category, and click **DISPATCH EMERGENCY SOS**.
4. An urgent SOS dispatch will be sent to your Telegram with your live coordinates.

### 3. Evacuee Location Check-in
1. In the navbar, select any role from the **Demo Switcher** (e.g., *Vulnerable Evacuee* or *Citizen*).
2. An evacuee check-in alert is automatically dispatched to Telegram with their name, role, vulnerabilities, and Google Maps position.

### 4. Physical ESP32 Hardware Simulator
1. Click **ESP32 Sim** in the navbar to open the simulated hardware drawer.
2. Click the **PHYSICAL SOS BUTTON** (GPIO 25 interrupt).
3. The hardware event hits `/api/hardware/sos` and dispatches an emergency kiosk SOS to Telegram.
