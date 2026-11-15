# SAFEHUB — Smart Emergency Shelter & Disaster Response System

**Detect. Evacuate. Coordinate. Protect.**

SAFEHUB is a complete, production-grade emergency shelter and disaster response full-stack system built according to the SAFEHUB Master PRD. It connects citizens, vulnerable evacuees, relief shelters, community helpers, verified medical volunteers, and disaster rescue officers in real-time.

---

## 1. System Architecture

```
+-----------------------------------------------------------------------------------------+
|                                    PHYSICAL EDGE LAYER                                  |
|  ESP32 Edge Node (Dual IR Gate Counter + ADC Water Level + Physical SOS + OLED Display) |
+-----------------------------------------------------------------------------------------+
                                             |
                                  Secure HTTP / Wi-Fi
                                (Header: X-Device-Key)
                                             v
+-----------------------------------------------------------------------------------------+
|                            BACKEND API & INGESTION GATEWAY                              |
|   Node.js / Express Gateway (/api/hardware/*, /api/places/nearby [SerpAPI Google Maps]) |
+-----------------------------------------------------------------------------------------+
                                             |
                                             v
+-----------------------------------------------------------------------------------------+
|                               PRIMARY CLOUD STORAGE & AUTH                              |
|            Firebase Authentication (Google + Email/Password + Persistent Sessions)       |
|            Cloud Firestore (13 Structured Collections + Real-Time Snapshot Sync)         |
+-----------------------------------------------------------------------------------------+
                                             |
                                             v
+-----------------------------------------------------------------------------------------+
|                                     FRONTEND WEB APP                                    |
|   React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons + Leaflet (OpenStreetMap)  |
|                                                                                         |
|   - Emergency Home Dashboard         - Live Alerts Feed & Audio Beacon                  |
|   - Leaflet Shelters Map & Radius    - Shelter Capacity & Dynamic Redirection           |
|   - Evacuation Departure Window Calc - Community Helpers Dispatch Board                 |
|   - Medical Help & Doctor Roster     - Shelter Staff Real-Time IR Counter Hub           |
|   - Rescue Command ICS-300 Matrix    - Admin Portal & SerpAPI Facility Promotion        |
|   - Instant Role Demo Switcher       - Interactive ESP32 Edge Hardware Simulator        |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Seven User Personas & Role-Based Access Control

SAFEHUB strictly enforces role-based navigation and sensitive role approval gates:

1. **Citizen / Evacuee**: Access live alerts, find nearby shelters, view evacuation windows, request general aid, trigger emergency SOS.
2. **Vulnerable Evacuee**: Access tailored mobility guidance (wheelchair/elderly), prioritized shelter allocation with medical staff, emergency assistance tickets.
3. **Helper**: Community volunteer with active availability toggle, incoming assistance dispatch feed, mission accept & resolution workflow.
4. **Doctor / Medical Volunteer**: Verified clinical volunteers with 4-hour duty timer, medical triage tickets, and shelter clinical station assignment (*requires Admin verification*).
5. **Shelter Staff**: On-site management terminal with real-time dual-IR gate count monitoring, manual error override (+1/-1/+5/-5), and logistics inventory updates (*requires Admin verification*).
6. **Rescue Team**: Disaster command officers with ICS-300 operations matrix, live flood telemetry feeds, boat/medevac unit status, road hazard reporting, and SOS dispatch (*requires Admin verification*).
7. **Administrator**: Master governance portal for sensitive role sign-offs, SerpAPI candidate facility inspection and promotion to verified shelters, device provisioning, and system audit logs.

*Note: For testing and evaluation, the navigation bar includes a **Demo Switcher** allowing instant switching between all 7 roles.*

---

## 3. Database Architecture (13 Cloud Firestore Collections)

1. `users`: Identity, authentication profile, sensitive role approval state, emergency contacts, medical directives.
2. `shelters`: Official relief shelters, capacity, current occupancy, 4 capacity states (`available`, `near_capacity`, `critical`, `full`), verification status (`verified`, `candidate`), facilities, contact phone.
3. `shelter_resources`: Real-time inventory of drinking water %, food packs, beds free, first aid, medicine stock level, and backup power %.
4. `devices`: Provisioned ESP32 edge units, shelter bindings, connection status (`online`, `offline`, `error`), and `X-Device-Key`.
5. `floodEvents`: Chronological telemetry logs of water depth (cm), rate of rise (cm/10min), severity (`Warning`, `High`, `Critical`), and `simulated` badges.
6. `assistanceRequests`: Evacuee assistance tickets (`elderly`, `mobility`, `wheelchair`, `injury`, `medical`, `general`) with GPS consent and responder assignment.
7. `medicalVolunteers`: Professional credentials, license number, specialty, shelter station, and 4-hour availability timer.
8. `alerts`: Official broadcast alerts with severity ratings, recipients, and responder acknowledgement tracking.
9. `rescueTeams`: Field disaster units (`Boat Rescue`, `Medical Evac`, `Logistics`, `Rapid Response`) with callsigns and radio frequencies.
10. `incidentReports`: Formal situation reports generated automatically when shelters hit 100% full or critical flood events occur.
11. `routeHazards`: Impassable roads, submerged bridges, and downed power lines with affected radius and rescue verification.
12. `notifications`: In-app notification messages routed to users by UID or role broadcast.
13. `admin_audit_logs`: Immutable security audit log tracking role approvals, manual occupancy overrides, and shelter imports.

---

## 4. Key Algorithmic Engines

### Multi-Criteria Shelter Suitability Engine (`src/utils/suitability.ts`)
Calculates an aggregate suitability score (0–100) using:
- **Distance**: Exponential decay curve based on Haversine distance in km (40 pts max).
- **Available Capacity**: Tiered scoring (30 pts for 0–70%, 18 pts for 71–90%, 5 pts for 91–99%).
- **Resource Sufficiency**: Water, food, and generator reserves (20 pts max).
- **Medical Presence**: On-duty doctor bonus (up to 20 pts for users needing medical care).
- **Route Hazard Penalty**: Deducts 20 pts for impassable roads and 12 pts for blocked routes.
- **Ineligibility Gating**: Completely rejects full shelters (100%), unverified candidates, or closed facilities from primary recommendations.

### Evacuation Readiness & Departure Window Engine (`src/utils/evacuation.ts`)
- Computes time-to-impassable:
  $$\text{Minutes to Impassable} = \frac{40\text{ cm} - \text{Current Water Level (cm)}}{\text{Rate of Rise (cm/10min)}} \times 10$$
- Factors in transport mode (walking vs vehicle) and a +50% delay multiplier for vulnerable/wheelchair evacuees.
- Emits real-time statuses: `LEAVE NOW (CRITICAL)`, `PREPARE FOR IMMEDIATE DEPARTURE`, `MONITOR CLOSELY`, or `SAFE FOR NOW`.
- Includes mandatory safety disclaimer: *"Emergency decisions must prioritize instructions from local disaster management authorities."*

### Automated Full-Capacity Redirection Workflow
When an active shelter reaches 100% capacity:
1. It is immediately flagged as `full`.
2. It is purged from recommendations for new evacuees.
3. Incoming citizens are dynamically redirected to the nearest alternative verified shelter.
4. A Critical Alert is broadcast to rescue teams and shelter staff.
5. A formal Incident Situation Report is generated in Firestore with occupancy, vulnerable counts, and recommended actions.
6. A permanent audit log is recorded.

---

## 5. SerpAPI Integration & Facility Promotion Workflow

SAFEHUB integrates SerpAPI to query Google Maps for nearby candidate hospitals and schools:
- The backend endpoint `/api/places/nearby` calls the SerpAPI Google Maps search engine.
- Results are marked strictly as **CANDIDATE ONLY**.
- Administrators review discovered facilities in the Admin Portal and click **"Verify & Promote to Active Shelter"**, setting certified bed capacity, emergency phone numbers, and amenities.
- Once verified, the candidate becomes an active, recommended emergency shelter in Cloud Firestore.

---

## 6. ESP32 Hardware Integration & Firmware

- **Firmware Location**: `firmware/SafeHub_ESP32_Node.ino`
- **Specification Document**: `docs/ESP32_API.md`
- **Hardware Features**:
  - Dual IR sensors (IR1 on GPIO 32, IR2 on GPIO 33) directional state machine.
  - Water level ADC sensor on GPIO 34.
  - Physical SOS interrupt push button on GPIO 25.
  - I2C 128x64 OLED display showing live occupancy and Wi-Fi state.
  - Visual status LEDs and buzzer alert.
  - HTTP client with `X-Device-Key` header authentication.

### Interactive Hardware Simulator (`src/components/HardwareSimulator.tsx`)
A software edge simulator clearly labeled **SIMULATED** is accessible directly in the top navigation bar. It enables:
- Adjusting simulated water level (0–120 cm) and rate of rise.
- Testing dual IR entry (+1) and exit (-1) sequences.
- Triggering the physical SOS panic button.
- Forcing 100% full capacity to test emergency redirection and situation report generation.

---

## 7. Running the Project

### Prerequisites
- Node.js v18+ or v20+

### Setup & Run
1. Install dependencies (already installed in workspace):
   ```bash
   npm install
   ```
2. Configure `.env` (configured in workspace):
   ```env
   PORT=5001
   DEVICE_SECRET_KEY=safehub_esp32_device_secret_2026
   ADMIN_SECRET_KEY=safehub_admin_master_secret
   SERPAPI_KEY=your_serpapi_key_here
   ```
3. Run Automated Tests:
   ```bash
   npx tsx test_runner.ts
   ```
4. Build Production Bundle:
   ```bash
   npm run build
   ```
5. Start Backend Server:
   ```bash
   npx tsx server/index.ts
   ```
6. Start Frontend Development Server:
   ```bash
   npm run dev
   ```

---

## 8. Safety & Compliance Notice
SAFEHUB is engineered for high-reliability disaster response. Simulated edge telemetry and unverified facility candidates are clearly differentiated from verified live assets to guarantee citizen and first-responder safety.
