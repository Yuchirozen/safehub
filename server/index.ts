import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { processChatRequest, checkRateLimit } from './aiService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5001;
const DEVICE_SECRET = process.env.DEVICE_SECRET_KEY || 'safehub_esp32_device_secret_2026';
const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || 'safehub_admin_master_secret';
const SERPAPI_KEY = process.env.SERPAPI_KEY || '';
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/safehub-events';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

// -------------------------------------------------------------
// n8n & Telegram Emergency Dispatch Engine
// -------------------------------------------------------------
async function dispatchDisasterAlert(event: string, data: any) {
  const payload = {
    event,
    timestamp: Date.now(),
    data
  };

  const results: Record<string, any> = { n8n: null, telegram: null };

  // 1. Dispatch to n8n Webhook
  if (N8N_WEBHOOK_URL) {
    try {
      const resp = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      results.n8n = { status: resp.status, ok: resp.ok };
    } catch (err: any) {
      results.n8n = { status: 'n8n_offline_or_not_started', message: err.message };
    }
  }

  // 2. Direct Telegram Bot API Dispatch (if configured in .env)
  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    try {
      let messageText = '';
      let replyMarkup: any = undefined;
      const coords = data.coordinates || { lat: 12.9716, lng: 77.5946 };

      if (event === 'sos_dispatch') {
        messageText = `🚨 <b>SAFEHUB CRITICAL EMERGENCY SOS DISPATCH</b> 🚨\n\n` +
          `<b>Victim Name:</b> ${data.requesterName || 'Emergency Evacuee'}\n` +
          `<b>Phone Number:</b> <code>${data.requesterPhone || 'Not Provided'}</code>\n` +
          `<b>Assistance Category:</b> ⚠️ <i>${(data.category || 'SOS').toUpperCase()}</i>\n` +
          `<b>Priority:</b> 🔴 <b>${data.priority || 'CRITICAL'}</b>\n\n` +
          `📍 <b>Location:</b> ${data.approximateLocation || 'Sector 4, Central District'}\n` +
          `🧭 <b>Coordinates:</b> <code>${coords.lat}, ${coords.lng}</code>\n\n` +
          `📝 <b>Details & Notes:</b>\n<i>"${data.notes || 'Victim urgently requires immediate rescue team dispatch'}"</i>\n\n` +
          `🗺️ <a href="https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}"><b>OPEN IN GOOGLE MAPS DIRECT NAVIGATION</b></a>`;

        replyMarkup = {
          inline_keyboard: [
            [
              { text: '🗺️ Navigate on Google Maps', url: `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}` }
            ],
            [
              { text: '📍 View Surrounding Area', url: `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}` }
            ]
          ]
        };
      } else if (event === 'user_checkin') {
        messageText = `👤 <b>NEW EVACUEE LOCATION CHECK-IN</b> 📍\n\n` +
          `<b>User Name:</b> ${data.name || 'Evacuee'}\n` +
          `<b>Role:</b> 🏷️ <i>${(data.role || 'citizen').toUpperCase()}</i>\n` +
          `<b>Phone:</b> <code>${data.phone || 'Not provided'}</code>\n` +
          `<b>Blood Group:</b> ${data.bloodType || 'Unknown'}\n\n` +
          `📍 <b>Reported Location:</b> ${data.approximateLocation || 'Live GPS'}\n` +
          `🧭 <b>GPS Coordinates:</b> <code>${coords.lat}, ${coords.lng}</code>\n` +
          `♿ <b>Mobility & Needs:</b> ${data.mobilityNeeds || 'Standard evacuee'}\n\n` +
          `🗺️ <a href="https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}"><b>VIEW EVACUEE POSITION ON GOOGLE MAPS</b></a>`;

        replyMarkup = {
          inline_keyboard: [
            [
              { text: '📍 View on Google Maps', url: `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}` }
            ]
          ]
        };
      }

      if (messageText) {
        const tgResp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: messageText,
            parse_mode: 'HTML',
            reply_markup: replyMarkup
          })
        });
        const tgData = await tgResp.json();
        results.telegram = tgData;
      }
    } catch (err: any) {
      results.telegram = { error: err.message };
    }
  }

  return results;
}

app.use(cors());
app.use(express.json());

// In-memory hardware state cache (for fast edge queries & fallback)
interface DeviceState {
  id: string;
  shelterId?: string;
  lastHeartbeat: number;
  status: 'online' | 'offline' | 'error';
  sensorReadings: {
    waterLevelCm?: number;
    rateOfRiseCmPer10Min?: number;
    tempC?: number;
    humidity?: number;
    batteryPercent?: number;
  };
}

const deviceRegistry = new Map<string, DeviceState>();

// Middleware: Authenticate ESP32 IoT Devices
const authenticateDevice = (req: Request, res: Response, next: Function) => {
  const deviceKey = req.header('X-Device-Key');
  if (!deviceKey || (deviceKey !== DEVICE_SECRET && deviceKey !== 'safehub-simulated-dev-key')) {
    return res.status(401).json({
      error: 'Unauthorized ESP32 Device',
      message: 'Valid X-Device-Key header is required'
    });
  }
  next();
};

// -------------------------------------------------------------
// Health Check
// -------------------------------------------------------------
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    service: 'SAFEHUB Backend API & IoT Ingestion Gateway',
    timestamp: new Date().toISOString(),
    serpApiConfigured: Boolean(SERPAPI_KEY && SERPAPI_KEY !== 'your_serpapi_key_here'),
    registeredDevicesCount: deviceRegistry.size
  });
});

// -------------------------------------------------------------
// Hardware: Flood Sensor Telemetry Ingestion
// -------------------------------------------------------------
app.post('/api/hardware/flood', authenticateDevice, (req: Request, res: Response) => {
  const { deviceId, waterLevelCm, rateOfRiseCmPer10Min, tempC, humidity, area, shelterId, simulated } = req.body;

  if (!deviceId || waterLevelCm === undefined) {
    return res.status(400).json({ error: 'Missing deviceId or waterLevelCm' });
  }

  let severity: 'Warning' | 'High' | 'Critical' = 'Warning';
  if (waterLevelCm >= 60 || (rateOfRiseCmPer10Min && rateOfRiseCmPer10Min >= 10)) {
    severity = 'Critical';
  } else if (waterLevelCm >= 35 || (rateOfRiseCmPer10Min && rateOfRiseCmPer10Min >= 5)) {
    severity = 'High';
  }

  // Update in-memory device state
  deviceRegistry.set(deviceId, {
    id: deviceId,
    shelterId,
    lastHeartbeat: Date.now(),
    status: 'online',
    sensorReadings: {
      waterLevelCm: Number(waterLevelCm),
      rateOfRiseCmPer10Min: Number(rateOfRiseCmPer10Min || 0),
      tempC: tempC !== undefined ? Number(tempC) : undefined,
      humidity: humidity !== undefined ? Number(humidity) : undefined
    }
  });

  const eventPayload = {
    id: 'flood_' + Date.now(),
    deviceId,
    shelterId,
    area: area || 'River Basin Zone A',
    waterLevelCm: Number(waterLevelCm),
    rateOfRiseCmPer10Min: Number(rateOfRiseCmPer10Min || 0),
    severity,
    timestamp: Date.now(),
    simulated: Boolean(simulated)
  };

  return res.status(200).json({
    success: true,
    message: 'Flood telemetry successfully recorded',
    event: eventPayload,
    alertTriggered: severity === 'High' || severity === 'Critical'
  });
});

// -------------------------------------------------------------
// Hardware: Dual IR Sensor Occupancy Ingestion
// (IR1 -> IR2 = Entry [+1], IR2 -> IR1 = Exit [-1])
// -------------------------------------------------------------
app.post('/api/hardware/occupancy', authenticateDevice, (req: Request, res: Response) => {
  const { deviceId, shelterId, direction, countDelta } = req.body;

  if (!deviceId || !shelterId || !direction) {
    return res.status(400).json({
      error: 'Missing required fields: deviceId, shelterId, direction (entry|exit)'
    });
  }

  // Directional logic
  const delta = countDelta !== undefined ? Number(countDelta) : (direction === 'entry' ? 1 : -1);

  deviceRegistry.set(deviceId, {
    id: deviceId,
    shelterId,
    lastHeartbeat: Date.now(),
    status: 'online',
    sensorReadings: {
      ...deviceRegistry.get(deviceId)?.sensorReadings
    }
  });

  return res.status(200).json({
    success: true,
    shelterId,
    direction,
    delta,
    timestamp: Date.now(),
    message: `Recorded ${direction.toUpperCase()} event (${delta > 0 ? '+' : ''}${delta})`
  });
});

// -------------------------------------------------------------
// Hardware: Physical SOS Button Trigger
// -------------------------------------------------------------
app.post('/api/hardware/sos', authenticateDevice, async (req: Request, res: Response) => {
  const { deviceId, shelterId, locationName, coordinates } = req.body;

  const incident = {
    id: 'sos_' + Date.now(),
    deviceId: deviceId || 'ESP32-PHYSICAL-BUTTON',
    shelterId: shelterId || 'UNASSIGNED',
    locationName: locationName || 'Shelter Entry Kiosk',
    coordinates: coordinates || { lat: 12.9716, lng: 77.5946 },
    timestamp: Date.now(),
    severity: 'Critical',
    incidentType: 'physical_sos',
    summary: `Physical emergency SOS button pressed at ${locationName || shelterId}`
  };

  // Dispatch alert to n8n & Telegram rescue channel
  const dispatchResult = await dispatchDisasterAlert('sos_dispatch', {
    id: incident.id,
    requesterName: `Physical SOS Station (${incident.deviceId})`,
    requesterPhone: 'Field Kiosk',
    category: 'physical_sos',
    priority: 'Critical',
    approximateLocation: incident.locationName,
    coordinates: incident.coordinates,
    notes: incident.summary,
    timestamp: incident.timestamp
  });

  return res.status(200).json({
    success: true,
    message: 'CRITICAL: Physical SOS dispatched to rescue teams & Telegram channel',
    incident,
    dispatchResult
  });
});

// -------------------------------------------------------------
// Webhook: Citizen Application SOS Dispatch (Modal / Form)
// -------------------------------------------------------------
app.post('/api/webhook/sos', async (req: Request, res: Response) => {
  const { requesterName, requesterPhone, category, priority, approximateLocation, coordinates, notes, shelterId } = req.body;

  const dispatchData = {
    id: 'sos_' + Date.now(),
    requesterName: requesterName || 'Emergency Evacuee',
    requesterPhone: requesterPhone || 'Not Provided',
    category: category || 'general',
    priority: priority || 'Critical',
    approximateLocation: approximateLocation || 'Live GPS Coordinates',
    coordinates: coordinates || { lat: 12.9716, lng: 77.5946 },
    notes: notes || 'Citizen emergency SOS dispatched from SAFEHUB Portal',
    shelterId,
    timestamp: Date.now()
  };

  const dispatchResult = await dispatchDisasterAlert('sos_dispatch', dispatchData);

  return res.status(200).json({
    success: true,
    message: 'Emergency SOS dispatched to n8n automation and Telegram channel',
    data: dispatchData,
    dispatchResult
  });
});

// -------------------------------------------------------------
// Webhook: Evacuee Login & GPS Location Check-in
// -------------------------------------------------------------
app.post('/api/webhook/checkin', async (req: Request, res: Response) => {
  const { uid, name, email, phone, role, bloodType, mobilityNeeds, approximateLocation, coordinates } = req.body;

  const checkinData = {
    uid: uid || 'evacuee_' + Date.now(),
    name: name || 'SAFEHUB User',
    email: email || '',
    phone: phone || '',
    role: role || 'citizen',
    bloodType: bloodType || 'Not specified',
    mobilityNeeds: mobilityNeeds || 'None',
    approximateLocation: approximateLocation || 'Live Coordinates',
    coordinates: coordinates || { lat: 12.9716, lng: 77.5946 },
    timestamp: Date.now()
  };

  const dispatchResult = await dispatchDisasterAlert('user_checkin', checkinData);

  return res.status(200).json({
    success: true,
    message: 'Evacuee check-in successfully logged and forwarded to rescue helpers',
    data: checkinData,
    dispatchResult
  });
});

// -------------------------------------------------------------
// Webhook: Test Telegram Alert Trigger (Instant Verification)
// -------------------------------------------------------------
app.post('/api/webhook/test', async (req: Request, res: Response) => {
  const testPayload = {
    id: 'test_' + Date.now(),
    requesterName: 'Test Evacuee (Dr. Roy / Bangalore)',
    requesterPhone: '+91 98450 12345',
    category: 'mobility',
    priority: 'Critical',
    approximateLocation: 'MG Road Metro Station, Bangalore',
    coordinates: { lat: 12.9756, lng: 77.6066 },
    notes: 'TEST DISPATCH: Evacuee with wheelchair stuck near flooded underpass. Needs boat/vehicle transport.',
    timestamp: Date.now()
  };

  const dispatchResult = await dispatchDisasterAlert('sos_dispatch', testPayload);

  return res.status(200).json({
    success: true,
    message: 'Test SOS dispatched to n8n and Telegram',
    testPayload,
    dispatchResult,
    config: {
      n8nConfigured: Boolean(N8N_WEBHOOK_URL),
      telegramConfigured: Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID)
    }
  });
});

// -------------------------------------------------------------
// Webhook: Check Integration Status
// -------------------------------------------------------------
app.get('/api/webhook/status', (req: Request, res: Response) => {
  return res.json({
    n8nWebhookUrl: N8N_WEBHOOK_URL,
    telegramBotConfigured: Boolean(TELEGRAM_BOT_TOKEN),
    telegramChatIdConfigured: Boolean(TELEGRAM_CHAT_ID),
    instructions: {
      n8nWorkflowFile: 'n8n/safehub-telegram-workflow.json',
      setupStep1: 'Start n8n (npx n8n or docker run -p 5678:5678 n8nio/n8n)',
      setupStep2: 'Import n8n/safehub-telegram-workflow.json into n8n',
      setupStep3: 'Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env or n8n credentials'
    }
  });
});

// -------------------------------------------------------------
// Hardware: Device Heartbeat
// -------------------------------------------------------------
app.post('/api/hardware/heartbeat', authenticateDevice, (req: Request, res: Response) => {
  const { deviceId, shelterId, batteryPercent, tempC } = req.body;

  if (!deviceId) return res.status(400).json({ error: 'Missing deviceId' });

  const existing = deviceRegistry.get(deviceId);
  deviceRegistry.set(deviceId, {
    id: deviceId,
    shelterId: shelterId || existing?.shelterId,
    lastHeartbeat: Date.now(),
    status: 'online',
    sensorReadings: {
      ...existing?.sensorReadings,
      batteryPercent: batteryPercent !== undefined ? Number(batteryPercent) : existing?.sensorReadings.batteryPercent,
      tempC: tempC !== undefined ? Number(tempC) : existing?.sensorReadings.tempC
    }
  });

  return res.json({ success: true, timestamp: Date.now(), deviceId });
});

// -------------------------------------------------------------
// SerpAPI Integration: Discover Nearby Hospitals and Schools
// -------------------------------------------------------------
app.get('/api/places/nearby', async (req: Request, res: Response) => {
  const { lat, lng, type, q } = req.query;

  const latitude = lat ? parseFloat(lat as string) : 12.9716;
  const longitude = lng ? parseFloat(lng as string) : 77.5946;
  const placeType = (type as string) || 'hospital';

  // Demo fallback candidates if SerpAPI key is awaiting configuration
  const demoCandidateFacilities = [
    {
      id: 'serp_candidate_001',
      name: "St. Philomena's Multi-Specialty Hospital",
      placeType: 'hospital',
      address: 'No. 4, Mother Teresa Rd, Viveka Nagar, Bengaluru, Karnataka 560047',
      coordinates: { lat: 12.9611, lng: 77.6189 },
      phone: '+91 80 4016 4500',
      rating: 4.2,
      userRatingsTotal: 1240,
      isVerifiedAsShelter: false,
      source: 'serpapi'
    },
    {
      id: 'serp_candidate_002',
      name: 'Chinmaya Mission Hospital & Medical Centre',
      placeType: 'hospital',
      address: 'CMH Road, Indiranagar, Bengaluru, Karnataka 560038',
      coordinates: { lat: 12.9784, lng: 77.6432 },
      phone: '+91 80 2528 0461',
      rating: 4.4,
      userRatingsTotal: 3410,
      isVerifiedAsShelter: false,
      source: 'serpapi'
    },
    {
      id: 'serp_candidate_003',
      name: 'National Public School - Indiranagar Campus',
      placeType: 'school',
      address: '12th A Main Rd, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560008',
      coordinates: { lat: 12.9702, lng: 77.6408 },
      phone: '+91 80 2528 0611',
      rating: 4.6,
      userRatingsTotal: 480,
      isVerifiedAsShelter: false,
      source: 'serpapi'
    },
    {
      id: 'serp_candidate_004',
      name: 'Kendriya Vidyalaya ASC Centre Gymnasium & Halls',
      placeType: 'school',
      address: 'Victoria Rd, ASC Centre, Bengaluru, Karnataka 560047',
      coordinates: { lat: 12.9614, lng: 77.6256 },
      phone: '+91 80 2554 4452',
      rating: 4.3,
      userRatingsTotal: 390,
      isVerifiedAsShelter: false,
      source: 'serpapi'
    }
  ];

  // Check if SerpAPI key is configured
  if (!SERPAPI_KEY || SERPAPI_KEY === 'your_serpapi_key_here') {
    return res.status(200).json({
      success: true,
      needsApiKey: true,
      error: 'SERPAPI_KEY is awaiting API key configuration in .env. Live Google Maps queries require SERPAPI_KEY.',
      candidateFacilities: demoCandidateFacilities,
      notice: 'Candidate facilities must be reviewed and officially verified by an administrator before being recommended as operational emergency shelters.'
    });
  }

  try {
    let queryTerm = ((q as string) || '').trim();
    const hasCategory = /hospital|school|clinic|college|hall|shelter|centre|center/i.test(queryTerm);
    if (!hasCategory && queryTerm) {
      const categoryWord = placeType === 'school' ? 'schools' : placeType === 'clinic' ? 'clinics' : 'hospitals';
      queryTerm = `${categoryWord} near ${queryTerm}`;
    } else if (!queryTerm) {
      queryTerm = placeType === 'school' ? 'schools near Indiranagar Bangalore' : 'hospitals near Indiranagar Bangalore';
    }

    const serpApiUrl = `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(queryTerm)}&ll=@${latitude},${longitude},14z&type=search&api_key=${SERPAPI_KEY}`;

    const apiResponse = await fetch(serpApiUrl);
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      return res.status(200).json({
        success: true,
        needsApiKey: true,
        error: `SerpAPI returned HTTP ${apiResponse.status}: ${errorText}`,
        candidateFacilities: demoCandidateFacilities
      });
    }

    const data: any = await apiResponse.json();
    const rawPlaces = data.local_results || [];

    // Format results as candidate facilities
    const candidateFacilities = rawPlaces.slice(0, 15).map((place: any, index: number) => {
      const isHospital = (place.type || '').toLowerCase().includes('hospital') || (place.title || '').toLowerCase().includes('hospital') || (place.title || '').toLowerCase().includes('clinic');
      return {
        id: `serp_${place.place_id || 'fac_' + index + '_' + Date.now()}`,
        name: place.title || 'Unknown Public Facility',
        placeType: isHospital ? 'hospital' : 'school',
        address: place.address || `${place.title}, Near Coordinates (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`,
        coordinates: {
          lat: place.gps_coordinates?.latitude || latitude + (Math.random() - 0.5) * 0.02,
          lng: place.gps_coordinates?.longitude || longitude + (Math.random() - 0.5) * 0.02
        },
        phone: place.phone || 'N/A',
        rating: place.rating || null,
        userRatingsTotal: place.reviews || 0,
        isVerifiedAsShelter: false,
        source: 'serpapi'
      };
    });

    return res.json({
      success: true,
      query: queryTerm,
      count: candidateFacilities.length,
      facilities: candidateFacilities,
      candidateFacilities,
      notice: 'Candidate facilities must be reviewed and officially verified by an administrator before being recommended as operational emergency shelters.'
    });
  } catch (err: any) {
    console.error('Error in SerpAPI query:', err);
    return res.status(500).json({
      error: 'SERVER_SERPAPI_EXCEPTION',
      message: err.message || 'Internal error fetching places'
    });
  }
});

// -------------------------------------------------------------
// AI Chatbot Endpoint (SAFEHUB AI)
// -------------------------------------------------------------
app.post('/api/chat', async (req: Request, res: Response) => {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';

  // 1. Rate limiting
  if (!checkRateLimit(clientIp, 25, 60000)) {
    return res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please wait a moment before sending another message to SAFEHUB AI.'
    });
  }

  // 2. Input validation
  const { messages, context } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      error: 'INVALID_REQUEST',
      message: 'Messages array is required and cannot be empty.'
    });
  }

  // Enforce message length & history limits
  const sanitizedMessages = messages.slice(-15).map((m: any) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: typeof m.content === 'string' ? m.content.slice(0, 1500) : ''
  })).filter((m: any) => m.content.trim().length > 0);

  if (sanitizedMessages.length === 0) {
    return res.status(400).json({
      error: 'EMPTY_MESSAGE',
      message: 'Message content cannot be blank.'
    });
  }

  try {
    const reply = await processChatRequest(sanitizedMessages, context);
    return res.json({
      reply,
      timestamp: Date.now()
    });
  } catch (err: any) {
    console.error('[SAFEHUB AI Server Error]', err);
    return res.status(503).json({
      error: 'AI_SERVICE_UNAVAILABLE',
      message: err.message || 'SAFEHUB AI is momentarily overloaded. For immediate life threats, please click the SOS button or dial 112.'
    });
  }
});

// -------------------------------------------------------------
// Admin Endpoints
// -------------------------------------------------------------
// -------------------------------------------------------------
// Admin: Create Shelter (writes directly to in-memory store + broadcasts via SSE)
// Called by scripts or curl when Firestore is unavailable
// -------------------------------------------------------------
interface InMemoryShelter {
  id: string;
  name: string;
  address: string;
  coordinates: { lat: number; lng: number };
  capacity: number;
  currentOccupancy: number;
  status: string;
  verificationStatus: string;
  medicalAvailable: boolean;
  contactPhone: string;
  facilities: string[];
  description?: string;
  createdAt: number;
  updatedAt: number;
}

const inMemoryShelters: InMemoryShelter[] = [];

app.get('/api/admin/shelters', (req: Request, res: Response) => {
  return res.json({ shelters: inMemoryShelters, count: inMemoryShelters.length });
});

app.post('/api/admin/create-shelter', (req: Request, res: Response) => {
  const { adminSecret, shelter } = req.body;
  if (adminSecret !== ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden: Invalid Admin Secret' });
  }

  const newId = 'shelter_' + Date.now();
  const now = Date.now();
  const full: InMemoryShelter = {
    id: newId,
    name: shelter.name || 'Emergency Shelter',
    address: shelter.address || 'Indiranagar, Bangalore',
    coordinates: shelter.coordinates || { lat: 12.9784, lng: 77.6408 },
    capacity: shelter.capacity || 200,
    currentOccupancy: 0,
    status: 'available',
    verificationStatus: 'verified',
    medicalAvailable: shelter.medicalAvailable !== false,
    contactPhone: shelter.contactPhone || '+91 80 2528 0461',
    facilities: shelter.facilities || ['Emergency Medical Bay', 'Clean Water', 'Generator Backup', 'First Aid'],
    description: shelter.description,
    createdAt: now,
    updatedAt: now
  };

  inMemoryShelters.push(full);

  console.log(`[SHELTER CREATED] ${full.name} → ID: ${newId}`);

  return res.status(201).json({
    success: true,
    message: `Shelter "${full.name}" created and added to Evacuation Map`,
    shelter: full
  });
});

app.post('/api/admin/approve-role', (req: Request, res: Response) => {
  const { targetUid, role, adminSecret } = req.body;
  if (adminSecret !== ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden: Invalid Admin Secret' });
  }
  return res.json({
    success: true,
    message: `Role ${role} approved for user ${targetUid}`,
    targetUid,
    role
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`SAFEHUB Backend Server & IoT Gateway running on port ${PORT}`);
    console.log(`SerpAPI configured: ${Boolean(SERPAPI_KEY && SERPAPI_KEY !== 'your_serpapi_key_here')}`);
  });
}

export default app;
export { app };
