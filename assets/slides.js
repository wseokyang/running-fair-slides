(() => {
 const slide = document.querySelector('.slide');
 const stage = document.querySelector('.stage');
 const page = Number(document.body.dataset.page);
 const notes = document.querySelector('#notes');
 const toggle = document.querySelector('#notes-toggle');
 function resize() {
   slide.style.transform = innerWidth <= 760 ? '' : `scale(${Math.min(stage.clientWidth / 1440, stage.clientHeight / 810)})`;
 }
 function navigate(n) { if (n >= 1 && n <= 8 && n !== page) location.href = `slide-${String(n).padStart(2,'0')}.html`; }
 function showNotes(show) { notes.hidden = !show; toggle.setAttribute('aria-expanded', String(show)); if (show) document.querySelector('#notes-close').focus(); else toggle.focus(); }
 async function fullscreen() {
   try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
   catch { document.querySelector('#fullscreen').title = '브라우저의 전체 화면 단축키를 사용하세요.'; }
 }
 toggle.addEventListener('click', () => showNotes(notes.hidden));
 document.querySelector('#notes-close').addEventListener('click', () => showNotes(false));
 document.querySelector('#fullscreen').addEventListener('click', fullscreen);
 addEventListener('resize', resize);
 document.addEventListener('fullscreenchange', resize);
 document.addEventListener('keydown', e => {
   if (e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
   if (e.key === 'Escape' && !notes.hidden) { showNotes(false); return; }
   if (e.key.toLowerCase() === 'n') { e.preventDefault(); showNotes(notes.hidden); return; }
   if (!notes.hidden) return;
   if (e.key.toLowerCase() === 'f') { e.preventDefault(); fullscreen(); }
   else if (/^[1-8]$/.test(e.key)) navigate(Number(e.key));
   else if (['ArrowRight','PageDown'].includes(e.key) || (e.key === ' ' && !/BUTTON|A/.test(e.target.tagName))) { e.preventDefault(); navigate(page+1); }
   else if (['ArrowLeft','PageUp'].includes(e.key)) { e.preventDefault(); navigate(page-1); }
   else if (e.key === 'Home') { e.preventDefault(); navigate(1); }
   else if (e.key === 'End') { e.preventDefault(); navigate(8); }
 });
 resize();
})();
