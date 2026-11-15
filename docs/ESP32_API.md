# SAFEHUB — ESP32 Hardware Integration Specification

## 1. Overview
The SAFEHUB IoT Edge architecture connects physical disaster sensors to the central SAFEHUB backend via Wi-Fi and HTTP REST endpoints.

```
+-------------------------------------------------------------------+
|                           ESP32 NODE                              |
|  [Water Sensor]   [2x IR Sensors]   [SOS Button]   [OLED Display] |
+-------------------------------------------------------------------+
                                  |
                           Wi-Fi (HTTPS/HTTP)
                         Header: X-Device-Key
                                  v
+-------------------------------------------------------------------+
|               SAFEHUB BACKEND API (Express / Cloud)              |
|        /api/hardware/flood     |     /api/hardware/occupancy      |
|        /api/hardware/sos       |     /api/hardware/heartbeat      |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                 CLOUD FIRESTORE & REAL-TIME ALERTS                |
|           Evacuee App  <--->  Rescue Dashboard  <---> Admin       |
+-------------------------------------------------------------------+
```

---

## 2. Authentication
All ESP32 endpoints require the `X-Device-Key` HTTP header.
```http
X-Device-Key: safehub_esp32_device_secret_2026
Content-Type: application/json
```
*Note: Never embed administrator credentials or Firebase private keys into the ESP32 firmware.*

---

## 3. Endpoints Specification

### A. Flood Telemetry Ingestion
- **Method:** `POST`
- **Path:** `/api/hardware/flood`
- **Payload:**
```json
{
  "deviceId": "DEV-FLOOD-01",
  "shelterId": "shelter_central_high",
  "area": "South River Embankment",
  "waterLevelCm": 42.5,
  "rateOfRiseCmPer10Min": 4.0,
  "tempC": 28.5,
  "humidity": 85.0,
  "simulated": false
}
```
- **Responses:**
  - `200 OK`: Telemetry persisted, returns `{ success: true, event: {...}, alertTriggered: boolean }`
  - `401 Unauthorized`: Invalid or missing `X-Device-Key`

### B. Dual IR Occupancy Ingestion
- **Method:** `POST`
- **Path:** `/api/hardware/occupancy`
- **Direction Logic:**
  - `IR_Outer` then `IR_Inner` -> `direction: "entry"` (`delta: +1`)
  - `IR_Inner` then `IR_Outer` -> `direction: "exit"` (`delta: -1`)
- **Payload:**
```json
{
  "deviceId": "DEV-OCCUPANCY-01",
  "shelterId": "shelter_central_high",
  "direction": "entry",
  "countDelta": 1
}
```
- **Responses:**
  - `200 OK`: Count updated, returns `{ success: true, shelterId, direction, delta: 1 }`

### C. Physical Emergency SOS Button
- **Method:** `POST`
- **Path:** `/api/hardware/sos`
- **Payload:**
```json
{
  "deviceId": "DEV-SOS-01",
  "shelterId": "shelter_central_high",
  "locationName": "Main Entrance Help Desk",
  "coordinates": {
    "lat": 12.9750,
    "lng": 77.5980
  }
}
```
- **Responses:**
  - `200 OK`: Incident dispatched, returns `{ success: true, incident: {...} }`

### D. Device Heartbeat
- **Method:** `POST`
- **Path:** `/api/hardware/heartbeat`
- **Payload:**
```json
{
  "deviceId": "DEV-FLOOD-01",
  "shelterId": "shelter_central_high",
  "batteryPercent": 94,
  "tempC": 28.5
}
```

---

## 4. Hardware Pinout Reference (ESP32 DevKit V1)
| Component | ESP32 GPIO | Description |
|---|---|---|
| IR Sensor 1 (Outer) | GPIO 32 | Digital Input (Active LOW) |
| IR Sensor 2 (Inner) | GPIO 33 | Digital Input (Active LOW) |
| Water Level ADC / Echo | GPIO 34 | Analog ADC / HC-SR04 Echo |
| Water Trigger (Ultrasonic)| GPIO 18 | Trigger pulse output |
| Physical SOS Push Button | GPIO 25 | Active LOW with pull-up & interrupt |
| I2C OLED SDA | GPIO 21 | SSD1306 Display Data |
| I2C OLED SCL | GPIO 22 | SSD1306 Display Clock |
| Active Buzzer | GPIO 27 | PWM / Digital High on Alarm |
| Green Status LED | GPIO 19 | Capacity < 70% (Available) |
| Yellow Status LED | GPIO 23 | Capacity 71-90% (Warning) |
| Red Status LED | GPIO 5 | Capacity > 90% or Flood Alert |
