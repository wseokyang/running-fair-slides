"""Build an offline, single-document player from the eight editable slide files."""
from pathlib import Path
import re
import json

root = Path(__file__).resolve().parents[1]
articles, notes = [], []
for number in range(1, 9):
    source = (root / f'slide-{number:02}.html').read_text()
    article = re.search(r'<article\b.*?</article>', source, re.S).group()
    if number != 1:
        article = article.replace('<article ', '<article hidden ', 1)
    articles.append(article)
    notes.append({
        'title': re.search(r'<title>(.*?)</title>', source).group(1),
        'html': re.search(r'<aside id="notes" hidden>(.*?)</aside>', source, re.S).group(1)
    })

(root / 'present.html').write_text('''<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Learning Voyage — 클리커 발표</title><link rel="stylesheet" href="assets/style.css">
<link rel="preload" as="image" href="assets/voyage-hero.png"><link rel="preload" as="image" href="assets/voyage-fleet.png">
<script src="assets/slides.js" defer></script></head><body class="presentation deck">
<main class="stage" aria-label="16:9 발표 화면">''' + '\n'.join(articles) + '''</main>
<nav class="controls" aria-label="발표 제어">
<a href="index.html" aria-label="전체 목차">▦ <span>전체 보기</span></a>
<button id="previous" aria-label="이전 단계">←</button><span class="counter">1 / 8</span><button id="next" aria-label="다음 단계">→</button>
<span class="build-status"></span><span class="build-dots" aria-hidden="true"></span>
<button id="notes-toggle" aria-expanded="false" aria-controls="notes">발표 노트</button>
<button id="fullscreen" class="start-presenting">전체 화면 시작</button>
</nav>
<aside id="notes" hidden></aside><div id="blank" class="blank-screen" hidden aria-label="발표 화면 가리기"></div>
<div class="live-status" role="status" aria-live="polite"></div>
<script type="application/json" id="deck-notes">''' + json.dumps(notes, ensure_ascii=False).replace('</', '<\\/') + '''</script>
<noscript>클리커 발표는 JavaScript가 필요합니다. <a href="slide-01.html">개별 슬라이드 보기</a></noscript>
</body></html>''')
print('Built present.html from 8 slide files.')
