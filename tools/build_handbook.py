# -*- coding: utf-8 -*-
"""從 國民成長手冊.md 產生官網下載用的《國民成長手冊》節錄版 PDF。
用法（在 遊戲企劃 資料夾）：python 官網/tools/build_handbook.py
產生 官網/tools/handbook.html → 用 Edge 無頭模式印成 官網/media/handbook.pdf"""
import re, subprocess, pathlib, html

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / '國民成長手冊.md'
OUT_HTML = ROOT / '官網' / 'tools' / 'handbook.html'
OUT_PDF = ROOT / '官網' / 'media' / 'handbook.pdf'
EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'

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

def render(block, kind=''):
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
            tag = 'h2' if l.startswith('####') or l.startswith('###') else 'h1'
            out.append('<%s>%s</%s>' % (tag, inline(clean_title(l)), tag))
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
    cls = 'page ' + kind
    return '<section class="%s">%s</section>' % (cls, '\n'.join(out))

def age_page(prefix):
    b = section(prefix)
    # 最後一行（頁尾短句）獨立出來
    body, foot = b[:-1], b[-1]
    while body and not body[-1].strip():
        body.pop()
    while not foot.strip():
        foot = body.pop()
    h = render(body, 'age')
    return h.replace('</section>', '<p class="motto">%s</p></section>' % inline(foot.strip()))

cover = '''<section class="page cover">
<p class="ed">第 27 版</p>
<h1 class="ct">黎安國<br>國民成長手冊</h1>
<p class="cs">國民人生發展指引・標準版</p>
<p class="cb">願你一生，都還可以更好。</p>
<div class="cm">
<p>適用對象：全體黎安國國民</p>
<p>發放方式：出生登記時隨戶籍資料核發</p>
<p>更新方式：每年生日當日，由本人及家庭監護人共同確認</p>
<p class="pub">黎安國國民發展總署　編印</p>
</div>
<p class="note">（網路節錄版）</p>
</section>'''

parts = [
    cover,
    render(section('## 卷首語')),
    render(section('## 第一篇')),
    age_page('#### 九歲'),
    age_page('#### 十六歲'),
    render(section('### 全年適用')),
    render(section('## 第三篇')),
    render(section('## 第四篇')),
    render(section('## 第五篇')),
    render(section('## 手冊末頁'), 'last'),
]

CSS = '''
@page { size: A5; margin: 16mm 14mm; }
body { margin: 0; font-family: "PMingLiU", "新細明體", "Noto Serif TC", serif; font-size: 10.5pt; line-height: 1.75; color: #1a1a1a; }
.page { page-break-after: always; }
.page:last-child { page-break-after: auto; }
h1 { font-family: "DFKai-SB", "標楷體", serif; font-size: 17pt; text-align: center; margin: 0 0 6mm; padding-bottom: 2mm; border-bottom: 1.5pt double #1d3a6e; color: #1d3a6e; }
h2 { font-family: "DFKai-SB", "標楷體", serif; font-size: 14pt; margin: 0 0 5mm; color: #1d3a6e; }
h3 { font-size: 11.5pt; margin: 5mm 0 2mm; color: #8a1c1c; }
p { margin: 0 0 2mm; text-align: justify; }
ul { margin: 2mm 0 4mm; padding-left: 0; list-style: none; }
ul.check li { padding-left: 6mm; text-indent: -6mm; margin-bottom: 2.5mm; }
ul.check li::before { content: "□　"; }
ul.plain li::before { content: "・"; }
table { width: 100%; border-collapse: collapse; margin-top: 3mm; font-size: 9.5pt; }
th, td { border: 0.6pt solid #555; padding: 2mm; height: 6mm; }
th { background: #e6ebf3; }
.age h2 { border: 1pt solid #1d3a6e; padding: 2mm 3mm; background: #eef2f8; }
.age ul.check li { font-size: 12pt; margin-bottom: 6mm; }
.motto { margin-top: 18mm; text-align: center; font-family: "DFKai-SB", "標楷體", serif; font-size: 15pt; color: #8a1c1c; }
.cover { text-align: center; border: 3pt double #1d3a6e; padding: 18mm 6mm 10mm; min-height: 150mm; box-sizing: border-box; background: #f5efdf; }
.cover .ed { font-size: 10pt; text-align: right; margin: -12mm 0 10mm; }
.cover .ct { border: 0; font-size: 28pt; line-height: 1.4; margin-bottom: 4mm; color: #8a1c1c; }
.cover .cs { text-align: center; font-size: 12pt; margin-bottom: 18mm; }
.cover .cb { text-align: center; font-family: "DFKai-SB", "標楷體", serif; font-size: 14pt; color: #1d3a6e; margin-bottom: 18mm; }
.cover .cm p { text-align: center; font-size: 9pt; margin: 0 0 1mm; }
.cover .pub { margin-top: 5mm !important; font-size: 11pt !important; font-weight: bold; }
.cover .note { text-align: center; font-size: 8pt; color: #777; margin-top: 8mm; }
.last p:last-child { margin-top: 10mm; font-size: 8.5pt; color: #8a1c1c; }
.disclaimer { font-size: 7.5pt; color: #888; text-align: center; margin-top: 12mm; }
'''

doc = '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>國民成長手冊</title><style>%s</style></head><body>%s<p class="disclaimer">本手冊為恐怖遊戲《別人家的孩子》中虛構國家「黎安國」的道具。</p></body></html>' % (CSS, '\n'.join(parts))
OUT_HTML.write_text(doc, encoding='utf-8')
# Edge 對中文路徑不友善：先印到暫存的英文路徑，再搬過去
import tempfile, shutil, time
tmpdir = pathlib.Path(tempfile.mkdtemp())
tmp_html, tmp_pdf = tmpdir / 'handbook.html', tmpdir / 'handbook.pdf'
shutil.copy(OUT_HTML, tmp_html)
subprocess.run([EDGE, '--headless=new', '--disable-gpu', '--no-pdf-header-footer',
                '--user-data-dir=' + str(tmpdir / 'profile'),
                '--print-to-pdf=' + str(tmp_pdf), tmp_html.as_uri()], check=True, timeout=120)
for _ in range(30):
    if tmp_pdf.exists() and tmp_pdf.stat().st_size > 0: break
    time.sleep(1)
shutil.move(str(tmp_pdf), str(OUT_PDF))
print('PDF:', OUT_PDF, OUT_PDF.stat().st_size, 'bytes')
