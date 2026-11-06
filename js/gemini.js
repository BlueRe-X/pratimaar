/**
 * PratimaAR - Gemini AI Chatbot Module
 * Fitur AI Chatbot dengan Strategi Penghematan Token Maksimal (Input & Output)
 * 
 * Strategi Penghematan Token:
 * 1. System Prompt ultra-ringkas (~25-30 token)
 * 2. Injeksi konteks objek dinamis (hanya objek aktif yang dikirim, ~15-20 token)
 * 3. Batas output untuk jawaban yang lebih lengkap (maxOutputTokens: 350)
 * 4. Sliding window percakapan (hanya 2 giliran percakapan terakhir yang dikirim ke API)
 * 5. Input user dipangkas maksimal 150 karakter
 * 6. Quick prompts pendek (2-4 kata)
 * 7. Pelacakan token real-time melalui usageMetadata
 */

class GeminiChatbot {
  constructor() {
    try {
      localStorage.removeItem('pratima_gemini_api_key');
    } catch (error) {
      console.warn("API Key lama tidak dapat dihapus dari penyimpanan browser.", error);
    }

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
  }

  setActiveItem(item) {
    this.activeItem = item;
  }

  clearHistory() {
    this.conversationHistory = [];
  }

  /**
   * System prompt untuk jawaban yang informatif tanpa melebar dari topik.
   */
  getSystemInstruction() {
    let ctx = "Objek: Umum WebAR Pratima.";
    if (this.activeItem) {
      ctx = `${this.activeItem.aiContext}`;
    }
    return `Asisten Pratima WebAR. Jawab dengan jelas dan cukup rinci dalam 4-6 kalimat tentang objek, bahasa Bali, budaya, atau fakta terkait. Berikan penjelasan dan contoh singkat bila membantu, jangan mengarang fakta, dan tetap fokus pada pertanyaan. Konteks saat ini: ${ctx}`;
  }

  /**
   * Mengirim pesan ke Gemini API dengan efisiensi token maksimal
   */
  async sendMessage(rawUserMessage) {
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

    // API key and generation settings stay on the server.
    const payload = {
      context: this.activeItem?.aiContext || "Objek: Umum WebAR Pratima.",
      contents
    };

    try {
      const response = await fetch('/api/gemini', {
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
      const modelText = data.reply;
      if (!modelText) {
        throw new Error("Gemini tidak mengembalikan jawaban.");
      }

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
   * Tes koneksi cepat ke endpoint Gemini yang dikelola server
   */
  async testApiKey() {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'test' })
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
