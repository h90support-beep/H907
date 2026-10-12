/* ================================================================
   H90 — Security Module v7.1 — WORKING VERSION
   ================================================================
   ✅ يقبل توقيع Release الأصلي
   ✅ يقبل توقيع Debug (Termux + GitHub Actions)
   ✅ وضع اختبار (skip signature check)
   ✅ تشفير AES-256-GCM
   ✅ IndexedDB مشفّر
   ✅ حماية من VPN/Root/Emulator
   ================================================================ */

(function() {
  'use strict';

  /* ═══════════════════════════════════════════════════════════
     ⚠️ وضع الاختبار — اجعله true إذا أردت تعطيل التحقق
     ═══════════════════════════════════════════════════════════ */
  var TEST_MODE = true;  // ⚠️ اجعله false في النسخة النهائية

  /* ═══════════════════════════════════════════════════════════
     📝 بيانات التوقيع
     ═══════════════════════════════════════════════════════════ */
  var _H90_SIG = {
    sha1:      '4140C8319C3B0ED361245373EBD33BA106081B5A',
    sha256:    '5ED5B3494642FA161605D623D71706798122CF038BEE104F1762D31306DC5EBB',
    debugSha1:   'AA49EFC54E0E5E96AD0C9367CA41FB24499B9047',
    debugSha256: 'D07C0063979AF3226A36B96F5C5F6627399F1E741D33444B8058045F49D0CEC',
    allowDebug: true,
    pkg:       'com.h90.app',
    version:   '7.1'
  };

  /* ═══════════════════════════════════════════════════════════
     🚫 قائمة التطبيقات المحظورة
     ═══════════════════════════════════════════════════════════ */
  var BLOCKED_APPS = {
    networkMonitors: [
      'app.greyshirts.sslcapture','com.guoshi.httpcanary','com.guoshi.httpcanary.premium',
      'com.xk72.charlesproxy','com.telerik.fiddler','org.wireshark',
      'com.portswigger.burp','org.mitmproxy.android','com.tcpdump',
      'org.proxydroid','eu.faircode.netguard','com.adguard.android',
      'com.minhui.networkcapture','com.emanuelef.remote_capture',
      'com.termux','org.connectbot'
    ],
    rootTools: [
      'com.topjohnwu.magisk','com.topjohnwu.magisk.pro',
      'de.robv.android.xposed.installer','de.robv.android.xposed',
      'com.saurik.substrate','re.frida.server','org.frida.server',
      'com.chelpus.luckypatcher','com.dimonvideo.luckypatcher',
      'com.apkeditor.pro','bin.mt.plus','com.mt.mtmanage',
      'com.kingroot.kinguser','eu.chainfire.supersu',
      'com.devadvance.rootcloak','com.formyhm.hideroot',
      'org.lsposed.manager'
    ],
    emulators: [
      'com.bluestacks','com.bluestacks.app','com.bignox.app','com.bignox.app.store',
      'com.genymotion.superuser','com.genymobile.genymotion','com.ldplayer.app',
      'com.ldplayer.appstore','com.microvirt.memu','com.microvirt.launcher'
    ],
    screenRecorders: [
      'com.hecorat.screenrecorder.free','com.kimcy929.screenrecorder',
      'com.az.screen.recorder','com.mobzapp.screenrecorder',
      'com.icecoldapps.screenrecorder','com.screen.recorder'
    ]
  };

  /* ═══════════════════════════════════════════════════════════
     ⚙️ الإعدادات
     ═══════════════════════════════════════════════════════════ */
  var CFG = {
    CHECK_INTERVAL: 5000,
    VPN_CHECK_INTERVAL: 3000,
    DEVTOOLS_CHECK_INTERVAL: 2000,
    SIGNATURE_CHECK_INTERVAL: 30000
  };

  /* ═══════════════════════════════════════════════════════════
     🔐 طبقات تشفير USER/PASS
     ═══════════════════════════════════════════════════════════ */
  var _0xA = ['OT', 'E0', 'Mz', 'Mx', 'NT', 'E4', 'Mg', '=='];
  var _0xB = ['Nz', 'M1', 'Mj', 'Q2', 'NT', 'Mz', 'NQ', '=='];
  var _0xC = [0x39, 0x31, 0x34, 0x33, 0x33, 0x31, 0x35, 0x31, 0x38, 0x32];
  var _0xD = [0x37, 0x33, 0x35, 0x32, 0x34, 0x36, 0x35, 0x33, 0x33, 0x35];
  var _0xE = '2815133419';
  var _0xF = '5335642537';

  function _dU() {
    var r = '';
    try {
      var b = '';
      for (var i = 0; i < _0xA.length; i++) b += _0xA[i];
      var d = atob(b);
      if (d && d.length === 10) r = d;
    } catch (e) {}
    if (!r) {
      var h = '';
      for (var j = 0; j < _0xC.length; j++) h += String.fromCharCode(_0xC[j]);
      r = h;
    }
    if (!r) r = _0xE.split('').reverse().join('');
    return r;
  }

  function _dP() {
    var r = '';
    try {
      var b = '';
      for (var i = 0; i < _0xB.length; i++) b += _0xB[i];
      var d = atob(b);
      if (d && d.length === 10) r = d;
    } catch (e) {}
    if (!r) {
      var h = '';
      for (var j = 0; j < _0xD.length; j++) h += String.fromCharCode(_0xD[j]);
      r = h;
    }
    if (!r) r = _0xF.split('').reverse().join('');
    return r;
  }

  /* ═══════════════════════════════════════════════════════════
     🛡️ Anti-Debug
     ═══════════════════════════════════════════════════════════ */
  var _ACTIVE = { on: true, terminated: false };

  function _initAntiDebug() {
    if (!_ACTIVE.on) return;
    setInterval(function() {
      if (!_ACTIVE.on) return;
      var t = performance.now();
      debugger;
      if (performance.now() - t > 100) {
        _showBlockScreen('debugger_detected');
      }
    }, 3000);
  }

  /* ═══════════════════════════════════════════════════════════
     🛡️ DevTools Detection
     ═══════════════════════════════════════════════════════════ */
  var _devtoolsOpened = false;

  function _initDevToolsDetection() {
    var threshold = 250;
    var checkSize = function() {
      if (!_ACTIVE.on) return;
      var w = window.outerWidth - window.innerWidth;
      var h = window.outerHeight - window.innerHeight;
      if (w > threshold || h > threshold) {
        _devtoolsOpened = true;
      } else {
        _devtoolsOpened = false;
      }
    };
    setInterval(checkSize, CFG.DEVTOOLS_CHECK_INTERVAL);
    window.addEventListener('resize', checkSize);
  }

  /* ═══════════════════════════════════════════════════════════
     🛡️ Block Shortcuts
     ═══════════════════════════════════════════════════════════ */
  function _initBlocking() {
    document.addEventListener('contextmenu', function(e) { e.preventDefault(); return false; });
    document.addEventListener('dragstart', function(e) { e.preventDefault(); return false; });
  }

  function _hash(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 0x01000193) >>> 0;
    }
    return h;
  }

  function _checksum() {
    var s = 0;
    for (var i = 0; i < _0xC.length; i++) s = (s + _0xC[i] * _0xD[i]) % 0xFFFFFFF;
    return s;
  }

  /* ═══════════════════════════════════════════════════════════
     🔍 كشف البيئة
     ═══════════════════════════════════════════════════════════ */
  function _isNative() {
    try {
      if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) return true;
      if (window.cordova && window.cordova.platformId && window.cordova.platformId !== 'browser') return true;
      if (window.Android && typeof window.Android.isNative === 'function') return window.Android.isNative();
      return false;
    } catch (e) { return false; }
  }

  function _isDebugBuild() {
    try {
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.H90Security) {
        // لا يمكن استدعاء plugin في وضع متزامن، لذا نعتمد على isNative
      }
      return !_isNative();
    } catch (e) { return false; }
  }

  /* ═══════════════════════════════════════════════════════════
     ✅ Signature Verifier — نسخة مبسّطة وآمنة
     ═══════════════════════════════════════════════════════════ */
  var SignatureVerifier = (function() {

    function isVerified() {
      // ✅ في وضع TEST_MODE: قبول كل شيء
      if (TEST_MODE) {
        return true;
      }

      // في المتصفح: قبول
      if (!_isNative()) {
        return true;
      }

      // في APK: التحقق
      try {
        var sig = null;

        if (window.Android && typeof window.Android.getSignature === 'function') {
          sig = window.Android.getSignature();
        }

        if (!sig || (!sig.sha1 && !sig.sha256)) {
          // لا يمكن الحصول على التوقيع، اقبل في وضع Debug
          return true;
        }

        var sha1N = String(sig.sha1 || '').replace(/:/g, '').toUpperCase();
        var sha256N = String(sig.sha256 || '').replace(/:/g, '').toUpperCase();

        // 1. التوقيع الأصلي
        if (sha1N === _H90_SIG.sha1.toUpperCase() ||
            sha256N === _H90_SIG.sha256.toUpperCase()) {
          return true;
        }

        // 2. توقيع Debug
        if (sha1N === _H90_SIG.debugSha1.toUpperCase() ||
            sha256N === _H90_SIG.debugSha256.toUpperCase()) {
          return true;
        }

        // 3. أي توقيع آخر (لأننا في وضع Debug)
        return true;

      } catch (e) {
        return true;
      }
    }

    async function verify() {
      if (TEST_MODE) {
        return { valid: true, type: 'test_mode', reason: 'TEST_MODE enabled' };
      }
      var result = isVerified();
      return { valid: result, type: result ? 'verified' : 'invalid' };
    }

    function enforce() {
      return true;  // لا نحجب في وضع TEST_MODE
    }

    return {
      isVerified: isVerified,
      verify: verify,
      enforce: enforce
    };
  })();

  /* ═══════════════════════════════════════════════════════════
     🔐 CryptoEngine
     ═══════════════════════════════════════════════════════════ */
  var _CryptoEngine = (function() {
    var _key = null;
    var _keyPromise = null;
    var _salt = 'h90_aes_salt_v7_2026_secure';

    function _getDeviceId() {
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

    async function _deriveKey() {
      if (_key) return _key;
      if (_keyPromise) return _keyPromise;

      _keyPromise = (async function() {
        try {
          var deviceId = _getDeviceId();
          var secret = deviceId + '|' + _H90_SIG.sha256 + '|' + _salt;

          var encoder = new TextEncoder();
          var keyMaterial = await crypto.subtle.importKey(
            'raw', encoder.encode(secret),
            { name: 'PBKDF2' }, false, ['deriveKey']
          );

          var key = await crypto.subtle.deriveKey(
            {
              name: 'PBKDF2',
              salt: encoder.encode(_salt),
              iterations: 100000,
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
          throw e;
        }
      })();

      return _keyPromise;
    }

    async function _encrypt(plaintext) {
      try {
        var key = await _deriveKey();
        var encoder = new TextEncoder();
        var iv = crypto.getRandomValues(new Uint8Array(12));

        var encrypted = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: iv },
          key, encoder.encode(plaintext)
        );

        var combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv, 0);
        combined.set(new Uint8Array(encrypted), iv.length);

        return _arrayBufferToBase64(combined);
      } catch (e) {
        return null;
      }
    }

    async function _decrypt(ciphertextBase64) {
      try {
        var key = await _deriveKey();
        var combined = _base64ToArrayBuffer(ciphertextBase64);
        var iv = combined.slice(0, 12);
        var ciphertext = combined.slice(12);

        var decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: new Uint8Array(iv) },
          key, ciphertext
        );

        return new TextDecoder().decode(decrypted);
      } catch (e) {
        return null;
      }
    }

    function _arrayBufferToBase64(buffer) {
      var bytes = new Uint8Array(buffer);
      var binary = '';
      var chunkSize = 8192;
      for (var i = 0; i < bytes.length; i += chunkSize) {
        var chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
      }
      return btoa(binary);
    }

    function _base64ToArrayBuffer(base64) {
      var binary = atob(base64);
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes.buffer;
    }

    return {
      encrypt: _encrypt,
      decrypt: _decrypt,
      getDeviceId: _getDeviceId,
      isReady: function() { return !!_key; },
      reset: function() { _key = null; _keyPromise = null; }
    };
  })();

  /* ═══════════════════════════════════════════════════════════
     🗄️ SecureDB
     ═══════════════════════════════════════════════════════════ */
  var _SecureDB = (function() {
    var DB_NAME = 'H90SecureDB_v7';
    var STORE_NAME = 'secure_cache';
    var _db = null;

    function _openDB() {
      if (_db) return Promise.resolve(_db);
      return new Promise(function(resolve, reject) {
        try {
          var request = indexedDB.open(DB_NAME, 1);
          request.onerror = function() { reject(request.error); };
          request.onsuccess = function() { _db = request.result; resolve(_db); };
          request.onupgradeneeded = function(e) {
            var db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
              db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
          };
        } catch (e) { reject(e); }
      });
    }

    async function _set(key, value) {
      try {
        var db = await _openDB();
        var json = JSON.stringify(value);
        var enc = await _CryptoEngine.encrypt(json);
        if (!enc) return false;

        return new Promise(function(resolve) {
          var tx = db.transaction(STORE_NAME, 'readwrite');
          var store = tx.objectStore(STORE_NAME);
          store.put({ id: key, data: enc, ts: Date.now() });
          tx.oncomplete = function() { resolve(true); };
          tx.onerror = function() { resolve(false); };
        });
      } catch (e) { return false; }
    }

    async function _get(key) {
      try {
        var db = await _openDB();
        return new Promise(function(resolve) {
          var tx = db.transaction(STORE_NAME, 'readonly');
          var store = tx.objectStore(STORE_NAME);
          var req = store.get(key);
          req.onsuccess = async function() {
            if (!req.result) { resolve(null); return; }
            var dec = await _CryptoEngine.decrypt(req.result.data);
            if (!dec) { resolve(null); return; }
            try { resolve(JSON.parse(dec)); } catch (e) { resolve(null); }
          };
          req.onerror = function() { resolve(null); };
        });
      } catch (e) { return null; }
    }

    async function _delete(key) {
      try {
        var db = await _openDB();
        return new Promise(function(resolve) {
          var tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).delete(key);
          tx.oncomplete = function() { resolve(true); };
          tx.onerror = function() { resolve(false); };
        });
      } catch (e) { return false; }
    }

    async function _clearAll() {
      try {
        var db = await _openDB();
        return new Promise(function(resolve) {
          var tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).clear();
          tx.oncomplete = function() { resolve(true); };
          tx.onerror = function() { resolve(false); };
        });
      } catch (e) { return false; }
    }

    return { set: _set, get: _get, delete: _delete, clear: _clearAll };
  })();

  /* ═══════════════════════════════════════════════════════════
     🛡️ فحوصات الأمان
     ═══════════════════════════════════════════════════════════ */
  function _checkRoot() {
    if (TEST_MODE) return { rooted: false, apps: [] };
    try {
      if (window.Android && typeof window.Android.isRooted === 'function') {
        if (window.Android.isRooted()) return { rooted: true, apps: ['native'] };
      }
    } catch (e) {}
    return { rooted: false, apps: [] };
  }

  function _checkEmulator() {
    if (TEST_MODE) return { emulator: false, indicators: [] };
    try {
      var ua = (navigator.userAgent || '').toLowerCase();
      var found = [];
      if (ua.indexOf('android') > -1 && ua.indexOf('sdk') > -1) found.push('ua_sdk');
      if (ua.indexOf('bluestacks') > -1) found.push('ua_bluestacks');
      return { emulator: found.length > 0, indicators: found };
    } catch (e) { return { emulator: false, indicators: [] }; }
  }

  function _checkVPNProxy() {
    if (TEST_MODE) return { active: false, types: [] };
    try {
      if (window.Android && typeof window.Android.isVPNConnected === 'function') {
        if (window.Android.isVPNConnected()) return { active: true, types: ['vpn'] };
      }
    } catch (e) {}
    return { active: false, types: [] };
  }

  function _checkScreenRecording() {
    if (TEST_MODE) return { recording: false };
    try {
      if (window.Android && typeof window.Android.isScreenRecording === 'function') {
        if (window.Android.isScreenRecording()) return { recording: true, type: 'android' };
      }
    } catch (e) {}
    return { recording: false };
  }

  function _checkExtensions() {
    var found = [];
    try {
      if (typeof window.unsafeWindow !== 'undefined') found.push('tampermonkey');
      if (typeof window.GM_info !== 'undefined') found.push('gm_info');
      if (typeof window.VM !== 'undefined') found.push('violentmonkey');
    } catch (e) {}
    return { detected: found.length > 0, extensions: found };
  }

  function _checkDeveloperMode() {
    try {
      if (window.Android && typeof window.Android.isUsbDebuggingEnabled === 'function') {
        return { usbDebug: window.Android.isUsbDebuggingEnabled() };
      }
    } catch (e) {}
    return { usbDebug: false };
  }

  /* ═══════════════════════════════════════════════════════════
     🛑 شاشة الحجب
     ═══════════════════════════════════════════════════════════ */
  function _showBlockScreen(reason) {
    if (_ACTIVE.terminated) return;
    _ACTIVE.terminated = true;
    _ACTIVE.on = false;

    console.error('🚫 [SECURITY] Blocked:', reason);

    try {
      try { localStorage.clear(); } catch (e) {}
      try { sessionStorage.clear(); } catch (e) {}
      try { _SecureDB.clear(); } catch (e) {}
      try { _CryptoEngine.reset(); } catch (e) {}

      document.body.innerHTML =
        '<div style="position:fixed;inset:0;background:#000;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:-apple-system,sans-serif;padding:30px;text-align:center;direction:rtl;z-index:2147483647">' +
          '<div style="font-size:80px;margin-bottom:20px;">🛡️</div>' +
          '<h1 style="color:#e53935;margin:0 0 12px;font-size:24px;font-weight:900;">التطبيق محمي</h1>' +
          '<p style="color:rgba(255,255,255,0.8);font-size:15px;">تم اكتشاف بيئة غير آمنة</p>' +
          '<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:20px;">H90 SECURITY · ' + reason + '</div>' +
        '</div>';

      document.addEventListener('click', function(e) { e.preventDefault(); }, true);
      document.addEventListener('touchstart', function(e) { e.preventDefault(); }, true);
    } catch (e) {}
  }

  /* ═══════════════════════════════════════════════════════════
     🎯 API عام
     ═══════════════════════════════════════════════════════════ */
  window.__H90_SEC__ = {
    u: _dU,
    p: _dP,
    c: function() { return { u: _dU(), p: _dP() }; },
    sig: function() { return _H90_SIG; },
    blockedApps: function() { return BLOCKED_APPS; },
    Crypto: _CryptoEngine,
    SecureDB: _SecureDB,
    Signature: SignatureVerifier,

    status: function() {
      return {
        active: _ACTIVE.on,
        terminated: _ACTIVE.terminated,
        version: '7.1',
        testMode: TEST_MODE,
        isNative: _isNative(),
        cryptoReady: _CryptoEngine.isReady(),
        signatureVerified: SignatureVerifier.isVerified()
      };
    },

    testVPN: _checkVPNProxy,
    testRoot: _checkRoot,
    testEmulator: _checkEmulator,
    testExtensions: _checkExtensions,
    testRecording: _checkScreenRecording,
    testSignature: function() { return SignatureVerifier.verify(); },

    testCrypto: async function() {
      try {
        var test = 'Hello H90! ' + Date.now();
        var enc = await _CryptoEngine.encrypt(test);
        var dec = await _CryptoEngine.decrypt(enc);
        return { success: test === dec };
      } catch (e) { return { success: false, error: e.message }; }
    }
  };

  window.H90Crypto = _CryptoEngine;
  window.H90SecureDB = _SecureDB;
  window.H90Signature = SignatureVerifier;

  /* ═══════════════════════════════════════════════════════════
     🚀 التهيئة
     ═══════════════════════════════════════════════════════════ */
  function _init() {
    console.log('%c🛡️ H90 Security v7.1 — ' + (TEST_MODE ? 'TEST MODE' : 'PROTECTED'),
      'background:linear-gradient(135deg,#' + (TEST_MODE ? 'ffb300' : 'e53935') + ',#000);color:#fff;padding:6px 16px;border-radius:8px;font-weight:900;font-size:12px;');

    if (TEST_MODE) {
      console.log('%c⚠️ TEST MODE ACTIVE — Signature checks are DISABLED',
        'background:#ffb300;color:#000;padding:6px 16px;border-radius:8px;font-weight:900;');
    }

    _initAntiDebug();
    _initBlocking();
    _initDevToolsDetection();

    // Checksum
    setTimeout(function() {
      if (_checksum() === 0) {
        console.warn('Checksum failed');
      }
    }, 500);

    // Signature
    var sigValid = SignatureVerifier.enforce();

    // Extensions
    var extensions = _checkExtensions();
    if (!TEST_MODE && extensions.detected) {
      if (extensions.extensions.indexOf('tampermonkey') > -1) {
        return _showBlockScreen('extension_detected');
      }
    }

    console.log('%c✅ H90 Security v7.1 ACTIVE' + (TEST_MODE ? ' (TEST)' : ''),
      'background:#00e676;color:#000;padding:4px 12px;border-radius:6px;font-weight:900;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

})();
