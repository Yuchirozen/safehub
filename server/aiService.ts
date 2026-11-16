/**
 * SAFEHUB AI Service
 * Handles prompt grounding, disaster safety rules, and multi-provider LLM execution
 */

export interface ChatMessagePayload {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LiveSafehubContext {
  shelters?: Array<{
    name: string;
    address: string;
    capacity: number;
    currentOccupancy: number;
    status: string;
    medicalAvailable: boolean;
    contactPhone?: string;
    facilities?: string[];
  }>;
  alerts?: Array<{
    title: string;
    category: string;
    severity: string;
    description: string;
    affectedArea?: string;
  }>;
  floodStatus?: {
    highestWaterLevelCm?: number;
    severity?: string;
    criticalStationsCount?: number;
  };
  userRole?: string;
}

// Simple in-memory sliding-window rate limiter (20 requests per minute per IP)
const ipRequestTimestamps: Map<string, number[]> = new Map();

export function checkRateLimit(ip: string, limit = 20, windowMs = 60000): boolean {
  const now = Date.now();
  const timestamps = ipRequestTimestamps.get(ip) || [];
  const validTimestamps = timestamps.filter(t => now - t < windowMs);
  if (validTimestamps.length >= limit) {
    ipRequestTimestamps.set(ip, validTimestamps);
    return false;
  }
  validTimestamps.push(now);
  ipRequestTimestamps.set(ip, validTimestamps);
  return true;
}

export function buildSystemPrompt(context?: LiveSafehubContext): string {
  let sheltersSection = 'No registered shelters currently reported.';
  if (context?.shelters && context.shelters.length > 0) {
    sheltersSection = context.shelters.map((s, i) => {
      const occPct = Math.round((s.currentOccupancy / (s.capacity || 1)) * 100);
      return `${i + 1}. **${s.name}**\n` +
        `   - Address: ${s.address}\n` +
        `   - Occupancy: ${s.currentOccupancy}/${s.capacity} (${occPct}%) | Status: ${s.status.toUpperCase()}\n` +
        `   - Medical Facilities Available: ${s.medicalAvailable ? 'YES (Medical bay on-site)' : 'NO'}\n` +
        `   - Emergency Phone: ${s.contactPhone || '+91 80 2221 4455'}\n` +
        `   - Amenities: ${(s.facilities || []).join(', ') || 'Emergency cots, clean drinking water'}`;
    }).join('\n\n');
  }

  let alertsSection = 'No active critical alerts at this time. Standard disaster preparedness protocol is in effect.';
  if (context?.alerts && context.alerts.length > 0) {
    alertsSection = context.alerts.map((a, i) => {
      return `${i + 1}. [${a.severity.toUpperCase()}] ${a.title} (${a.category})\n` +
        `   - Details: ${a.description}\n` +
        `   - Area: ${a.affectedArea || 'Bangalore Metropolitan Region'}`;
    }).join('\n\n');
  }

  return `You are SAFEHUB AI, an intelligent, calm, and reassuring emergency response assistant integrated into the SAFEHUB Smart Disaster & Shelter Grid.

### CORE OBJECTIVES:
1. Provide accurate, real-time guidance on registered emergency shelters, flood alerts, and rescue operations based on verified SAFEHUB data.
2. Explain SAFEHUB features (e.g. SOS broadcast, Live Shelter Map, ESP32 IoT Water Sensors, Medical Volunteers, Evacuation routes).
3. Offer authoritative disaster preparedness, flood safety, and first-aid recommendations.
4. Maintain a clear, concise, empathetic, and professional tone suitable for high-stress crisis situations.

---

### CRITICAL SAFETY RULES (STRICT COMPLIANCE MANDATORY):
- **NEVER INVENT SHELTER OR EMERGENCY DATA**: Only cite the verified shelters and alerts provided below in the VERIFIED DATA section. If a user asks about a facility or area not listed, explicitly state: *"I do not see that facility registered in the live SAFEHUB database. Please refer to the verified shelters listed below or contact local disaster control at 1077."*
- **NEVER GUARANTEE ROUTE SAFETY**: Do not tell an evacuee that any specific road or street is 100% safe from floodwaters. Dynamic conditions can change rapidly. Always instruct them to avoid walking or driving through moving water (Turn Around, Don't Drown).
- **IMMEDIATE LIFE THREATS**: If a user states they are trapped, injured, drowning, or in immediate life danger, instruct them immediately to:
  1. Click the red **"SEND EMERGENCY SOS"** button at the top of the SAFEHUB app to transmit their live GPS coordinates directly to active rescue teams.
  2. Call the National Emergency Helpline: **112** or Disaster Control Room: **1077** / **108** (Ambulance).
- **NO DIRECT RECORD MODIFICATION**: Clarify that as an informational assistant, you cannot directly modify shelter database records or deploy vehicles on your own, but you can guide the user on how to do so via the SAFEHUB interface.
- **DISTINGUISH VERIFIED DATA FROM GENERAL ADVICE**: Always make it clear when you are quoting live SAFEHUB grid status versus general preparedness guidance.

---

### LIVE VERIFIED SAFEHUB SYSTEM DATA:

#### REGISTERED EMERGENCY SHELTERS:
${sheltersSection}

#### CURRENT ACTIVE DISASTER ALERTS:
${alertsSection}

#### OFFICIAL EMERGENCY HELPLINES:
- National Emergency Helpline: **112**
- State / City Disaster Management: **1077**
- Medical Ambulance & Paramedics: **108**
- Police Control Room: **100**
- Fire & Rescue Services: **101**

User Role in Current Session: ${context?.userRole || 'citizen'}`;
}

export async function processChatRequest(
  messages: ChatMessagePayload[],
  context?: LiveSafehubContext
): Promise<string> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
  const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

  const systemPrompt = buildSystemPrompt(context);

  // 1. Check Google Gemini (Preferred default)
  if (GEMINI_API_KEY) {
    try {
      const contents = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            },
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 900
            }
          })
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        console.error('[SAFEHUB AI] Gemini API error:', res.status, errText);
        throw new Error(`Gemini API returned status ${res.status}`);
      }

      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) return reply.trim();
    } catch (err: any) {
      console.warn('[SAFEHUB AI] Gemini attempt failed, trying fallbacks if configured:', err.message);
    }
  }

  // 2. Check Groq (Ultra-fast Llama 3)
  if (GROQ_API_KEY) {
    try {
      const openAiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }))
      ];

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: openAiMessages,
          temperature: 0.3,
          max_tokens: 900
        })
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) return reply.trim();
      } else {
        console.error('[SAFEHUB AI] Groq error:', res.status, await res.text());
      }
    } catch (err: any) {
      console.warn('[SAFEHUB AI] Groq attempt failed:', err.message);
    }
  }

  // 3. Check OpenAI
  if (OPENAI_API_KEY) {
    try {
      const openAiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }))
      ];

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: openAiMessages,
          temperature: 0.3,
          max_tokens: 900
        })
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) return reply.trim();
      } else {
        console.error('[SAFEHUB AI] OpenAI error:', res.status, await res.text());
      }
    } catch (err: any) {
      console.warn('[SAFEHUB AI] OpenAI attempt failed:', err.message);
    }
  }

  // If no AI key was configured
  if (!GEMINI_API_KEY && !GROQ_API_KEY && !OPENAI_API_KEY) {
    return `⚠️ **SAFEHUB AI Backend Configuration Notice**\n\nThe AI assistant backend is active, but requires an AI provider API key to process natural language inquiries. Please configure \`GEMINI_API_KEY\`, \`GROQ_API_KEY\`, or \`OPENAI_API_KEY\` in your environment.\n\nIn the meantime, you can explore live shelters on the **Evacuation Map**, view active alerts in **Live Alerts**, or click **SOS** for emergency rescue dispatch.`;
  }

  throw new Error('All configured AI services are temporarily unavailable. Please try again shortly or contact emergency services directly.');
}
