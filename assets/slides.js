(() => {
 'use strict';
 const deck = document.body.classList.contains('deck');
 const slides = [...document.querySelectorAll('.slide')];
 const stage = document.querySelector('.stage');
 const notes = document.querySelector('#notes');
 const notesToggle = document.querySelector('#notes-toggle');
 const fullscreenButton = document.querySelector('#fullscreen');
 const blank = document.querySelector('#blank');
 const noteData = deck ? JSON.parse(document.querySelector('#deck-notes').textContent) : [];
 let page = deck ? 0 : Number(document.body.dataset.page) - 1;
 let step = 0;
 let controlsTimer;
 function revealControls() {
   if (!document.fullscreenElement) return;
   document.body.classList.add('controls-visible');
   clearTimeout(controlsTimer);
   controlsTimer = setTimeout(() => document.body.classList.remove('controls-visible'), 1800);
 }
 document.addEventListener('pointermove', revealControls);
 document.addEventListener('pointerdown', revealControls);
 const maxSteps = slides.map(s => Math.max(0, ...[...s.querySelectorAll('[data-reveal]')].map(e => Number(e.dataset.reveal))));
 function resize() {
   const scale = Math.min(stage.clientWidth / 1440, stage.clientHeight / 810);
   slides.forEach(slide => { slide.style.transform = `scale(${scale})`; });
 }
 function closeNotes() { notes.hidden = true; notesToggle.setAttribute('aria-expanded', 'false'); }
 function showNotes(show) {
   notes.hidden = !show; notesToggle.setAttribute('aria-expanded', String(show));
   if (show) document.querySelector('#notes-close').focus();
   else notesToggle.focus();
 }
 function syncHash() {
   const hash = `#slide=${page + 1}&step=${step}`;
   // Same-document URL changes preserve fullscreen and work when opened with file://.
   if (location.hash !== hash) location.replace(hash);
 }
 function render(updateURL = true) {
   if (!deck) return;
   slides.forEach((slide, index) => {
     slide.hidden = index !== page;
     if (index !== page) return;
     slide.dataset.build = String(step);
     slide.querySelectorAll('[data-reveal]').forEach(element => {
       const concealed = Number(element.dataset.reveal) > step;
       element.classList.toggle('unrevealed', concealed);
       element.setAttribute('aria-hidden', String(concealed));
     });
   });
   notes.innerHTML = noteData[page].html;
   document.querySelector('#notes-close').addEventListener('click', () => showNotes(false));
   document.title = noteData[page].title;
   document.querySelector('.counter').textContent = `${page + 1} / 8`;
   document.querySelector('.build-status').textContent = `${step} / ${maxSteps[page]} 단계`;
   document.querySelector('.build-dots').innerHTML = Array.from({length:maxSteps[page]+1}, (_, n) => `<i class="${n<=step?'done':''}"></i>`).join('');
   document.querySelector('#previous').disabled = page === 0 && step === 0;
   document.querySelector('#next').disabled = page === 7 && step === maxSteps[page];
   document.querySelector('.live-status').textContent = `${page+1}번째 슬라이드, ${step}/${maxSteps[page]} 단계`;
   if (updateURL) syncHash();
   resize();
 }
 function readHash() {
   const params = new URLSearchParams(location.hash.slice(1));
   const number = Number(params.get('slide') || 1);
   page = Number.isFinite(number) ? Math.max(0,Math.min(7,Math.trunc(number)-1)) : 0;
   const requested = Number(params.get('step') || 0);
   step = Number.isFinite(requested) ? Math.max(0,Math.min(maxSteps[page],Math.trunc(requested))) : 0;
   render(false);
 }
 function jump(n, last = false) {
   if (n < 0 || n > 7) return;
   closeNotes();
   if (!deck) { location.href = `slide-${String(n+1).padStart(2,'0')}.html`; return; }
   page = n; step = last ? maxSteps[n] : 0; render();
 }
 function advance(direction) {
   if (blank && !blank.hidden) { blank.hidden = true; return; }
   if (!notes.hidden) { closeNotes(); return; }
   if (!deck) { jump(page + direction); return; }
   if (direction > 0) {
     if (step < maxSteps[page]) { step++; render(); }
     else if (page < 7) jump(page + 1);
   } else {
     if (step > 0) { step--; render(); }
     else if (page > 0) jump(page - 1, true);
   }
 }
 async function fullscreen() {
   try {
     if (document.fullscreenElement) await document.exitFullscreen();
     else await document.documentElement.requestFullscreen();
     fullscreenButton.blur();
     revealControls();
   } catch {
     fullscreenButton.title = '이 브라우저는 전체 화면 API를 지원하지 않습니다. 브라우저 메뉴의 전체 화면을 사용하세요.';
     if (deck) document.querySelector('.live-status').textContent = fullscreenButton.title;
   }
 }
 notesToggle.addEventListener('click', () => showNotes(notes.hidden));
 if (!deck) document.querySelector('#notes-close').addEventListener('click', () => showNotes(false));
 fullscreenButton.addEventListener('click', fullscreen);
 addEventListener('resize', resize);
 document.addEventListener('fullscreenchange', () => {
   if (deck) fullscreenButton.textContent = document.fullscreenElement ? '전체 화면 종료' : '전체 화면 시작';
   resize();
 });
 if (deck) {
   document.querySelector('#previous').addEventListener('click', () => advance(-1));
   document.querySelector('#next').addEventListener('click', () => advance(1));
   stage.addEventListener('click', e => { if (!e.target.closest('a,button')) advance(1); });
   blank.addEventListener('click', () => { blank.hidden = true; });
   addEventListener('hashchange', readHash);
   readHash();
 }
 document.addEventListener('keydown', e => {
   if (e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable) return;
   const key = e.key.toLowerCase();
   const nextKeys = ['arrowright','arrowdown','pagedown',' ','enter'];
   const previousKeys = ['arrowleft','arrowup','pageup','backspace'];
   if (nextKeys.includes(key) || previousKeys.includes(key)) {
     // PageDown/arrow keys always control the deck, regardless of button focus.
     // Space/Enter retain normal activation for explicitly focused controls.
     if ([' ','enter'].includes(key) && e.target.closest('button,a')) return;
     e.preventDefault();
     if (!e.repeat) advance(nextKeys.includes(key) ? 1 : -1);
     return;
   }
   if (e.repeat) return;
   if (key === 'escape') { closeNotes(); if (blank) blank.hidden = true; return; }
   if (blank && !blank.hidden && !['b','.','w',','].includes(key)) { blank.hidden = true; return; }
   if (key === 'n') { e.preventDefault(); showNotes(notes.hidden); }
   else if (key === 'f' || key === 'f5') { e.preventDefault(); fullscreen(); }
   else if (/^[1-8]$/.test(key)) jump(Number(key)-1);
   else if (key === 'home') { e.preventDefault(); jump(0); }
   else if (key === 'end') { e.preventDefault(); jump(7,true); }
   else if (deck && ['b','.','w',','].includes(key)) {
     e.preventDefault(); const black = key === 'b' || key === '.';
     const same = blank.classList.contains('black') === black;
     blank.hidden = !blank.hidden && same;
     blank.classList.toggle('black',black);
   }
 });
 resize();
})();
