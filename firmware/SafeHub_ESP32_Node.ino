/*
  SAFEHUB — ESP32 Smart Emergency Shelter & Flood Monitoring Firmware
  
  Features:
  1. Dual IR doorway sensors for bidirectional occupancy counting:
     - IR1 (Outer) -> IR2 (Inner) = ENTRY (+1)
     - IR2 (Inner) -> IR1 (Outer) = EXIT (-1)
  2. Water level sensor (ADC / Ultrasonic) measuring flood depth & rate of rise
  3. Physical Emergency SOS button with hardware interrupt
  4. SSD1306 0.96" I2C OLED display for real-time field status
  5. Green / Yellow / Red capacity status LEDs & active alarm buzzer
  6. Secure REST HTTP client with X-Device-Key header to SAFEHUB Backend
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ==========================================
// CONFIGURATION & SECRETS
// ==========================================
const char* WIFI_SSID     = "SAFEHUB_EMERGENCY_WIFI";
const char* WIFI_PASSWORD = "EmergencySecurePassword123";

// SAFEHUB Server URL (e.g. your cloud or local gateway)
const char* SERVER_BASE_URL = "http://192.168.1.100:5001";
const char* DEVICE_SECRET   = "safehub_esp32_device_secret_2026";

const char* DEVICE_ID  = "DEV-ESP32-NODE-01";
const char* SHELTER_ID = "shelter_central_high";
const int   CAPACITY   = 100;

// ==========================================
// PIN DEFINITIONS
// ==========================================
#define PIN_IR_OUTER    32  // IR Sensor 1 (Outside door)
#define PIN_IR_INNER    33  // IR Sensor 2 (Inside door)
#define PIN_WATER_ADC   34  // Analog water sensor
#define PIN_SOS_BTN     25  // Physical emergency button (Pull-Up)
#define PIN_BUZZER      27  // Active buzzer
#define PIN_LED_GREEN   19  // Available (< 70%)
#define PIN_LED_YELLOW  23  // Warning (71-90%)
#define PIN_LED_RED      5  // Critical / Full (> 90%)

#define SCREEN_WIDTH   128
#define SCREEN_HEIGHT   64
#define OLED_RESET      -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ==========================================
// STATE VARIABLES
// ==========================================
volatile int currentOccupancy = 0;
volatile bool sosTriggered = false;
unsigned long lastHeartbeat = 0;
unsigned long lastWaterRead = 0;
float previousWaterLevel = 0.0;
float currentWaterLevel = 0.0;

// Dual IR State Machine
enum IRState { IDLE, OUTER_TRIGGERED, INNER_TRIGGERED, WAIT_FOR_CLEAR };
IRState irState = IDLE;
unsigned long irStateStartTime = 0;
const unsigned long IR_PAIR_TIMEOUT_MS = 2500; // max time between crossing sensor 1 & 2
const unsigned long IR_DEBOUNCE_MS     = 100;

// ==========================================
// HARDWARE INTERRUPT: SOS BUTTON
// ==========================================
void IRAM_ATTR handleSosInterrupt() {
  static unsigned long lastInterruptTime = 0;
  unsigned long now = millis();
  if (now - lastInterruptTime > 400) { // debounce
    sosTriggered = true;
    lastInterruptTime = now;
  }
}

// ==========================================
// HTTP HELPERS
// ==========================================
bool sendJsonPost(const String& endpoint, const String& jsonPayload) {
  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  String url = String(SERVER_BASE_URL) + endpoint;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_SECRET);
  http.setTimeout(3000);

  int httpCode = http.POST(jsonPayload);
  http.end();
  return (httpCode >= 200 && httpCode < 300);
}

void reportOccupancyChange(const char* direction, int delta) {
  String payload = "{\"deviceId\":\"" + String(DEVICE_ID) + "\","
                   + "\"shelterId\":\"" + String(SHELTER_ID) + "\","
                   + "\"direction\":\"" + String(direction) + "\","
                   + "\"countDelta\":" + String(delta) + "}";
  sendJsonPost("/api/hardware/occupancy", payload);
}

void reportFloodReading(float waterCm, float riseRate) {
  String payload = "{\"deviceId\":\"" + String(DEVICE_ID) + "\","
                   + "\"shelterId\":\"" + String(SHELTER_ID) + "\","
                   + "\"waterLevelCm\":" + String(waterCm, 1) + ","
                   + "\"rateOfRiseCmPer10Min\":" + String(riseRate, 1) + ","
                   + "\"simulated\":false}";
  sendJsonPost("/api/hardware/flood", payload);
}

void dispatchSosIncident() {
  String payload = "{\"deviceId\":\"" + String(DEVICE_ID) + "\","
                   + "\"shelterId\":\"" + String(SHELTER_ID) + "\","
                   + "\"locationName\":\"Shelter Kiosk Station\"}";
  sendJsonPost("/api/hardware/sos", payload);
}

// ==========================================
// OLED & LED UI UPDATES
// ==========================================
void updateLedsAndOled() {
  int pct = (currentOccupancy * 100) / CAPACITY;

  // LED indication
  digitalWrite(PIN_LED_GREEN, pct <= 70);
  digitalWrite(PIN_LED_YELLOW, pct > 70 && pct <= 90);
  digitalWrite(PIN_LED_RED, pct > 90 || currentWaterLevel >= 40.0);

  // OLED Refresh
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  display.setCursor(0, 0);
  display.print("SAFEHUB SHELTER NODE");

  display.setCursor(0, 14);
  display.print("Occupancy: ");
  display.print(currentOccupancy);
  display.print("/");
  display.print(CAPACITY);
  display.print(" (");
  display.print(pct);
  display.print("%)");

  display.setCursor(0, 28);
  display.print("Water: ");
  display.print(currentWaterLevel, 1);
  display.print(" cm");
  if (currentWaterLevel >= 40.0) display.print(" [ALERT]");

  display.setCursor(0, 42);
  display.print("WiFi: ");
  display.print(WiFi.status() == WL_CONNECTED ? "ONLINE" : "OFFLINE");

  display.setCursor(0, 54);
  if (pct >= 100) {
    display.print("STATUS: SHELTER FULL");
  } else if (pct > 90) {
    display.print("STATUS: CRITICAL CAP");
  } else {
    display.print("STATUS: NORMAL OP");
  }

  display.display();
}

// ==========================================
// SETUP
// ==========================================
void setup() {
  Serial.begin(115200);

  pinMode(PIN_IR_OUTER, INPUT_PULLUP);
  pinMode(PIN_IR_INNER, INPUT_PULLUP);
  pinMode(PIN_WATER_ADC, INPUT);
  pinMode(PIN_SOS_BTN, INPUT_PULLUP);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_YELLOW, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);

  digitalWrite(PIN_BUZZER, LOW);

  // Attach hardware interrupt for emergency SOS button
  attachInterrupt(digitalPinToInterrupt(PIN_SOS_BTN), handleSosInterrupt, FALLING);

  // OLED Init
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("SSD1306 allocation failed");
  }
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(10, 25);
  display.println("SAFEHUB Starting...");
  display.display();

  // Connect to Wi-Fi
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

// ==========================================
// MAIN LOOP
// ==========================================
void loop() {
  unsigned long now = millis();

  // 1. Process Physical SOS Button
  if (sosTriggered) {
    sosTriggered = false;
    Serial.println("EMERGENCY: Physical SOS Button Activated!");
    digitalWrite(PIN_BUZZER, HIGH);
    dispatchSosIncident();
    delay(500);
    digitalWrite(PIN_BUZZER, LOW);
  }

  // 2. Dual IR State Machine (Directional Entry & Exit)
  bool outerActive = (digitalRead(PIN_IR_OUTER) == LOW);
  bool innerActive = (digitalRead(PIN_IR_INNER) == LOW);

  switch (irState) {
    case IDLE:
      if (outerActive && !innerActive) {
        irState = OUTER_TRIGGERED;
        irStateStartTime = now;
      } else if (innerActive && !outerActive) {
        irState = INNER_TRIGGERED;
        irStateStartTime = now;
      }
      break;

    case OUTER_TRIGGERED:
      if (now - irStateStartTime > IR_PAIR_TIMEOUT_MS) {
        irState = IDLE; // timeout
      } else if (innerActive) {
        // Outer was tripped first, then Inner -> ENTRY DETECTED
        currentOccupancy++;
        Serial.print("ENTRY Detected. Occupancy: ");
        Serial.println(currentOccupancy);
        reportOccupancyChange("entry", 1);
        irState = WAIT_FOR_CLEAR;
      }
      break;

    case INNER_TRIGGERED:
      if (now - irStateStartTime > IR_PAIR_TIMEOUT_MS) {
        irState = IDLE; // timeout
      } else if (outerActive) {
        // Inner was tripped first, then Outer -> EXIT DETECTED
        if (currentOccupancy > 0) currentOccupancy--;
        Serial.print("EXIT Detected. Occupancy: ");
        Serial.println(currentOccupancy);
        reportOccupancyChange("exit", -1);
        irState = WAIT_FOR_CLEAR;
      }
      break;

    case WAIT_FOR_CLEAR:
      // Wait until both sensors are unblocked
      if (!outerActive && !innerActive) {
        irState = IDLE;
      }
      break;
  }

  // 3. Periodic Water Level Sampling (Every 10 seconds)
  if (now - lastWaterRead >= 10000) {
    lastWaterRead = now;
    int rawAdc = analogRead(PIN_WATER_ADC);
    // Convert ADC (0-4095) to estimated water level cm (0-100cm)
    currentWaterLevel = (rawAdc / 4095.0) * 100.0;
    float riseRate = (currentWaterLevel - previousWaterLevel); // cm per 10s (scaled)
    previousWaterLevel = currentWaterLevel;

    reportFloodReading(currentWaterLevel, riseRate);
    updateLedsAndOled();
  }

  // 4. Periodic Heartbeat (Every 30 seconds)
  if (now - lastHeartbeat >= 30000) {
    lastHeartbeat = now;
    String hbPayload = "{\"deviceId\":\"" + String(DEVICE_ID) + "\","
                       + "\"shelterId\":\"" + String(SHELTER_ID) + "\","
                       + "\"batteryPercent\":95}";
    sendJsonPost("/api/hardware/heartbeat", hbPayload);
  }

  delay(20);
}
