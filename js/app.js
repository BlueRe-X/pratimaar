/**
 * PratimaAR - Main Application Controller
 * Mengatur lifecycle MindAR, interaksi model 3D, UI responsif, TTS, dan Chatbot Gemini
 */

document.addEventListener('DOMContentLoaded', async () => {
  // State aplikasi
  const state = {
    activeItem: null,
    activeLang: 'id', // 'id', 'en', 'bali'
    isChatOpen: false,
    isGalleryOpen: false,
    isSettingsOpen: false,
    isTargetModalOpen: false,
    previewModeItem: null,
    speechActive: false,
    trackedTargets: new Set()
  };

  // Elemen DOM utama
  const dom = {
    // Status & Reticle
    statusIndicator: document.getElementById('status-indicator'),
    statusText: document.getElementById('status-text'),
    scannerReticle: document.getElementById('scanner-reticle'),
    
    // Bottom Info Card & Model Navigator
    infoCard: document.getElementById('info-card'),
    cardIcon: document.getElementById('card-icon'),
    cardTitle: document.getElementById('card-title'),
    cardSub: document.getElementById('card-sub'),
    cardDesc: document.getElementById('card-desc'),
    langTabs: document.querySelectorAll('.lang-tab'),
    btnTts: document.getElementById('btn-tts'),
    btnAskAi: document.getElementById('btn-ask-ai'),
    modelNavPills: document.getElementById('model-nav-pills'),
    modelCounterBadge: document.getElementById('model-counter-badge'),
    
    // 3D Controls
    btnRotLeft: document.getElementById('ctrl-rot-left'),
    btnRotRight: document.getElementById('ctrl-rot-right'),
    btnZoomIn: document.getElementById('ctrl-zoom-in'),
    btnZoomOut: document.getElementById('ctrl-zoom-out'),
    btnReset3d: document.getElementById('ctrl-reset'),
    
    // Chat Drawer
    chatDrawer: document.getElementById('chat-drawer'),
    btnOpenChat: document.getElementById('btn-open-chat'),
    btnCloseChat: document.getElementById('btn-close-chat'),
    chatMessages: document.getElementById('chat-messages'),
    chatInput: document.getElementById('chat-input'),
    btnSendChat: document.getElementById('btn-send-chat'),
    chatCharCount: document.getElementById('chat-char-count'),
    chatActiveObject: document.getElementById('chat-active-object'),
    quickChipsContainer: document.getElementById('quick-chips'),
    tokenStatsBadge: document.getElementById('token-stats-badge'),
    btnClearChat: document.getElementById('btn-clear-chat'),
    
    // Gallery Modal
    galleryModal: document.getElementById('gallery-modal'),
    btnOpenGallery: document.getElementById('btn-open-gallery'),
    btnCloseGallery: document.getElementById('btn-close-gallery'),
    galleryGrid: document.getElementById('gallery-grid'),
    
    // Full Image Modal & Deskripsi
    imageModal: document.getElementById('image-modal'),
    btnCloseImageModal: document.getElementById('btn-close-image-modal'),
    modalTargetImg: document.getElementById('modal-target-img'),
    modalTargetTitle: document.getElementById('modal-target-title'),
    btnDownloadTarget: document.getElementById('btn-download-target'),
    
    // Settings / Gemini connection
    settingsModal: document.getElementById('settings-modal'),
    btnOpenSettings: document.getElementById('btn-open-settings'),
    btnCloseSettings: document.getElementById('btn-close-settings'),
    btnTestApiKey: document.getElementById('btn-test-api-key'),
    apiKeyStatus: document.getElementById('api-key-status'),
    
    // Loading Screen
    loadingScreen: document.getElementById('loading-screen'),
    loadingProgress: document.getElementById('loading-progress'),
    btnSkipLoading: document.getElementById('btn-skip-loading'),
    loadingHint: document.getElementById('loading-hint')
  };

  /* ==========================================================================
     1. REGISTRASI KOMPONEN A-FRAME
     ========================================================================== */

  // Komponen untuk otomatis menengahkan dan menormalisasi ukuran model 3D
  AFRAME.registerComponent('auto-fit-model', {
    schema: {
      targetSize: { type: 'number', default: 0.65 },
      center: { type: 'boolean', default: true },
      offsetY: { type: 'number', default: 0 }
    },
    init: function () {
      this.el.addEventListener('model-loaded', () => {
        const mesh = this.el.getObject3D('mesh');
        if (!mesh) return;

        // Hitung bounding box model
        const bbox = new THREE.Box3().setFromObject(mesh);
        const size = bbox.getSize(new THREE.Vector3());
        const center = bbox.getCenter(new THREE.Vector3());

        // Hitung dimensi terbesar
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          const scaleFactor = this.data.targetSize / maxDim;
          mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);

          // Posisikan ke tengah target
          mesh.position.x = -center.x * scaleFactor;
          mesh.position.y = (-center.y * scaleFactor) + this.data.offsetY;
          mesh.position.z = -center.z * scaleFactor;
        }

        // Simpan transformasi default untuk fitur Reset
        this.el.dataset.defaultScale = `${mesh.scale.x} ${mesh.scale.y} ${mesh.scale.z}`;
        this.el.dataset.defaultRotY = mesh.rotation.y;
      });
    }
  });

  // Komponen interaksi sentuh / gestur untuk model 3D
  AFRAME.registerComponent('model-gesture-control', {
    init: function () {
      let isDragging = false;
      let prevX = 0;
      let prevY = 0;
      let initialDist = 0;
      let initialScale = 1;

      const viewport = document.body;

      // Mouse Drag
      viewport.addEventListener('mousedown', (e) => {
        if (e.target.closest('#info-card') || e.target.closest('#chat-drawer') || 
            e.target.closest('.modal-backdrop') || e.target.closest('.ui-header')) return;
        isDragging = true;
        prevX = e.clientX;
        prevY = e.clientY;
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging || !state.activeItem) return;
        const deltaX = e.clientX - prevX;
        const deltaY = e.clientY - prevY;
        prevX = e.clientX;
        prevY = e.clientY;

        rotateActiveModel(deltaX * 0.5, deltaY * 0.5);
      });

      window.addEventListener('mouseup', () => { isDragging = false; });

      // Touch Drag & Pinch Zoom
      viewport.addEventListener('touchstart', (e) => {
        if (e.target.closest('#info-card') || e.target.closest('#chat-drawer') || 
            e.target.closest('.modal-backdrop') || e.target.closest('.ui-header')) return;
        
        if (e.touches.length === 1) {
          isDragging = true;
          prevX = e.touches[0].clientX;
          prevY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
          isDragging = false;
          initialDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
        }
      }, { passive: true });

      viewport.addEventListener('touchmove', (e) => {
        if (!state.activeItem) return;
        if (isDragging && e.touches.length === 1) {
          const deltaX = e.touches[0].clientX - prevX;
          const deltaY = e.touches[0].clientY - prevY;
          prevX = e.touches[0].clientX;
          prevY = e.touches[0].clientY;
          rotateActiveModel(deltaX * 0.6, deltaY * 0.6);
        } else if (e.touches.length === 2 && initialDist > 0) {
          const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          const zoomFactor = dist / initialDist;
          initialDist = dist;
          zoomActiveModel(zoomFactor);
        }
      }, { passive: true });

      viewport.addEventListener('touchend', () => {
        isDragging = false;
        initialDist = 0;
      });

      // Mouse Wheel Zoom
      viewport.addEventListener('wheel', (e) => {
        if (!state.activeItem || e.target.closest('#chat-drawer') || e.target.closest('.modal-content')) return;
        const factor = e.deltaY < 0 ? 1.08 : 0.92;
        zoomActiveModel(factor);
      }, { passive: true });
    }
  });

  /* ==========================================================================
     2. FUNGSI KONTROL 3D MODEL
     ========================================================================== */

  function getActiveModelEntity() {
    if (!state.activeItem) return null;
    return document.querySelector(`#target-entity-${state.activeItem.id} .model-wrapper`);
  }

  function rotateActiveModel(deltaX, deltaY = 0) {
    const entity = getActiveModelEntity();
    if (!entity) return;
    const currentRot = entity.getAttribute('rotation') || { x: 0, y: 0, z: 0 };
    entity.setAttribute('rotation', {
      x: currentRot.x + (deltaY * 0.3),
      y: currentRot.y + deltaX,
      z: currentRot.z
    });
  }

  function zoomActiveModel(factor) {
    const entity = getActiveModelEntity();
    if (!entity) return;
    const currentScale = entity.getAttribute('scale') || { x: 1, y: 1, z: 1 };
    const newScaleX = Math.min(Math.max(currentScale.x * factor, 0.2), 3.5);
    const newScaleY = Math.min(Math.max(currentScale.y * factor, 0.2), 3.5);
    const newScaleZ = Math.min(Math.max(currentScale.z * factor, 0.2), 3.5);
    entity.setAttribute('scale', `${newScaleX} ${newScaleY} ${newScaleZ}`);
  }

  function resetActiveModel() {
    const entity = getActiveModelEntity();
    if (!entity) return;
    entity.setAttribute('rotation', '0 0 0');
    entity.setAttribute('scale', '1 1 1');
  }

  // Tombol kontrol 3D manual
  dom.btnRotLeft?.addEventListener('click', () => rotateActiveModel(-20));
  dom.btnRotRight?.addEventListener('click', () => rotateActiveModel(20));
  dom.btnZoomIn?.addEventListener('click', () => zoomActiveModel(1.2));
  dom.btnZoomOut?.addEventListener('click', () => zoomActiveModel(0.8));
  dom.btnReset3d?.addEventListener('click', resetActiveModel);

  /* ==========================================================================
     3. MINDAR LIFECYCLE & EVENT TRACKING
     ========================================================================== */

  let sceneEl = null;

  function configureSceneTransparency(scene) {
    if (!scene) return;
    if (scene.renderer) {
      scene.renderer.setClearColor(0x000000, 0);
    }
    if (scene.object3D) {
      scene.object3D.background = null;
    }
    const canvas = scene.querySelector('canvas.a-canvas') || scene.canvas;
    if (canvas) {
      canvas.style.backgroundColor = 'transparent';
    }
  }

  function ensureVideoPlaying(video) {
    if (!video) return;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('autoplay', '');
    video.style.display = 'block';
    video.style.visibility = 'visible';
    video.style.opacity = '1';
    if (video.paused) {
      video.play().catch(error => {
        console.warn('Video play retry needed:', error);
      });
    }
  }

  try {
    await import('https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js');

    const sceneTemplate = document.getElementById('ar-scene-template');
    if (!sceneTemplate?.content.firstElementChild) {
      throw new Error('Template scene AR tidak ditemukan.');
    }

    sceneEl = sceneTemplate.content.firstElementChild.cloneNode(true);
    document.body.insertBefore(sceneEl, document.querySelector('.ui-overlay'));

    sceneEl.addEventListener('renderstart', () => configureSceneTransparency(sceneEl));
    sceneEl.addEventListener('loaded', () => configureSceneTransparency(sceneEl));

    await new Promise((resolve, reject) => {
      const deadline = performance.now() + 15000;
      const checkMindARReady = () => {
        if (sceneEl.systems['mindar-image-system']) {
          resolve();
        } else if (performance.now() >= deadline) {
          reject(new Error('Komponen MindAR tidak siap.'));
        } else {
          requestAnimationFrame(checkMindARReady);
        }
      };
      checkMindARReady();
    });

    configureSceneTransparency(sceneEl);

    dom.loadingHint.textContent = 'Modul AR siap. Tekan tombol, lalu pilih Izinkan saat browser meminta akses kamera.';
    dom.btnSkipLoading.disabled = false;
  } catch (error) {
    console.error('Modul MindAR gagal dimuat:', error);
    dom.loadingHint.textContent = 'Gagal memuat modul AR. Periksa koneksi internet, lalu muat ulang halaman.';
    dom.btnSkipLoading.textContent = 'Muat Ulang Halaman';
    dom.btnSkipLoading.disabled = false;
    dom.btnSkipLoading.addEventListener('click', () => window.location.reload(), { once: true });
  }

  let cameraStartPending = false;
  let cameraStartTimedOut = false;
  let cameraStartTimeout;

  function dismissLoading() {
    if (dom.loadingScreen) {
      dom.loadingScreen.classList.add('opacity-0', 'pointer-events-none');
      setTimeout(() => dom.loadingScreen.style.display = 'none', 500);
    }
  }

  dom.btnSkipLoading?.addEventListener('click', async () => {
    if (!sceneEl) return;

    if (cameraStartTimedOut) {
      window.location.reload();
      return;
    }

    if (cameraStartPending) return;

    const arSystem = sceneEl?.systems['mindar-image-system'];
    if (!arSystem) {
      dom.loadingHint.textContent = 'Sistem AR belum siap. Muat ulang halaman dan coba lagi.';
      return;
    }

    cameraStartPending = true;
    dom.btnSkipLoading.disabled = true;
    dom.btnSkipLoading.textContent = 'Meminta izin kamera...';
    dom.loadingHint.textContent = 'Pilih Izinkan pada dialog browser. Jika dialog tidak muncul, cek izin Kamera di pengaturan situs browser.';

    // Polling video element saat MindAR menyuntikkannya ke DOM
    const videoWatcher = setInterval(() => {
      const video = arSystem.video || document.querySelector('video');
      if (video) {
        ensureVideoPlaying(video);
      }
    }, 100);

    cameraStartTimeout = setTimeout(() => {
      if (!cameraStartPending) return;
      clearInterval(videoWatcher);
      cameraStartPending = false;
      cameraStartTimedOut = true;
      dom.btnSkipLoading.disabled = false;
      dom.btnSkipLoading.textContent = 'Muat Ulang & Coba Lagi';
      dom.loadingHint.textContent = 'Belum ada respons kamera. Izinkan Kamera lewat ikon pengaturan di address bar atau pengaturan situs browser, lalu tekan tombol untuk memuat ulang.';
    }, 15000);

    try {
      await arSystem.start();
    } catch (error) {
      clearInterval(videoWatcher);
      clearTimeout(cameraStartTimeout);
      console.error('Kamera gagal dimulai:', error);
      cameraStartPending = false;
      dom.btnSkipLoading.disabled = false;
      dom.btnSkipLoading.textContent = 'Coba Lagi';
      dom.loadingHint.textContent = 'Kamera gagal dimulai. Periksa izin Kamera situs dan browser, lalu coba lagi.';
      return;
    }

    clearInterval(videoWatcher);
    configureSceneTransparency(sceneEl);

    const video = arSystem.video || document.querySelector('video');
    if (video) {
      ensureVideoPlaying(video);
      if (video.readyState >= 1) {
        clearTimeout(cameraStartTimeout);
        cameraStartPending = false;
        dismissLoading();
      } else {
        video.addEventListener('loadeddata', () => {
          clearTimeout(cameraStartTimeout);
          cameraStartPending = false;
          ensureVideoPlaying(video);
          configureSceneTransparency(sceneEl);
          dismissLoading();
        }, { once: true });
      }
    }
  });

  sceneEl?.addEventListener('arReady', () => {
    console.log("MindAR Siap");
    clearTimeout(cameraStartTimeout);
    cameraStartPending = false;
    configureSceneTransparency(sceneEl);
    const arSystem = sceneEl?.systems['mindar-image-system'];
    const video = arSystem?.video || document.querySelector('video');
    if (video) {
      ensureVideoPlaying(video);
    }
    dismissLoading();
  });

  sceneEl?.addEventListener('arError', (event) => {
    const error = event.detail?.error || 'Kesalahan kamera atau AR';
    console.error("MindAR Gagal Dimulai:", error);
    clearTimeout(cameraStartTimeout);
    cameraStartPending = false;
    cameraStartTimedOut = false;
    dom.loadingHint.textContent = error === 'VIDEO_FAIL'
      ? 'Kamera tidak dapat dibuka. Atur izin Kamera untuk situs ini ke Izinkan, tutup aplikasi lain yang memakai kamera, lalu coba lagi.'
      : `${error}. Periksa izin kamera dan koneksi HTTPS, lalu coba lagi.`;
    dom.btnSkipLoading.disabled = false;
    dom.btnSkipLoading.textContent = 'Coba Lagi';
  });

  // Hubungkan event targetFound dan targetLost untuk masing-masing item (1..6)
  ITEMS_DATA.forEach(item => {
    const targetEntity = document.querySelector(`#target-entity-${item.id}`);
    if (!targetEntity) return;

    targetEntity.addEventListener('targetFound', () => {
      console.log(`Target ${item.id} (${item.name}) Terdeteksi!`);
      state.trackedTargets.add(item.id);
      setActiveItem(item);
      
      // Getar singkat di mobile (haptic feedback)
      if (navigator.vibrate) navigator.vibrate(40);
    });

    targetEntity.addEventListener('targetLost', () => {
      console.log(`Target ${item.id} (${item.name}) Hilang.`);
      state.trackedTargets.delete(item.id);
      
      if (state.activeItem?.id === item.id) {
        const nextTrackedItem = ITEMS_DATA.find(trackedItem => state.trackedTargets.has(trackedItem.id));
        if (nextTrackedItem) {
          setActiveItem(nextTrackedItem);
        } else {
          clearActiveItem();
        }
      }
    });
  });

  /* ==========================================================================
     4. UPDATE STATUS & KARTU INFORMASI OBJEK
     ========================================================================== */

  function renderModelNavPills() {
    if (!dom.modelNavPills) return;
    dom.modelNavPills.innerHTML = '';
    ITEMS_DATA.forEach(item => {
      const pill = document.createElement('span');
      pill.className = `model-nav-pill ${state.activeItem?.id === item.id ? 'active' : ''}`;
      pill.dataset.id = item.id;
      pill.innerHTML = `<span>${item.icon}</span> <span>#${item.id} ${item.name}</span>`;
      dom.modelNavPills.appendChild(pill);
    });
  }

  function setActiveItem(item) {
    if (!state.trackedTargets.has(item.id)) return;
    state.activeItem = item;
    window.geminiChatbot.setActiveItem(item);

    // Update Status Bar
    updateTrackingStatus(true, item);

    // Update Info Card
    dom.cardIcon.textContent = item.icon;
    dom.cardTitle.textContent = `${item.id}. ${item.name} (${item.balineseName})`;
    dom.cardSub.textContent = `${item.latinName} · ${item.englishName}`;
    if (dom.modelCounterBadge) {
      dom.modelCounterBadge.textContent = `${item.id}/6`;
    }
    updateCardDescription();

    // Update Nav Pills Active State
    document.querySelectorAll('.model-nav-pill').forEach(pill => {
      if (parseInt(pill.dataset.id) === item.id) {
        pill.classList.add('active');
        pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } else {
        pill.classList.remove('active');
      }
    });

    // Tampilkan Card
    dom.infoCard.classList.remove('translate-y-full', 'opacity-0');

    // Update Banner di Chatbot
    dom.chatActiveObject.textContent = `${item.icon} ${item.name} (${item.balineseName})`;
    renderQuickChips(item);
  }

  function clearActiveItem() {
    state.activeItem = null;
    window.geminiChatbot.setActiveItem(null);
    dom.infoCard.classList.add('translate-y-full', 'opacity-0');
    dom.chatActiveObject.textContent = 'Belum ada target terdeteksi';
    dom.quickChipsContainer.innerHTML = '';
    document.querySelectorAll('.model-nav-pill').forEach(pill => pill.classList.remove('active'));
    updateTrackingStatus(false);
  }

  function updateTrackingStatus(isFound, item = null) {
    if (isFound && item) {
      dom.statusIndicator.classList.remove('bg-amber-500/80', 'text-amber-200');
      dom.statusIndicator.classList.add('bg-emerald-600/90', 'text-white');
      dom.statusText.innerHTML = `✓ Terdeteksi: <strong>${item.name}</strong>`;
      dom.scannerReticle.classList.add('detected');
    } else {
      dom.statusIndicator.classList.remove('bg-emerald-600/90', 'text-white');
      dom.statusIndicator.classList.add('bg-amber-500/80', 'text-amber-200');
      dom.statusText.textContent = "Arahkan kamera ke target gambar...";
      dom.scannerReticle.classList.remove('detected');
    }
  }

  function updateCardDescription() {
    if (!state.activeItem) return;
    const desc = state.activeItem.descriptions[state.activeLang] || state.activeItem.descriptions.id;
    dom.cardDesc.textContent = desc;

    // Highlight tab aktif
    dom.langTabs.forEach(tab => {
      if (tab.dataset.lang === state.activeLang) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
  }

  // Event Tab Bahasa
  dom.langTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      state.activeLang = tab.dataset.lang;
      updateCardDescription();
    });
  });

  // Text-To-Speech (Dengarkan Deskripsi)
  dom.btnTts.addEventListener('click', () => {
    if (!state.activeItem) return;
    const desc = state.activeItem.descriptions[state.activeLang];
    if (!desc) return;

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      dom.btnTts.classList.remove('tts-active');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(desc);
    utterance.rate = 0.95;

    // Atur bahasa pengucapan
    if (state.activeLang === 'en') {
      utterance.lang = 'en-US';
    } else {
      utterance.lang = 'id-ID'; // Bahasa Bali dibacakan dengan aksen Indonesia
    }

    dom.btnTts.classList.add('tts-active');

    utterance.onend = () => {
      dom.btnTts.classList.remove('tts-active');
    };
    utterance.onerror = () => {
      dom.btnTts.classList.remove('tts-active');
    };

    window.speechSynthesis.speak(utterance);
  });

  // Tombol "Tanya AI" di Info Card -> Buka Chat Drawer
  dom.btnAskAi?.addEventListener('click', () => {
    openChatDrawer();
  });

  /* ==========================================================================
     5. GEMINI AI CHATBOT INTEGRASI (TOKEN-OPTIMIZED)
     ========================================================================== */

  function openChatDrawer() {
    dom.chatDrawer.classList.remove('translate-y-full', 'pointer-events-none');
    dom.chatDrawer.classList.add('translate-y-0');
    state.isChatOpen = true;

    // Jika belum ada pesan, berikan sapaan pembuka hemat token
    if (window.geminiChatbot.conversationHistory.length === 0) {
      const activeObjName = state.activeItem ? `${state.activeItem.name} (${state.activeItem.balineseName})` : "objek AR";
      addMessageToUI('model', `Om Swastyastu! Saya asisten Pratima AR. Silakan tanya singkat seputar **${activeObjName}**, bahasa Bali, atau filosofinya! ⚡`, null);
    }

    dom.chatInput?.focus();
  }

  function closeChatDrawer() {
    dom.chatDrawer.classList.remove('translate-y-0');
    dom.chatDrawer.classList.add('translate-y-full', 'pointer-events-none');
    state.isChatOpen = false;
  }

  dom.btnOpenChat?.addEventListener('click', openChatDrawer);
  dom.btnCloseChat?.addEventListener('click', closeChatDrawer);

  // Render Prompt Chips hemat token
  function renderQuickChips(item) {
    if (!dom.quickChipsContainer) return;
    dom.quickChipsContainer.innerHTML = '';
    
    if (!item || !item.quickPrompts) return;

    item.quickPrompts.forEach(promptText => {
      const chip = document.createElement('button');
      chip.className = 'quick-chip';
      chip.textContent = promptText;
      chip.addEventListener('click', () => {
        dom.chatInput.value = promptText;
        dom.chatCharCount.textContent = `${promptText.length}/150`;
        sendChatMessage();
      });
      dom.quickChipsContainer.appendChild(chip);
    });
  }

  // Hitung karakter input (maks 150)
  dom.chatInput?.addEventListener('input', () => {
    const len = dom.chatInput.value.length;
    dom.chatCharCount.textContent = `${len}/150`;
  });

  // Kirim pesan saat Enter ditekan
  dom.chatInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });

  dom.btnSendChat?.addEventListener('click', sendChatMessage);

  async function sendChatMessage() {
    const rawText = dom.chatInput.value.trim();
    if (!rawText) return;

    // Tampilkan pesan user ke UI
    addMessageToUI('user', rawText);
    dom.chatInput.value = '';
    dom.chatCharCount.textContent = '0/150';

    // Tampilkan loading indicator
    const loadingId = addLoadingIndicator();

    // Disable input sementara
    dom.chatInput.disabled = true;
    dom.btnSendChat.disabled = true;

    try {
      const response = await window.geminiChatbot.sendMessage(rawText);
      removeLoadingIndicator(loadingId);
      addMessageToUI('model', response.reply, response.tokenInfo);
    } catch (err) {
      removeLoadingIndicator(loadingId);
      addMessageToUI('model', `⚠️ Maaf, terjadi kesalahan: ${err.message}`, null, true);
    } finally {
      dom.chatInput.disabled = false;
      dom.btnSendChat.disabled = false;
      dom.chatInput.focus();
    }
  }

  function addMessageToUI(role, text, tokenInfo = null, isError = false) {
    const msgEl = document.createElement('div');
    msgEl.className = `chat-bubble ${role === 'user' ? 'bubble-user' : 'bubble-model'} ${isError ? 'bubble-error' : ''}`;

    // Format markdown sederhana (bold, list)
    let formattedText = escapeHtml(text)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');

    let metaHtml = '';
    if (tokenInfo && role === 'model') {
      metaHtml = `
        <div class="token-meta">
          <span title="Hemat Token: Input ${tokenInfo.inputTokens} + Output ${tokenInfo.outputTokens}">
            ⚡ ${tokenInfo.totalTokens} token (${tokenInfo.outputTokens} out)
          </span>
        </div>
      `;
    }

    msgEl.innerHTML = `
      <div class="bubble-content">${formattedText}</div>
      ${metaHtml}
    `;

    dom.chatMessages.appendChild(msgEl);
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
  }

  function addLoadingIndicator() {
    const id = 'loading-' + Date.now();
    const loadingEl = document.createElement('div');
    loadingEl.id = id;
    loadingEl.className = 'chat-bubble bubble-model bubble-loading';
    loadingEl.innerHTML = `
      <div class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
    `;
    dom.chatMessages.appendChild(loadingEl);
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
    return id;
  }

  function removeLoadingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  // Update statistik token pada UI
  window.geminiChatbot.onTokenUpdate = (stats, lastTurn) => {
    if (dom.tokenStatsBadge) {
      dom.tokenStatsBadge.textContent = `⚡ Total: ${stats.totalTokens} token (${stats.requestCount}x)`;
      dom.tokenStatsBadge.title = `Input: ${stats.totalInputTokens} token | Output: ${stats.totalOutputTokens} token`;
    }
  };

  // Bersihkan riwayat chat
  dom.btnClearChat?.addEventListener('click', () => {
    if (confirm("Hapus semua riwayat percakapan?")) {
      window.geminiChatbot.clearHistory();
      dom.chatMessages.innerHTML = '';
      addMessageToUI('model', "Riwayat dibersihkan. Hemat token dimulai kembali! ⚡");
    }
  });

  /* ==========================================================================
     6. TARGET GALLERY & IMAGE MODAL
     ========================================================================== */

  function renderGalleryGrid() {
    if (!dom.galleryGrid) return;
    dom.galleryGrid.innerHTML = '';

    ITEMS_DATA.forEach(item => {
      const card = document.createElement('div');
      card.className = 'gallery-card';
      card.innerHTML = `
        <div class="relative overflow-hidden rounded-t-xl aspect-square bg-slate-800">
          <img src="${item.imageSrc}" alt="${item.name}" class="w-full h-full object-cover">
          <span class="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full font-bold">
            #${item.id}
          </span>
        </div>
        <div class="p-3">
          <h4 class="font-bold text-sm text-white flex items-center justify-between">
            <span>${item.name}</span>
            <span class="text-base">${item.icon}</span>
          </h4>
          <p class="text-xs text-amber-300 font-medium">${item.balineseName} (${item.englishName})</p>
          <div class="mt-2 flex">
            <button class="btn-view-target flex-1 py-1 px-2 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded font-medium" data-id="${item.id}">
              🔍 Lihat Target
            </button>
          </div>
        </div>
      `;

      // Event Lihat Gambar Target
      card.querySelector('.btn-view-target').addEventListener('click', () => {
        openTargetImageModal(item);
      });

      dom.galleryGrid.appendChild(card);
    });
  }

  function openGalleryModal() {
    renderGalleryGrid();
    dom.galleryModal.classList.remove('hidden');
    state.isGalleryOpen = true;
  }

  function closeGalleryModal() {
    dom.galleryModal.classList.add('hidden');
    state.isGalleryOpen = false;
  }

  dom.btnOpenGallery?.addEventListener('click', openGalleryModal);
  dom.btnCloseGallery?.addEventListener('click', closeGalleryModal);

  function openTargetImageModal(item) {
    dom.modalTargetImg.src = item.imageSrc;
    dom.modalTargetTitle.textContent = `#${item.id} Target: ${item.name} (${item.balineseName})`;
    
    dom.btnDownloadTarget.href = item.imageSrc;
    dom.btnDownloadTarget.download = `target-${item.id}-${item.name.toLowerCase()}.jpg`;

    dom.imageModal.classList.remove('hidden');
  }

  dom.btnCloseImageModal?.addEventListener('click', () => {
    dom.imageModal.classList.add('hidden');
  });

  /* ==========================================================================
     7. SETTINGS / GEMINI API KEY MODAL
     ========================================================================== */

  function openSettingsModal() {
    dom.apiKeyStatus.textContent = 'API Key dikelola secara aman di server.';
    dom.settingsModal.classList.remove('hidden');
  }

  function closeSettingsModal() {
    dom.settingsModal.classList.add('hidden');
  }

  dom.btnOpenSettings?.addEventListener('click', openSettingsModal);
  dom.btnCloseSettings?.addEventListener('click', closeSettingsModal);

  dom.btnTestApiKey?.addEventListener('click', async () => {
    dom.apiKeyStatus.innerHTML = `<span class="text-amber-300">Menguji koneksi AI server...</span>`;
    dom.btnTestApiKey.disabled = true;

    try {
      await window.geminiChatbot.testApiKey();
      dom.apiKeyStatus.innerHTML = `<span class="text-emerald-400">✓ Koneksi berhasil. Chatbot siap digunakan.</span>`;
    } catch (err) {
      dom.apiKeyStatus.innerHTML = `<span class="text-red-400">✗ Gagal: ${err.message}</span>`;
    } finally {
      dom.btnTestApiKey.disabled = false;
    }
  });

  /* ==========================================================================
     8. UTILITIES
     ========================================================================== */

  function escapeHtml(string) {
    const entityMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return String(string).replace(/[&<>"']/g, s => entityMap[s]);
  }

  // Render pill navigasi objek (1 s/d 6)
  renderModelNavPills();

  clearActiveItem();
});
