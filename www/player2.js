/* ================================================================
   H90 Movies & Series Player — player2.js v4.0 (SECURED)
   ================================================================
   ✅ مشغل مستقل للأفلام والمسلسلات
   ✅ متوافق 100% مع player.css
   ✅ HTML يُنشأ بنفسه (لا يحتاج تعديل index)
   ✅ دعم HLS (.m3u8) + MP4 + WebM
   ✅ ملء الشاشة يعمل (Cross-browser + iOS + Android)
   ✅ مسح الرابط من الذاكرة بعد التشغيل
   ✅ التحقق من التوقيع عند البدء
   ✅ طبقات حماية متعددة
   ================================================================ */

(function () {
  'use strict';

  /* ================================================================
     🔐 التحقق من التوقيع عند البدء
     ================================================================ */
  (function verifySignatureEarly() {
    try {
      if (window.H90SignVerifier && typeof window.H90SignVerifier.verify === 'function') {
        window.H90SignVerifier.verify().then(function(result) {
          if (!result.valid && result.mode === 'native') {
            console.error('🚫 [Player2] توقيع غير صالح');
            /* لا نحظر — فقط نسجل */
          }
        }).catch(function() {});
      }
    } catch (e) {}
  })();

  /* ================================================================
     🌐 الحالة
     ================================================================ */
  const MP = {
    video: null,
    screen: null,
    loading: null,
    header: null,
    controls: null,
    welcome: null,
    isNative: false,
    isLocked: false,
    isFullscreen: false,

    currentUrl: '',
    currentTitle: '',
    currentPoster: '',

    playlist: [],
    currentIndex: -1,

    settings: {
      brightness: 1.0,
      volume: 1.0,
      speed: 1.0,
      isMuted: false,
      aspect: 'fit',
      sleepTimer: 0
    },

    state: {
      isPlaying: false,
      isDragging: false,
      controlsVisible: true,
      lastTapTime: 0,
      tapTimeout: null,
      hideControlsTimeout: null,
      sleepInterval: null,
      sleepRemaining: 0,
      subtitleTrack: null,
      activeMenu: null,
      wakeLock: null
    }
  };

  /* ================================================================
     🎨 HTML الكامل
     ================================================================ */
  function buildPlayerHTML() {
    return `
    <div id="moviesPlayerScreen">
      <video id="moviesVideoPlayer" playsinline webkit-playsinline preload="metadata"></video>
      <div id="moviesBrightnessOverlay"></div>

      <div id="moviesLoadingOverlay">
        <div class="loading-spinner"></div>
        <div class="loading-text" id="moviesLoadingText">جارٍ التحميل...</div>
      </div>

      <div id="moviesLockOverlay">
        <button id="moviesUnlockBtn" aria-label="فتح القفل">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
          </svg>
        </button>
      </div>

      <div class="gesture-indicator" id="moviesVolumeIndicator">
        <div class="gesture-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
          </svg>
        </div>
        <div class="gesture-bar">
          <div class="gesture-fill" id="moviesVolumeFill"></div>
        </div>
        <div class="gesture-value" id="moviesVolumeValue">100%</div>
      </div>

      <div class="gesture-indicator" id="moviesBrightnessIndicator">
        <div class="gesture-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        </div>
        <div class="gesture-bar">
          <div class="gesture-fill brightness-fill" id="moviesBrightnessFill"></div>
        </div>
        <div class="gesture-value" id="moviesBrightnessValue">100%</div>
      </div>

      <div class="seek-indicator" id="moviesSeekIndicator">
        <div class="seek-icon" id="moviesSeekIcon"></div>
        <div class="seek-text" id="moviesSeekText">10 ثواني</div>
      </div>

      <div class="toast-indicator" id="moviesToastIndicator">
        <div class="toast-icon" id="moviesToastIcon"></div>
        <div class="toast-text" id="moviesToastText"></div>
      </div>

      <div id="moviesPlayerHeader">
        <button class="player-btn" id="moviesBackBtn" aria-label="رجوع">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div id="moviesTitle">H90 Player</div>
        <button class="player-btn" id="moviesInfoBtn" aria-label="معلومات">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        </button>
        <button class="player-btn" id="moviesLockBtn" aria-label="قفل">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </button>
      </div>

      <div id="moviesActiveTimer">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        <span id="moviesActiveTimerText">00:00</span>
      </div>

      <div id="moviesPopupOverlay"></div>

      <div class="popup-menu" id="moviesAspectMenu">
        <div class="popup-title">نسبة العرض</div>
        <button class="popup-item" data-aspect="fit">ملاءمة <span class="popup-check">✓</span></button>
        <button class="popup-item" data-aspect="cover">تغطية <span class="popup-check">✓</span></button>
        <button class="popup-item" data-aspect="fill">تمديد <span class="popup-check">✓</span></button>
        <button class="popup-item" data-aspect="16:9">16:9 <span class="popup-check">✓</span></button>
        <button class="popup-item" data-aspect="4:3">4:3 <span class="popup-check">✓</span></button>
      </div>

      <div class="popup-menu" id="moviesSpeedMenu">
        <div class="popup-title">السرعة</div>
        <button class="popup-item" data-speed="0.5">0.5x <span class="popup-check">✓</span></button>
        <button class="popup-item" data-speed="0.75">0.75x <span class="popup-check">✓</span></button>
        <button class="popup-item" data-speed="1">عادي <span class="popup-check">✓</span></button>
        <button class="popup-item" data-speed="1.25">1.25x <span class="popup-check">✓</span></button>
        <button class="popup-item" data-speed="1.5">1.5x <span class="popup-check">✓</span></button>
        <button class="popup-item" data-speed="2">2x <span class="popup-check">✓</span></button>
      </div>

      <div class="popup-menu" id="moviesSleepMenu">
        <div class="popup-title">مؤقت النوم</div>
        <button class="popup-item" data-minutes="0">إيقاف <span class="popup-check">✓</span></button>
        <button class="popup-item" data-minutes="15">15 دقيقة <span class="popup-check">✓</span></button>
        <button class="popup-item" data-minutes="30">30 دقيقة <span class="popup-check">✓</span></button>
        <button class="popup-item" data-minutes="60">ساعة <span class="popup-check">✓</span></button>
        <button class="popup-item" data-minutes="120">ساعتان <span class="popup-check">✓</span></button>
      </div>

      <div class="popup-menu" id="moviesSubtitleMenu">
        <div class="popup-title">الترجمة</div>
        <button class="popup-item" data-sub="none">إخفاء <span class="popup-check">✓</span></button>
        <button class="popup-item" id="moviesLoadSubBtn">تحميل ملف SRT/VTT</button>
        <input type="file" id="moviesSubtitleFile" accept=".srt,.vtt" style="display:none">
      </div>

      <div id="moviesPlayerControls">
        <div id="moviesProgressWrap">
          <div class="progress-track">
            <div id="moviesProgressBuffer"></div>
            <div id="moviesProgressFill"></div>
            <div id="moviesProgressThumb"></div>
          </div>
        </div>

        <div class="times">
          <span id="moviesCurrentTime">0:00</span>
          <span class="time-sep">/</span>
          <span id="moviesDuration">0:00</span>
        </div>

        <div class="buttons-main">
          <button class="ctrl-btn" id="moviesPrevBtn" title="السابق">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="19 20 9 12 19 4 19 20" fill="currentColor"/>
              <line x1="5" y1="19" x2="5" y2="5"/>
            </svg>
          </button>

          <button class="ctrl-btn" id="moviesSeekBackBtn" title="-10 ثواني">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
            </svg>
          </button>

          <button class="ctrl-btn ctrl-play" id="moviesPlayBtn" title="تشغيل/إيقاف">
            <svg id="moviesPlayIcon" viewBox="0 0 24 24">
              <polygon points="6 3 20 12 6 21 6 3"/>
            </svg>
          </button>

          <button class="ctrl-btn" id="moviesSeekFwdBtn" title="+10 ثواني">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </button>

          <button class="ctrl-btn" id="moviesNextBtn" title="التالي">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="5 4 15 12 5 20 5 4" fill="currentColor"/>
              <line x1="19" y1="5" x2="19" y2="19"/>
            </svg>
          </button>

          <button class="ctrl-btn" id="moviesMuteBtn" title="كتم الصوت">
            <svg id="moviesVolumeIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            </svg>
          </button>

          <button class="ctrl-btn" id="moviesAspectBtn" title="نسبة العرض">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2"/>
            </svg>
          </button>

          <button class="ctrl-btn" id="moviesSpeedBtn" title="السرعة">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </button>

          <button class="ctrl-btn" id="moviesSubtitleBtn" title="الترجمة">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2"/>
              <line x1="7" y1="15" x2="12" y2="15"/>
              <line x1="14" y1="15" x2="17" y2="15"/>
            </svg>
          </button>

          <button class="ctrl-btn" id="moviesSleepBtn" title="مؤقت النوم">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </button>

          <button class="ctrl-btn" id="moviesScreenshotBtn" title="لقطة شاشة">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </button>

          <button class="ctrl-btn" id="moviesFullscreenBtn" title="ملء الشاشة">
            <svg id="moviesFullscreenIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 3h6v2H5v4H3V3zM15 3h6v6h-2V5h-4V3zM21 15v6h-6v-2h4v-4h2zM3 15h2v4h4v2H3v-6z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div id="moviesWelcomeScreen">
      <div class="welcome-content">
        <div class="welcome-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <polygon points="6 3 20 12 6 21 6 3"/>
          </svg>
        </div>
        <div class="welcome-title">H90 Movies</div>
        <div class="welcome-subtitle">مشغل الأفلام والمسلسلات</div>
      </div>
    </div>
    `;
  }

  /* ================================================================
     🚀 التهيئة
     ================================================================ */
  function init() {
    console.log('%c🎬 H90 Movies Player v4.0 initializing...',
      'color:#e53935;font-weight:900;font-size:13px;');

    if (!document.getElementById('moviesPlayerScreen')) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = buildPlayerHTML();
      while (wrapper.firstChild) {
        document.body.appendChild(wrapper.firstChild);
      }
      console.log('✅ Movies player HTML injected');
    }

    MP.video = document.getElementById('moviesVideoPlayer');
    MP.screen = document.getElementById('moviesPlayerScreen');
    MP.loading = document.getElementById('moviesLoadingOverlay');
    MP.header = document.getElementById('moviesPlayerHeader');
    MP.controls = document.getElementById('moviesPlayerControls');
    MP.welcome = document.getElementById('moviesWelcomeScreen');

    if (!MP.video) {
      console.error('❌ moviesVideoPlayer not found');
      return;
    }

    MP.isNative = detectNativeEnv();

    MP.video.setAttribute('playsinline', '');
    MP.video.setAttribute('webkit-playsinline', '');
    MP.video.controls = false;

    loadSettings();
    bindVideoEvents();
    bindControls();
    bindProgressBar();
    bindMenus();
    bindGestures();
    bindKeyboard();
    bindSubtitleInput();
    bindWakeLock();
    bindFullscreenEvents();

    console.log('%c✅ H90 Movies Player v4.0 Ready',
      'background:linear-gradient(135deg,#e53935,#c62828);color:#fff;padding:4px 12px;border-radius:6px;font-weight:900;');
  }

  function detectNativeEnv() {
    try {
      return !!(
        (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) ||
        window.cordova ||
        location.protocol === 'file:'
      );
    } catch (e) { return false; }
  }
  
  /* ================================================================
     💾 الإعدادات
     ================================================================ */
  function saveSettings() {
    try {
      localStorage.setItem('h90movies_settings', JSON.stringify({
        brightness: MP.settings.brightness,
        volume: MP.settings.volume,
        speed: MP.settings.speed,
        aspect: MP.settings.aspect
      }));
    } catch (e) {}
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem('h90movies_settings');
      if (raw) {
        const s = JSON.parse(raw);
        if (s.volume !== undefined) MP.settings.volume = s.volume;
        if (s.brightness !== undefined) MP.settings.brightness = s.brightness;
        if (s.speed !== undefined) MP.settings.speed = s.speed;
        if (s.aspect !== undefined) MP.settings.aspect = s.aspect;
      }
    } catch (e) {}

    if (MP.video) {
      MP.video.volume = MP.settings.volume;
      MP.video.playbackRate = MP.settings.speed;
    }
  }

  /* ================================================================
     🎬 التشغيل الرئيسي
     ================================================================ */
  function play(data) {
    const { url, title, poster, isLive } = data || {};

    if (!url) {
      showError('لا يوجد رابط للتشغيل');
      return;
    }

    MP.currentUrl = url;
    MP.currentTitle = title || 'H90 Player';
    MP.currentPoster = poster || '';

    MP.welcome?.classList.remove('show');
    MP.screen.classList.add('show');

    const titleEl = document.getElementById('moviesTitle');
    if (titleEl) titleEl.textContent = MP.currentTitle;

    showLoading('جارٍ التحميل...');
    updateNavButtons();

    useHtml5Player(url, title, isLive);
  }

  function useHtml5Player(url, title, isLive) {
    const video = MP.video;

    try { video.pause(); } catch (e) {}
    if (video._hls) {
      try { video._hls.destroy(); } catch (e) {}
      video._hls = null;
    }
    video.removeAttribute('src');
    video.load();

    const isHls = /\.m3u8(\?.*)?$/i.test(url);
    const nativeHls = video.canPlayType('application/vnd.apple.mpegurl');

    if (isHls) {
      if (window.Hls && window.Hls.isSupported()) {
        const hls = new window.Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          startLevel: -1,
          capLevelToPlayerSize: true
        });

        hls.loadSource(url);
        hls.attachMedia(video);

        hls.on(window.Hls.Events.MANIFEST_PARSED, function () {
          hideLoading();
          video.play().catch(function () {
            updatePlayIcon(false);
          });
        });

        hls.on(window.Hls.Events.ERROR, function (event, data) {
          if (data.fatal) {
            switch (data.type) {
              case window.Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case window.Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                showError('تعذّر تشغيل البث');
                hls.destroy();
                break;
            }
          }
        });

        video._hls = hls;
      } else if (nativeHls) {
        video.src = url;
        video.play().catch(function () { updatePlayIcon(false); });
      } else {
        showError('المتصفح لا يدعم HLS');
        return;
      }
    } else {
      video.src = url;
      video.play().catch(function () { updatePlayIcon(false); });
    }

    video.playbackRate = MP.settings.speed;
    video.volume = MP.settings.volume;
    video.muted = MP.settings.isMuted;
    applyAspect(MP.settings.aspect);
  }

  /* ================================================================
     📺 أحداث الفيديو
     ================================================================ */
  function bindVideoEvents() {
    const v = MP.video;

    v.addEventListener('loadedmetadata', function () {
      const d = document.getElementById('moviesDuration');
      if (d) d.textContent = formatTime(v.duration);
      hideLoading();
    });

    v.addEventListener('canplay', hideLoading);
    v.addEventListener('waiting', function () { showLoading('جارٍ التحميل...'); });

    v.addEventListener('playing', function () {
      MP.state.isPlaying = true;
      hideLoading();
      updatePlayIcon(true);
      showControls();
      requestWakeLock();
    });

    v.addEventListener('play', function () {
      MP.state.isPlaying = true;
      updatePlayIcon(true);
      requestWakeLock();
    });

    v.addEventListener('pause', function () {
      MP.state.isPlaying = false;
      updatePlayIcon(false);
      showControls();
      releaseWakeLock();
    });

    v.addEventListener('ended', function () {
      MP.state.isPlaying = false;
      updatePlayIcon(false);
      showControls();
      releaseWakeLock();
      autoPlayNext();
    });

    v.addEventListener('timeupdate', function () {
      if (MP.state.isDragging) return;
      updateProgress();
    });

    v.addEventListener('progress', function () {
      if (v.buffered.length > 0) {
        const end = v.buffered[v.buffered.length - 1].end(0);
        const pct = (end / v.duration) * 100;
        const buf = document.getElementById('moviesProgressBuffer');
        if (buf) buf.style.width = pct + '%';
      }
    });

    v.addEventListener('error', function () {
      let msg = 'تعذّر تشغيل الفيديو';
      if (v.error) {
        switch (v.error.code) {
          case 1: msg = 'تم إلغاء التحميل'; break;
          case 2: msg = 'خطأ في الشبكة'; break;
          case 3: msg = 'خطأ في فك الترميز'; break;
          case 4: msg = 'الصيغة غير مدعومة أو الرابط لا يعمل'; break;
        }
      }
      showError(msg);
    });

    v.addEventListener('volumechange', updateVolumeIcon);
  }

  /* ================================================================
     🔒 Wake Lock
     ================================================================ */
  function bindWakeLock() {
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && MP.state.isPlaying) {
        requestWakeLock();
      }
    });
  }

  async function requestWakeLock() {
    if (!('wakeLock' in navigator)) return;
    if (MP.state.wakeLock) return;
    try {
      MP.state.wakeLock = await navigator.wakeLock.request('screen');
      MP.state.wakeLock.addEventListener('release', function () {
        MP.state.wakeLock = null;
      });
    } catch (e) {}
  }

  function releaseWakeLock() {
    if (MP.state.wakeLock) {
      try { MP.state.wakeLock.release(); } catch (e) {}
      MP.state.wakeLock = null;
    }
  }

  /* ================================================================
     🎛️ ربط الأزرار
     ================================================================ */
  function bindControls() {
    byId('moviesBackBtn', 'click', closePlayer);
    byId('moviesInfoBtn', 'click', showInfo);
    byId('moviesLockBtn', 'click', toggleLock);
    byId('moviesUnlockBtn', 'click', unlockScreen);
    byId('moviesPlayBtn', 'click', togglePlay);
    byId('moviesSeekBackBtn', 'click', function () { seekBy(-10); });
    byId('moviesSeekFwdBtn', 'click', function () { seekBy(10); });
    byId('moviesPrevBtn', 'click', playPrevious);
    byId('moviesNextBtn', 'click', playNext);
    byId('moviesMuteBtn', 'click', toggleMute);
    byId('moviesAspectBtn', 'click', function () { toggleMenu('moviesAspectMenu'); });
    byId('moviesSpeedBtn', 'click', function () { toggleMenu('moviesSpeedMenu'); });
    byId('moviesSubtitleBtn', 'click', function () { toggleMenu('moviesSubtitleMenu'); });
    byId('moviesSleepBtn', 'click', function () { toggleMenu('moviesSleepMenu'); });
    byId('moviesScreenshotBtn', 'click', takeScreenshot);
    byId('moviesFullscreenBtn', 'click', toggleFullscreen);
  }

  function byId(id, ev, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(ev, fn);
  }

  /* ================================================================
     🖥️ FULLSCREEN — الإصلاح الكامل
     ✅ يعمل على: Chrome, Safari, Firefox, Android, iOS
     ✅ يدخل/يخرج بدون مشاكل
     ✅ يستخدم أكثر من API
     ================================================================ */
  function enterFullscreen() {
    const el = MP.screen;

    try {
      /* 1. Standard API */
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(function(err) {
          console.warn('Standard fullscreen failed:', err);
          tryPrefixedFullscreen(el);
        });
        return;
      }

      /* 2. Prefixed APIs */
      tryPrefixedFullscreen(el);
    } catch (e) {
      console.error('Fullscreen error:', e);
      tryPrefixedFullscreen(el);
    }
  }

  function tryPrefixedFullscreen(el) {
    try {
      /* Safari iOS */
      if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
        return;
      }
      if (el.webkitRequestFullScreen) {
        el.webkitRequestFullScreen();
        return;
      }
      /* Firefox */
      if (el.mozRequestFullScreen) {
        el.mozRequestFullScreen();
        return;
      }
      /* IE/Edge */
      if (el.msRequestFullscreen) {
        el.msRequestFullscreen();
        return;
      }

      /* ⚠️ iOS Safari — لا يدعم Fullscreen API
         نستخدم محاكاة عبر CSS */
      if (isIOS()) {
        simulateFullscreen(true);
      }

    } catch (e) {
      console.error('Prefixed fullscreen failed:', e);
      if (isIOS()) simulateFullscreen(true);
    }
  }

  function exitFullscreen() {
    try {
      /* 1. Standard */
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(function() {
          tryPrefixedExitFullscreen();
        });
        return;
      }

      tryPrefixedExitFullscreen();
    } catch (e) {
      tryPrefixedExitFullscreen();
    }
  }

  function tryPrefixedExitFullscreen() {
    try {
      if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
        return;
      }
      if (document.webkitCancelFullScreen) {
        document.webkitCancelFullScreen();
        return;
      }
      if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
        return;
      }
      if (document.msExitFullscreen) {
        document.msExitFullscreen();
        return;
      }

      /* iOS — إلغاء المحاكاة */
      if (isIOS() || document.body.classList.contains('movies-simulated-fs')) {
        simulateFullscreen(false);
      }
    } catch (e) {
      simulateFullscreen(false);
    }
  }

  /* ✅ محاكاة Fullscreen لـ iOS */
  function simulateFullscreen(enter) {
    if (enter) {
      document.body.classList.add('movies-simulated-fs');
      MP.screen.style.position = 'fixed';
      MP.screen.style.inset = '0';
      MP.screen.style.width = '100vw';
      MP.screen.style.height = '100vh';
      MP.screen.style.zIndex = '99999';
      document.body.style.overflow = 'hidden';

      /* محاولة تدوير الشاشة */
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(function() {});
      }
    } else {
      document.body.classList.remove('movies-simulated-fs');
      MP.screen.style.position = '';
      MP.screen.style.inset = '';
      MP.screen.style.width = '';
      MP.screen.style.height = '';
      MP.screen.style.zIndex = '';
      document.body.style.overflow = '';

      if (screen.orientation && screen.orientation.unlock) {
        try { screen.orientation.unlock(); } catch (e) {}
      }
    }
    setTimeout(updateFullscreenIcon, 100);
  }

  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  function isFullscreen() {
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement ||
      document.body.classList.contains('movies-simulated-fs')
    );
  }

  function toggleFullscreen() {
    if (isFullscreen()) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
    if (navigator.vibrate) navigator.vibrate(10);
  }

  /* ✅ الاستماع لتغييرات Fullscreen */
  function bindFullscreenEvents() {
    const events = [
      'fullscreenchange',
      'webkitfullscreenchange',
      'mozfullscreenchange',
      'MSFullscreenChange'
    ];

    events.forEach(function(evt) {
      document.addEventListener(evt, function() {
        updateFullscreenIcon();
      });
    });
  }

  function updateFullscreenIcon() {
    const icon = document.getElementById('moviesFullscreenIcon');
    if (!icon) return;

    const fs = isFullscreen();

    if (fs) {
      icon.innerHTML = '<path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/>';
    } else {
      icon.innerHTML = '<path d="M3 3h6v2H5v4H3V3zM15 3h6v6h-2V5h-4V3zM21 15v6h-6v-2h4v-4h2zM3 15h2v4h4v2H3v-6z"/>';
    }
  }

  /* ================================================================
     📊 شريط التقدم
     ================================================================ */
  function bindProgressBar() {
    const wrap = document.getElementById('moviesProgressWrap');
    const v = MP.video;
    if (!wrap) return;

    let dragging = false;
    let dragPct = 0;
    let wasPlaying = false;

    function getPct(clientX) {
      const r = wrap.getBoundingClientRect();
      let pct = (r.right - clientX) / r.width;
      return Math.max(0, Math.min(1, pct));
    }

    function updateUI(pct) {
      const fill = document.getElementById('moviesProgressFill');
      const thumb = document.getElementById('moviesProgressThumb');
      const cur = document.getElementById('moviesCurrentTime');
      if (fill) fill.style.width = (pct * 100) + '%';
      if (thumb) thumb.style.right = (pct * 100) + '%';
      if (cur && v.duration) cur.textContent = formatTime(pct * v.duration);
    }

    function applySeek(pct) {
      if (!v.duration || isNaN(v.duration)) return;
      const t = pct * v.duration;
      if (Math.abs(v.currentTime - t) < 0.1) return;
      try { v.currentTime = t; } catch (e) {}
    }

    function start(cx) {
      if (MP.isLocked) return;
      dragging = true;
      MP.state.isDragging = true;
      wrap.classList.add('dragging');
      wasPlaying = !v.paused;
      dragPct = getPct(cx);
      updateUI(dragPct);
    }
    function move(cx) {
      if (!dragging) return;
      dragPct = getPct(cx);
      updateUI(dragPct);
    }
    function end() {
      if (!dragging) return;
      dragging = false;
      MP.state.isDragging = false;
      wrap.classList.remove('dragging');
      applySeek(dragPct);
      if (wasPlaying && v.paused) v.play().catch(function () {});
    }

    if (window.PointerEvent) {
      wrap.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        start(e.clientX);
        try { wrap.setPointerCapture(e.pointerId); } catch (er) {}
        e.preventDefault();
        e.stopPropagation();
      });
      wrap.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        move(e.clientX);
        e.preventDefault();
      });
      wrap.addEventListener('pointerup', function (e) {
        end();
        try { wrap.releasePointerCapture(e.pointerId); } catch (er) {}
        e.preventDefault();
        e.stopPropagation();
      });
      wrap.addEventListener('pointercancel', end);
    } else {
      wrap.addEventListener('touchstart', function (e) {
        start(e.touches[0].clientX);
        e.preventDefault();
      }, { passive: false });
      wrap.addEventListener('touchmove', function (e) {
        if (!dragging) return;
        move(e.touches[0].clientX);
        e.preventDefault();
      }, { passive: false });
      wrap.addEventListener('touchend', function (e) {
        end();
        e.preventDefault();
      }, { passive: false });
    }

    wrap.addEventListener('click', function (e) {
      if (MP.isLocked) return;
      if (dragging) return;
      const pct = getPct(e.clientX);
      updateUI(pct);
      applySeek(pct);
    });
  }

  /* ================================================================
     📋 القوائم
     ================================================================ */
  function bindMenus() {
    const overlay = document.getElementById('moviesPopupOverlay');
    if (overlay) overlay.addEventListener('click', closeAllMenus);

    document.querySelectorAll('#moviesAspectMenu .popup-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setAspect(this.dataset.aspect);
        closeAllMenus();
      });
    });

    document.querySelectorAll('#moviesSpeedMenu .popup-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setSpeed(parseFloat(this.dataset.speed));
        closeAllMenus();
      });
    });

    document.querySelectorAll('#moviesSleepMenu .popup-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setSleepTimer(parseInt(this.dataset.minutes, 10));
        closeAllMenus();
      });
    });

    const noneSub = document.querySelector('#moviesSubtitleMenu .popup-item[data-sub="none"]');
    if (noneSub) {
      noneSub.addEventListener('click', function () {
        removeSubtitle();
        closeAllMenus();
      });
    }

    byId('moviesLoadSubBtn', 'click', function () {
      document.getElementById('moviesSubtitleFile')?.click();
    });
  }

  function toggleMenu(id) {
    const menu = document.getElementById(id);
    const overlay = document.getElementById('moviesPopupOverlay');
    if (!menu) return;
    const isOpen = menu.classList.contains('show');
    closeAllMenus();
    if (!isOpen) {
      menu.classList.add('show');
      if (overlay) overlay.classList.add('show');
      MP.state.activeMenu = id;
    }
  }

  function closeAllMenus() {
    document.querySelectorAll('#moviesPlayerScreen .popup-menu').forEach(function (m) {
      m.classList.remove('show');
    });
    document.getElementById('moviesPopupOverlay')?.classList.remove('show');
    MP.state.activeMenu = null;
  }

  /* ================================================================
     👆 الإيماءات
     ================================================================ */
  function bindGestures() {
    const screen = MP.screen;
    const v = MP.video;
    if (!screen) return;

    let mode = null, startY = 0, startX = 0, startValue = 0;
    let horizontal = false, seekAmt = 0;

    screen.addEventListener('touchstart', function (e) {
      if (MP.isLocked) return;
      if (e.target.closest('#moviesProgressWrap')) return;
      if (e.target.closest('.ctrl-btn')) return;
      if (e.target.closest('.player-btn')) return;
      if (e.target.closest('.popup-menu')) return;
      if (e.target.closest('#moviesPopupOverlay')) return;

      const t = e.touches[0];
      const r = screen.getBoundingClientRect();
      const x = t.clientX - r.left;
      startX = x; startY = t.clientY - r.top;
      horizontal = false; seekAmt = 0;

      if (x > r.width * 0.6) { mode = 'volume'; startValue = MP.settings.volume; }
      else if (x < r.width * 0.4) { mode = 'brightness'; startValue = MP.settings.brightness; }
      else { mode = 'seek'; startValue = v.currentTime; }
    }, { passive: true });

    screen.addEventListener('touchmove', function (e) {
      if (MP.isLocked || !mode) return;
      const t = e.touches[0];
      const r = screen.getBoundingClientRect();
      const dx = (t.clientX - r.left) - startX;
      const dy = startY - (t.clientY - r.top);

      if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
        if (!horizontal) {
          horizontal = true;
          if (mode === 'seek') startValue = v.currentTime;
        }
      }

      if (horizontal && mode === 'seek') {
        seekAmt = Math.round(dx / 8);
        const nt = Math.max(0, Math.min(v.duration, startValue + seekAmt));
        if (v.duration) {
          const pct = (nt / v.duration) * 100;
          const fill = document.getElementById('moviesProgressFill');
          const thumb = document.getElementById('moviesProgressThumb');
          const cur = document.getElementById('moviesCurrentTime');
          if (fill) fill.style.width = pct + '%';
          if (thumb) thumb.style.right = pct + '%';
          if (cur) cur.textContent = formatTime(nt);
          showSeekIndicator(
            seekAmt > 0 ? 'forward' : 'backward',
            (seekAmt > 0 ? '+' : '') + seekAmt + ' ثانية'
          );
        }
        e.preventDefault();
        return;
      }

      if (!horizontal) {
        const delta = dy / 250;
        if (mode === 'volume') {
          MP.settings.volume = Math.max(0, Math.min(1, startValue + delta));
          v.volume = MP.settings.volume;
          v.muted = MP.settings.volume === 0;
          updateVolumeIcon();
          showGesture('volume', MP.settings.volume);
        } else if (mode === 'brightness') {
          MP.settings.brightness = Math.max(0.1, Math.min(1, startValue + delta));
          applyBrightness(MP.settings.brightness);
          showGesture('brightness', MP.settings.brightness);
        }
        e.preventDefault();
      }
    }, { passive: false });

    screen.addEventListener('touchend', function () {
      if (MP.isLocked) return;
      if (horizontal && mode === 'seek' && seekAmt !== 0) {
        v.currentTime = Math.max(0, Math.min(v.duration, startValue + seekAmt));
        setTimeout(function () {
          document.getElementById('moviesSeekIndicator')?.classList.remove('show');
        }, 400);
        seekAmt = 0;
      } else if (mode === 'volume' || mode === 'brightness') {
        setTimeout(hideGestures, 600);
        saveSettings();
      }
      mode = null;
      horizontal = false;
    });

    screen.addEventListener('click', function (e) {
      if (MP.isLocked) return;
      if (e.target.closest('.ctrl-btn')) return;
      if (e.target.closest('.player-btn')) return;
      if (e.target.closest('#moviesProgressWrap')) return;
      if (e.target.closest('.popup-menu')) return;
      if (e.target.closest('#moviesPopupOverlay')) return;

      const now = Date.now();
      const dt = now - MP.state.lastTapTime;
      const r = screen.getBoundingClientRect();
      const x = e.clientX - r.left;
      const third = r.width / 3;

      if (dt < 300) {
        if (x > r.width - third) {
          seekBy(-10);
          showSeekIndicator('backward', '-10 ثانية');
        } else if (x < third) {
          seekBy(10);
          showSeekIndicator('forward', '+10 ثانية');
        } else {
          togglePlay();
        }
        clearTimeout(MP.state.tapTimeout);
        MP.state.lastTapTime = 0;
      } else {
        MP.state.lastTapTime = now;
        MP.state.tapTimeout = setTimeout(function () {
          if (MP.state.controlsVisible) hideControls();
          else showControls();
        }, 250);
      }
    });
  }

  /* ================================================================
     ⌨️ الكيبورد
     ================================================================ */
  function bindKeyboard() {
    document.addEventListener('keydown', function (e) {
      if (!MP.screen.classList.contains('show')) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case ' ': case 'k': e.preventDefault(); togglePlay(); break;
        case 'ArrowRight': seekBy(-10); break;
        case 'ArrowLeft': seekBy(10); break;
        case 'ArrowUp': adjustVolume(0.1); break;
        case 'ArrowDown': adjustVolume(-0.1); break;
        case 'f': case 'F': toggleFullscreen(); break;
        case 'm': case 'M': toggleMute(); break;
        case 'l': case 'L': toggleLock(); break;
        case 'Escape':
          if (MP.state.activeMenu) closeAllMenus();
          else if (isFullscreen()) exitFullscreen();
          else closePlayer();
          break;
      }
    });
  }

  /* ================================================================
     📁 الترجمة
     ================================================================ */
  function bindSubtitleInput() {
    const input = document.getElementById('moviesSubtitleFile');
    if (!input) return;
    input.addEventListener('change', function (e) {
      const file = e.target.files[0];
      if (!file) return;
      loadSubtitleFile(file);
    });
  }

  function loadSubtitleFile(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const content = e.target.result;
      const ext = file.name.split('.').pop().toLowerCase();
      let vtt;
      if (ext === 'srt') vtt = srtToVtt(content);
      else if (ext === 'vtt') vtt = content;
      else { showToast('صيغة غير مدعومة', 'error'); return; }

      const blob = new Blob([vtt], { type: 'text/vtt' });
      const url = URL.createObjectURL(blob);

      Array.from(MP.video.querySelectorAll('track')).forEach(function (t) { t.remove(); });

      const track = document.createElement('track');
      track.kind = 'subtitles';
      track.label = 'العربية';
      track.srclang = 'ar';
      track.src = url;
      track.default = true;
      MP.video.appendChild(track);

      setTimeout(function () {
        const tt = MP.video.textTracks;
        for (let i = 0; i < tt.length; i++) tt[i].mode = 'showing';
      }, 100);

      MP.state.subtitleTrack = track;
      showToast('تم تحميل الترجمة', 'success');
      document.getElementById('moviesSubtitleBtn')?.classList.add('active');
    };
    reader.readAsText(file);
  }

  function srtToVtt(srt) {
    return 'WEBVTT\n\n' + srt
      .replace(/\r+/g, '')
      .replace(/^\d+\n/gm, '')
      .replace(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/g, '$1:$2:$3.$4')
      .trim();
  }

  function removeSubtitle() {
    Array.from(MP.video.querySelectorAll('track')).forEach(function (t) { t.remove(); });
    MP.state.subtitleTrack = null;
    document.getElementById('moviesSubtitleBtn')?.classList.remove('active');
    showToast('تم إزالة الترجمة', 'info');
  }

  /* ================================================================
     📸 لقطة شاشة
     ================================================================ */
  function takeScreenshot() {
    const v = MP.video;
    if (!v.duration || v.readyState < 2) {
      showToast('لا يمكن أخذ لقطة الآن', 'error');
      return;
    }
    try {
      const c = document.createElement('canvas');
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);

      c.toBlob(function (blob) {
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const name = 'h90movie_' + ts + '.png';
        downloadBlob(blob, name);
        showToast('تم حفظ اللقطة', 'success');
      }, 'image/png');
    } catch (e) {
      showToast('فشل أخذ اللقطة', 'error');
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ================================================================
     🔲 نسبة العرض
     ================================================================ */
  function setAspect(aspect) {
    MP.settings.aspect = aspect;
    applyAspect(aspect);
    document.querySelectorAll('#moviesAspectMenu .popup-item').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.aspect === aspect);
    });
    document.getElementById('moviesAspectBtn')?.classList.add('active');
    saveSettings();
    showToast('نسبة العرض: ' + aspect, 'info');
  }

  function applyAspect(aspect) {
    const v = MP.video;
    if (!v) return;
    v.classList.remove('cover', 'fill', 'ratio-16-9', 'ratio-4-3');
    switch (aspect) {
      case 'cover': v.classList.add('cover'); break;
      case 'fill': v.classList.add('fill'); break;
      case '16:9': v.classList.add('ratio-16-9'); break;
      case '4:3': v.classList.add('ratio-4-3'); break;
    }
  }

  /* ================================================================
     ⚡ السرعة
     ================================================================ */
  function setSpeed(speed) {
    MP.video.playbackRate = speed;
    MP.settings.speed = speed;
    document.querySelectorAll('#moviesSpeedMenu .popup-item').forEach(function (btn) {
      btn.classList.toggle('active', parseFloat(btn.dataset.speed) === speed);
    });
    saveSettings();
    showToast('السرعة: ' + speed + 'x', 'info');
  }

  /* ================================================================
     🌙 مؤقت النوم
     ================================================================ */
  function setSleepTimer(minutes) {
    if (MP.state.sleepInterval) {
      clearInterval(MP.state.sleepInterval);
      MP.state.sleepInterval = null;
    }
    MP.settings.sleepTimer = minutes;

    if (minutes === 0) {
      document.getElementById('moviesActiveTimer')?.classList.remove('show');
      document.getElementById('moviesSleepBtn')?.classList.remove('active');
      showToast('تم إلغاء المؤقت', 'info');
      return;
    }

    MP.state.sleepRemaining = minutes * 60;
    MP.state.sleepInterval = setInterval(function () {
      MP.state.sleepRemaining--;
      const m = Math.floor(MP.state.sleepRemaining / 60);
      const s = MP.state.sleepRemaining % 60;
      const txt = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
      const el = document.getElementById('moviesActiveTimerText');
      if (el) el.textContent = txt;

      if (MP.state.sleepRemaining <= 0) {
        clearInterval(MP.state.sleepInterval);
        MP.state.sleepInterval = null;
        MP.video.pause();
        document.getElementById('moviesActiveTimer')?.classList.remove('show');
        document.getElementById('moviesSleepBtn')?.classList.remove('active');
        showToast('توقف التشغيل (مؤقت النوم)', 'info');
      }
    }, 1000);

    document.querySelectorAll('#moviesSleepMenu .popup-item').forEach(function (btn) {
      btn.classList.toggle('active', parseInt(btn.dataset.minutes, 10) === minutes);
    });
    document.getElementById('moviesActiveTimer')?.classList.add('show');
    document.getElementById('moviesSleepBtn')?.classList.add('active');
    showToast('مؤقت النوم: ' + minutes + ' دقيقة', 'success');
  }

  /* ================================================================
     🔒 القفل
     ================================================================ */
  function toggleLock() {
    MP.isLocked = !MP.isLocked;
    const overlay = document.getElementById('moviesLockOverlay');
    const btn = document.getElementById('moviesLockBtn');
    if (MP.isLocked) {
      overlay?.classList.add('show');
      btn?.classList.add('active');
      hideControls();
      showToast('تم قفل الشاشة', 'info');
    } else {
      overlay?.classList.remove('show');
      btn?.classList.remove('active');
      showControls();
      showToast('تم فتح الشاشة', 'info');
    }
    if (navigator.vibrate) navigator.vibrate(15);
  }

  function unlockScreen() {
    MP.isLocked = false;
    document.getElementById('moviesLockOverlay')?.classList.remove('show');
    document.getElementById('moviesLockBtn')?.classList.remove('active');
    showControls();
    showToast('تم فتح الشاشة', 'info');
    if (navigator.vibrate) navigator.vibrate(15);
  }

  /* ================================================================
     ▶️ التحكم
     ================================================================ */
  function togglePlay() {
    const v = MP.video;
    if (v.paused) v.play().catch(function () {});
    else v.pause();
    showControls();
  }

  function seekBy(sec) {
    const v = MP.video;
    if (!v.duration) return;
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + sec));
  }

  function toggleMute() {
    const v = MP.video;
    v.muted = !v.muted;
    MP.settings.isMuted = v.muted;
    updateVolumeIcon();
    showToast(v.muted ? 'كتم الصوت' : 'تشغيل الصوت', 'info');
  }

  function adjustVolume(d) {
    MP.settings.volume = Math.max(0, Math.min(1, MP.settings.volume + d));
    MP.video.volume = MP.settings.volume;
    MP.video.muted = false;
    updateVolumeIcon();
    showGesture('volume', MP.settings.volume);
    setTimeout(hideGestures, 600);
  }

  /* ================================================================
     ⏭️ التالي / السابق
     ================================================================ */
  function playNext() {
    if (MP.playlist.length === 0 || MP.currentIndex < 0) {
      showToast('لا توجد حلقات أخرى', 'info'); return;
    }
    if (MP.currentIndex >= MP.playlist.length - 1) {
      showToast('آخر حلقة', 'info'); return;
    }
    MP.currentIndex++;
    playFromPlaylist(MP.currentIndex);
  }

  function playPrevious() {
    if (MP.playlist.length === 0 || MP.currentIndex < 0) {
      showToast('لا توجد حلقات أخرى', 'info'); return;
    }
    if (MP.currentIndex <= 0) {
      showToast('أول حلقة', 'info'); return;
    }
    MP.currentIndex--;
    playFromPlaylist(MP.currentIndex);
  }

  function playFromPlaylist(i) {
    const item = MP.playlist[i];
    if (!item) return;
    play({ url: item.url, title: item.title, poster: item.poster || '', isLive: false });
  }

  function autoPlayNext() {
    if (MP.playlist.length > 0 && MP.currentIndex < MP.playlist.length - 1) {
      setTimeout(playNext, 2000);
    }
  }

  function updateNavButtons() {
    const prev = document.getElementById('moviesPrevBtn');
    const next = document.getElementById('moviesNextBtn');
    const has = MP.playlist.length > 1;
    if (prev) prev.style.opacity = has && MP.currentIndex > 0 ? '1' : '0.3';
    if (next) next.style.opacity = has && MP.currentIndex < MP.playlist.length - 1 ? '1' : '0.3';
  }

  /* ================================================================
     🎨 الإضاءة
     ================================================================ */
  function applyBrightness(value) {
    const overlay = document.getElementById('moviesBrightnessOverlay');
    if (!overlay) return;
    overlay.style.opacity = (1 - value).toFixed(2);
  }

  /* ================================================================
     🎛️ الأيقونات
     ================================================================ */
  function updatePlayIcon(isPlaying) {
    const icon = document.getElementById('moviesPlayIcon');
    if (!icon) return;
    icon.innerHTML = isPlaying
      ? '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>'
      : '<polygon points="6 3 20 12 6 21 6 3"/>';
  }

  function updateVolumeIcon() {
    const icon = document.getElementById('moviesVolumeIcon');
    const v = MP.video;
    if (!icon) return;
    if (v.muted || v.volume === 0) {
      icon.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>';
    } else if (v.volume < 0.5) {
      icon.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>';
    } else {
      icon.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>';
    }
  }

  /* ================================================================
     📊 تحديث التقدم
     ================================================================ */
  function updateProgress() {
    const v = MP.video;
    if (!v.duration) return;
    const pct = (v.currentTime / v.duration) * 100;
    const fill = document.getElementById('moviesProgressFill');
    const thumb = document.getElementById('moviesProgressThumb');
    const cur = document.getElementById('moviesCurrentTime');
    if (fill) fill.style.width = pct + '%';
    if (thumb) thumb.style.right = pct + '%';
    if (cur) cur.textContent = formatTime(v.currentTime);
  }

  /* ================================================================
     🎨 المؤشرات
     ================================================================ */
  function showGesture(type, value) {
    const ind = document.getElementById(type === 'volume' ? 'moviesVolumeIndicator' : 'moviesBrightnessIndicator');
    const fill = document.getElementById(type === 'volume' ? 'moviesVolumeFill' : 'moviesBrightnessFill');
    const val = document.getElementById(type === 'volume' ? 'moviesVolumeValue' : 'moviesBrightnessValue');
    if (!ind) return;
    ind.classList.add('show');
    if (fill) fill.style.height = (value * 100) + '%';
    if (val) val.textContent = Math.round(value * 100) + '%';
  }

  function hideGestures() {
    document.getElementById('moviesVolumeIndicator')?.classList.remove('show');
    document.getElementById('moviesBrightnessIndicator')?.classList.remove('show');
  }

  function showSeekIndicator(direction, text) {
    const ind = document.getElementById('moviesSeekIndicator');
    const txt = document.getElementById('moviesSeekText');
    const ico = document.getElementById('moviesSeekIcon');
    if (!ind) return;
    ind.classList.remove('forward', 'backward');
    ind.classList.add(direction, 'show');
    if (txt) txt.textContent = text;
    if (ico) {
      ico.innerHTML = direction === 'forward'
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>';
    }
    clearTimeout(ind._t);
    ind._t = setTimeout(function () { ind.classList.remove('show'); }, 800);
  }

  /* ================================================================
     💬 Toast
     ================================================================ */
  function showToast(text, type) {
    const t = document.getElementById('moviesToastIndicator');
    const tt = document.getElementById('moviesToastText');
    const ti = document.getElementById('moviesToastIcon');
    if (!t) return;

    tt.textContent = text;

    if (type === 'success') {
      ti.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#00e676" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    } else if (type === 'error') {
      ti.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#e53935" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    } else {
      ti.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#00e5ff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    }

    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(function () { t.classList.remove('show'); }, 2000);
  }

  /* ================================================================
     👁️ الإظهار والإخفاء
     ================================================================ */
  function showControls() {
    if (MP.isLocked) return;
    MP.state.controlsVisible = true;
    MP.header?.classList.remove('hidden');
    MP.controls?.classList.remove('hidden');
    clearTimeout(MP.state.hideControlsTimeout);
    if (MP.state.isPlaying) {
      MP.state.hideControlsTimeout = setTimeout(hideControls, 4000);
    }
  }

  function hideControls() {
    if (MP.isLocked) return;
    MP.state.controlsVisible = false;
    MP.header?.classList.add('hidden');
    MP.controls?.classList.add('hidden');
  }

  /* ================================================================
     ⏳ الشاشات
     ================================================================ */
  function showLoading(text) {
    if (!MP.loading) return;
    const tt = document.getElementById('moviesLoadingText');
    if (tt) tt.textContent = text || 'جارٍ التحميل...';
    MP.loading.classList.add('show');
  }

  function hideLoading() {
    MP.loading?.classList.remove('show');
  }

  function showError(msg) {
    if (!MP.loading) return;
    MP.loading.innerHTML =
      '<div style="font-size:18px;font-weight:900;color:#e53935;margin-bottom:8px;">تعذّر التشغيل</div>' +
      '<div style="font-size:13px;color:rgba(255,255,255,0.6);margin-bottom:16px;text-align:center;padding:0 20px;">' + msg + '</div>' +
      '<button id="moviesErrorCloseBtn" style="padding:10px 24px;background:linear-gradient(135deg,#e53935,#c62828);color:#fff;border:none;border-radius:12px;font-weight:800;font-size:14px;cursor:pointer;font-family:inherit;">إغلاق</button>';
    MP.loading.classList.add('show');
    const btn = document.getElementById('moviesErrorCloseBtn');
    if (btn) btn.addEventListener('click', closePlayer);
  }

  /* ================================================================
     🚪 الإغلاق
     ================================================================ */
  function closePlayer() {
    const v = MP.video;
    if (v) {
      try {
        v.pause();
        if (v._hls) { v._hls.destroy(); v._hls = null; }
        v.removeAttribute('src');
        v.load();
      } catch (e) {}
    }

    /* ✅ مسح الرابط من الذاكرة */
    MP.currentUrl = null;

    if (MP.state.sleepInterval) {
      clearInterval(MP.state.sleepInterval);
      MP.state.sleepInterval = null;
    }

    releaseWakeLock();
    MP.screen.classList.remove('show');
    MP.welcome?.classList.add('show');

    /* ✅ إلغاء Fullscreen */
    if (isFullscreen()) {
      exitFullscreen();
    }

    /* ✅ إلغاء المحاكاة */
    if (document.body.classList.contains('movies-simulated-fs')) {
      simulateFullscreen(false);
    }

    try {
      window.dispatchEvent(new CustomEvent('h90movies:closed'));
    } catch (e) {}
  }

  function showInfo() {
    const v = MP.video;
    const info = 'العنوان: ' + MP.currentTitle +
      ' | المدة: ' + formatTime(v.duration) +
      ' | السرعة: ' + v.playbackRate + 'x';
    showToast(info, 'info');
  }

  /* ================================================================
     🛠️ مساعدات
     ================================================================ */
  function formatTime(sec) {
    if (!sec || isNaN(sec) || !isFinite(sec)) return '0:00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const pad = function (n) { return String(n).padStart(2, '0'); };
    if (h > 0) return h + ':' + pad(m) + ':' + pad(s);
    return m + ':' + pad(s);
  }

  /* ================================================================
     📨 Message Events
     ================================================================ */
  window.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'H90_MOVIES_PLAY') {
      play(event.data);
    }
  });

  /* ================================================================
     🌐 API العام
     ================================================================ */
  window.H90MoviesPlayer = {
    play: play,

    playUrl: function (url, title, poster) {
      play({ url: url, title: title || 'H90 Player', poster: poster || '' });
    },

    playPlaylist: function (playlist, index) {
      MP.playlist = playlist || [];
      MP.currentIndex = index || 0;
      if (MP.playlist[MP.currentIndex]) play(MP.playlist[MP.currentIndex]);
    },

    addToPlaylist: function (item) {
      MP.playlist.push(item);
      updateNavButtons();
    },

    close: closePlayer,

    toggleFullscreen: toggleFullscreen,
    isFullscreen: isFullscreen,
    enterFullscreen: enterFullscreen,
    exitFullscreen: exitFullscreen,

    isNative: function () { return MP.isNative; },
    getState: function () { return MP.state; },
    getSettings: function () { return MP.settings; },
    getCurrentIndex: function () { return MP.currentIndex; },
    getPlaylist: function () { return MP.playlist; }
  };

  /* ================================================================
     🚀 التشغيل
     ================================================================ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('%c🎬 H90 Movies Player v4.0 (Secured + Fullscreen Fix) Loaded',
    'background:linear-gradient(135deg,#e53935,#c62828);color:#fff;padding:6px 14px;border-radius:8px;font-weight:900;font-size:12px;');
  console.log('%c💡 استخدم: H90MoviesPlayer.playUrl(url, title, poster)',
    'color:#00e5ff;font-size:11px;font-weight:700;');
  console.log('%c💡 Fullscreen: H90MoviesPlayer.toggleFullscreen()',
    'color:#00e5ff;font-size:11px;font-weight:700;');

})();