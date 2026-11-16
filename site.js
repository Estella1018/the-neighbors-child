/* 黎安國 國民生活入口網
   - 內容警告（第一次進站）
   - 理智值：停留 20 秒後開始崩壞，越久越嚴重
   - 找異常：崩壞會留下「異常」，點一下就能糾正；七種都糾正過 → 網站恢復完美
             放著不管 → 一路壞到底，電視自己轉到外面的頻道
   - 第二次造訪：停留 30 秒後跳保養中心訊息、褪色、閒置時浮出貓眼
   - 國民電視台：CH6 是外面的頻道，點畫面可以離開黎安國
   - 切換分頁、暫停跑馬燈、宵禁（23 點～5 點）、凌晨 3 點、首長信箱、右鍵、發呆

   測試用網址參數：
     ?reset     清掉所有紀錄（重看第一次進站）
     ?visit=2   假裝是第二次造訪（不會改到真的紀錄）
     ?fast=10   時間加速 10 倍
     ?hour=23   假裝現在是幾點（23＝宵禁，3＝凌晨三點） */
(function () {
  'use strict';

  var params = new URLSearchParams(location.search);
  var KEYS = ['lian_visits', 'lian_cw', 'lian_counted', 'lian_sys', 'lian_idle', 'lian_rc'];
  function sget(s, k) { try { return window[s].getItem(k); } catch (e) { return null; } }
  function sset(s, k, v) { try { window[s].setItem(k, v); } catch (e) {} }

  if (params.has('reset')) {
    KEYS.forEach(function (k) {
      try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch (e) {}
    });
    location.replace(location.pathname);
    return;
  }

  var $ = function (id) { return document.getElementById(id); };
  var each = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var speed = Math.max(1, parseFloat(params.get('fast')) || 1);
  var rand = Math.random;
  function pick(a) { return a[Math.floor(rand() * a.length)]; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function two(n) { return (n < 10 ? '0' : '') + n; }
  function esc(s) { return s.replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }

  var now = new Date();
  sset('localStorage', 'lian_base', location.pathname.replace(/[^/]*$/, '')); // 給 404 頁找回首頁
  var hour = params.has('hour') ? parseInt(params.get('hour'), 10) : now.getHours();

  /* ---------- 最新消息日期：永遠從今天往前推 ---------- */
  (function () {
    var back = [0, 2, 4, 6, 9, 13];
    each('.news tbody tr', function (tr, i) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (back[i] || i * 2));
      tr.cells[0].textContent = two(d.getMonth() + 1) + '/' + two(d.getDate());
    });
    $('upd').textContent = now.getFullYear() + '/' + two(now.getMonth() + 1) + '/' + two(now.getDate());
  })();

  /* ---------- 造訪次數 ---------- */
  var override = parseInt(params.get('visit'), 10);
  var visits;
  if (override > 0) {
    visits = override;
  } else {
    visits = parseInt(sget('localStorage', 'lian_visits'), 10) || 0;
    if (!sget('sessionStorage', 'lian_counted')) {
      visits += 1;
      sset('localStorage', 'lian_visits', String(visits));
      sset('sessionStorage', 'lian_counted', '1');
    }
    if (visits < 1) visits = 1;
  }

  /* ---------- 訪客計數器 ---------- */
  var digits = $('digits');
  var baseCount = 114514 + visits;
  function pad(n) { n = String(n); while (n.length < 7) n = '0' + n; return n; }
  digits.textContent = pad(baseCount);

  /* ---------- 對話框 ---------- */
  var lastFocus;
  function anyDlgOpen() { return !!document.querySelector('.dlg-backdrop:not([hidden])'); }
  function openDlg(d) {
    lastFocus = document.activeElement;
    d.hidden = false;
    var b = d.querySelector('input, button');
    if (b) b.focus();
  }
  function closeDlg(d) {
    d.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  // 視窗右上角的 X 與 Esc 鍵：內容警告＝我已了解、公告＝確定，其他就是關掉
  function closeByX(d) {
    if (!d || d.hidden) return;
    if (d.id === 'cw') $('cw-ok').click();
    else if (d.id === 'notice') $('notice-ok').click();
    else closeDlg(d);
  }
  document.addEventListener('click', function (e) {
    var x = e.target.closest && e.target.closest('.dlg-x');
    if (x) closeByX(x.closest('.dlg-backdrop'));
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var open = document.querySelectorAll('.dlg-backdrop:not([hidden])');
    if (open.length) closeByX(open[open.length - 1]);
  });
  var noticeCb = null;
  function showNotice(title, html, cb) {
    if (anyDlgOpen()) return false;
    $('notice-title').textContent = title;
    $('notice-body').innerHTML = html;
    noticeCb = cb || null;
    openDlg($('notice'));
    return true;
  }
  $('notice-ok').addEventListener('click', function () {
    closeDlg($('notice'));
    if (noticeCb) { var f = noticeCb; noticeCb = null; f(); }
  });

  /* ---------- 文字閃一下 ---------- */
  function flash(el, html, ms, cls) {
    if (!el || el.dataset.busy) return;
    var old = el.innerHTML;
    el.dataset.busy = '1';
    el.innerHTML = html;
    if (cls) el.classList.add(cls);
    if (!reduced) el.classList.add('glitch');
    setTimeout(function () {
      el.innerHTML = old;
      if (cls) el.classList.remove(cls);
      el.classList.remove('glitch');
      delete el.dataset.busy;
    }, ms);
  }
  function glitchOnce(el) {
    if (reduced || !el) return;
    el.classList.remove('glitch'); void el.offsetWidth; el.classList.add('glitch');
    setTimeout(function () { el.classList.remove('glitch'); }, 300);
  }

  /* =========================================================
     跑馬燈（暫停時露出藏起來的話）
     ========================================================= */
  var mq = $('marquee'), mqBtn = $('mq-pause'), mqText = $('mq-text');
  function toggleMq() {
    var p = mq.classList.toggle('paused');
    mqBtn.textContent = p ? '播放' : '暫停';
    mqBtn.setAttribute('aria-pressed', p ? 'true' : 'false');
  }
  mqBtn.addEventListener('click', toggleMq);
  mq.querySelector('.mq-track').addEventListener('click', toggleMq);

  /* =========================================================
     宵禁（23:00～05:00）與凌晨三點
     ========================================================= */
  var curfew = hour >= 23 || hour < 5;
  if (curfew) {
    document.body.classList.add('curfew-on');
    mqText.innerHTML = new Array(4).join('★ 現在是宵禁時間，請立即就寢 ★　　');
    $('greeting').textContent = '請立即就寢。';
  }
  if (hour === 3) {
    $('care-link').textContent = '保養中心預約（凌晨 3:00 尚有名額）';
    var tr = document.createElement('tr');
    tr.innerHTML = '<td>' + two(now.getMonth() + 1) + '/' + two(now.getDate()) + '</td>' +
      '<td><a href="care.html">【緊急】凌晨三點的你，為什麼還醒著？</a><span class="new-tag">NEW</span></td><td>國民保養中心</td>';
    var tb = document.querySelector('.news tbody');
    tb.insertBefore(tr, tb.firstChild);
  }

  /* =========================================================
     切換分頁會被發現
     ========================================================= */
  var realTitle = document.title;
  document.addEventListener('visibilitychange', function () {
    document.title = document.hidden ? '國民，您要去哪裡？' : realTitle;
  });

  /* =========================================================
     國民電視台
     ========================================================= */
  var CHANNELS = {
    1: { still: 'img/tv_model_bow.jpg', cap: '國民楷模頒獎典禮', ticker: '年度國民楷模頒獎典禮　精彩回顧' },
    2: { still: 'img/tv_news.jpg', cap: '國民新聞', ticker: '本月國民幸福指數 99.8%　再創新高' },
    3: { video: 'media/opening.mp4', poster: 'img/poster_opening.jpg', cap: '光榮大樓　夜間安全巡查', ticker: '' },
    4: { video: 'media/school.mp4', poster: 'img/poster_school.jpg', cap: '校園巡禮', ticker: '今天的你，比昨天更好了嗎？' },
    5: { video: 'media/trailer.mp4', poster: 'img/poster_trailer.jpg', cap: '年度宣導短片', ticker: '' },
    6: { outside: true, cap: '——（無訊號）', ticker: '' }
  };
  var tvScreen = $('tv-screen'), tvStill = $('tv-still'), tvVideo = $('tv-video');
  var tvSnow = $('tv-snow'), tvOut = $('tv-outside'), tvOsd = $('tv-osd');
  var tvTicker = $('tv-ticker'), tvCap = $('tv-cap'), tvHit = $('tv-hit'), tvSound = $('tv-sound');
  var snowCtx = tvSnow.getContext('2d');
  var tvOutImg = $('tv-outside-img');
  var OUTSIDE_IMGS = ['img/outside_1.jpg', 'img/outside_2.jpg', 'img/outside_3.jpg', 'img/outside_4.jpg'];
  OUTSIDE_IMGS.forEach(function (src) { new Image().src = src; });
  var curCh = 1, burstUntil = 0, osdTimer, lastOutFlash = 0;
  var sanity = 0;          // 0 = 正常，1 = 完全崩壞
  var collapsed = false;   // 放著不管，壞到底了
  var obedient = false;    // 全部糾正，網站「恢復完美」

  function drawSnow(ctx, w, h, alpha) {
    var img = ctx.createImageData(w, h), d = img.data;
    for (var i = 0; i < d.length; i += 4) {
      var v = rand() * 255;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = alpha;
    }
    ctx.putImageData(img, 0, 0);
  }

  function setChannel(n) {
    var c = CHANNELS[n];
    curCh = n;
    burstUntil = performance.now() + 280;
    tvVideo.pause();
    tvStill.hidden = !c.still;
    if (c.still) tvStill.src = c.still;
    tvVideo.hidden = !c.video;
    if (c.video) {
      tvVideo.poster = c.poster;
      tvVideo.src = c.video;
      tvVideo.muted = tvSound.getAttribute('aria-pressed') !== 'true';
      var p = tvVideo.play();
      if (p && p.catch) p.catch(function () {});
    }
    tvOut.hidden = !c.outside || obedient;
    tvScreen.classList.toggle('outside', !!c.outside && !obedient);
    tvHit.tabIndex = c.outside ? 0 : -1;
    tvHit.setAttribute('aria-label', c.outside ? '外面的頻道：點一下' : '電視畫面');
    tvTicker.textContent = c.ticker;
    tvCap.textContent = 'CH ' + n + '　' + c.cap;
    tvOsd.textContent = 'CH ' + n;
    tvOsd.classList.remove('hide');
    clearTimeout(osdTimer);
    osdTimer = setTimeout(function () { tvOsd.classList.add('hide'); }, 2000);
    each('.tv-ch [data-ch]', function (b) {
      b.setAttribute('aria-pressed', b.dataset.ch == n ? 'true' : 'false');
    });
  }

  each('.tv-ch [data-ch]', function (b) {
    b.addEventListener('click', function () { setChannel(parseInt(b.dataset.ch, 10)); });
  });
  tvSound.addEventListener('click', function () {
    var on = tvSound.getAttribute('aria-pressed') !== 'true';
    tvSound.setAttribute('aria-pressed', on ? 'true' : 'false');
    tvVideo.muted = !on;
  });

  // 電視雪花：轉台的瞬間，以及外面的頻道
  var snowLast = 0;
  (function snowLoop(t) {
    requestAnimationFrame(snowLoop);
    if (t - snowLast < 66) return; // 約 15fps
    snowLast = t;
    var bursting = t < burstUntil;
    var showSnow = bursting || CHANNELS[curCh].outside;
    tvSnow.hidden = !showSnow;
    if (!showSnow) return;
    if (!reduced || bursting || !tvSnow.dataset.drawn) { drawSnow(snowCtx, 160, 90, 255); tvSnow.dataset.drawn = '1'; }
    if (CHANNELS[curCh].outside && !obedient) {
      // 外面的畫面：理智值越低越清楚（兩次閃之間至少 0.4 秒）
      var o = collapsed ? 0.5 : 0.04 + 0.12 * sanity;
      if (t - lastOutFlash > 400 && rand() < 0.05 + 0.2 * sanity) {
        lastOutFlash = t;
        tvOutImg.src = OUTSIDE_IMGS[Math.floor(rand() * OUTSIDE_IMGS.length)]; // 每閃一次換一個地方
      }
      if (t - lastOutFlash < 160) o = collapsed ? 0.9 : 0.25 + 0.6 * sanity;
      tvOut.style.opacity = o.toFixed(2);
    }
  })(0);

  setChannel(1);

  /* ---------- 外面：是／否 ---------- */
  var outDlg = $('out');
  tvHit.addEventListener('click', function () {
    if (CHANNELS[curCh].outside && !obedient) openDlg(outDlg);
  });
  $('out-no').addEventListener('click', function () {
    closeDlg(outDlg);
    restoreOrder();
    setChannel(1);
    tvTicker.textContent = '感謝您的配合。願你一生，都還可以更好。';
  });
  $('out-yes').addEventListener('click', function () {
    closeDlg(outDlg);
    enterTV();
  });

  // 選「是」：鑽進電視 → 轉台 → 雜訊 → 跳到外面（外面那頁接著鎖定訊號）
  //   0–0.6s 鏡頭推進螢幕｜0.6–0.8s 黑＋CH 06｜0.8–2.3s 雜訊、亮帶往上滾、偷閃兩下外面
  function enterTV() {
    var page = document.querySelector('.page');
    var r = tvScreen.getBoundingClientRect();
    var pr = page.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var vw = window.innerWidth, vh = window.innerHeight;
    var s = Math.max(vw / r.width, vh / r.height) * 1.15;
    var dest = 'outside/';
    var tune = $('tune'), tn = $('tune-noise'), tctx = tn.getContext('2d');
    try { sessionStorage.setItem('lian_tv', String(Date.now())); } catch (e) {}
    function go() { location.href = dest; }
    if (reduced) {
      tune.hidden = false;
      setTimeout(go, 400);
      return;
    }
    var sfx = tvSfx();
    if (sfx) sfx.click();
    tvSound.setAttribute('aria-pressed', 'false');
    tvVideo.muted = true;
    burstUntil = performance.now() + 3000;
    document.body.classList.add('entering');
    page.style.transformOrigin = (cx - pr.left) + 'px ' + (cy - pr.top) + 'px';
    page.classList.add('zoom');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        page.style.transform = 'translate(' + (vw / 2 - cx) + 'px,' + (vh / 2 - cy) + 'px) scale(' + s + ')';
        page.style.filter = 'brightness(1.3)';
      });
    });
    setTimeout(function () { tune.hidden = false; }, 600);
    setTimeout(function () {
      tune.classList.add('noisy');
      drawSnow(tctx, 200, 120, 255);
      setInterval(function () { drawSnow(tctx, 200, 120, 255); }, 50);
      if (sfx) sfx.noise();
    }, 800);
    // 雜訊裡偷閃外面（兩次，間隔超過 0.5 秒）
    [1350, 1950].forEach(function (t) {
      setTimeout(function () { tune.querySelector('.tune-peek').classList.add('on'); }, t);
      setTimeout(function () { tune.querySelector('.tune-peek').classList.remove('on'); }, t + 90);
    });
    setTimeout(go, 2300);
  }

  // 遙控器的「喀」＋電視雜訊（按「是」的那一下就是使用者手勢，可以出聲）
  function tvSfx() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    var ac;
    try { ac = new AC(); } catch (e) { return null; }
    var sr = ac.sampleRate;
    function burst(sec, decay) {
      var b = ac.createBuffer(1, Math.floor(sr * sec), sr), d = b.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (decay ? Math.pow(1 - i / d.length, 3) : 1);
      return b;
    }
    return {
      click: function () {
        var src = ac.createBufferSource(), g = ac.createGain(), hp = ac.createBiquadFilter();
        src.buffer = burst(0.03, true);
        hp.type = 'highpass'; hp.frequency.value = 1800;
        g.gain.value = 0.5;
        src.connect(hp); hp.connect(g); g.connect(ac.destination);
        src.start();
      },
      noise: function () {
        var src = ac.createBufferSource(), g = ac.createGain(), bp = ac.createBiquadFilter();
        src.buffer = burst(1, false); src.loop = true;
        bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 0.4;
        g.gain.setValueAtTime(0, ac.currentTime);
        g.gain.linearRampToValueAtTime(0.16, ac.currentTime + 0.08);
        src.connect(bp); bp.connect(g); g.connect(ac.destination);
        src.start();
      }
    };
  }

  /* =========================================================
     找異常
     ========================================================= */
  var ANOMALIES = {
    happy: {
      target: '#happy',
      on: function () { $('happy').innerHTML = '12.3<small>%</small>'; },
      off: function () { $('happy').innerHTML = '99.8<small>%</small>'; }
    },
    patrol: {
      target: '.patrol, .patrol-box',
      on: function () { each('.patrol', function (el) { el.textContent = '七樓四號'; }); },
      off: function () { each('.patrol', function (el) { el.textContent = '七樓三號'; }); }
    },
    quote: {
      target: '#quote',
      on: function () { $('quote').textContent = '你這樣就很好了。'; },
      off: function () { $('quote').textContent = '休息，是給輸的人的。'; }
    },
    marquee: {
      target: '.mq-track',
      on: function () { mqText.classList.add('reverse'); },
      off: function () { mqText.classList.remove('reverse'); }
    },
    badge: {
      target: '.badge',
      on: function () { document.querySelector('.badge').classList.add('anom'); $('badge-text').textContent = '本站有失敗成員'; },
      off: function () { document.querySelector('.badge').classList.remove('anom'); $('badge-text').textContent = '本站無失敗成員'; }
    },
    award: {
      target: '#news-award',
      on: function () { $('news-award').innerHTML = '年度國民楷模頒獎典禮　即日起受理<b>檢舉</b>'; },
      off: function () { $('news-award').textContent = '年度國民楷模頒獎典禮　即日起受理推薦'; }
    },
    bow: {
      // 電視 CH1：鞠躬的人抬起頭看著你（只在 CH1 點得到）
      target: '#tv-screen',
      when: function () { return curCh === 1; },
      on: function () { CHANNELS[1].still = 'img/tv_model_lookup.jpg'; if (curCh === 1) tvStill.src = CHANNELS[1].still; },
      off: function () { CHANNELS[1].still = 'img/tv_model_bow.jpg'; if (curCh === 1) tvStill.src = CHANNELS[1].still; }
    },
    counter: {
      target: '#digits',
      on: function () { digits.textContent = '0000000'; },
      off: function () { digits.textContent = pad(baseCount); }
    }
  };
  var ANOM_IDS = Object.keys(ANOMALIES);
  var active = {}, fixedSet = {};
  $('fix-total').textContent = ANOM_IDS.length;

  function fixedCount() { return Object.keys(fixedSet).length; }
  function updateSysbox() {
    $('fix-n').textContent = fixedCount();
  }
  function spawnAnomaly() {
    // 正在「閃一下」的地方先不放異常，不然閃完會把異常蓋掉
    var free = ANOM_IDS.filter(function (id) {
      var el = document.querySelector(ANOMALIES[id].target);
      if (ANOMALIES[id].when && !ANOMALIES[id].when()) return false;
      return !active[id] && !(el && el.dataset.busy);
    });
    if (!free.length) return;
    var id = pick(free);
    active[id] = true;
    ANOMALIES[id].on();
    glitchOnce(document.querySelector(ANOMALIES[id].target));
    $('sysbox').hidden = false;
  }
  function fixAnomaly(id, el) {
    active[id] = false;
    ANOMALIES[id].off();
    fixedSet[id] = true;
    elapsed = Math.max(0, elapsed - 25); // 糾正一個，理智值往回拉
    updateSysbox();
    var box = el.closest('.box') || el;
    box.classList.remove('fixed-pop'); void box.offsetWidth; box.classList.add('fixed-pop');
    if (fixedCount() === ANOM_IDS.length) obey();
  }
  // 在捕捉階段攔下點擊：點到異常＝糾正，不觸發原本的連結或暫停
  document.addEventListener('click', function (e) {
    for (var i = 0; i < ANOM_IDS.length; i++) {
      var id = ANOM_IDS[i];
      if (!active[id]) continue;
      if (ANOMALIES[id].when && !ANOMALIES[id].when()) continue;
      var hit = e.target.closest && e.target.closest(ANOMALIES[id].target);
      if (hit) {
        e.preventDefault();
        e.stopPropagation();
        fixAnomaly(id, hit);
        return;
      }
    }
  }, true);

  // 全部糾正：網站恢復完美（乾淨得讓人不舒服）
  function obey() {
    obedient = true;
    restoreOrder();
    document.body.classList.add('obedient');
    each('.new-tag', function (el) { el.style.animation = 'none'; });
    if (!curfew) mqText.innerHTML = new Array(6).join('★ 一切正常 ★　　');
    document.querySelector('.sysbox .note').innerHTML = '所有異常皆已修正。<br>感謝您的配合。';
    if (CHANNELS[curCh].outside) setChannel(1);
    setTimeout(function () {
      showNotice('系統公告', '<p>所有異常皆已修正。</p><p>感謝您的配合。</p><p>願你一生，都還可以更好。</p>');
    }, 400);
  }

  /* =========================================================
     理智值與崩壞
     ========================================================= */
  var elapsed = 0;              // 已停留的秒數（分頁在背景時不算）
  var secondVisitDone = false;
  var noise = $('noise'), noiseCtx = noise.getContext('2d');
  var watch = $('watch');
  var greet = $('greeting');

  // 選「否」或全部糾正：一切恢復原狀
  function restoreOrder() {
    elapsed = 0;
    sanity = 0;
    collapsed = false;
    ANOM_IDS.forEach(function (id) { if (active[id]) { active[id] = false; ANOMALIES[id].off(); } });
    $('happy-note').textContent = '本月統計｜連續二十年第一';
    document.body.classList.remove('faded');
    secondVisitDone = false;
    watch.classList.remove('on');
    noise.style.opacity = 0;
  }

  // 小事件：一閃就恢復（不碰正在異常的地方）
  var minorEvents = [
    function () { if (!active.happy) flash($('happy'), '99.7<small>%</small>', 180); },
    function () {
      if (active.counter) return;
      var n = 0, t = setInterval(function () {
        digits.textContent = pad(Math.floor(rand() * 9999999));
        if (++n > 5) { clearInterval(t); digits.textContent = active.counter ? '0000000' : pad(baseCount); }
      }, 70);
    },
    function () { if (!active.quote) flash($('quote'), '停下來也沒關係。', 400); }
  ];

  // 區塊位移
  function shiftBlocks() {
    if (reduced) return;
    var boxes = document.querySelectorAll('.cols .box');
    var n = 1 + Math.floor(rand() * (1 + sanity * 3));
    for (var i = 0; i < n; i++) {
      (function (b) {
        var dx = (rand() - .5) * (16 + 40 * sanity), dy = (rand() - .5) * (6 + 14 * sanity);
        b.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
        setTimeout(function () { b.style.transform = ''; }, 120 + rand() * 260);
      })(pick(boxes));
    }
  }

  // 整頁扭曲
  var warpD = $('warp-d'), warpT = $('warp-t');
  var warping = false;
  function warpPage() {
    if (reduced || warping) return;
    var page = document.querySelector('.page');
    var peak = 18 + 40 * sanity, dur = 500 + rand() * 500, t0 = performance.now();
    warping = true;
    warpT.setAttribute('seed', String(Math.floor(rand() * 100)));
    page.classList.add('warping');
    (function step(t) {
      var k = (t - t0) / dur;
      if (k >= 1) { warpD.setAttribute('scale', '0'); page.classList.remove('warping'); warping = false; return; }
      warpD.setAttribute('scale', (Math.sin(k * Math.PI) * peak).toFixed(1));
      requestAnimationFrame(step);
    })(t0);
  }

  // 整頁雜訊
  var noiseLast = 0;
  (function noiseLoop(t) {
    requestAnimationFrame(noiseLoop);
    var level = (obedient || sanity < 0.3) ? 0 : 0.06 + 0.3 * (sanity - 0.3) / 0.7;
    noise.style.opacity = level.toFixed(3);
    if (level === 0 || t - noiseLast < 83) return; // 約 12fps
    if (reduced && noise.dataset.drawn) return;
    noiseLast = t;
    drawSnow(noiseCtx, 200, 120, 200);
    noise.dataset.drawn = '1';
  })(0);

  /* ---------- 發呆：一分鐘沒動 → 公告；第二次造訪還會浮出貓眼 ---------- */
  var idleSecs = 0;
  function wake() {
    idleSecs = 0;
    watch.classList.remove('on');
  }
  ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'].forEach(function (ev) {
    window.addEventListener(ev, wake, { passive: true });
  });

  function tick() {
    if (document.hidden || !$('cw').hidden) return;
    idleSecs += 0.5 * speed;
    if (idleSecs >= 60 && !sget('sessionStorage', 'lian_idle')) {
      if (showNotice('系統公告', '<p>偵測到您正在休息。</p><p>休息，是給輸的人的。</p>')) sset('sessionStorage', 'lian_idle', '1');
    }
    if (secondVisitDone && idleSecs >= 12 && !obedient) watch.classList.add('on');

    if (obedient) return;
    elapsed += 0.5 * speed;
    sanity = clamp((elapsed - 20) / 120, 0, 1);

    if (sanity > 0) {
      if (rand() < 0.05 + 0.2 * sanity) pick(minorEvents)();
      if (rand() < 0.03 + 0.12 * sanity) spawnAnomaly();
    }
    if (sanity >= 0.3) {
      $('happy-note').textContent = '本月統計（已修正）';
      if (rand() < 0.05 + 0.2 * sanity) shiftBlocks();
      if (rand() < 0.03 + 0.08 * sanity) flash(greet, '你還可以更好。', 700, 'wrong');
    }
    if (sanity >= 0.6) {
      if (rand() < 0.02 + 0.08 * sanity) warpPage();
    }
    // 放著不管：壞到底，電視自己轉到外面
    if (sanity >= 1 && !collapsed) {
      collapsed = true;
      if (!CHANNELS[curCh].outside) setChannel(6);
    }

    if (visits >= 2 && !secondVisitDone && elapsed >= 30) {
      secondVisitDone = true;
      document.body.classList.add('faded');
      if (override > 0 || !sget('sessionStorage', 'lian_sys')) {
        $('sys-n').textContent = visits;
        if (!anyDlgOpen()) { openDlg($('sys')); sset('sessionStorage', 'lian_sys', '1'); }
      }
    }
  }
  setInterval(tick, 500);

  each('.sys-ok', function (b) {
    b.addEventListener('click', function () { closeDlg($('sys')); });
  });

  /* =========================================================
     首長信箱
     ========================================================= */
  // 敏感字（2026-11-14 和作者討論後的版本）：盡量用詞，避免誤傷；爸、媽刻意保留單字
  var CENSOR = [
    // 叔叔的話：黎安國最危險的一句
    '這樣就很好', '這樣就好', '夠好了', '沒關係',
    // 累、痛、怕
    '好累', '很累', '太累', '累了', '疲累', '好痛', '很痛', '痛苦', '好怕', '很怕', '害怕',
    '想哭', '哭了', '難過', '討厭',
    // 想停下來
    '休息', '放棄', '不想', '夠了', '不要再',
    // 求救、逃
    '救命', '救救', '逃走', '逃跑', '逃離', '自由',
    // 禁忌
    '外面', '失敗', '電擊', '診療所',
    // 家人
    '爸爸', '媽媽', '爸', '媽',
    'help', 'tired', 'outside'
  ];
  // 求救字眼：偵測到就停止演出，改成真實的求助資訊
  var CRISIS = /想死|去死|自殺|不想活|活不下去|活著好累|結束生命|輕生|割腕|跳樓|尋死|想消失|不想醒來|kill myself|suicide|want to die/i;
  var censorRe = new RegExp(CENSOR.map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|'), 'gi');
  function censor(text) {
    var n = 0;
    var html = esc(text).replace(censorRe, function (m) {
      n++;
      return '<span class="cens">' + new Array(m.length + 1).join('■') + '</span>';
    });
    return { html: html, n: n };
  }
  var mail = $('mail'), mailForm = $('mail-form'), mailReply = $('mail-reply');
  each('.mail-link', function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      if (anyDlgOpen()) return;
      mailForm.hidden = false;
      mailReply.hidden = true;
      mailForm.reset();
      $('mail-title').textContent = '首長信箱';
      openDlg(mail);
    });
  });
  $('mail-cancel').addEventListener('click', function () { closeDlg(mail); });
  $('mail-close').addEventListener('click', function () { closeDlg(mail); });
  mailForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = mailForm.elements;
    var paper = $('mail-paper');
    if (CRISIS.test(f.subject.value + ' ' + f.body.value)) {
      paper.classList.add('real');
      $('mail-title').textContent = '網站暫停演出';
      paper.innerHTML =
        '<p><b>謝謝你願意把這些話寫下來。</b></p>' +
        '<p>這封信沒有寄出，也沒有任何人看到；它只留在你的瀏覽器裡。</p>' +
        '<p>如果你現在真的很難受，請找人說說話：</p>' +
        '<ul><li>安心專線 <b>1925</b>（24 小時，免付費）</li>' +
        '<li>生命線 <b>1995</b></li>' +
        '<li>張老師 <b>1980</b></li></ul>' +
        '<p>如果有立即的危險，請撥 <b>119</b> 或 <b>110</b>。</p>' +
        '<p>你不需要變得更好。現在這樣的你，就值得被好好對待。</p>' +
        '<p class="sign">——《別人家的孩子》開發者</p>';
      mailForm.hidden = true;
      mailReply.hidden = false;
      $('mail-close').focus();
      return;
    }
    paper.classList.remove('real');
    $('mail-title').textContent = '首長信箱';
    var subj = censor(f.subject.value), body = censor(f.body.value);
    var n = subj.n + body.n;
    var date = now.getFullYear() + ' 年 ' + (now.getMonth() + 1) + ' 月 ' + now.getDate() + ' 日';
    var html =
      '親愛的國民　' + esc(f.name.value) + '　您好：\n\n' +
      '　　您於 ' + date + ' 來信（主旨：「' + subj.html + '」）已收悉。來信內容如下：\n\n' +
      '「' + body.html + '」\n\n' +
      (n === 0
        ? '　　感謝您的寶貴意見。本部將持續努力，讓黎安國還可以更好。\n\n'
        : '　　來信含有不當字詞 ' + n + ' 處，已依《國民網路使用規範》遮蔽。\n' +
          (n >= 3 ? '　　本部已將來信副本轉知您的家長與學校，請放心。\n' : '') + '\n') +
      '　　願你一生，都還可以更好。\n\n' +
      '　　　　　　　　黎安國 國民生活部　首長信箱　敬覆';
    $('mail-paper').innerHTML = html;
    mailForm.hidden = true;
    mailReply.hidden = false;
    $('mail-close').focus();
  });

  /* =========================================================
     右鍵：第一次跳警告，之後放行
     ========================================================= */
  document.addEventListener('contextmenu', function (e) {
    if (sget('sessionStorage', 'lian_rc')) return;
    e.preventDefault();
    if (showNotice('警告', '<p>本站內容禁止私自保存。</p><p>違者依《國民網路使用規範》處理。</p>')) {
      sset('sessionStorage', 'lian_rc', '1');
    }
  });

  // 從子頁面點「首長信箱」過來（index.html#mail）
  function openMailFromHash() {
    if (location.hash === '#mail' && !anyDlgOpen()) { var l = document.querySelector('.mail-link'); if (l) l.click(); }
  }
  // 相關連結：選了就跳頁
  var rel = $('rel');
  if (rel) rel.addEventListener('change', function () { if (rel.value && /\.html$/.test(rel.value)) location.href = rel.value; });

  /* ---------- 內容警告 ---------- */
  var cw = $('cw');
  if (!sget('localStorage', 'lian_cw') && !params.has('shot')) { // ?shot：截圖用，不跳內容警告
    openDlg(cw);
    $('cw-ok').addEventListener('click', function () {
      sset('localStorage', 'lian_cw', '1');
      closeDlg(cw);
      openMailFromHash();
    });
    $('cw-leave').addEventListener('click', function () {
      if (history.length > 1) history.back(); else location.href = 'about:blank';
    });
  } else {
    openMailFromHash();
  }
})();
