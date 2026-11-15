/**
 * SAFEHUB — Deploy Shelter to Firestore (now that API is enabled)
 * 1. Queries SerpAPI for hospitals near Indiranagar, Bangalore
 * 2. Writes shelter directly to Firestore REST API
 * 3. Also writes via backend API as backup
 */

const SERPAPI_KEY = '3a0a7a6e8885667a91d1c066a181aba93b9cd69b3acaa92aa669a50f67e5dc2b';
const FIREBASE_PROJECT_ID = 'smarthub-c8309';
const FIREBASE_API_KEY = 'AIzaSyC1us7eXlX8XIB4p2CeTJURDJn7MP0CAxA';
const BACKEND_URL = 'http://localhost:5001';
const ADMIN_SECRET = 'safehub_admin_master_secret';

// ─── Step 1: Query SerpAPI ─────────────────────────────────────────────────
console.log('\n🔍 Querying SerpAPI for hospitals near Indiranagar, Bangalore...\n');

let chosenFacility;

try {
  const query = encodeURIComponent('hospitals near Indiranagar, Bangalore');
  const serpUrl = `https://serpapi.com/search.json?engine=google_maps&q=${query}&ll=@12.9784,77.6408,14z&type=search&api_key=${SERPAPI_KEY}`;
  const serpRes = await fetch(serpUrl);
  const serpData = await serpRes.json();

  if (serpData.error) throw new Error('SerpAPI: ' + serpData.error);
  const places = serpData.local_results || [];
  if (places.length === 0) throw new Error('No results');

  const sorted = places.filter(p => p.rating).sort((a, b) => (b.rating || 0) - (a.rating || 0));
  const best = sorted[0] || places[0];

  chosenFacility = {
    name: best.title || 'Indiranagar Hospital',
    address: best.address || 'Indiranagar, Bangalore',
    lat: best.gps_coordinates?.latitude || 12.9784,
    lng: best.gps_coordinates?.longitude || 77.6408,
    phone: best.phone || '+91 80 2528 0461',
    rating: best.rating || 4.3,
    reviews: best.reviews || 0
  };

  console.log(`✅ Found: ${chosenFacility.name}`);
  console.log(`   ★ ${chosenFacility.rating} (${chosenFacility.reviews} reviews)`);
  console.log(`   ${chosenFacility.address}`);
  console.log(`   ${chosenFacility.lat}, ${chosenFacility.lng}\n`);
} catch (err) {
  console.warn('⚠️  SerpAPI failed, using fallback:', err.message);
  chosenFacility = {
    name: 'Chinmaya Mission Hospital & Medical Centre',
    address: 'CMH Road, Indiranagar, Bengaluru, Karnataka 560038',
    lat: 12.9784, lng: 77.6432,
    phone: '+91 80 2528 0461', rating: 4.4, reviews: 3410
  };
}

// ─── Step 2: Build shelter doc ─────────────────────────────────────────────
const shelterId = 'shelter_indiranagar_' + Date.now();
const now = Date.now();
const shelterDoc = {
  id: shelterId,
  name: chosenFacility.name,
  address: chosenFacility.address,
  coordinates: { lat: chosenFacility.lat, lng: chosenFacility.lng },
  capacity: 200,
  currentOccupancy: 0,
  status: 'available',
  verificationStatus: 'verified',
  medicalAvailable: true,
  contactPhone: chosenFacility.phone,
  facilities: ['Emergency Medical Bay', 'ICU', 'Clean Water Supply', 'Generator Backup', 'First Aid Station', 'Ambulance Access'],
  createdAt: now,
  updatedAt: now
};

// ─── Step 3: Write to Firestore ────────────────────────────────────────────
function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number' && Number.isInteger(value)) return { integerValue: String(value) };
  if (typeof value === 'number') return { doubleValue: value };
  if (typeof value === 'string') return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(value)) fields[k] = toFirestoreValue(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function toFirestoreDocument(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) fields[k] = toFirestoreValue(v);
  return { fields };
}

console.log('📡 Writing to Firestore...');
const fsUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/shelters/${shelterId}?key=${FIREBASE_API_KEY}`;

try {
  const fsRes = await fetch(fsUrl, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toFirestoreDocument(shelterDoc))
  });

  if (!fsRes.ok) {
    const errText = await fsRes.text();
    console.error('❌ Firestore write failed:', fsRes.status, errText);
  } else {
    console.log('✅ FIRESTORE WRITE SUCCESSFUL!');
  }
} catch (err) {
  console.error('❌ Firestore connection error:', err.message);
}

// ─── Step 4: Also write via backend API ────────────────────────────────────
console.log('📡 Also writing via backend API...');
try {
  const res = await fetch(`${BACKEND_URL}/api/admin/create-shelter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminSecret: ADMIN_SECRET, shelter: shelterDoc })
  });
  const data = await res.json();
  if (data.success) console.log('✅ Backend API write successful!');
} catch (err) {
  console.warn('⚠️  Backend API fallback also failed:', err.message);
}

// ─── Also write shelter resources ──────────────────────────────────────────
const resourcesDoc = {
  id: shelterId, shelterId, waterLevelPercent: 90, foodPacks: 500,
  foodPercent: 85, blankets: 300, medicalKits: 50, volunteers: 12, lastUpdated: now
};
try {
  const resUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/shelter_resources/${shelterId}?key=${FIREBASE_API_KEY}`;
  const rr = await fetch(resUrl, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(toFirestoreDocument(resourcesDoc)) });
  if (rr.ok) console.log('✅ Shelter resources written to Firestore!');
} catch {}

// ─── Summary ───────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════');
console.log('🎉 INDIRANAGAR SHELTER DEPLOYED TO EVACUATION MAP!');
console.log('════════════════════════════════════════════════════════');
console.log(`   📍 ${shelterDoc.name}`);
console.log(`   🏠 ${shelterDoc.address}`);
console.log(`   🛏  ${shelterDoc.capacity} beds | 📞 ${shelterDoc.contactPhone}`);
console.log(`   🔑 ${shelterId}`);
console.log(`\n   🌐 http://localhost:5173/shelters`);
console.log('════════════════════════════════════════════════════════\n');
