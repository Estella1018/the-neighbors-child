/* 子頁面共用：頁首、頁尾、內容警告、切換分頁的標題
   用法：頁面放 <div id="site-top"></div> 和 <div id="site-foot"></div>，再載入本檔 */
(function () {
  'use strict';
  function sget(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var here = location.pathname.split('/').pop() || 'index.html';
  var parent = { 'checkup.html': 'services.html', 'care.html': 'services.html', 'award.html': 'services.html', 'badge.html': 'services.html', 'faq.html': 'services.html', 'sitemap.html': 'services.html' };
  var lit = parent[here] || here;

  var NAV = [
    ['index.html', '首　頁'],
    ['about.html', '認識黎安國'],
    ['news.html', '最新消息'],
    ['services.html', '便民服務'],
    ['downloads.html', '下載專區'],
    ['index.html#mail', '首長信箱']
  ];

  var top = document.getElementById('site-top');
  if (top) {
    top.className = 'top';
    top.innerHTML =
      '<div class="top-links"><a href="index.html">回首頁</a>｜<a href="sitemap.html">網站導覽</a>｜<a href="en.html">English</a>｜<a href="kids.html">兒童版</a></div>' +
      '<div class="banner">' +
        '<img class="emblem" src="img/emblem.png?v=2" alt="">' +
        '<div><p class="site-name">黎安國　國民生活入口網</p><p class="sub">Republic of Li-An ‧ National Life Portal</p></div>' +
        '<p class="greeting">願你一生，都還可以更好。</p>' +
      '</div>' +
      '<nav class="nav" aria-label="主選單">' + NAV.map(function (n) {
        return '<a href="' + n[0] + '"' + (n[0] === lit ? ' class="on"' : '') + '>' + n[1] + '</a>';
      }).join('') + '</nav>';
  }

  var foot = document.getElementById('site-foot');
  if (foot) {
    foot.className = 'foot';
    foot.innerHTML =
      '<p>黎安國 國民生活部　版權所有 © 黎安國政府　地址：光榮路一段 1 號　服務時間：全年無休</p>' +
      '<p class="small">本網站最佳瀏覽解析度 800×600　建議使用 IE 5.0 以上版本瀏覽</p>' +
      '<p class="small real">本網站為遊戲《別人家的孩子》的虛構官網，黎安國與其中所有機關、人物皆為虛構。</p>';
  }

  // 內容警告：直接從分享連結進到子頁面的人也要看到
  if (!sget('lian_cw')) {
    var d = document.createElement('div');
    d.className = 'dlg-backdrop';
    d.innerHTML =
      '<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="cw2-title">' +
        '<div class="dlg-bar"><span id="cw2-title">國民須知</span><button type="button" class="dlg-x" aria-label="關閉">×</button></div>' +
        '<div class="dlg-body"><p class="dlg-icon" aria-hidden="true">!</p><div>' +
          '<p><b>本網站為恐怖遊戲《別人家的孩子》的官方網站。</b></p>' +
          '<p>遊戲與本網站含有以下內容：電擊矯正、家庭暴力、精神控制，以及間接呈現的自殺。</p>' +
          '<p>如果你最近狀況不好，請先照顧自己。離開也沒有關係。</p>' +
        '</div></div>' +
        '<div class="dlg-btns"><button type="button" class="btn" id="cw2-ok">我已了解，進入本站</button>' +
        '<button type="button" class="btn" id="cw2-leave">離開</button></div>' +
      '</div>';
    document.body.appendChild(d);
    document.getElementById('cw2-ok').focus();
    document.getElementById('cw2-ok').addEventListener('click', function () { sset('lian_cw', '1'); d.remove(); });
    d.querySelector('.dlg-x').addEventListener('click', function () { document.getElementById('cw2-ok').click(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape' && d.isConnected) { document.getElementById('cw2-ok').click(); document.removeEventListener('keydown', esc); }
    });
    document.getElementById('cw2-leave').addEventListener('click', function () {
      if (history.length > 1) history.back(); else location.href = 'about:blank';
    });
  }

  var title = document.title;
  document.addEventListener('visibilitychange', function () {
    document.title = document.hidden ? '國民，您要去哪裡？' : title;
  });

  // 給產生圖卡的頁面用：等字型載好再畫
  window.LIAN = {
    fontsReady: function () {
      if (!document.fonts || !document.fonts.load) return Promise.resolve();
      return Promise.all([
        document.fonts.load('900 40px "Noto Serif TC"'),
        document.fonts.load('400 20px "Noto Serif TC"')
      ]).catch(function () {});
    },
    today: function () {
      var d = new Date();
      return d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日';
    },
    // 把 canvas 存成圖檔；手機上能分享就直接開分享
    saveCanvas: function (canvas, filename) {
      canvas.toBlob(function (blob) {
        var file;
        try { file = new File([blob], filename, { type: 'image/png' }); } catch (e) {}
        if (file && navigator.canShare && navigator.canShare({ files: [file] }) && /Mobi|Android/i.test(navigator.userAgent)) {
          navigator.share({ files: [file] }).catch(function () {});
          return;
        }
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      }, 'image/png');
    },
    // 文字自動換行（canvas）
    wrap: function (ctx, text, x, y, maxW, lineH) {
      var line = '';
      for (var i = 0; i < text.length; i++) {
        var test = line + text[i];
        if (ctx.measureText(test).width > maxW && line) {
          ctx.fillText(line, x, y); y += lineH; line = text[i];
        } else { line = test; }
      }
      if (line) ctx.fillText(line, x, y);
      return y + lineH;
    }
  };
})();
