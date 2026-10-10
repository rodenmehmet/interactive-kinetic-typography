/* Native controls stay available unless the phone controls initialize successfully. */
(() => {
  const mobile = navigator.userAgentData?.mobile ?? /iPhone|iPod|Android.+Mobile|Windows Phone|Opera Mini|IEMobile/i.test(navigator.userAgent);
  if (!mobile) return;
  const video = document.getElementById('video');
  const stage = document.getElementById('stage');
  if (!video || !stage) return;
  const bar = document.createElement('div');
  bar.className = 'mobile-video-controls';
  bar.innerHTML = `<button type="button" class="mobile-play"></button><span class="mobile-time">0:00 / 0:00</span><input class="mobile-seek" type="range" min="0" max="1000" value="0" step="1"><button type="button" class="mobile-mute"></button><button type="button" class="mobile-fullscreen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg></button><span class="mobile-control-status" role="status"></span>`;
  const play = bar.querySelector('.mobile-play');
  const mute = bar.querySelector('.mobile-mute');
  const seek = bar.querySelector('.mobile-seek');
  const time = bar.querySelector('.mobile-time');
  const fullscreen = bar.querySelector('.mobile-fullscreen');
  const status = bar.querySelector('.mobile-control-status');
  let hideTimer;
  let interacting = false;
  function revealControls(schedule = true) {
    clearTimeout(hideTimer);
    bar.classList.remove('controls-hidden');
    bar.inert = false;
    bar.removeAttribute('aria-hidden');
    if (schedule && !video.paused && !video.ended && !interacting) {
      hideTimer = setTimeout(() => {
        if (video.paused || video.ended || interacting || bar.querySelector(':focus-visible')) return;
        bar.classList.add('controls-hidden');
        bar.inert = true;
        bar.setAttribute('aria-hidden', 'true');
      }, 2000);
    }
  }
  stage.addEventListener('pointerdown', event => {
    if (event.target.closest('.close-video')) return;
    interacting = bar.contains(event.target);
    revealControls();
  });
  const finishInteraction = () => { if (interacting) { interacting = false; revealControls(); } };
  window.addEventListener('pointerup', finishInteraction);
  window.addEventListener('pointercancel', finishInteraction);
  bar.addEventListener('input', () => revealControls());
  stage.addEventListener('keydown', () => revealControls());
  bar.addEventListener('focusin', () => revealControls());
  bar.addEventListener('focusout', () => revealControls());
  video.addEventListener('play', () => revealControls());
  video.addEventListener('pause', () => revealControls(false));
  video.addEventListener('ended', () => revealControls(false));
  video.addEventListener('emptied', () => revealControls(false));
  document.addEventListener('fullscreenchange', () => revealControls());
  const tr = () => document.documentElement.lang !== 'en';
  const label = (button, turkish, english) => {
    button.setAttribute('aria-label', tr() ? turkish : english);
    button.title = tr() ? turkish : english;
  };
  const format = value => {
    const seconds = Number.isFinite(value) ? Math.floor(value) : 0;
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  };
  function sync() {
    label(play, video.paused ? 'Oynat' : 'Duraklat', video.paused ? 'Play' : 'Pause');
    play.innerHTML = video.paused
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="none"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" stroke-width="4"/></svg>';
    label(mute, video.muted ? 'Sesi aç' : 'Sesi kapat', video.muted ? 'Unmute' : 'Mute');
    mute.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h4l5-4v14l-5-4H3Z"/>${video.muted ? '<path d="m16 9 6 6m0-6-6 6"/>' : '<path d="M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>'}</svg>`;
    const duration = video.duration;
    seek.disabled = !Number.isFinite(duration) || duration <= 0;
    seek.value = seek.disabled ? 0 : Math.round(video.currentTime / duration * 1000);
    seek.setAttribute('aria-label', tr() ? 'Video ilerlemesi' : 'Video progress');
    seek.setAttribute('aria-valuetext', `${format(video.currentTime)} / ${format(duration)}`);
    time.textContent = `${format(video.currentTime)} / ${format(duration)}`;
    label(fullscreen, document.fullscreenElement ? 'Tam ekrandan çık' : 'Tam ekran', document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen');
    fullscreen.hidden = !stage.requestFullscreen && !video.webkitEnterFullscreen;
  }
  play.addEventListener('click', async () => {
    status.textContent = '';
    if (!video.paused) { video.pause(); return; }
    try { await video.play(); }
    catch { status.textContent = tr() ? 'Oynatılamadı. Yeniden deneyiniz.' : 'Could not play. Please retry.'; }
    sync();
  });
  mute.addEventListener('click', () => { video.muted = !video.muted; sync(); });
  seek.addEventListener('input', () => {
    if (Number.isFinite(video.duration) && video.duration > 0) video.currentTime = Number(seek.value) / 1000 * video.duration;
    sync();
  });
  fullscreen.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (stage.requestFullscreen) await stage.requestFullscreen();
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
    } catch { status.textContent = tr() ? 'Tam ekran açılamadı.' : 'Fullscreen unavailable.'; }
    sync();
  });
  ['play','pause','timeupdate','loadedmetadata','durationchange','volumechange','ended','emptied'].forEach(event => video.addEventListener(event, sync));
  video.addEventListener('loadstart', () => { status.textContent = ''; sync(); });
  document.addEventListener('fullscreenchange', sync);
  new MutationObserver(sync).observe(document.documentElement, {attributes:true, attributeFilter:['lang']});
  stage.append(bar);
  sync();
  video.controls = false;
})();
