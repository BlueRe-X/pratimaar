/**
 * PratimaAR - Gemini AI Chatbot Module
 * Fitur AI Chatbot dengan Strategi Penghematan Token Maksimal (Input & Output)
 * 
 * Strategi Penghematan Token:
 * 1. System Prompt ultra-ringkas (~25-30 token)
 * 2. Injeksi konteks objek dinamis (hanya objek aktif yang dikirim, ~15-20 token)
 * 3. Batas output ketat (maxOutputTokens: 100)
 * 4. Sliding window percakapan (hanya 2 giliran percakapan terakhir yang dikirim ke API)
 * 5. Input user dipangkas maksimal 150 karakter
 * 6. Quick prompts pendek (2-4 kata)
 * 7. Pelacakan token real-time melalui usageMetadata
 */

class GeminiChatbot {
  constructor() {
    this.storageKey = 'pratima_gemini_api_key';
    this.apiKey = localStorage.getItem(this.storageKey) || '';
    this.modelName = 'gemini-1.5-flash'; // Model paling hemat, cepat, dan handal
    this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent`;

    // Riwayat percakapan lokal (untuk tampilan)
    this.conversationHistory = [];
    
    // Objek aktif saat ini (diset saat target terdeteksi)
    this.activeItem = null;

    // Statistik token kumulatif
    this.tokenStats = {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      requestCount: 0
    };

    // Callback untuk update UI token
    this.onTokenUpdate = null;

    // Muat konfigurasi .env otomatis dari server
    this.initServerConfig();
  }

  async initServerConfig() {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const config = await res.json();
        if (config.hasEnvKey && !this.apiKey) {
          this.apiKey = config.geminiApiKey;
          this.isFromEnv = true;
          console.log("✓ Gemini API Key berhasil dimuat otomatis dari .env");
        }
      }
    } catch (e) {
      // Abaikan jika dijalankan tanpa server backend
    }
  }

  setApiKey(key) {
    this.apiKey = key.trim();
    if (this.apiKey) {
      localStorage.setItem(this.storageKey, this.apiKey);
    } else {
      localStorage.removeItem(this.storageKey);
    }
  }

  getApiKey() {
    return this.apiKey;
  }

  hasApiKey() {
    return Boolean(this.apiKey && this.apiKey.length > 10);
  }

  setActiveItem(item) {
    this.activeItem = item;
  }

  clearHistory() {
    this.conversationHistory = [];
  }

  /**
   * System Prompt hemat token:
   * Sangat padat, menegaskan jawaban maksimal 2 kalimat tanpa pembuka/penutup klise.
   */
  getSystemInstruction() {
    let ctx = "Objek: Umum WebAR Pratima.";
    if (this.activeItem) {
      ctx = `${this.activeItem.aiContext}`;
    }
    return `Asisten Pratima WebAR. Jawab singkat padat (maksimal 2 kalimat, to-the-point) tentang objek/bahasa Bali/fakta unik. Tanpa basa-basi. Konteks saat ini: ${ctx}`;
  }

  /**
   * Mengirim pesan ke Gemini API dengan efisiensi token maksimal
   */
  async sendMessage(rawUserMessage) {
    if (!this.hasApiKey()) {
      throw new Error("API Key Gemini belum diatur. Silakan masukkan API Key di menu pengaturan.");
    }

    // 1. Pangkas input teks (Token Saving Strategy #1)
    const userMessage = rawUserMessage.trim().substring(0, 150);
    if (!userMessage) {
      throw new Error("Pesan tidak boleh kosong.");
    }

    // Simpan ke riwayat lokal
    this.conversationHistory.push({
      role: 'user',
      text: userMessage,
      time: new Date()
    });

    // 2. Sliding Window: Ambil hanya 2 turn terakhir (Token Saving Strategy #2)
    // Hindari mengirim riwayat panjang yang membakar token!
    const recentTurns = this.conversationHistory.slice(-4);

    const contents = recentTurns.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    // 3. Payload Request dengan generationConfig hemat token
    const payload = {
      systemInstruction: {
        parts: [{ text: this.getSystemInstruction() }]
      },
      contents: contents,
      generationConfig: {
        maxOutputTokens: 100, // Token Saving Strategy #3: Output dibatasi keras ~60-80 kata
        temperature: 0.4,     // Akurat, tidak bertele-tele
        topP: 0.8
      }
    };

    try {
      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || `Error ${response.status}: ${response.statusText}`;
        throw new Error(errorMsg);
      }

      const data = await response.json();

      // Ambil respon model
      const candidate = data.candidates?.[0];
      const modelText = candidate?.content?.parts?.[0]?.text || "(Tidak ada respon)";

      // 4. Catat token penggunaan dari usageMetadata Gemini
      const usage = data.usageMetadata || {};
      const promptTokens = usage.promptTokenCount || Math.ceil((this.getSystemInstruction().length + userMessage.length) / 4);
      const outputTokens = usage.candidatesTokenCount || Math.ceil(modelText.length / 4);
      const totalTokens = usage.totalTokenCount || (promptTokens + outputTokens);

      this.tokenStats.totalInputTokens += promptTokens;
      this.tokenStats.totalOutputTokens += outputTokens;
      this.tokenStats.totalTokens += totalTokens;
      this.tokenStats.requestCount += 1;

      // Simpan jawaban model ke riwayat lokal
      const assistantMessage = {
        role: 'model',
        text: modelText,
        time: new Date(),
        tokenInfo: {
          inputTokens: promptTokens,
          outputTokens: outputTokens,
          totalTokens: totalTokens
        }
      };
      this.conversationHistory.push(assistantMessage);

      if (typeof this.onTokenUpdate === 'function') {
        this.onTokenUpdate(this.tokenStats, assistantMessage.tokenInfo);
      }

      return {
        reply: modelText,
        tokenInfo: assistantMessage.tokenInfo
      };
    } catch (err) {
      console.error("Gemini API Error:", err);
      throw err;
    }
  }

  /**
   * Tes koneksi cepat API Key dengan biaya 5 token
   */
  async testApiKey(key) {
    const testKey = (key || this.apiKey).trim();
    if (!testKey) throw new Error("API Key kosong");

    const payload = {
      contents: [{ role: 'user', parts: [{ text: "Halo" }] }],
      generationConfig: { maxOutputTokens: 10 }
    };

    const res = await fetch(`${this.apiUrl}?key=${testKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }
    return true;
  }
}

// Inisialisasi global
window.geminiChatbot = new GeminiChatbot();
