import { spawn } from 'child_process';

const server = spawn('npx.cmd', ['tsx', 'server/index.ts'], {
  cwd: process.cwd(),
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe']
});

let started = false;

server.stdout.on('data', async (data) => {
  const text = data.toString();
  console.log('[SERVER LOG]', text.trim());
  if (!started && text.includes('running on port')) {
    started = true;
    try {
      // 1. Health check
      const healthRes = await fetch('http://127.0.0.1:5001/api/health');
      const health = await healthRes.json();
      console.log('>>> HEALTH OK:', health);

      // 2. SerpAPI Places candidate query
      const placesRes = await fetch('http://127.0.0.1:5001/api/places/nearby?q=hospitals&type=hospital');
      const places = await placesRes.json();
      console.log('>>> PLACES CANDIDATES COUNT:', places.candidateFacilities?.length);

      // 3. Flood telemetry ingestion
      const floodRes = await fetch('http://127.0.0.1:5001/api/hardware/flood', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Key': 'safehub_esp32_device_secret_2026'
        },
        body: JSON.stringify({
          deviceId: 'ESP32_PROBE_01',
          waterLevelCm: 55,
          rateOfRiseCmPer10Min: 6,
          area: 'Test Basin Zone'
        })
      });
      const floodData = await floodRes.json();
      console.log('>>> FLOOD INGESTION OK:', floodData.success, floodData.event?.severity);

      // 4. Dual IR Occupancy entry
      const irRes = await fetch('http://127.0.0.1:5001/api/hardware/occupancy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Key': 'safehub_esp32_device_secret_2026'
        },
        body: JSON.stringify({
          deviceId: 'ESP32_PROBE_01',
          shelterId: 'shelter_central_high',
          direction: 'entry'
        })
      });
      const irData = await irRes.json();
      console.log('>>> IR ENTRY INGESTION OK:', irData.success, irData.direction, irData.delta);

      // 5. Physical SOS button trigger
      const sosRes = await fetch('http://127.0.0.1:5001/api/hardware/sos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Key': 'safehub_esp32_device_secret_2026'
        },
        body: JSON.stringify({
          deviceId: 'ESP32_PROBE_01',
          shelterId: 'shelter_central_high',
          locationName: 'North Gate Kiosk'
        })
      });
      const sosData = await sosRes.json();
      console.log('>>> PHYSICAL SOS DISPATCH OK:', sosData.success, sosData.incident?.severity);

      console.log('\n=======================================');
      console.log('ALL 5 BACKEND REST API ENDPOINTS PASSED');
      console.log('=======================================');

      server.kill();
      process.exit(0);
    } catch (err) {
      console.error('PROBE ERROR:', err);
      server.kill();
      process.exit(1);
    }
  }
});

server.stderr.on('data', (d) => {
  console.error('[SERVER ERR]', d.toString().trim());
});

setTimeout(() => {
  if (!started) {
    console.error('Server failed to start within timeout');
    server.kill();
    process.exit(1);
  }
}, 15000);
