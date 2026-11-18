# -*- coding: utf-8 -*-
"""從 國民成長手冊.md 產生官網下載用的《國民成長手冊》節錄版 PDF（空白的公版，不放品睿那本的打勾）。
用法（在 遊戲企劃 資料夾）：python 官網/tools/build_handbook.py
產生 官網/tools/handbook.html → 用 Edge 無頭模式印成 官網/media/handbook.pdf
樣式（2026-11-19，W1）跟遊戲內的手冊統一（美術參考/修圖/成長手冊/成長手冊_上字.py）：
紙 #e8dfcc＋淡雜訊、字 #2a2622、紅字 #7a2a24 只用在國名・版次・標語；扉頁照遊戲；內頁頁眉＝外側小國徽＋紅字欄名"""
import re, subprocess, pathlib, html, base64, io, random

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / '國民成長手冊.md'
OUT_HTML = ROOT / '官網' / 'tools' / 'handbook.html'
OUT_PDF = ROOT / '官網' / 'media' / 'handbook.pdf'
EMBLEM = ROOT / '官網' / 'img' / 'emblem.png'
EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
OLD_FONT = pathlib.Path(r'C:\Users\wendy\AppData\Local\Microsoft\Windows\Fonts\UoqMunThenKhung-Regular.otf')

lines = SRC.read_text(encoding='utf-8').split('\n')

def section(start_prefix):
    i = next(n for n, l in enumerate(lines) if l.startswith(start_prefix))
    level = len(lines[i]) - len(lines[i].lstrip('#'))
    out = [lines[i]]
    for l in lines[i + 1:]:
        if l.startswith('**定稿說明**') or l.startswith('**遊戲內節錄') or l.strip() == '---':
            break
        if l.startswith('#'):
            lv = len(l) - len(l.lstrip('#'))
            if lv <= level:
                break
        out.append(l)
    return out

def inline(t):
    t = html.escape(t)
    return re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t)

def clean_title(t):
    t = t.lstrip('#').strip()
    t = re.sub(r'\s*✅.*$', '', t)
    return t

def render(block, kind='', page='text'):
    out, table, ul = [], [], []
    def flush_ul():
        if ul:
            out.append('<ul class="%s">%s</ul>' % ('check' if ul[0][0] else 'plain', ''.join('<li>%s</li>' % x for _, x in ul)))
            ul.clear()
    def flush_table():
        if table:
            rows = [r for r in table if not re.match(r'^\|[-| ]+\|$', r)]
            cells = [[c.strip() for c in r.strip('|').split('|')] for r in rows]
            h = '<tr>' + ''.join('<th>%s</th>' % inline(c) for c in cells[0]) + '</tr>'
            b = ''.join('<tr>' + ''.join('<td>%s</td>' % inline(c) for c in r) + '</tr>' for r in cells[1:])
            out.append('<table>%s%s</table>' % (h, b))
            table.clear()
    for n, l in enumerate(block):
        s = l.strip()
        if n == 0:
            out.append('<h1>%s</h1>' % inline(clean_title(l)))
            continue
        if s.startswith('|'):
            flush_ul(); table.append(s); continue
        flush_table()
        if s.startswith('- □'):
            ul.append((True, inline(s[3:].strip()))); continue
        if s.startswith('- '):
            ul.append((False, inline(s[2:]))); continue
        flush_ul()
        if not s:
            continue
        if s.startswith('###'):
            out.append('<h3>%s</h3>' % inline(clean_title(s)))
        else:
            out.append('<p>%s</p>' % inline(s))
    flush_ul(); flush_table()
    return '<section class="page %s" style="page:%s">%s</section>' % (kind, page, '\n'.join(out))

def age_page(prefix):
    """年度頁（照遊戲的 age_page）：歲數、「本年度成長指標」、空白的 □ 檢核格、頁尾短句"""
    b = section(prefix)
    title = clean_title(b[0]).split('｜')[0]
    items = [inline(l.strip()[3:].strip()) for l in b[1:] if l.strip().startswith('- □')]
    foot = [l.strip() for l in b[1:] if l.strip() and not l.strip().startswith('- ')][-1]
    lis = ''.join('<li>%s</li>' % x for x in items)
    return ('<section class="page age" style="page:age"><h1 class="at">%s</h1><p class="as">本年度成長指標</p>'
            '<ul class="check">%s</ul><p class="motto">%s</p></section>') % (title, lis, inline(foot))

def paper_png():
    """紙：#e8dfcc 加淡雜訊（照遊戲內 paper() 的細顆粒＋斑駁，做成可以重複鋪的小圖）"""
    from PIL import Image, ImageFilter, ImageChops
    S = 512; random.seed(27)
    def grain(lo, hi, blur):
        n = Image.effect_noise((S, S), 90).filter(ImageFilter.GaussianBlur(blur))
        return n.point(lambda v: int(lo + (hi - lo) * min(1, max(0, (v - 70) / 116))))
    tone = ImageChops.multiply(ImageChops.multiply(grain(246, 255, 40), grain(248, 255, 14)), grain(243, 255, 1.2))
    im = ImageChops.multiply(Image.new('RGB', (S, S), (232, 223, 204)), Image.merge('RGB', (tone,) * 3))
    buf = io.BytesIO(); im.save(buf, 'JPEG', quality=86)
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()

def emblem_uri():
    from PIL import Image
    e = Image.open(EMBLEM).convert('RGBA'); e = e.crop(e.getbbox())
    buf = io.BytesIO(); e.save(buf, 'PNG')
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()

PAPER, EMB = paper_png(), emblem_uri()

# 扉頁（照遊戲 growth_0R）：國徽 → 紅字國名 → 書名 → 副標 → 紅字版次、標語 → 表格式欄位 → 頁尾發行單位
cover = '''<section class="page title" style="page:title">
<img class="emb" src="%s" alt="">
<p class="red nation">黎安國・REPUBLIC OF LI-AN</p>
<hr class="thin">
<h1 class="ct">國民成長手冊</h1>
<p class="cs">國民人生發展指引・標準版</p>
<p class="red ed">第 27 版</p>
<p class="red cb">願你一生，都還可以更好。</p>
<table class="fields">
<tr><td>適用對象：全體黎安國國民</td></tr>
<tr><td>發放方式：出生登記時隨戶籍資料核發</td></tr>
<tr><td>更新方式：每年生日當日，由本人及家庭監護人共同確認</td></tr>
</table>
<p class="note">（網路節錄版）</p>
<div class="colophon"><span>發行單位｜黎安國國民發展總署</span><span>國訓｜還可以更好</span></div>
</section>''' % EMB

# 年度頁：遊戲裡出現過的幾頁（四、五歲＝第一章；九、十、十六、十七歲＝序章玻璃櫃）
AGES = ['#### 四歲', '#### 五歲', '#### 九歲', '#### 十歲', '#### 十六歲', '#### 十七歲']
parts = [cover, render(section('## 卷首語'), page='preface'), render(section('## 第一篇'))]
parts += [age_page(a) for a in AGES]
parts += [render(section('### 全年適用'), page='age'),
          render(section('## 第三篇')), render(section('## 第四篇')), render(section('## 第五篇')),
          render(section('## 手冊末頁'), 'last')]

font_src = ("local('UoqMunThenKhung'), url('%s')" % OLD_FONT.as_uri()) if OLD_FONT.exists() else "local('DFKai-SB')"

def heads(name, label):
    """頁眉：外側（右頁在右、左頁在左）一個小國徽，另一側紅字欄名"""
    emb = "content: ''; background: url(%s) no-repeat center / contain; width: 11mm; height: 7mm; margin-top: 7mm;" % EMB
    lab = "content: '%s'; color: #7a2a24; font-family: PMingLiU, serif; font-size: 8.5pt; margin-top: 7mm;" % label
    sel = ('@page ' + name) if name else '@page'
    return ('%(s)s:right { @top-right { %(e)s } @top-left { %(l)s } }\n'
            '%(s)s:left { @top-left { %(e)s } @top-right { %(l)s } }\n') % {'s': sel, 'e': emb, 'l': lab}

HEADS = (heads('', '國民成長手冊') + heads('text', '國民成長手冊') + heads('age', '國民成長手冊・年度檢核')
         + heads('preface', '國民成長手冊・卷首語'))

CSS = '''
@font-face { font-family: "HB-Old"; src: %(font)s; }
:root { --ink: #2a2622; --red: #7a2a24; }
html { background: #e8dfcc url(%(paper)s); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
@page { size: A5; margin: 22mm 15mm 18mm; background: #e8dfcc url(%(paper)s); }
%(heads)s
@page title { margin: 14mm 15mm 12mm; @top-left { content: none } @top-right { content: none } }
body { margin: 0; font-family: "PMingLiU", "新細明體", "MingLiU", serif; font-size: 10.5pt; line-height: 1.8; color: var(--ink); }
.page { break-after: page; }
.page.last { break-after: auto; }
.red { color: var(--red); }
h1 { font-family: "HB-Old", "DFKai-SB", serif; font-weight: normal; font-size: 18pt; text-align: center; margin: 0 0 6mm; padding-bottom: 2.5mm; border-bottom: 0.8pt solid var(--ink); }
h3 { font-size: 11.5pt; margin: 5mm 0 2mm; }
p { margin: 0 0 2mm; text-align: justify; }
ul { margin: 2mm 0 4mm; padding-left: 0; list-style: none; }
ul.check li { position: relative; padding-left: 7mm; margin-bottom: 3mm; }
ul.check li::before { content: ""; position: absolute; left: 0; top: 1.3mm; width: 3.4mm; height: 3.4mm; border: 0.7pt solid var(--ink); }
ul.plain li::before { content: "・"; }
table { width: 100%%; border-collapse: collapse; margin-top: 3mm; font-size: 9.5pt; }
th, td { border: 0.6pt solid var(--ink); padding: 2mm; height: 6mm; }
th { font-weight: normal; background: rgba(42,38,34,.06); }
.title { text-align: center; height: 176mm; position: relative; }
.title .emb { width: 40mm; display: block; margin: 4mm auto 3mm; opacity: .92; }
.title .nation { text-align: center; font-size: 9.5pt; letter-spacing: .08em; margin: 0; }
.title hr.thin { border: 0; border-top: 0.4pt solid rgba(42,38,34,.6); margin: 2mm 12mm 4mm; }
.title .ct { border: 0; font-size: 30pt; margin: 0 0 1mm; padding: 0; letter-spacing: .06em; }
.title .cs { text-align: center; font-size: 11pt; margin: 0 0 1.5mm; }
.title .ed { text-align: center; font-size: 11pt; margin: 0 0 2mm; }
.title .cb { text-align: center; font-size: 13.5pt; margin: 0 0 6mm; }
.title .fields { border-top: 1.4pt solid var(--ink); border-bottom: 1pt solid var(--ink); font-size: 9.5pt; text-align: left; }
.title .fields td { border: 0; border-bottom: 0.4pt solid rgba(42,38,34,.45); padding: 2.2mm 0; height: auto; }
.title .fields tr:last-child td { border-bottom: 0; }
.title .note { text-align: center; font-size: 8pt; opacity: .6; margin-top: 5mm; }
.title .colophon { position: absolute; left: 0; right: 0; bottom: 0; border-top: 0.4pt solid rgba(42,38,34,.6); padding-top: 2.5mm; display: flex; justify-content: space-between; font-size: 9pt; }
.age .at { border: 0; font-size: 22pt; margin: 2mm 0 0; padding: 0; }
.age .as { text-align: center; font-size: 11pt; margin: 0 0 6mm; padding-bottom: 5mm; border-bottom: 0.8pt solid var(--ink); }
.age ul.check li { font-size: 12pt; margin-bottom: 6mm; }
.age ul.check li::before { top: 1.6mm; width: 4mm; height: 4mm; }
.motto { margin-top: 14mm; padding-top: 6mm; border-top: 0.5pt solid var(--ink); text-align: center; font-size: 14pt; }
.last p:last-child { margin-top: 10mm; font-size: 8.5pt; }
.disclaimer { font-size: 7.5pt; opacity: .6; text-align: center; margin-top: 12mm; }
''' % {'font': font_src, 'paper': PAPER, 'heads': HEADS}

doc = ('<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>國民成長手冊</title><style>%s</style></head>'
       '<body>%s<p class="disclaimer">本手冊為恐怖遊戲《別人家的孩子》中虛構國家「黎安國」的道具。</p></body></html>') % (CSS, '\n'.join(parts))
OUT_HTML.write_text(doc, encoding='utf-8')
# Edge 對中文路徑不友善：先印到暫存的英文路徑，再搬過去
import tempfile, shutil, time
tmpdir = pathlib.Path(tempfile.mkdtemp())
tmp_html, tmp_pdf = tmpdir / 'handbook.html', tmpdir / 'handbook.pdf'
shutil.copy(OUT_HTML, tmp_html)
subprocess.run([EDGE, '--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--allow-file-access-from-files',
                '--user-data-dir=' + str(tmpdir / 'profile'),
                '--print-to-pdf=' + str(tmp_pdf), tmp_html.as_uri()], check=True, timeout=120)
for _ in range(30):
    if tmp_pdf.exists() and tmp_pdf.stat().st_size > 0: break
    time.sleep(1)
shutil.move(str(tmp_pdf), str(OUT_PDF))
print('PDF:', OUT_PDF, OUT_PDF.stat().st_size, 'bytes')
