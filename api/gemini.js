const MODEL_NAME = 'gemini-2.5-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`;

function jsonResponse(status, body) {
  return { status, body };
}

function parseBody(body) {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }
  return body && typeof body === 'object' ? body : null;
}

function validateOrigin(headers) {
  const origin = headers.origin;
  const host = headers.host;
  if (!origin || !host) return true;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function processRequest(req) {
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: { message: 'Gunakan metode POST.' } });
  }

  const headers = req.headers || {};
  if (!validateOrigin(headers)) {
    return jsonResponse(403, { error: { message: 'Asal permintaan tidak diizinkan.' } });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonResponse(503, { error: { message: 'Chatbot belum dikonfigurasi. Tambahkan GEMINI_API_KEY di pengaturan server.' } });
  }

  const body = parseBody(req.body);
  if (!body) {
    return jsonResponse(400, { error: { message: 'Format permintaan tidak valid.' } });
  }

  let contents;
  let testMode = false;
  if (body.action === 'test') {
    testMode = true;
    contents = [{ role: 'user', parts: [{ text: 'Halo' }] }];
  } else {
    if (!Array.isArray(body.contents) || body.contents.length < 1 || body.contents.length > 4) {
      return jsonResponse(400, { error: { message: 'Riwayat pesan tidak valid.' } });
    }
    if (typeof body.context !== 'string' || body.context.length > 300) {
      return jsonResponse(400, { error: { message: 'Konteks objek tidak valid.' } });
    }

    contents = [];
    for (const message of body.contents) {
      if (!message || !['user', 'model'].includes(message.role) ||
          !Array.isArray(message.parts) || message.parts.length !== 1 ||
          typeof message.parts[0]?.text !== 'string') {
        return jsonResponse(400, { error: { message: 'Isi pesan tidak valid.' } });
      }

      const text = message.parts[0].text.trim();
      const maxLength = message.role === 'user' ? 150 : 1000;
      if (!text || text.length > maxLength) {
        return jsonResponse(400, { error: { message: 'Panjang pesan tidak valid.' } });
      }
      contents.push({ role: message.role, parts: [{ text }] });
    }

    if (contents[contents.length - 1].role !== 'user') {
      return jsonResponse(400, { error: { message: 'Pesan terakhir harus berasal dari pengguna.' } });
    }
  }

  const payload = {
    contents,
    generationConfig: {
      maxOutputTokens: testMode ? 10 : 100,
      temperature: 0.4,
      topP: 0.8
    }
  };

  if (!testMode) {
    payload.systemInstruction = {
      parts: [{
        text: `Asisten Pratima WebAR. Jawab singkat padat (maksimal 2 kalimat, to-the-point) tentang objek/bahasa Bali/fakta unik. Tanpa basa-basi. Konteks saat ini: ${body.context}`
      }]
    };
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return jsonResponse(response.status, {
        error: { message: data.error?.message || `Gemini API gagal (HTTP ${response.status}).` }
      });
    }

    if (testMode) return jsonResponse(200, { ok: true });

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) {
      return jsonResponse(502, { error: { message: 'Gemini tidak mengembalikan jawaban.' } });
    }

    return jsonResponse(200, { reply, usageMetadata: data.usageMetadata || {} });
  } catch (error) {
    console.error('Gemini proxy request failed:', error);
    return jsonResponse(502, { error: { message: 'Tidak dapat menghubungi Gemini. Coba lagi nanti.' } });
  }
}

async function handler(req, res) {
  const result = await processRequest(req);
  res.statusCode = result.status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(result.body));
}

module.exports = handler;
module.exports.processRequest = processRequest;
