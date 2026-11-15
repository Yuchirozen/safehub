# SAFEHUB — Cloud Firestore Database Schema

This document outlines the complete schema for the 13 required Cloud Firestore collections in the **SAFEHUB — Smart Emergency Shelter & Disaster Response System**.

---

## 1. `users`
Stores user authentication profile, emergency details, and assigned roles.

| Field | Type | Description |
|---|---|---|
| `uid` | string | Firebase Auth User ID (document key) |
| `name` | string | Full name of user |
| `email` | string | Email address |
| `phone` | string (optional) | Contact phone number |
| `role` | string | Role: `citizen`, `vulnerable_evacuee`, `helper`, `doctor`, `shelter_staff`, `rescue_team`, `admin` |
| `approvalStatus` | string | `approved`, `pending_approval`, `rejected` |
| `bloodType` | string (optional) | e.g. "O+", "A-" |
| `medicalConditions` | string (optional) | Critical health notes (asthma, diabetes, etc.) |
| `mobilityNeeds` | string (optional) | Wheelchair, cane, bedridden |
| `emergencyContactName`| string (optional) | Next of kin contact name |
| `emergencyContactPhone`| string (optional)| Next of kin contact phone |
| `vulnerabilities` | array of strings | `['wheelchair', 'elderly', 'infant', 'medical_equipment']` |
| `availableToHelp` | boolean | Helpers only: opt-in flag for emergency alerts |
| `assignedShelterId` | string (optional) | Shelter staff/doctor assigned facility |
| `createdAt` | number / timestamp | Creation timestamp in ms |
| `updatedAt` | number / timestamp | Last profile update timestamp in ms |

---

## 2. `shelters`
Main emergency shelter facilities registry with live occupancy and status.

| Field | Type | Description |
|---|---|---|
| `id` | string | Shelter identifier (e.g. `shelter_central_high`) |
| `name` | string | Official name of shelter |
| `address` | string | Physical street address |
| `coordinates` | `{ lat: number, lng: number }` | Geolocation for map rendering |
| `capacity` | number | Maximum physical evacuee capacity |
| `currentOccupancy` | number | Real-time headcount from ESP32 IR counters / staff corrections |
| `status` | string | `available` (0-70%), `near_capacity` (71-90%), `critical` (91-99%), `full` (100%), `closed` |
| `verificationStatus` | string | `verified` (official safe shelter), `candidate` (from SerpAPI), `unverified` |
| `facilities` | array of strings | `['wheelchair_accessible', 'backup_power', 'kitchen', 'infant_care', 'quarantine']` |
| `medicalAvailable` | boolean | True if verified doctor/nurse is currently on duty |
| `contactPhone` | string | Shelter emergency coordination phone |
| `staffUid` | string (optional) | UID of assigned shelter staff |
| `description` | string (optional) | Operational notes |
| `createdAt` | number / timestamp | Registration time |
| `updatedAt` | number / timestamp | Status update time |

---

## 3. `shelter_resources`
Vital supplies inventory for each operational shelter.

| Field | Type | Description |
|---|---|---|
| `id` | string | Resource ID (typically matches `shelterId`) |
| `shelterId` | string | Reference to parent shelter |
| `waterLevelPercent` | number | Drinking water level (0–100%) |
| `foodPacks` | number | Packaged emergency meals count |
| `foodPercent` | number | Estimated food supply percentage |
| `bedsAvailable` | number | Unoccupied bedding units |
| `firstAidPacks` | number | First aid kits in stock |
| `medicineLevel` | string | `sufficient`, `low`, `critical` |
| `backupPowerPercent` | number | Generator / battery reserve (0–100%) |
| `blankets` | number | Emergency thermal blankets in stock |
| `lastUpdatedBy` | string (optional) | Staff UID |
| `updatedAt` | number / timestamp | Last inventory check timestamp |

---

## 4. `devices`
Physical IoT edge hardware registry (ESP32 sensors).

| Field | Type | Description |
|---|---|---|
| `id` | string | Hardware Device ID (e.g. `DEV-ESP32-FL01`, `DEV-ESP32-IR01`) |
| `shelterId` | string (optional) | Associated shelter |
| `deviceType` | string | `flood_monitor`, `occupancy_counter`, `sos_station`, `combo` |
| `apiKey` | string | Secure token for device HTTP API authentication |
| `status` | string | `online`, `offline`, `error` |
| `lastHeartbeat` | number / timestamp | Milliseconds since last ping |
| `sensorReadings` | object | Water level (cm), rise rate, DHT22 temp/humidity, battery |
| `installedLocation`| string | Physical installation point (e.g., "Main Entrance Doorway", "River Bank St") |
| `createdAt` | number / timestamp | Registration date |

---

## 5. `flood_events`
Chronological flood telemetry records from ultrasonic/water sensors.

| Field | Type | Description |
|---|---|---|
| `id` | string | Event identifier |
| `deviceId` | string | Reporting ESP32 device ID |
| `shelterId` / `area` | string | Affected geographical area or shelter perimeter |
| `waterLevelCm` | number | Current water depth in cm |
| `rateOfRiseCmPer10Min` | number | Speed of water rise (cm / 10 minutes) |
| `severity` | string | `Warning`, `High`, `Critical` |
| `timestamp` | number / timestamp | Time of reading |
| `acknowledged` | boolean | False until acknowledged by rescue team |
| `acknowledgedBy`| string (optional) | Rescue team member UID |
| `simulated` | boolean | True for demo/simulator data, False for physical ESP32 |

---

## 6. `assistance_requests`
Citizen requests for mobility, injury, or emergency evacuation assistance.

| Field | Type | Description |
|---|---|---|
| `id` | string | Request identifier |
| `requesterUid` | string | Citizen's UID |
| `requesterName` | string | Contact name |
| `requesterPhone` | string (optional) | Phone for coordination |
| `category` | string | `elderly`, `mobility`, `wheelchair`, `injury`, `medical`, `general` |
| `priority` | string | `Normal`, `High`, `Critical` |
| `locationSharingConsent`| boolean | Opt-in consent for precise coordinates |
| `coordinates` | `{ lat: number, lng: number }` (optional) | Location if consent granted |
| `approximateLocation` | string | Landmark / neighborhood description |
| `status` | string | `pending`, `assigned`, `in_progress`, `resolved`, `cancelled` |
| `assignedHelperUid`| string (optional) | UID of responding helper |
| `assignedHelperName`| string (optional)| Helper name |
| `assignedType` | string | `helper` or `rescue_team` |
| `notes` | string (optional) | Additional instructions or situation details |
| `createdAt` | number / timestamp | Creation timestamp |
| `updatedAt` | number / timestamp | Status update timestamp |

---

## 7. `medical_volunteers`
Credentialed healthcare professionals registered to provide disaster medical relief.

| Field | Type | Description |
|---|---|---|
| `id` | string | Matches volunteer's User UID |
| `name` | string | Doctor/nurse name |
| `email` | string | Professional email |
| `medicalLicenseNumber` | string | Verification credential |
| `specialty` | string | e.g. "Emergency Medicine", "General Physician", "Paramedic" |
| `shelterId` | string (optional) | Currently stationed shelter |
| `isAvailable` | boolean | Live readiness toggle |
| `verificationStatus` | string | `verified`, `pending`, `rejected` (admin controlled) |
| `lastConfirmedAt` | number / timestamp | Timestamp of last availability pulse |
| `availabilityExpiresAt` | number / timestamp | Auto-expiration cutoff to avoid ghost availability |
| `contactPhone` | string (optional) | Coordination line |

---

## 8. `alerts`
System-wide or target-broadcast emergency alerts.

| Field | Type | Description |
|---|---|---|
| `id` | string | Alert identifier |
| `category` | string | `flood`, `shelter_full`, `resource_critical`, `sos`, `medical`, `general` |
| `severity` | string | `Normal`, `High`, `Critical` |
| `title` | string | Brief headline |
| `description` | string | Full description and instructions |
| `affectedArea` | string | Neighborhood, shelter name, or region |
| `relatedShelterId` | string (optional) | Associated shelter |
| `relatedDeviceId` | string (optional) | Associated IoT sensor |
| `recipients` | array of strings | `['all']`, `['rescue_team']`, `['doctor']`, `['shelter_staff']` |
| `acknowledgedBy`| array of UIDs | Responders who marked read/acknowledged |
| `createdAt` | number / timestamp | Creation time |

---

## 9. `rescue_teams`
Disaster response units and specialized field teams.

| Field | Type | Description |
|---|---|---|
| `id` | string | Team ID (e.g. `RESCUE-UNIT-01`) |
| `name` | string | Team designation (e.g. "Bravo Boat Squad") |
| `callsign` | string | Radio callsign (e.g. "RESCUE-2") |
| `unitType` | string | `Boat Rescue`, `Medical Evac`, `Logistics`, `Rapid Response` |
| `baseLocation` | string | Base station / depot |
| `currentLocation`| `{ lat: number, lng: number }` | Live GPS location |
| `status` | string | `standby`, `dispatched`, `on_scene`, `offline` |
| `assignedIncidentId` | string (optional) | Current incident under response |
| `membersCount` | number | Team crew size |
| `contactRadio` | string | Radio frequency or coordination channel |

---

## 10. `incident_reports`
Formal post-action or urgent situation reports generated during escalations.

| Field | Type | Description |
|---|---|---|
| `id` | string | Incident ID |
| `title` | string | Report title (e.g. "CRITICAL: Shelter Full - Capacity Overload") |
| `incidentType` | string | `shelter_full_report`, `flood_critical`, `physical_sos`, `mass_evacuation` |
| `shelterId` | string (optional) | Associated shelter |
| `severity` | string | `Normal`, `High`, `Critical` |
| `summary` | string | Narrative breakdown of the situation |
| `stats` | object | Snapshot of occupancy, seniors, children, medical triage count, supplies |
| `recommendedActions` | array of strings | Suggested rescue actions |
| `status` | string | `open`, `investigating`, `dispatched`, `closed` |
| `dispatchedTeamId` | string (optional) | Team handling the incident |
| `createdAt` | number / timestamp | Incident generation time |
| `updatedAt` | number / timestamp | Last update time |

---

## 11. `route_hazards`
Known road blockages, bridge closures, and submerged routes.

| Field | Type | Description |
|---|---|---|
| `id` | string | Hazard ID |
| `roadName` | string | Street or intersection name |
| `hazardType` | string | `flooded_road`, `bridge_closed`, `debris`, `power_line_down` |
| `severity` | string | `impassable`, `caution`, `blocked` |
| `coordinates` | `{ lat: number, lng: number }` | Hazard epicenter |
| `affectedRadiusMeters` | number | Hazard boundary in meters |
| `reportedAt` | number / timestamp | Detection timestamp |
| `verifiedByRescue` | boolean | Rescue team verification |
| `simulated` | boolean | Simulated for drill / prototype demonstration |

---

## 12. `notifications`
Real-time user-targeted notifications delivered via Firestore listeners.

| Field | Type | Description |
|---|---|---|
| `id` | string | Notification ID |
| `recipientUid` | string | Target User UID, `all`, or `role:rescue_team`, `role:helper` |
| `title` | string | Subject line |
| `body` | string | Content text |
| `type` | string | `flood_alert`, `sos_alert`, `shelter_full`, `assistance_accepted`, `request_assigned`, `resource_low` |
| `read` | boolean | Read receipt |
| `createdAt` | number / timestamp | Delivery timestamp |
| `data` | object (optional) | Deep link metadata (e.g. `{ requestId: '...', shelterId: '...' }`) |

---

## 13. `admin_audit_logs`
Immutable compliance and security trail for sensitive admin and operational decisions.

| Field | Type | Description |
|---|---|---|
| `id` | string | Audit log ID |
| `adminUid` | string | Acting admin or system worker UID |
| `adminEmail` | string | Admin email address |
| `action` | string | e.g. `verify_shelter`, `approve_role`, `override_occupancy`, `import_serpapi_facility` |
| `targetResource` | string | Collection or subsystem impacted |
| `targetId` | string | Target document ID |
| `details` | string | Description and before/after parameters |
| `timestamp` | number / timestamp | Immutably captured server time |
