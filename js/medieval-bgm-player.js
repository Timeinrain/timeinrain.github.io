(function () {
  var ROOT_ID = 'medieval-bgm-player';
  var STORE_KEY = 'timeinrain-medieval-bgm-player';
  var DEFAULT_VOLUME = 0.22;
  var HOME_AUTOPLAY = true;
  var DRAG_THRESHOLD = 5;
  var PLAYBACK_STORE_INTERVAL = 1000;
  var tracks = {
    light: {
      title: 'Medieval Castle Loop - Ebunny',
      phase: 'Day',
      src: '/music/bgm/ebunny-medieval-castle-loop-366828.mp3',
      duration: 48
    },
    dark: {
      title: "Medieval: The Bard's Tale - RandomMind",
      phase: 'Night',
      src: '/music/bgm/medieval-the-bards-tale-randommind.mp3',
      duration: 156.42
    }
  };

  var state = {
    root: null,
    audio: null,
    currentTheme: null,
    isSeeking: false,
    pendingSeekValue: null,
    committedSeekValue: null,
    committedSeekUntil: 0,
    seekCommitTimer: 0,
    pendingRestoreTime: null,
    playAfterTrackLoad: false,
    lastPlaybackStoreAt: 0,
    isChangingTrack: false,
    wantedPlaying: false,
    hasError: false,
    dragging: false,
    dragMoved: false,
    suppressClick: false,
    dragPointerId: null,
    dragStartX: 0,
    dragStartY: 0,
    dragStartLeft: 0,
    dragStartTop: 0,
    dragStartedOnDock: false,
    positionRatio: null,
    lastUserSeekTime: null,
    lastUserSeekUntil: 0,
    progressRaf: 0,
    elements: {}
  };

  function readStore() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    } catch (error) {
      return {};
    }
  }

  function writeStore(patch) {
    var next = Object.assign({}, readStore(), patch);

    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch (error) {
      // Local storage may be unavailable in private or restricted contexts.
    }
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function isHomePage() {
    var path = window.location.pathname.replace(/\/index\.html$/, '/');

    return path === '/';
  }

  function validPosition(position) {
    return position &&
      typeof position.left === 'number' &&
      typeof position.top === 'number' &&
      Number.isFinite(position.left) &&
      Number.isFinite(position.top);
  }

  function validPositionRatio(ratio) {
    return ratio &&
      typeof ratio.x === 'number' &&
      typeof ratio.y === 'number' &&
      Number.isFinite(ratio.x) &&
      Number.isFinite(ratio.y);
  }

  function getPositionLimits() {
    var width = state.root.offsetWidth || state.root.getBoundingClientRect().width;
    var height = state.root.offsetHeight || state.root.getBoundingClientRect().height;

    return {
      maxLeft: Math.max(0, window.innerWidth - width),
      maxTop: Math.max(0, window.innerHeight - height)
    };
  }

  function placeRoot(left, top) {
    var limits = getPositionLimits();

    state.root.style.left = clamp(left, 0, limits.maxLeft) + 'px';
    state.root.style.top = clamp(top, 0, limits.maxTop) + 'px';
    state.root.style.right = 'auto';
    state.root.style.bottom = 'auto';
  }

  function getCurrentPosition() {
    var rect = state.root.getBoundingClientRect();

    return {
      left: Math.round(rect.left),
      top: Math.round(rect.top)
    };
  }

  function getPositionRatio(position) {
    var limits = getPositionLimits();

    if (!validPosition(position)) return null;

    return {
      x: limits.maxLeft > 0 ? clamp(position.left / limits.maxLeft, 0, 1) : 0,
      y: limits.maxTop > 0 ? clamp(position.top / limits.maxTop, 0, 1) : 0
    };
  }

  function rememberPositionRatio(position) {
    var ratio = getPositionRatio(position);

    if (validPositionRatio(ratio)) {
      state.positionRatio = ratio;
    }

    return state.positionRatio;
  }

  function rememberCurrentPositionRatio() {
    return rememberPositionRatio(getCurrentPosition());
  }

  function getPositionFromRatio(ratio) {
    var limits = getPositionLimits();

    return {
      left: clamp(ratio.x, 0, 1) * limits.maxLeft,
      top: clamp(ratio.y, 0, 1) * limits.maxTop
    };
  }

  function placeByPositionRatio() {
    var ratio = state.positionRatio || rememberCurrentPositionRatio();
    var position;

    if (validPositionRatio(ratio)) {
      position = getPositionFromRatio(ratio);
      placeRoot(position.left, position.top);
    }
  }

  function storePosition() {
    writeStore({
      position: getCurrentPosition(),
      positionRatio: rememberCurrentPositionRatio()
    });
  }

  function storeLayoutState(patch) {
    writeStore(Object.assign({
      position: getCurrentPosition(),
      positionRatio: rememberCurrentPositionRatio()
    }, patch || {}));
  }

  function getDockAnchor() {
    var rect = state.root.getBoundingClientRect();
    var dockSize = state.elements.dock ? state.elements.dock.offsetWidth : 0;

    return {
      right: rect.right,
      top: rect.bottom - (dockSize || rect.height)
    };
  }

  function placeRootByDockAnchor(anchor) {
    var width = state.root.offsetWidth || state.root.getBoundingClientRect().width;
    var height = state.root.offsetHeight || state.root.getBoundingClientRect().height;
    var dockSize = state.elements.dock ? state.elements.dock.offsetWidth : 0;
    var left = anchor.right - width;
    var top = anchor.top - height + (dockSize || height);

    placeRoot(left, top);
  }

  function shouldStartDrag(event) {
    var target = event.target;

    if (event.button !== undefined && event.button !== 0) return false;
    if (!target || !target.closest) return false;

    if (state.root.classList.contains('is-collapsed')) {
      return Boolean(target.closest('.medieval-bgm-player__dock'));
    }

    if (target.closest('button, input, select, textarea, a, label')) return false;

    return Boolean(target.closest('.medieval-bgm-player__panel'));
  }

  function openCollapsedPlayer() {
    var anchor = getDockAnchor();

    state.root.classList.remove('is-collapsed');
    placeRootByDockAnchor(anchor);
    storeLayoutState({ collapsed: false });
  }

  function formatTime(seconds) {
    var value = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
    var minutes = Math.floor(value / 60);
    var rest = Math.floor(value % 60);

    return minutes + ':' + String(rest).padStart(2, '0');
  }

  function getActiveTrack() {
    return tracks[state.currentTheme || getTheme()];
  }

  function getDuration() {
    var mediaDuration = state.audio && state.audio.duration;
    var track = getActiveTrack();

    if (Number.isFinite(mediaDuration) && mediaDuration > 0) return mediaDuration;
    if (track && Number.isFinite(track.duration) && track.duration > 0) return track.duration;

    return 0;
  }

  function getCurrentTime() {
    var currentTime = state.audio && state.audio.currentTime;

    return Number.isFinite(currentTime) && currentTime > 0 ? currentTime : 0;
  }

  function getStoredTrackTime(theme) {
    var store = readStore();
    var entry = store.trackTimes && store.trackTimes[theme];
    var currentTime = entry && entry.currentTime;

    return Number.isFinite(currentTime) && currentTime > 0 ? currentTime : 0;
  }

  function writeTrackTime(theme, currentTime) {
    var store = readStore();
    var trackTimes = Object.assign({}, store.trackTimes || {});

    if (!theme) return;

    trackTimes[theme] = {
      currentTime: currentTime,
      updatedAt: Date.now()
    };

    writeStore({
      currentTheme: theme,
      trackTimes: trackTimes
    });
  }

  function storePlaybackTime(force) {
    var now = Date.now();
    var duration = getDuration();
    var currentTime;

    if (!state.currentTheme || !state.audio || !state.audio.getAttribute('src')) return;
    if (state.isSeeking && !force) return;
    if (!force && now - state.lastPlaybackStoreAt < PLAYBACK_STORE_INTERVAL) return;
    if (duration <= 0) return;

    currentTime = clamp(getCurrentTime(), 0, Math.max(0, duration - 0.05));
    writeTrackTime(state.currentTheme, currentTime);
    state.lastPlaybackStoreAt = now;
  }

  function hasDuration() {
    return getDuration() > 0;
  }

  function getSeekInputValue() {
    return clamp(Number(state.elements.seek.value) || 0, 0, 1000);
  }

  function getSeekTime(value, duration) {
    return clamp(value, 0, 1000) / 1000 * duration;
  }

  function getSeekTargetTime(value, duration) {
    var targetTime = getSeekTime(value, duration);

    if (duration > 0 && targetTime >= duration) {
      return Math.max(0, duration - 0.05);
    }

    return targetTime;
  }

  function clearCommittedSeek() {
    state.committedSeekValue = null;
    state.committedSeekUntil = 0;
  }

  function hasRecentUserSeek() {
    return state.lastUserSeekTime !== null && Date.now() <= state.lastUserSeekUntil;
  }

  function clearRecentUserSeek() {
    state.lastUserSeekTime = null;
    state.lastUserSeekUntil = 0;
  }

  function rememberUserSeekTime(targetTime) {
    if (!Number.isFinite(targetTime)) return;

    state.lastUserSeekTime = targetTime;
    state.lastUserSeekUntil = Date.now() + 1800;
  }

  function enforceRecentUserSeek() {
    var targetTime = state.lastUserSeekTime;

    if (!hasRecentUserSeek() || !state.audio || !Number.isFinite(targetTime)) return;

    window.setTimeout(function () {
      var currentTime;

      if (!hasRecentUserSeek() || !state.audio) return;

      currentTime = getCurrentTime();

      if (Math.abs(currentTime - targetTime) > 0.8) {
        try {
          state.audio.currentTime = targetTime;
        } catch (error) {
          // The next media event will try again if the seek has not settled yet.
        }
      }
    }, 80);
  }

  function protectRecentUserSeek() {
    if (!hasRecentUserSeek() || !Number.isFinite(state.lastUserSeekTime)) return false;

    if (Math.abs(getCurrentTime() - state.lastUserSeekTime) <= 0.3) return false;

    enforceRecentUserSeek();
    return true;
  }

  function clearSeekCommitTimer() {
    if (!state.seekCommitTimer) return;

    window.clearTimeout(state.seekCommitTimer);
    state.seekCommitTimer = 0;
  }

  function shouldPreviewCommittedSeek(currentTime, duration) {
    var targetTime;

    if (state.committedSeekValue === null) return false;

    targetTime = getSeekTargetTime(state.committedSeekValue, duration);

    if (Math.abs(currentTime - targetTime) <= 0.35 || Date.now() > state.committedSeekUntil) {
      clearCommittedSeek();
      return false;
    }

    return true;
  }

  function renderProgress(currentTime, duration, shouldUpdateInput) {
    var percent = 0;
    var value = 0;

    if (duration > 0) {
      percent = clamp(currentTime / duration * 100, 0, 100);
      value = Math.round(percent * 10);
    }

    state.root.style.setProperty('--bgm-progress', percent.toFixed(2) + '%');

    if (shouldUpdateInput) {
      state.elements.seek.value = String(value);
    }

    state.elements.seek.disabled = duration <= 0;
    state.elements.time.textContent = duration > 0
      ? formatTime(currentTime) + ' / ' + formatTime(duration)
      : formatTime(currentTime) + ' / --:--';
  }

  function previewSeekValue(value) {
    var duration = getDuration();
    var currentTime = duration > 0 ? getSeekTime(value, duration) : 0;

    state.elements.seek.value = String(Math.round(clamp(value, 0, 1000)));
    renderProgress(currentTime, duration, false);
  }

  function setIcon(button, iconClass) {
    var icon = button.querySelector('i');

    if (icon) icon.className = iconClass;
  }

  function updateProgress() {
    var duration = getDuration();
    var currentTime = getCurrentTime();

    if (state.isSeeking && state.pendingSeekValue !== null) {
      previewSeekValue(state.pendingSeekValue);
      return;
    }

    if (shouldPreviewCommittedSeek(currentTime, duration)) {
      previewSeekValue(state.committedSeekValue);
      return;
    }

    renderProgress(currentTime, duration, !state.isSeeking);
  }

  function stopProgressLoop() {
    if (!state.progressRaf) return;

    window.cancelAnimationFrame(state.progressRaf);
    state.progressRaf = 0;
  }

  function startProgressLoop() {
    stopProgressLoop();

    function tick() {
      updateProgress();

      if (!state.audio.paused && !state.hasError) {
        state.progressRaf = window.requestAnimationFrame(tick);
      } else {
        state.progressRaf = 0;
      }
    }

    state.progressRaf = window.requestAnimationFrame(tick);
  }

  function updatePlaying(isPlaying) {
    state.root.classList.toggle('is-playing', isPlaying);
    state.elements.play.setAttribute('aria-label', isPlaying ? '暂停背景音乐' : '播放背景音乐');
    state.elements.play.setAttribute('title', isPlaying ? '暂停' : '播放');
    setIcon(state.elements.play, isPlaying ? 'fas fa-pause' : 'fas fa-play');
  }

  function updateTrackText(track) {
    state.elements.title.textContent = track.title;
    state.elements.phase.textContent = state.hasError ? 'Missing' : track.phase;
  }

  function setError(hasError) {
    state.hasError = hasError;
    state.root.classList.toggle('is-error', hasError);
    state.elements.play.disabled = hasError;
    updateTrackText(tracks[state.currentTheme || getTheme()]);
  }

  function restorePendingTrackTime() {
    var duration = getDuration();
    var currentTime = state.pendingRestoreTime;

    state.pendingRestoreTime = null;

    if (!Number.isFinite(currentTime) || currentTime <= 0 || duration <= 0) return;

    try {
      state.audio.currentTime = clamp(currentTime, 0, Math.max(0, duration - 0.05));
    } catch (error) {
      // Some browsers reject early seeks before media data is fully ready.
    }
  }

  function attemptPlay() {
    state.audio.play().then(function () {
      setError(false);
      updatePlaying(true);
    }).catch(function () {
      updatePlaying(false);
    });
  }

  function setTrack(theme, shouldKeepPlaying) {
    var track = tracks[theme];
    var previousTheme = state.currentTheme;
    var wasPlaying = state.wantedPlaying && shouldKeepPlaying;

    if (!track) return;

    if (previousTheme && previousTheme !== theme) {
      storePlaybackTime(true);
    }

    state.currentTheme = theme;
    setError(false);
    updateTrackText(track);

    if (state.audio.getAttribute('src') !== track.src) {
      clearSeekCommitTimer();
      clearCommittedSeek();
      state.pendingSeekValue = null;
      state.isSeeking = false;
      state.pendingRestoreTime = getStoredTrackTime(theme);
      state.playAfterTrackLoad = wasPlaying;
      state.isChangingTrack = true;
      state.audio.pause();
      state.audio.src = track.src;
      state.audio.load();
      updatePlaying(false);
      updateProgress();
      return;
    }

    if (wasPlaying) attemptPlay();
  }

  function seekToInputValue(value) {
    var audio = state.audio;
    var inputValue = typeof value === 'number' ? value : getSeekInputValue();
    var duration = getDuration();
    var targetTime;

    if (!duration) return;

    targetTime = getSeekTargetTime(inputValue, duration);

    audio.currentTime = targetTime;

    return targetTime;
  }

  function finishSeek() {
    var value = getSeekInputValue();
    var shouldResume = state.wantedPlaying;
    var targetTime;

    clearSeekCommitTimer();
    state.pendingSeekValue = value;
    state.committedSeekValue = value;
    state.committedSeekUntil = Date.now() + 1200;
    previewSeekValue(value);
    targetTime = seekToInputValue(value);

    if (Number.isFinite(targetTime)) {
      rememberUserSeekTime(targetTime);
      writeTrackTime(state.currentTheme, targetTime);
      state.lastPlaybackStoreAt = Date.now();
    } else {
      storePlaybackTime(true);
    }

    state.isSeeking = false;
    state.pendingSeekValue = null;
    updateProgress();
    enforceRecentUserSeek();

    if (shouldResume && !state.hasError) {
      attemptPlay();
    }
  }

  function scheduleFinishSeek(delay) {
    clearSeekCommitTimer();
    state.seekCommitTimer = window.setTimeout(function () {
      state.seekCommitTimer = 0;
      finishSeek();
    }, delay || 0);
  }

  function createButton(className, label, title, iconClass) {
    var button = document.createElement('button');
    var icon = document.createElement('i');

    button.className = className;
    button.type = 'button';
    button.setAttribute('aria-label', label);
    button.setAttribute('title', title);
    icon.className = iconClass;
    icon.setAttribute('aria-hidden', 'true');
    button.appendChild(icon);

    return button;
  }

  function buildPlayer() {
    var store = readStore();
    var root = document.createElement('aside');
    var panel = document.createElement('div');
    var play = createButton('medieval-bgm-player__button medieval-bgm-player__play', '播放背景音乐', '播放', 'fas fa-play');
    var meta = document.createElement('div');
    var status = document.createElement('div');
    var title = document.createElement('div');
    var phase = document.createElement('div');
    var seekWrap = document.createElement('div');
    var seek = document.createElement('input');
    var seekThumb = document.createElement('span');
    var time = document.createElement('div');
    var secondary = document.createElement('div');
    var volume = document.createElement('input');
    var collapse = createButton('medieval-bgm-player__button medieval-bgm-player__collapse', '收起背景音乐播放器', '收起', 'fas fa-xmark');
    var dock = document.createElement('button');
    var dockIcon = document.createElement('span');
    var audio = document.createElement('audio');
    var storedVolume = typeof store.volume === 'number' ? store.volume : DEFAULT_VOLUME;

    root.id = ROOT_ID;
    root.className = 'medieval-bgm-player';
    root.setAttribute('aria-label', '背景音乐播放器');
    if (store.collapsed) root.classList.add('is-collapsed');

    panel.className = 'medieval-bgm-player__panel';
    meta.className = 'medieval-bgm-player__meta';
    status.className = 'medieval-bgm-player__status';
    title.className = 'medieval-bgm-player__title';
    phase.className = 'medieval-bgm-player__phase';
    seekWrap.className = 'medieval-bgm-player__seek-wrap';
    time.className = 'medieval-bgm-player__time';
    secondary.className = 'medieval-bgm-player__secondary';

    seek.className = 'medieval-bgm-player__seek';
    seek.type = 'range';
    seek.min = '0';
    seek.max = '1000';
    seek.step = '1';
    seek.value = '0';
    seek.disabled = true;
    seek.setAttribute('aria-label', '播放进度');
    seek.setAttribute('title', '播放进度');

    seekThumb.className = 'medieval-bgm-player__seek-thumb';
    seekThumb.setAttribute('aria-hidden', 'true');

    volume.className = 'medieval-bgm-player__volume';
    volume.type = 'range';
    volume.min = '0';
    volume.max = '100';
    volume.step = '1';
    volume.value = String(Math.round(clamp(storedVolume, 0, 1) * 100));
    volume.setAttribute('aria-label', '音量');
    volume.setAttribute('title', '音量');

    dock.className = 'medieval-bgm-player__dock';
    dock.type = 'button';
    dock.setAttribute('aria-label', '展开背景音乐播放器');
    dock.setAttribute('title', '展开');
    dockIcon.className = 'medieval-bgm-player__dock-icon';
    dockIcon.setAttribute('aria-hidden', 'true');
    dock.appendChild(dockIcon);

    audio.loop = true;
    audio.preload = 'metadata';
    audio.volume = clamp(storedVolume, 0, 1);

    status.appendChild(title);
    status.appendChild(phase);
    seekWrap.appendChild(seek);
    seekWrap.appendChild(seekThumb);
    meta.appendChild(status);
    meta.appendChild(seekWrap);
    meta.appendChild(time);
    secondary.appendChild(volume);
    secondary.appendChild(collapse);
    panel.appendChild(play);
    panel.appendChild(meta);
    panel.appendChild(secondary);
    root.appendChild(panel);
    root.appendChild(dock);
    root.appendChild(audio);
    document.body.appendChild(root);

    state.root = root;
    state.audio = audio;
    state.wantedPlaying = typeof store.wantedPlaying === 'boolean'
      ? store.wantedPlaying
      : HOME_AUTOPLAY && isHomePage();
    state.elements = {
      play: play,
      title: title,
      phase: phase,
      seek: seek,
      seekThumb: seekThumb,
      time: time,
      volume: volume,
      collapse: collapse,
      dock: dock
    };

    if (validPositionRatio(store.positionRatio)) {
      state.positionRatio = {
        x: clamp(store.positionRatio.x, 0, 1),
        y: clamp(store.positionRatio.y, 0, 1)
      };
      placeByPositionRatio();
    } else if (validPosition(store.position)) {
      placeRoot(store.position.left, store.position.top);
      rememberCurrentPositionRatio();
    }
  }

  function bindEvents() {
    var observer;

    function beginDrag(event) {
      var rect;

      if (!shouldStartDrag(event)) return;

      rect = state.root.getBoundingClientRect();
      state.dragging = true;
      state.dragMoved = false;
      state.dragPointerId = event.pointerId;
      state.dragStartX = event.clientX;
      state.dragStartY = event.clientY;
      state.dragStartLeft = rect.left;
      state.dragStartTop = rect.top;
      state.dragStartedOnDock = Boolean(event.target.closest('.medieval-bgm-player__dock'));
      state.root.classList.add('is-dragging');
      placeRoot(rect.left, rect.top);

      if (state.root.setPointerCapture && event.pointerId !== undefined) {
        try {
          state.root.setPointerCapture(event.pointerId);
        } catch (error) {
          // Pointer capture can fail for synthetic or already-captured events.
        }
      }
    }

    function moveDrag(event) {
      var dx;
      var dy;

      if (!state.dragging || event.pointerId !== state.dragPointerId) return;

      dx = event.clientX - state.dragStartX;
      dy = event.clientY - state.dragStartY;

      if (!state.dragMoved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;

      state.dragMoved = true;
      placeRoot(state.dragStartLeft + dx, state.dragStartTop + dy);
      event.preventDefault();
    }

    function endDrag(event) {
      if (!state.dragging || event.pointerId !== state.dragPointerId) return;

      if (state.root.releasePointerCapture && event.pointerId !== undefined) {
        try {
          state.root.releasePointerCapture(event.pointerId);
        } catch (error) {
          // Pointer capture may already be released by the browser.
        }
      }

      state.root.classList.remove('is-dragging');

      if (state.dragMoved) {
        storePosition();
        state.suppressClick = true;
        window.setTimeout(function () {
          state.suppressClick = false;
        }, 0);
        event.preventDefault();
      } else if (state.dragStartedOnDock && state.root.classList.contains('is-collapsed')) {
        openCollapsedPlayer();
        state.suppressClick = true;
        window.setTimeout(function () {
          state.suppressClick = false;
        }, 0);
        event.preventDefault();
      }

      state.dragging = false;
      state.dragMoved = false;
      state.dragPointerId = null;
      state.dragStartedOnDock = false;
    }

    state.root.addEventListener('pointerdown', beginDrag);
    state.root.addEventListener('pointermove', moveDrag);
    state.root.addEventListener('pointerup', endDrag);
    state.root.addEventListener('pointercancel', endDrag);

    state.elements.play.addEventListener('click', function () {
      if (state.audio.paused) {
        state.wantedPlaying = true;
        writeStore({ wantedPlaying: true });
        attemptPlay();
      } else {
        state.wantedPlaying = false;
        writeStore({ wantedPlaying: false });
        state.audio.pause();
        updatePlaying(false);
      }
    });

    state.elements.collapse.addEventListener('click', function () {
      var anchor = getDockAnchor();

      state.root.classList.add('is-collapsed');
      placeRootByDockAnchor(anchor);
      storeLayoutState({ collapsed: true });
    });

    state.elements.dock.addEventListener('click', function (event) {
      if (state.suppressClick) {
        event.preventDefault();
        return;
      }

      openCollapsedPlayer();
    });

    state.elements.volume.addEventListener('input', function () {
      var volume = clamp((Number(state.elements.volume.value) || 0) / 100, 0, 1);

      state.audio.volume = volume;
      writeStore({ volume: volume });
    });

    state.elements.seek.addEventListener('pointerdown', function () {
      clearCommittedSeek();
      clearSeekCommitTimer();
      state.isSeeking = true;
      state.pendingSeekValue = null;
    });

    state.elements.seek.addEventListener('input', function () {
      clearSeekCommitTimer();
      state.isSeeking = true;
      state.pendingSeekValue = getSeekInputValue();
      previewSeekValue(state.pendingSeekValue);
    });

    state.elements.seek.addEventListener('change', function () {
      scheduleFinishSeek(0);
    });

    document.addEventListener('pointerup', function () {
      if (!state.isSeeking) return;
      scheduleFinishSeek(60);
    });

    document.addEventListener('pointercancel', function () {
      if (!state.isSeeking) return;
      scheduleFinishSeek(60);
    });

    state.audio.addEventListener('loadedmetadata', function () {
      setError(false);
      restorePendingTrackTime();
      state.isChangingTrack = false;
      updateProgress();

      if (state.playAfterTrackLoad) {
        state.playAfterTrackLoad = false;
        attemptPlay();
      }
    });

    state.audio.addEventListener('durationchange', updateProgress);
    state.audio.addEventListener('timeupdate', function () {
      var protectedSeek = protectRecentUserSeek();

      updateProgress();

      if (!protectedSeek) {
        storePlaybackTime(false);
      }
    });
    state.audio.addEventListener('seeked', function () {
      var protectedSeek = protectRecentUserSeek();

      updateProgress();

      if (!protectedSeek) {
        storePlaybackTime(true);
      }
    });
    state.audio.addEventListener('play', function () {
      enforceRecentUserSeek();
      updatePlaying(true);
      startProgressLoop();
    });
    state.audio.addEventListener('pause', function () {
      if (!state.isChangingTrack) {
        storePlaybackTime(true);
      }

      updatePlaying(false);
      stopProgressLoop();
      updateProgress();
    });
    state.audio.addEventListener('ended', function () {
      if (state.audio.loop && state.wantedPlaying && !state.hasError) {
        updatePlaying(true);
        startProgressLoop();
        return;
      }

      stopProgressLoop();
      clearRecentUserSeek();
      updatePlaying(false);
      updateProgress();
    });
    state.audio.addEventListener('error', function () {
      state.isChangingTrack = false;
      setError(true);
      updatePlaying(false);
      updateProgress();
    });

    observer = new MutationObserver(function () {
      var nextTheme = getTheme();

      if (nextTheme !== state.currentTheme) {
        setTrack(nextTheme, true);
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    window.addEventListener('resize', function () {
      placeByPositionRatio();
    });

    window.addEventListener('pagehide', function () {
      storePlaybackTime(true);
    });

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') {
        storePlaybackTime(true);
      }
    });
  }

  function init() {
    if (document.getElementById(ROOT_ID)) return;

    buildPlayer();
    bindEvents();
    setTrack(getTheme(), state.wantedPlaying);
    updateProgress();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
