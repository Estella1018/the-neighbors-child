/* 外面：倒數片頭＋日誌隧道＋索引＋放映
   - 倒數片頭：5→2，同一個分頁第二次進來就不再播
   - 隧道：每篇日誌是一張幻燈片，浮在黑暗裡；往下捲＝鏡頭往前穿過
   - 索引：右上角切換成整卷底片，可以快速跳到某一篇
   - 放映：點一格，放大成銀幕，下面展開日誌
   - 從黎安國的電視鑽進來：接續雜訊、鎖定訊號；停留時偶爾訊號不穩
   - 外面的聲音：風、街道、鳥叫，預設關，用 Web Audio 現場合成（不用音檔） */
(function () {
  'use strict';
  var LOGS = window.LOGS || [];
  var $ = function (id) { return document.getElementById(id); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pad3 = function (n) { return ('00' + n).slice(-3); };
  var dot = function (d) { return d.replace(/-/g, '.'); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var body = document.body;
  var deep = /^#log-(\d+)$/.exec(location.hash);
  var fromTV = document.documentElement.classList.contains('from-tv');

  /* =========================================================
     倒數片頭
     ========================================================= */
  var cd = $('countdown');
  var seen = false;
  try { seen = !!sessionStorage.getItem('out_cd'); } catch (e) {}
  function start() {
    if (body.classList.contains('started')) return;
    clearInterval(cdTimer);
    cd.classList.add('done');
    setTimeout(function () { cd.hidden = true; }, 500);
    body.classList.remove('counting');
    body.classList.add('started');
    try { sessionStorage.setItem('out_cd', '1'); } catch (e) {}
    if (deep) setTimeout(openDeep, 0);  // 等下面的隧道排好
    scheduleGlitch();
  }
  var cdTimer;
  if (fromTV) {
    cd.hidden = true;
    setTimeout(function () { tuneIn(start); }, 0);   // 從電視來：接續雜訊、鎖定訊號
  } else if (seen || reduced || deep) {
    cd.hidden = true;
    start();
  } else {
    var nums = [5, 4, 3, 2], k = 0, t0 = Date.now(), STEP = 750;
    cdTimer = setInterval(function () {
      var t = Date.now() - t0 - 500;          // 先等白光淡掉
      if (t < 0) return;
      var idx = Math.floor(t / STEP);
      if (idx >= nums.length) { start(); return; }
      if (idx !== k) { k = idx; $('cd-n').textContent = nums[idx]; }
      $('cd-sweep').style.setProperty('--a', ((t % STEP) / STEP * 360).toFixed(1) + 'deg');
    }, 30);
    $('cd-skip').addEventListener('click', start);
    cd.addEventListener('click', start);
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') { start(); document.removeEventListener('keydown', onKey); }
    });
  }

  /* =========================================================
     隧道：排出幻燈片和卷頭字卡
     ========================================================= */
  var tunnel = $('tunnel'), space = $('space');
  var GAP = 850;           // 兩張之間的深度
  var FOCUS = 220;         // 對焦時離鏡頭多遠
  var K = 0.75;            // 捲動 1px＝往前多少深度的倒數
  var items = [], slides = [];
  var z = -GAP * 0.55, lastReel = null, reelNo = 0;

  LOGS.forEach(function (log, i) {
    if (log.reel !== lastReel) {
      lastReel = log.reel; reelNo++;
      var card = document.createElement('div');
      card.className = 'card';
      card.setAttribute('aria-hidden', 'true');
      card.innerHTML = '<span class="k-no">REEL ' + pad3(reelNo) + '</span><span class="k-name"></span>';
      card.querySelector('.k-name').textContent = log.reel;
      space.appendChild(card);
      items.push({ el: card, z: z, x: 0, y: 0, ry: 0, kind: 'card' });
      z -= GAP * 0.8;
    }
    var side = slides.length % 2 ? 1 : -1;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'slide';
    b.setAttribute('aria-label', '第 ' + (i + 1) + ' 格：' + log.title + '（' + log.date + '），展開日誌');
    b.innerHTML =
      '<span class="mount"><span class="lbl-t"><span>FRAME ' + pad3(i + 1) + '</span><span>' + dot(log.date) + '</span></span>' +
      '<img alt="" decoding="async"><span class="lbl-b"><span class="lb-title"></span><span>' + reelNo + '</span></span></span>' +
      '<span class="caption"><span class="c-date">' + dot(log.date) + '　/　FRAME ' + pad3(i + 1) + '</span><span class="c-title"></span><span class="c-open">點一下展開 ＋</span></span>';
    b.querySelector('img').src = log.img;
    b.querySelector('.lb-title').textContent = log.title;
    b.querySelector('.c-title').textContent = log.title;
    b.addEventListener('click', function () { openLog(i, 'tunnel'); });
    space.appendChild(b);
    var it = { el: b, z: z, side: side, i: i, kind: 'slide', jit: ((i * 37) % 5) - 2 };
    items.push(it);
    slides.push(it);
    z -= GAP;
  });
  var DEPTH = -slides[slides.length - 1].z - FOCUS;   // 鏡頭最遠走到哪裡

  var cam = 0, camTarget = 0, vw = 0, vh = 0, focusIdx = -1;
  function layout() {
    vw = window.innerWidth; vh = window.innerHeight;
    var spread = vw < 760 ? vw * 0.07 : Math.min(vw * 0.27, 480);
    items.forEach(function (it) { if (it.kind === 'card') it.y = -vh * 0.2; });
    slides.forEach(function (s) {
      s.x = s.side * spread;
      s.y = s.jit * vh * 0.035;
      s.ry = s.side * -7;
    });
    tunnel.style.height = (vh + DEPTH * K + vh * 0.5) + 'px';
    readScroll();
    cam = camTarget;
  }
  function readScroll() {
    camTarget = clamp((window.scrollY - tunnel.offsetTop) / K, 0, DEPTH);
    var inT = window.scrollY > tunnel.offsetTop - vh * 0.5 && window.scrollY < tunnel.offsetTop + tunnel.offsetHeight - vh * 0.6;
    body.classList.toggle('in-tunnel', inT);
  }
  function render() {
    var best = -1, bestD = Infinity;
    items.forEach(function (it) {
      var rz = it.z + cam;
      var o = clamp((rz + 7000) / 4200, 0, 1);              // 遠處：霧裡慢慢浮出來
      if (rz > -FOCUS) o *= clamp(1 - (rz + FOCUS) / 520, 0, 1); // 穿過去：淡掉
      if (it.kind === 'card') o *= clamp((rz + 1900) / 900, 0, 1);  // 卷頭字卡：靠近了才出現，不擋後面的格子
      var el = it.el;
      if (o <= 0.01 || rz > 400) {
        if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden';
        return;
      }
      el.style.visibility = '';
      el.style.opacity = o.toFixed(3);
      el.style.transform = 'translate3d(' + (it.x || 0).toFixed(1) + 'px,' + (it.y || 0).toFixed(1) + 'px,' + rz.toFixed(1) + 'px) rotateY(' + (it.ry || 0) + 'deg)';
      if (it.kind === 'slide') {
        el.tabIndex = o > 0.35 ? 0 : -1;
        var d = Math.abs(rz + FOCUS);
        if (d < bestD) { bestD = d; best = it.i; }
      }
    });
    if (bestD > GAP * 0.45) best = -1;
    if (best !== focusIdx) {
      if (focusIdx >= 0) slides[focusIdx].el.classList.remove('focus');
      focusIdx = best;
      if (best >= 0) {
        slides[best].el.classList.add('focus');
        $('hud-frame').textContent = 'FRAME ' + pad3(best + 1) + ' / ' + pad3(slides.length);
      }
    }
  }
  (function loop() {
    requestAnimationFrame(loop);
    var dz = camTarget - cam;
    cam = (reduced || Math.abs(dz) < 0.5) ? camTarget : cam + dz * 0.1;
    render();
  })();
  window.addEventListener('scroll', function () { readScroll(); revealText(); }, { passive: true });
  window.addEventListener('resize', layout);
  window.addEventListener('load', layout);
  layout();

  // 把第 i 篇送到對焦的位置
  function jumpTo(i) {
    var c = clamp(-slides[i].z - FOCUS, 0, DEPTH);
    window.scrollTo(0, tunnel.offsetTop + c * K);
    camTarget = cam = c;
    render();
  }

  /* =========================================================
     索引：整卷底片
     ========================================================= */
  var index = $('index'), strip = $('strip'), frames = [];
  lastReel = null; reelNo = 0;
  LOGS.forEach(function (log, i) {
    if (log.reel !== lastReel) {
      lastReel = log.reel; reelNo++;
      var ld = document.createElement('div');
      ld.className = 'leader';
      ld.setAttribute('aria-hidden', 'true');
      ld.innerHTML = '<div class="ring">' + reelNo + '</div><p></p>';
      ld.querySelector('p').textContent = log.reel;
      strip.appendChild(ld);
    }
    var f = document.createElement('button');
    f.type = 'button';
    f.className = 'frame';
    f.setAttribute('aria-label', '第 ' + (i + 1) + ' 格：' + log.title + '（' + log.date + '）');
    f.innerHTML = '<span class="edge"></span><img alt="" decoding="async"><span class="cap"></span>';
    f.querySelector('.edge').textContent = '▸ ' + pad3(i + 1) + '　' + dot(log.date);
    f.querySelector('img').src = log.img;
    f.querySelector('.cap').textContent = log.title;
    f.addEventListener('click', function () { openLog(i, 'index'); });
    strip.appendChild(f);
    frames.push(f);
  });
  function centerStrip(i) {
    var f = frames[i];
    strip.scrollLeft = f.offsetLeft + f.offsetWidth / 2 - strip.clientWidth / 2;
  }
  function openIndex() {
    index.hidden = false;
    body.classList.add('locked');
    centerStrip(focusIdx >= 0 ? focusIdx : 0);
    requestAnimationFrame(function () { index.classList.add('open'); });
    (frames[focusIdx >= 0 ? focusIdx : 0]).focus({ preventScroll: true });
  }
  function closeIndex() {
    index.classList.remove('open');
    setTimeout(function () { index.hidden = true; }, reduced ? 0 : 400);
    body.classList.remove('locked');
    $('index-btn').focus({ preventScroll: true });
  }
  $('index-btn').addEventListener('click', openIndex);
  $('index-close').addEventListener('click', closeIndex);
  // 滑鼠滾輪在索引裡＝左右送片
  strip.addEventListener('wheel', function (e) {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { strip.scrollLeft += e.deltaY; e.preventDefault(); }
  }, { passive: false });

  /* =========================================================
     放映
     ========================================================= */
  var viewer = $('viewer'), vScroll = $('v-scroll'), vImg = $('v-img');
  var curLog = -1, from = 'tunnel', busy = false;

  function srcImg(i) {
    return from === 'index' ? frames[i].querySelector('img') : slides[i].el.querySelector('img');
  }
  function fill(i) {
    var log = LOGS[i];
    $('v-no').textContent = 'FRAME ' + pad3(i + 1);
    $('v-date').textContent = dot(log.date);
    $('v-reel').textContent = log.reel;
    $('v-title').textContent = log.title;
    var vb = $('v-body');
    vb.textContent = '';
    (log.body || []).forEach(function (blk) {
      if (typeof blk === 'string') {
        var p = document.createElement('p');
        p.textContent = blk;
        vb.appendChild(p);
      } else if (blk && blk.img) {
        var fig = document.createElement('figure');
        var im = document.createElement('img');
        im.src = blk.img; im.alt = blk.cap || ''; im.loading = 'lazy';
        fig.appendChild(im);
        if (blk.cap) {
          var cap = document.createElement('figcaption');
          cap.textContent = blk.cap;
          fig.appendChild(cap);
        }
        vb.appendChild(fig);
      }
    });
    vImg.src = log.img;
    vImg.alt = log.title;
    $('v-prev').disabled = i === 0;
    $('v-next').disabled = i === LOGS.length - 1;
    try { history.replaceState(null, '', '#log-' + pad3(i + 1)); } catch (e) {}
  }
  function flip(rect, toFrame) {
    // FLIP：圖從 rect 的位置放大到銀幕（或反過來）
    var cur = vImg.getBoundingClientRect();
    if (!cur.width || !rect.width) return false;
    var tf = 'translate(' + (rect.left - cur.left) + 'px,' + (rect.top - cur.top) + 'px) scale(' + (rect.width / cur.width) + ',' + (rect.height / cur.height) + ')';
    if (toFrame) {
      vImg.style.transition = 'transform .6s cubic-bezier(.2,.7,.1,1)';
      vImg.style.transform = tf;
    } else {
      vImg.style.transition = 'none';
      vImg.style.transform = tf;
      void vImg.offsetWidth;
      vImg.style.transition = 'transform .75s cubic-bezier(.2,.7,.1,1)';
      vImg.style.transform = 'none';
    }
    return true;
  }
  function onScreen(r) { return r.width > 0 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw; }

  function openLog(i, where) {
    if (busy) return;
    busy = true;
    from = where;
    curLog = i;
    var s = srcImg(i);
    var rect = s.getBoundingClientRect();
    fill(i);
    viewer.hidden = false;
    body.classList.add('locked');
    vScroll.scrollTop = 0;
    var go = function () {
      if (!reduced && onScreen(rect)) flip(rect, false);
      s.style.visibility = 'hidden';
      requestAnimationFrame(function () { viewer.classList.add('open'); });
      $('v-close').focus({ preventScroll: true });
      setTimeout(function () { busy = false; }, 500);
    };
    if (vImg.decode) vImg.decode().then(go, go); else go();
  }
  function closeLog() {
    if (busy || curLog < 0) return;
    busy = true;
    var i = curLog;
    vScroll.scrollTop = 0;
    if (from === 'index') centerStrip(i); else jumpTo(i);
    var s = srcImg(i);
    viewer.classList.remove('open');
    var r = s.getBoundingClientRect();
    if (!reduced && onScreen(r)) flip(r, true);
    else vImg.style.opacity = '0';
    setTimeout(function () {
      viewer.hidden = true;
      vImg.style.transition = 'none';
      vImg.style.transform = '';
      vImg.style.opacity = '';
      s.style.visibility = '';
      if (from !== 'index') body.classList.remove('locked');
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
      (from === 'index' ? frames[i] : slides[i].el).focus({ preventScroll: true });
      curLog = -1;
      busy = false;
    }, reduced ? 0 : 600);
  }
  function step(dir) {
    var n = curLog + dir;
    if (busy || n < 0 || n >= LOGS.length) return;
    busy = true;
    srcImg(curLog).style.visibility = '';
    vScroll.style.opacity = '0';
    setTimeout(function () {
      curLog = n;
      fill(n);
      if (from === 'index') centerStrip(n); else jumpTo(n);
      srcImg(n).style.visibility = 'hidden';
      vScroll.scrollTop = 0;
      vScroll.style.opacity = '1';
      setTimeout(function () { busy = false; }, 250);
    }, reduced ? 0 : 250);
  }
  $('v-close').addEventListener('click', closeLog);
  $('v-prev').addEventListener('click', function () { step(-1); });
  $('v-next').addEventListener('click', function () { step(1); });
  $('v-screen').addEventListener('click', function (e) { if (e.target === this) closeLog(); });

  function trapTab(e, box) {
    var f = box.querySelectorAll('button:not([disabled]), a[href]');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  document.addEventListener('keydown', function (e) {
    if (!viewer.hidden) {
      if (e.key === 'Escape') closeLog();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'Tab') trapTab(e, viewer);
    } else if (!index.hidden) {
      if (e.key === 'Escape') closeIndex();
      else if (e.key === 'Tab') trapTab(e, index);
    }
  });

  // 網址帶 #log-003：直接打開那一篇（可以分享單篇日誌）
  function openDeep() {
    var idx = parseInt(deep[1], 10) - 1;
    if (!LOGS[idx]) return;
    var run = function () {
      layout();
      jumpTo(idx);
      setTimeout(function () { openLog(idx, 'tunnel'); }, reduced ? 0 : 700);
    };
    if (document.readyState === 'complete') run(); else window.addEventListener('load', run);
  }

  /* =========================================================
     收訊：從電視進來時鎖定訊號；停留時偶爾不穩
     ========================================================= */
  var signal = $('signal'), sigCtx = $('sig-noise').getContext('2d'), sigTimer = null;
  function drawNoise() {
    var img = sigCtx.createImageData(200, 120), d = img.data;
    for (var i = 0; i < d.length; i += 4) {
      var v = Math.random() * 255;
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
    // 幾條橫向撕裂：整列變亮
    for (var k = 0; k < 3; k++) {
      var y = Math.floor(Math.random() * 120), h = 1 + Math.floor(Math.random() * 6);
      for (var yy = y; yy < Math.min(120, y + h); yy++) for (var x = 0; x < 200; x++) {
        var p = (yy * 200 + x) * 4; d[p] = d[p + 1] = d[p + 2] = Math.min(255, d[p] + 90);
      }
    }
    sigCtx.putImageData(img, 0, 0);
  }
  function noiseOn() { drawNoise(); if (!sigTimer) sigTimer = setInterval(drawNoise, 50); }
  function noiseOff() { clearInterval(sigTimer); sigTimer = null; }
  function residue() {
    var r = $('residue');
    r.classList.add('on');
    void r.offsetWidth;
    setTimeout(function () { r.classList.remove('on'); }, 60);
  }

  // 鎖定訊號：雜訊斷斷續續退掉（大的下降之間只小幅回彈，不做高對比的閃爍），畫面撕裂後穩定
  function tuneIn(done) {
    if (reduced) {
      signal.style.opacity = '0';
      document.documentElement.classList.remove('from-tv');
      done();
      return;
    }
    noiseOn();
    body.classList.add('tearing');
    tvAudioIn();
    var steps = [[0, 1], [160, .82], [300, .9], [440, .58], [580, .66], [740, .34], [880, .4], [1040, .14], [1180, 0]];
    steps.forEach(function (st) {
      setTimeout(function () { signal.style.opacity = String(st[1]); }, st[0]);
    });
    setTimeout(function () { $('sig-osd').style.opacity = '0'; }, 500);
    setTimeout(done, 700);   // 片頭字卡在訊號還沒完全穩時就開始浮出來
    setTimeout(function () {
      noiseOff();
      body.classList.remove('tearing');
      document.documentElement.classList.remove('from-tv');
      signal.style.opacity = '';
      $('sig-osd').style.opacity = '';
      residue();
    }, 1200);
  }

  // 偶爾訊號不穩：每 45～90 秒一次，雜訊閃一下，有時候短暫被拉回黎安國
  function scheduleGlitch() {
    if (reduced) return;
    setTimeout(glitch, 45000 + Math.random() * 45000);
  }
  function glitch() {
    if (document.hidden || !viewer.hidden || !index.hidden || body.classList.contains('counting')) { scheduleGlitch(); return; }
    var lian = Math.random() < 0.35;
    signal.classList.add('on', 'glitch');
    signal.style.opacity = '.6';
    noiseOn();
    body.classList.add('tearing');
    glitchAudio();
    if (lian) {
      setTimeout(function () { $('sig-lian').style.opacity = '.85'; signal.style.opacity = '1'; }, 120);
      setTimeout(function () { $('sig-lian').style.opacity = '0'; signal.style.opacity = '.6'; }, 300);
    }
    setTimeout(function () {
      noiseOff();
      body.classList.remove('tearing');
      signal.classList.remove('on', 'glitch');
      signal.style.opacity = '';
      residue();
      scheduleGlitch();
    }, 440);
  }
  window.__glitch = glitch; // 測試用：在主控台打 __glitch() 立刻看一次

  /* =========================================================
     外面的聲音：風、遠處的街道、偶爾的鳥叫（Web Audio 現場合成）
     預設關；如果瀏覽器允許自動播放，從電視進來時會自己浮上來
     ========================================================= */
  var ac = null, ambGain, tvGain, tvFilter, ambOn = false, birdTimer = null;
  function ensureAudio() {
    if (ac) return ac;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ac = new AC(); } catch (e) { return null; }
    var sr = ac.sampleRate;
    function loopSrc(buf) { var s = ac.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s; }
    // 白噪音（電視雜訊）、棕噪音（風和街道）
    var white = ac.createBuffer(1, sr * 2, sr), wd = white.getChannelData(0);
    for (var i = 0; i < wd.length; i++) wd[i] = Math.random() * 2 - 1;
    var brown = ac.createBuffer(1, sr * 4, sr), bd = brown.getChannelData(0), last = 0;
    for (i = 0; i < bd.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; bd[i] = last * 3.5; }

    ambGain = ac.createGain(); ambGain.gain.value = 0; ambGain.connect(ac.destination);
    // 風：帶通＋很慢的起伏
    var wind = ac.createBiquadFilter(); wind.type = 'bandpass'; wind.frequency.value = 520; wind.Q.value = 0.6;
    var windG = ac.createGain(); windG.gain.value = 0.5;
    var lfo = ac.createOscillator(), lfoG = ac.createGain();
    lfo.frequency.value = 0.07; lfoG.gain.value = 0.3;
    lfo.connect(lfoG); lfoG.connect(windG.gain); lfo.start();
    loopSrc(brown).connect(wind); wind.connect(windG); windG.connect(ambGain);
    // 遠處的街道：低沉的嗡嗡聲
    var street = ac.createBiquadFilter(); street.type = 'lowpass'; street.frequency.value = 200;
    var streetG = ac.createGain(); streetG.gain.value = 0.6;
    loopSrc(brown).connect(street); street.connect(streetG); streetG.connect(ambGain);
    // 電視雜訊：鎖定訊號時越來越悶
    tvFilter = ac.createBiquadFilter(); tvFilter.type = 'lowpass'; tvFilter.frequency.value = 9000;
    tvGain = ac.createGain(); tvGain.gain.value = 0;
    loopSrc(white).connect(tvFilter); tvFilter.connect(tvGain); tvGain.connect(ac.destination);
    return ac;
  }
  function chirp() {
    if (!ambOn || !ac) return;
    var t = ac.currentTime, n = 2 + Math.floor(Math.random() * 3), base = 2800 + Math.random() * 1400;
    for (var k = 0; k < n; k++) {
      var o = ac.createOscillator(), g = ac.createGain(), st = t + k * 0.13;
      o.type = 'sine';
      o.frequency.setValueAtTime(base, st);
      o.frequency.exponentialRampToValueAtTime(base * 1.35, st + 0.07);
      g.gain.setValueAtTime(0, st);
      g.gain.linearRampToValueAtTime(0.035, st + 0.015);
      g.gain.linearRampToValueAtTime(0, st + 0.09);
      o.connect(g); g.connect(ambGain);
      o.start(st); o.stop(st + 0.1);
    }
  }
  function birds() {
    clearTimeout(birdTimer);
    if (!ambOn) return;
    chirp();
    birdTimer = setTimeout(birds, 3000 + Math.random() * 6000);
  }
  function setAmb(on) {
    if (!ensureAudio()) return;
    ambOn = on;
    if (on && ac.state === 'suspended') ac.resume();
    ambGain.gain.setTargetAtTime(on ? 0.35 : 0, ac.currentTime, on ? 0.8 : 0.3);
    var b = $('sound-btn');
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.textContent = '外面的聲音　' + (on ? '開' : '關');
    if (on) setTimeout(birds, 1500); else clearTimeout(birdTimer);
  }
  // 從電視進來：雜訊越來越悶、外面的環境音浮上來（瀏覽器不允許自動播放時就安靜進場）
  function tvAudioIn() {
    if (!ensureAudio() || ac.state !== 'running') return;
    var t = ac.currentTime;
    tvGain.gain.setValueAtTime(0.14, t);
    tvGain.gain.linearRampToValueAtTime(0, t + 1.3);
    tvFilter.frequency.setValueAtTime(9000, t);
    tvFilter.frequency.exponentialRampToValueAtTime(300, t + 1.2);
    setAmb(true);
  }
  function glitchAudio() {
    if (!ambOn || !ac) return;
    var t = ac.currentTime;
    tvFilter.frequency.setValueAtTime(6000, t);
    tvGain.gain.setValueAtTime(0.1, t);
    tvGain.gain.linearRampToValueAtTime(0, t + 0.45);
    ambGain.gain.setValueAtTime(0.08, t);
    ambGain.gain.setTargetAtTime(0.35, t + 0.45, 0.4);
  }
  $('sound-btn').addEventListener('click', function () { setAmb(!ambOn); });
  document.addEventListener('visibilitychange', function () {
    if (!ac) return;
    if (document.hidden) ac.suspend(); else if (ambOn) ac.resume();
  });

  /* =========================================================
     關於：大字隨捲動一個字一個字亮起
     ========================================================= */
  var reveal = $('reveal'), chars = [];
  (function split() {
    var text = reveal.textContent;
    reveal.setAttribute('aria-label', text);
    reveal.textContent = '';
    Array.prototype.forEach.call(text, function (c) {
      var s = document.createElement('span');
      s.className = 'ch';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = c;
      reveal.appendChild(s);
      chars.push(s);
    });
  })();
  function revealText() {
    var r = reveal.getBoundingClientRect();
    var p = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35), 0, 1);
    var n = Math.round(p * chars.length);
    for (var i = 0; i < chars.length; i++) chars[i].classList.toggle('on', i < n);
  }
  revealText();

  /* =========================================================
     片尾名單：看到才開始捲
     ========================================================= */
  var credits = $('credits');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es, ob) {
      es.forEach(function (en) {
        if (en.isIntersecting) { credits.classList.add('rolling'); ob.disconnect(); }
      });
    }, { threshold: 0.35 }).observe(credits);
  } else {
    credits.classList.add('rolling');
  }
})();
