import type { IncomingMessage, ServerResponse } from 'http';

// In Vercel serverless, req has .body, .headers, .method, res has .status, .json
export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED', message: 'Only POST is supported' });
  }

  const { messages, context } = req.body || {};
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'INVALID_REQUEST', message: 'Messages array is required' });
  }

  const sanitizedMessages = messages.slice(-15).map((m: any) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: typeof m.content === 'string' ? m.content.slice(0, 1500) : ''
  })).filter((m: any) => m.content.trim().length > 0);

  if (sanitizedMessages.length === 0) {
    return res.status(400).json({ error: 'EMPTY_MESSAGE', message: 'Message content cannot be blank' });
  }

  // Build System Prompt
  let sheltersSection = 'No registered shelters currently reported.';
  if (context?.shelters && context.shelters.length > 0) {
    sheltersSection = context.shelters.map((s: any, i: number) => {
      const occPct = Math.round((s.currentOccupancy / (s.capacity || 1)) * 100);
      return `${i + 1}. **${s.name}**\n` +
        `   - Address: ${s.address}\n` +
        `   - Occupancy: ${s.currentOccupancy}/${s.capacity} (${occPct}%) | Status: ${s.status?.toUpperCase() || 'AVAILABLE'}\n` +
        `   - Medical Facilities Available: ${s.medicalAvailable ? 'YES (Medical bay on-site)' : 'NO'}\n` +
        `   - Emergency Phone: ${s.contactPhone || '+91 80 2221 4455'}\n` +
        `   - Amenities: ${(s.facilities || []).join(', ') || 'Emergency cots, clean drinking water'}`;
    }).join('\n\n');
  }

  let alertsSection = 'No active critical alerts at this time. Standard disaster preparedness protocol is in effect.';
  if (context?.alerts && context.alerts.length > 0) {
    alertsSection = context.alerts.map((a: any, i: number) => {
      return `${i + 1}. [${a.severity?.toUpperCase() || 'INFO'}] ${a.title} (${a.category})\n` +
        `   - Details: ${a.description}\n` +
        `   - Area: ${a.affectedArea || 'Bangalore Metropolitan Region'}`;
    }).join('\n\n');
  }

  const systemPrompt = `You are SAFEHUB AI, an intelligent, calm, and reassuring emergency response assistant integrated into the SAFEHUB Smart Disaster & Shelter Grid.

### CORE OBJECTIVES:
1. Provide accurate, real-time guidance on registered emergency shelters, flood alerts, and rescue operations based on verified SAFEHUB data.
2. Explain SAFEHUB features (e.g. SOS broadcast, Live Shelter Map, ESP32 IoT Water Sensors, Medical Volunteers, Evacuation routes).
3. Offer authoritative disaster preparedness, flood safety, and first-aid recommendations.
4. Maintain a clear, concise, empathetic, and professional tone suitable for high-stress crisis situations.

### CRITICAL SAFETY RULES (STRICT COMPLIANCE MANDATORY):
- NEVER INVENT SHELTER OR EMERGENCY DATA: Only cite verified shelters and alerts provided below.
- NEVER GUARANTEE ROUTE SAFETY: Do not tell an evacuee that any specific road or street is 100% safe from floodwaters.
- IMMEDIATE LIFE THREATS: If a user states they are trapped or in life danger, instruct them to click "SEND EMERGENCY SOS" and call 112 / 1077.
- DISTINGUISH VERIFIED DATA FROM GENERAL ADVICE.

### LIVE VERIFIED SAFEHUB SYSTEM DATA:
#### REGISTERED EMERGENCY SHELTERS:
${sheltersSection}

#### CURRENT ACTIVE DISASTER ALERTS:
${alertsSection}

#### OFFICIAL EMERGENCY HELPLINES:
- National Emergency: 112
- State Disaster Management: 1077
- Ambulance: 108
- Police: 100
- Fire: 101

User Role: ${context?.userRole || 'citizen'}`;

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
  const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

  // 1. Gemini
  if (GEMINI_API_KEY) {
    try {
      const contents = sanitizedMessages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const gRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { temperature: 0.3, maxOutputTokens: 900 }
          })
        }
      );

      if (gRes.ok) {
        const data = await gRes.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply) return res.json({ reply: reply.trim(), timestamp: Date.now() });
      }
    } catch (e: any) {
      console.warn('Gemini failed:', e.message);
    }
  }

  // 2. Groq
  if (GROQ_API_KEY) {
    try {
      const gRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            ...sanitizedMessages
          ],
          temperature: 0.3,
          max_tokens: 900
        })
      });

      if (gRes.ok) {
        const data = await gRes.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) return res.json({ reply: reply.trim(), timestamp: Date.now() });
      }
    } catch (e: any) {
      console.warn('Groq failed:', e.message);
    }
  }

  // 3. OpenAI
  if (OPENAI_API_KEY) {
    try {
      const oRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            ...sanitizedMessages
          ],
          temperature: 0.3,
          max_tokens: 900
        })
      });

      if (oRes.ok) {
        const data = await oRes.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) return res.json({ reply: reply.trim(), timestamp: Date.now() });
      }
    } catch (e: any) {
      console.warn('OpenAI failed:', e.message);
    }
  }

  if (!GEMINI_API_KEY && !GROQ_API_KEY && !OPENAI_API_KEY) {
    return res.json({
      reply: `⚠️ **SAFEHUB AI Backend Configuration Notice**\n\nThe AI assistant backend is active, but requires an AI provider API key to process natural language inquiries. Please configure \`GEMINI_API_KEY\`, \`GROQ_API_KEY\`, or \`OPENAI_API_KEY\` in your environment.\n\nIn the meantime, you can explore live shelters on the **Evacuation Map**, view active alerts in **Live Alerts**, or click **SOS** for emergency rescue dispatch.`,
      timestamp: Date.now()
    });
  }

  return res.status(503).json({
    error: 'AI_SERVICE_UNAVAILABLE',
    message: 'SAFEHUB AI is momentarily overloaded. For immediate life threats, click SOS or dial 112.'
  });
}
