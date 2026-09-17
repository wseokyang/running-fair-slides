"""Export the current deck and all its resources as one portable offline HTML file."""
from pathlib import Path
import base64
import mimetypes
import re
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
subprocess.run([sys.executable, str(root / 'scripts/build-deck.py')], check=True)
source = (root / 'present.html').read_text()

def data_url(relative, base=root):
    asset = (base / relative).resolve()
    if not asset.is_relative_to(root):
        raise ValueError(f'Asset outside project: {relative}')
    mime = mimetypes.guess_type(asset.name)[0] or 'application/octet-stream'
    return f'data:{mime};base64,' + base64.b64encode(asset.read_bytes()).decode('ascii')

css = (root / 'assets/style.css').read_text()
css = re.sub(r'url\([\'\"]?([^\)\'\"]+)[\'\"]?\)',
             lambda m: 'url("' + data_url(m[1], root / 'assets') + '")', css)
source = source.replace('<link rel="stylesheet" href="assets/style.css">', '<style>' + css + '</style>')
source = re.sub(r'<link rel="preload"[^>]*>', '', source)
source = re.sub(r'src="(assets/[^"]+)"', lambda m: 'src="' + data_url(m[1]) + '"', source)
# Inline scripts run at the end, after the slide DOM and embedded notes exist.
source = source.replace('<script src="assets/slides.js" defer></script>', '')
source = re.sub(r'<script src="data:[^"]+" defer></script>', '', source)
source = source.replace('href="index.html"', 'href="#contents" data-contents')
source = re.sub(r'<noscript>.*?</noscript>', '<noscript>발표를 실행하려면 브라우저에서 JavaScript를 켜 주세요.</noscript>', source, flags=re.S)

menu = '''<dialog id="portable-contents" aria-labelledby="contents-title">
<div class="contents-heading"><div><p>LEARNING VOYAGE</p><h2 id="contents-title">전체 슬라이드</h2></div><button id="contents-close" aria-label="목차 닫기">×</button></div>
<div class="contents-grid"></div><p class="contents-help">슬라이드 선택 · 방향키로 이동 · Enter로 시작 · Esc로 닫기</p>
</dialog>'''
menu_css = '''
#portable-contents{width:min(1000px,calc(100vw - 40px));max-height:85dvh;border:1px solid #d2d2d7;border-radius:18px;padding:32px;color:#1d1d1f;background:#fff;overflow:auto}
#portable-contents::backdrop{background:#1d1d1f66;backdrop-filter:blur(8px)}
.contents-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}.contents-heading p{font-size:10px;letter-spacing:2px;color:#6e6e73;margin-bottom:6px}.contents-heading h2{font-size:28px}
#contents-close{border:0;border-radius:50%;background:#f5f5f7;min-width:44px;height:44px;font-size:26px}.contents-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.contents-grid button{text-align:left;padding:20px;border:1px solid #e0e0e0;border-radius:12px;background:#fafafc;min-height:92px;color:#1d1d1f;display:flex;gap:20px;align-items:center}.contents-grid button span{color:#0066cc;font-size:22px;flex-shrink:0}.contents-grid button strong{font-size:17px;line-height:1.4;word-break:keep-all}.contents-grid button[aria-current="true"]{border:2px solid #0066cc;background:#f0f7ff}.contents-help{font-size:12px;color:#6e6e73;margin-top:20px}.contents-grid button:focus-visible,#contents-close:focus-visible{outline:3px solid #0066cc;outline-offset:3px}
@media(max-width:600px){#portable-contents{padding:20px}.contents-grid{grid-template-columns:1fr}.contents-grid button{min-height:70px;padding:14px}.contents-grid button strong{font-size:15px}}
@media print{#portable-contents{display:none!important}}
'''
menu_js = '''(() => {
 const dialog = document.querySelector('#portable-contents');
 const stage = document.querySelector('.stage');
 const slides = [...document.querySelectorAll('.slide')];
 const grid = dialog.querySelector('.contents-grid');
 stage.tabIndex = -1;
 function resume() { if (dialog.open) dialog.close(); stage.focus({preventScroll:true}); }
 slides.forEach((slide, index) => {
   const button = document.createElement('button');
   const number = document.createElement('span'); number.textContent = String(index+1).padStart(2,'0');
   const title = document.createElement('strong'); title.textContent = slide.querySelector('h1').innerText.replace(/\\n/g, ' ');
   button.append(number, title);
   button.addEventListener('click', () => { location.hash = `slide=${index+1}&step=0`; resume(); });
   grid.append(button);
 });
 const buttons = [...grid.querySelectorAll('button')];
 document.querySelectorAll('[data-contents]').forEach(link => link.addEventListener('click', event => {
   event.preventDefault();
   const current = slides.findIndex(slide => !slide.hidden);
   buttons.forEach((button,index) => button.setAttribute('aria-current', String(index===current)));
   dialog.showModal(); buttons[Math.max(0,current)].focus();
 }));
 document.querySelector('#contents-close').addEventListener('click', resume);
 dialog.addEventListener('cancel', event => { event.preventDefault(); resume(); });
 dialog.addEventListener('click', event => { if (event.target===dialog) { const r=dialog.getBoundingClientRect(); if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)resume(); } });
 document.addEventListener('keydown', event => {
   if (!dialog.open) return;
   // Keep the deck's clicker listener from advancing beneath the modal.
   event.stopImmediatePropagation();
   const index=buttons.indexOf(document.activeElement);
   const columns=innerWidth<=600?1:2;
   const moves={ArrowRight:1,ArrowLeft:-1,ArrowDown:columns,ArrowUp:-columns,PageDown:1,PageUp:-1};
   if (event.key in moves) { event.preventDefault(); buttons[Math.max(0,Math.min(7,(index<0?0:index)+moves[event.key]))].focus(); }
 }, true);
})();'''
js = (root / 'assets/slides.js').read_text()
source = source.replace('</head>', '<style>' + menu_css + '</style></head>')
source = source.replace('</body>', menu + '<script>' + js + '</script><script>' + menu_js + '</script></body>')
# Fail the export if an HTML resource reference still points to another file.
for value in re.findall(r'(?:src|href)="([^"]+)"', source):
    if not value.startswith(('data:', '#')):
        raise ValueError(f'Unbundled reference: {value}')
output = root / 'Learning-Voyage.html'
output.write_text(source)
print(f'Built {output.name}: {output.stat().st_size / 1024 / 1024:.1f} MiB, no external assets.')
