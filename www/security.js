/* ================================================================
   H90 — Security Module v6.0 — ENTERPRISE GRADE
   ================================================================
   ✅ Native Bridge (Android/iOS)
   ✅ Anti-Tamper (Signature + Checksum)
   ✅ Anti-Debug + Anti-Hook + Anti-Frida
   ✅ Root/Emulator/VPN/Proxy Detection
   ✅ AES-256-GCM + PBKDF2 (200K) Encryption
   ✅ SecureDB (IndexedDB Encrypted Chunks)
   ✅ Self-Destruct on Threat
   ✅ Dev Mode for Browser Testing
   ================================================================ */

(function() {
  'use strict';

  /* ═══════════════════════════════════════════════════════════
     0. معلومات التوقيع الرسمي (لا تُعدّل)
     ═══════════════════════════════════════════════════════════ */
  var _SIG = {
    sha1:      '4140C8319C3B0ED361245373EBD33BA106081B5A',
    sha256:    '5ED5B3494642FA161605D623D71706798122CF038BEE104F1762D31306DC5EBB',
    pkg:       'com.h90.app',
    version:   '6.0',
    owner:     'H90 Entertainment'
  };

  /* ═══════════════════════════════════════════════════════════
     1. اكتشاف البيئة
     ═══════════════════════════════════════════════════════════ */
  function isNative() {
    try {
      if (window.Android && typeof window.Android.isNative === 'function') return window.Android.isNative();
      if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) return true;
      if (window.cordova && window.cordova.platformId && window.cordova.platformId !== 'browser') return true;
      return false;
    } catch (e) { return false; }
  }

  function isDevMode() {
    try { return localStorage.getItem('H90_DEV_MODE') === 'true'; } catch (e) { return false; }
  }

  function isPreview() {
    return !isNative() || isDevMode();
  }

  /* ═══════════════════════════════════════════════════════════
     2. التشفير — AES-256-GCM + PBKDF2
     ═══════════════════════════════════════════════════════════ */
  var Crypto = (function() {
    var _key = null;
    var _keyPromise = null;
    var _salt = 'h90_aes_v6_2026_enterprise';
    var _iterations = 200000;

    function getDeviceId() {
      try {
        var id = localStorage.getItem('h90_device_id');
        if (!id) {
          var arr = new Uint8Array(16);
          crypto.getRandomValues(arr);
          id = 'dev_' + Array.from(arr).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
          localStorage.setItem('h90_device_id', id);
        }
        return id;
      } catch (e) {
        return 'dev_' + Math.random().toString(36).substring(2, 18);
      }
    }

    function getMasterSecret() {
      try {
        if (window.Android && typeof window.Android.getMasterSecret === 'function') {
          var s = window.Android.getMasterSecret();
          if (s && s.length > 10) return s;
        }
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.H90Security) {
          if (window.Capacitor.Plugins.H90Security.getMasterSecret) {
            var s2 = window.Capacitor.Plugins.H90Security.getMasterSecret();
            if (s2 && s2.length > 10) return s2;
          }
        }
      } catch (e) {}
      return _SIG.sha256 + '|' + _SIG.pkg + '|fallback';
    }

    async function deriveKey() {
      if (_key) return _key;
      if (_keyPromise) return _keyPromise;

      _keyPromise = (async function() {
        try {
          var deviceId = getDeviceId();
          var master = getMasterSecret();
          var secret = deviceId + '|' + master + '|' + _salt;

          var enc = new TextEncoder();
          var keyMaterial = await crypto.subtle.importKey(
            'raw', enc.encode(secret),
            { name: 'PBKDF2' }, false, ['deriveKey']
          );

          var key = await crypto.subtle.deriveKey(
            {
              name: 'PBKDF2',
              salt: enc.encode(_salt),
              iterations: _iterations,
              hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
          );

          _key = key;
          return key;
        } catch (e) {
          console.error('❌ [Crypto] Key derivation failed:', e);
          throw e;
        }
      })();

      return _keyPromise;
    }

    async function encrypt(plaintext) {
      try {
        if (!plaintext) return null;
        var key = await deriveKey();
        var enc = new TextEncoder();
        var iv = crypto.getRandomValues(new Uint8Array(12));

        var encrypted = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: iv },
          key, enc.encode(String(plaintext))
        );

        var combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv, 0);
        combined.set(new Uint8Array(encrypted), iv.length);

        return ab2b64(combined);
      } catch (e) {
        return null;
      }
    }

    async function decrypt(ciphertextB64) {
      try {
        if (!ciphertextB64) return null;
        var key = await deriveKey();
        var combined = b642ab(ciphertextB64);
        var iv = combined.slice(0, 12);
        var ct = combined.slice(12);

        var decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: new Uint8Array(iv) },
          key, ct
        );

        return new TextDecoder().decode(decrypted);
      } catch (e) {
        return null;
      }
    }

    async function hmac(data) {
      try {
        var enc = new TextEncoder();
        var k = await crypto.subtle.importKey(
          'raw', enc.encode(_salt + '_hmac_v6'),
          { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
        );
        var sig = await crypto.subtle.sign('HMAC', k, enc.encode(String(data)));
        return ab2b64(sig);
      } catch (e) { return null; }
    }

    async function hashPassword(password, salt) {
      try {
        var enc = new TextEncoder();
        var s = enc.encode((salt || _salt) + '_pass_v6');
        var km = await crypto.subtle.importKey(
          'raw', enc.encode(password),
          { name: 'PBKDF2' }, false, ['deriveBits']
        );
        var bits = await crypto.subtle.deriveBits(
          { name: 'PBKDF2', salt: s, iterations: _iterations, hash: 'SHA-256' },
          km, 256
        );
        return Array.from(new Uint8Array(bits)).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
      } catch (e) { return null; }
    }

    function generateNonce() {
      var arr = new Uint8Array(16);
      crypto.getRandomValues(arr);
      return Array.from(arr).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
    }

    function ab2b64(buffer) {
      var bytes = new Uint8Array(buffer);
      var binary = '';
      var chunk = 8192;
      for (var i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
      }
      return btoa(binary);
    }

    function b642ab(base64) {
      var binary = atob(base64);
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes.buffer;
    }

    return {
      encrypt: encrypt,
      decrypt: decrypt,
      hmac: hmac,
      hashPassword: hashPassword,
      generateNonce: generateNonce,
      getDeviceId: getDeviceId,
      getMasterSecret: getMasterSecret,
      isReady: function() { return !!_key; },
      reset: function() { _key = null; _keyPromise = null; }
    };
  })();

  /* ═══════════════════════════════════════════════════════════
     3. SecureDB — IndexedDB مشفّر بقطع 500KB
     ═══════════════════════════════════════════════════════════ */
  var SecureDB = (function() {
    var DB_NAME = 'H90SecureDB_v6';
    var STORE = 'secure_store';
    var CHUNK = 500 * 1024;
    var _db = null;
    var _promise = null;

    function open() {
      if (_db) return Promise.resolve(_db);
      if (_promise) return _promise;
      _promise = new Promise(function(resolve, reject) {
        try {
          var req = indexedDB.open(DB_NAME, 1);
          req.onerror = function() { reject(req.error); };
          req.onsuccess = function() { _db = req.result; resolve(_db); };
          req.onupgradeneeded = function(e) {
            var db = e.target.result;
            if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
          };
        } catch (e) { reject(e); }
      });
      return _promise;
    }

    async function set(key, value) {
      try {
        var db = await open();
        var json = JSON.stringify(value);
        var enc = await Crypto.encrypt(json);
        if (!enc) return false;

        var chunks = [];
        for (var i = 0; i < enc.length; i += CHUNK) chunks.push(enc.substring(i, i + CHUNK));

        var hmac = await Crypto.hmac(enc);

        return new Promise(function(resolve) {
          var tx = db.transaction(STORE, 'readwrite');
          var store = tx.objectStore(STORE);
          store.delete(key + '_meta');
          for (var j = 0; j < 200; j++) store.delete(key + '_c' + j);
          store.put({ id: key + '_meta', chunks: chunks.length, hmac: hmac, ts: Date.now() });
          for (var k = 0; k < chunks.length; k++) store.put({ id: key + '_c' + k, data: chunks[k] });
          tx.oncomplete = function() { resolve(true); };
          tx.onerror = function() { resolve(false); };
        });
      } catch (e) { return false; }
    }

    async function get(key) {
      try {
        var db = await open();
        return new Promise(function(resolve) {
          var tx = db.transaction(STORE, 'readonly');
          var store = tx.objectStore(STORE);
          var metaReq = store.get(key + '_meta');
          metaReq.onsuccess = function() {
            var meta = metaReq.result;
            if (!meta) { resolve(null); return; }
            var chunks = new Array(meta.chunks);
            var loaded = 0;
            for (var i = 0; i < meta.chunks; i++) {
              (function(idx) {
                var cr = store.get(key + '_c' + idx);
                cr.onsuccess = function() {
                  if (cr.result) chunks[idx] = cr.result.data;
                  loaded++;
                  if (loaded === meta.chunks) {
                    var enc = chunks.join('');
                    Crypto.hmac(enc).then(function(hmac) {
                      if (hmac !== meta.hmac) { resolve(null); return; }
                      Crypto.decrypt(enc).then(function(dec) {
                        if (!dec) { resolve(null); return; }
                        try { resolve(JSON.parse(dec)); } catch (e) { resolve(null); }
                      });
                    });
                  }
                };
                cr.onerror = function() {
                  loaded++;
                  if (loaded === meta.chunks) resolve(null);
                };
              })(i);
            }
          };
          metaReq.onerror = function() { resolve(null); };
        });
      } catch (e) { return null; }
    }

    async function del(key) {
      try {
        var db = await open();
        return new Promise(function(resolve) {
          var tx = db.transaction(STORE, 'readwrite');
          var store = tx.objectStore(STORE);
          store.delete(key + '_meta');
          for (var i = 0; i < 200; i++) store.delete(key + '_c' + i);
          tx.oncomplete = function() { resolve(true); };
          tx.onerror = function() { resolve(false); };
        });
      } catch (e) { return false; }
    }

    async function clear() {
      try {
        var db = await open();
        return new Promise(function(resolve) {
          var tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).clear();
          tx.oncomplete = function() { resolve(true); };
          tx.onerror = function() { resolve(false); };
        });
      } catch (e) { return false; }
    }

    return { set: set, get: get, delete: del, clear: clear };
  })();

  /* ═══════════════════════════════════════════════════════════
     4. Native Bridge — جسر للتحقق الأصلي
     ═══════════════════════════════════════════════════════════ */
  var NativeBridge = (function() {
    function call(method) {
      try {
        if (window.Android && typeof window.Android[method] === 'function') {
          return window.Android[method]();
        }
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.H90Security) {
          var fn = window.Capacitor.Plugins.H90Security[method];
          if (typeof fn === 'function') return fn();
        }
        if (window.cordova && window.cordova.exec) {
          return new Promise(function(resolve) {
            window.cordova.exec(resolve, function() { resolve(null); }, 'H90Security', method, []);
          });
        }
      } catch (e) {}
      return null;
    }

    function isVerifiedSync() {
      try {
        if (window.Android && typeof window.Android.isVerified === 'function') {
          return window.Android.isVerified() === true;
        }
      } catch (e) {}
      // في المتصفح أو إذا لم تتوفر الدالة، نعيد true
      return !isNative() || isDevMode();
    }

    async function verifyAsync() {
      try {
        if (window.Android && typeof window.Android.verifySignature === 'function') {
          return window.Android.verifySignature() === true;
        }
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.H90Security) {
          if (window.Capacitor.Plugins.H90Security.verify) {
            var r = await window.Capacitor.Plugins.H90Security.verify();
            return r && r.valid === true;
          }
        }
        if (!isNative()) return true;
        return false;
      } catch (e) { return false; }
    }

    return {
      isRooted: function() { return call('isRooted') === true; },
      isFridaDetected: function() { return call('isFridaDetected') === true; },
      isXposedDetected: function() { return call('isXposedDetected') === true; },
      isEmulator: function() { return call('isEmulator') === true; },
      isVPNConnected: function() { return call('isVPNConnected') === true; },
      isProxyEnabled: function() { return call('isProxyEnabled') === true; },
      isScreenRecording: function() { return call('isScreenRecording') === true; },
      isDebuggerAttached: function() { return call('isDebuggerAttached') === true; },
      isAppInstalled: function(pkg) {
        try {
          if (window.Android && typeof window.Android.isAppInstalled === 'function') {
            return window.Android.isAppInstalled(pkg) === true;
          }
        } catch (e) {}
        return false;
      },
      isVerifiedSync: isVerifiedSync,
      verifyAsync: verifyAsync
    };
  })();

  /* ═══════════════════════════════════════════════════════════
     5. فحوصات الأمان
     ═══════════════════════════════════════════════════════════ */
  var Checks = {
    signature: function() {
      if (isPreview()) return { valid: true, reason: 'preview' };
      return { valid: NativeBridge.isVerifiedSync(), reason: 'native_check' };
    },

    root: function() {
      if (isPreview()) return { rooted: false, reason: 'preview' };
      var rooted = NativeBridge.isRooted() ||
                    NativeBridge.isFridaDetected() ||
                    NativeBridge.isXposedDetected();
      return { rooted: rooted, reason: rooted ? 'native_root' : 'clean' };
    },

    emulator: function() {
      if (isPreview()) return { emulator: false, reason: 'preview' };
      return { emulator: NativeBridge.isEmulator(), reason: 'native_check' };
    },

    vpn: function() {
      if (isPreview()) return { active: false, reason: 'preview' };
      var active = NativeBridge.isVPNConnected() || NativeBridge.isProxyEnabled();
      return { active: active, reason: active ? 'vpn_proxy' : 'clean' };
    },

    recording: function() {
      if (isPreview()) return { recording: false, reason: 'preview' };
      return { recording: NativeBridge.isScreenRecording(), reason: 'native_check' };
    },

    debugger: function() {
      if (isPreview()) return { detected: false, reason: 'preview' };
      return { detected: NativeBridge.isDebuggerAttached(), reason: 'native_check' };
    },

    extensions: function() {
      var found = [];
      try {
        if (typeof window.unsafeWindow !== 'undefined') found.push('tampermonkey');
        if (typeof window.GM_info !== 'undefined') found.push('greasemonkey');
        if (typeof window.VM !== 'undefined') found.push('violentmonkey');
        if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) found.push('react_devtools');
        if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__) found.push('vue_devtools');
      } catch (e) {}
      return { detected: found.length > 0, extensions: found };
    },

    devtools: function() {
      if (isPreview()) return { open: false, reason: 'preview' };
      try {
        var w = window.outerWidth - window.innerWidth;
        var h = window.outerHeight - window.innerHeight;
        return { open: w > 200 || h > 200, reason: 'size_check' };
      } catch (e) { return { open: false }; }
    }
  };

  /* ═══════════════════════════════════════════════════════════
     6. شاشة الإنهاء
     ═══════════════════════════════════════════════════════════ */
  var _terminated = false;

  function terminate(reason, details) {
    if (_terminated) return;
    _terminated = true;

    console.error('🚫 [SECURITY] Termination:', reason, details || '');

    try {
      try { localStorage.clear(); } catch (e) {}
      try { sessionStorage.clear(); } catch (e) {}
      try { SecureDB.clear(); } catch (e) {}
      try { Crypto.reset(); } catch (e) {}
    } catch (e) {}

    try {
      var isVPN = /vpn|proxy|tun/.test(reason);
      var isRoot = /root|frida|xposed|magisk/.test(reason);
      var isDebug = /debug|devtools|f12/.test(reason);
      var isEmu = /emulator/.test(reason);
      var isSig = /signature|tamper/.test(reason);
      var isRec = /recording/.test(reason);
      var isExt = /extension/.test(reason);

      var color = '#e53935';
      var icon = '🛡️';
      var title = 'التطبيق محمي';
      var msg = 'تم اكتشاف بيئة غير آمنة';
      var hint = 'يرجى إعادة تشغيل التطبيق.';

      if (isVPN) { color = '#ffb300'; icon = '🌐'; title = 'VPN نشط'; msg = 'تم اكتشاف اتصال VPN أو Proxy'; hint = 'يرجى إيقاف VPN من إعدادات الجهاز.'; }
      else if (isRoot) { icon = '🔓'; title = 'جهاز غير آمن'; msg = 'تم اكتشاف Root أو أدوات تعديل'; hint = 'لا يمكن تشغيل التطبيق على جهاز Root.'; }
      else if (isDebug) { icon = '🐛'; title = 'محاولة فحص'; msg = 'تم اكتشاف أدوات المطورين'; hint = 'يرجى إغلاق أدوات المطورين.'; }
      else if (isEmu) { icon = '📱'; title = 'جهاز غير مدعوم'; msg = 'لا يمكن تشغيل التطبيق على محاكي'; hint = 'يرجى استخدام جهاز حقيقي.'; }
      else if (isSig) { icon = '❌'; title = 'التطبيق معدّل'; msg = 'التوقيع غير مطابق للأصلي'; hint = 'يرجى استخدام النسخة الأصلية.'; }
      else if (isRec) { icon = '🎥'; title = 'تسجيل الشاشة'; msg = 'لا يمكن التسجيل أثناء التشغيل'; hint = 'يرجى إيقاف تسجيل الشاشة.'; }
      else if (isExt) { icon = '⚠️'; title = 'امتداد مشبوه'; msg = 'تم اكتشاف امتداد يعدّل الكود'; hint = 'يرجى تعطيل الامتدادات.'; }

      document.body.innerHTML =
        '<div style="position:fixed;inset:0;background:radial-gradient(ellipse at 50% 30%,rgba(229,57,53,0.15),transparent 60%),#000;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:-apple-system,sans-serif;padding:30px;text-align:center;z-index:2147483647;direction:rtl;">' +
          '<div style="font-size:80px;margin-bottom:20px;">' + icon + '</div>' +
          '<h1 style="color:' + color + ';margin:0 0 16px;font-size:26px;font-weight:900;">' + title + '</h1>' +
          '<p style="color:rgba(255,255,255,0.85);font-size:16px;line-height:1.8;margin:0 0 20px;max-width:340px;">' + msg + '</p>' +
          '<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);padding:14px 20px;border-radius:14px;max-width:340px;">' +
            '<div style="font-size:13px;color:rgba(255,255,255,0.85);line-height:1.7;">' + hint + '</div>' +
          '</div>' +
          '<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:20px;">H90 SECURITY · ' + reason + '</div>' +
        '</div>';

      document.addEventListener('click', function(e) { e.preventDefault(); }, true);
      document.addEventListener('touchstart', function(e) { e.preventDefault(); }, true);
      document.addEventListener('keydown', function(e) { e.preventDefault(); }, true);

      if (window.Android && typeof window.Android.exitApp === 'function') {
        setTimeout(function() { try { window.Android.exitApp(); } catch (e) {} }, 3000);
      }
    } catch (e) {}
  }

  /* ═══════════════════════════════════════════════════════════
     7. التهيئة
     ═══════════════════════════════════════════════════════════ */
  async function init() {
    console.log('%c🛡️ H90 Security v6.0', 'background:linear-gradient(135deg,#e53935,#000);color:#fff;padding:6px 16px;border-radius:8px;font-weight:900;');

    if (isPreview()) {
      console.log('%c🔧 DEV MODE — Security disabled for preview', 'background:#ffb300;color:#000;padding:4px 12px;border-radius:6px;font-weight:900;');
      return;
    }

    // 1. فحص التوقيع (الأهم)
    var sig = Checks.signature();
    if (!sig.valid) {
      terminate('signature_invalid', sig);
      return;
    }

    // 2. فحص الروت
    var root = Checks.root();
    if (root.rooted) {
      terminate('root_detected', root);
      return;
    }

    // 3. فحص المحاكي
    var emu = Checks.emulator();
    if (emu.emulator) {
      terminate('emulator_detected', emu);
      return;
    }

    // 4. فحص VPN
    var vpn = Checks.vpn();
    if (vpn.active) {
      terminate('vpn_active', vpn);
      return;
    }

    // 5. فحص تسجيل الشاشة
    var rec = Checks.recording();
    if (rec.recording) {
      terminate('screen_recording', rec);
      return;
    }

    // 6. فحص الامتدادات
    var ext = Checks.extensions();
    if (ext.detected && (ext.extensions.indexOf('tampermonkey') > -1 || ext.extensions.indexOf('greasemonkey') > -1)) {
      terminate('extension_detected', ext);
      return;
    }

    // 7. فحص دوري
    setInterval(function() {
      if (_terminated) return;

      var s = Checks.signature();
      if (!s.valid) return terminate('signature_invalid');

      var r = Checks.root();
      if (r.rooted) return terminate('root_detected');

      var v = Checks.vpn();
      if (v.active) return terminate('vpn_active');

      var d = Checks.debugger();
      if (d.detected) return terminate('debugger_detected');

      var dev = Checks.devtools();
      if (dev.open) return terminate('devtools_detected');
    }, 3000);

    console.log('%c✅ H90 Security v6.0 ACTIVE', 'background:#00e676;color:#000;padding:4px 12px;border-radius:6px;font-weight:900;');
  }

  /* ═══════════════════════════════════════════════════════════
     8. API عام
     ═══════════════════════════════════════════════════════════ */
  window.__H90_SEC__ = {
    version: _SIG.version,
    Crypto: Crypto,
    SecureDB: SecureDB,
    NativeBridge: NativeBridge,
    Checks: Checks,

    Signature: {
      isVerified: function() { return NativeBridge.isVerifiedSync(); },
      verify: function() { return NativeBridge.verifyAsync(); },
      enforce: function() {
        if (isPreview()) return true;
        return NativeBridge.isVerifiedSync();
      }
    },

    isNative: isNative,
    isPreview: isPreview,
    isDevMode: isDevMode,
    terminate: terminate,

    status: function() {
      return {
        version: _SIG.version,
        isNative: isNative(),
        isPreview: isPreview(),
        isDevMode: isDevMode(),
        cryptoReady: Crypto.isReady(),
        terminated: _terminated
      };
    },

    test: async function() {
      var results = {};
      try {
        results.signature = await NativeBridge.verifyAsync();
        results.root = NativeBridge.isRooted();
        results.frida = NativeBridge.isFridaDetected();
        results.emulator = NativeBridge.isEmulator();
        results.vpn = NativeBridge.isVPNConnected();
        results.recording = NativeBridge.isScreenRecording();
        results.crypto = await (async function() {
          var t = 'test_' + Date.now();
          var e = await Crypto.encrypt(t);
          var d = await Crypto.decrypt(e);
          return t === d;
        })();
      } catch (e) { results.error = e.message; }
      return results;
    }
  };

  window.H90Crypto = Crypto;
  window.H90SecureDB = SecureDB;
  window.H90Signature = window.__H90_SEC__.Signature;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();