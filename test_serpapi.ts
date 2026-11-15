import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.SERPAPI_KEY;
console.log('Testing SerpAPI with key:', apiKey ? `${apiKey.substring(0, 6)}... (length: ${apiKey.length})` : 'MISSING');

async function testSerp() {
  const query = 'hospitals near Indiranagar Bangalore';
  const url = `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(query)}&ll=@12.9716,77.5946,14z&type=search&api_key=${apiKey}`;

  try {
    const res = await fetch(url);
    console.log('HTTP status:', res.status, res.statusText);
    const data: any = await res.json();
    if (data.error) {
      console.error('SerpAPI error response:', data.error);
    } else {
      const places = data.local_results || [];
      console.log(`Successfully fetched ${places.length} places from Google Maps via SerpAPI!`);
      places.slice(0, 3).forEach((p: any, idx: number) => {
        console.log(` [${idx + 1}] ${p.title} - ${p.address || 'No address'}`);
      });
    }
  } catch (err: any) {
    console.error('Network / fetch error:', err.message);
  }
}

testSerp();
