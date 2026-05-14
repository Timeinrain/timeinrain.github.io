(function () {
  var ROOT_ID = 'live2d-kanban';
  var STORE_KEY = 'timeinrain-live2d-hijiki-minimized';
  var POSITION_KEY = 'timeinrain-live2d-hijiki-position';
  var MODEL_URL = '/kanban/tororo_hijiki/tororo_hijiki/hijiki/runtime/hijiki.model3.json';
  var TALK_DURATION = 4600;
  var DRAG_THRESHOLD = 5;
  var CAT_HOP_MIN_DELAY = 1600;
  var CAT_HOP_MAX_DELAY = 2800;
  var CAT_MEOW_MIN_DELAY = 7800;
  var CAT_MEOW_MAX_DELAY = 12800;
  var CAT_MEOW_DURATION = 1600;

  var DEPENDENCIES = [
    {
      key: 'live2d-cubism-core',
      src: 'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js',
      ready: function () {
        return Boolean(window.Live2DCubismCore);
      }
    },
    {
      key: 'pixi-js-v6',
      src: 'https://cdn.jsdelivr.net/npm/pixi.js@6.5.10/dist/browser/pixi.min.js',
      ready: function () {
        return Boolean(window.PIXI && window.PIXI.Application);
      }
    },
    {
      key: 'pixi-live2d-display-cubism4',
      src: 'https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/dist/cubism4.min.js',
      ready: function () {
        return Boolean(window.PIXI && window.PIXI.live2d && window.PIXI.live2d.Live2DModel);
      }
    }
  ];

  var TAP_MOTIONS = [
    { group: 'Tap', count: 3 },
    { group: 'Flick', count: 1 },
    { group: 'FlickUp', count: 1 },
    { group: 'FlickDown', count: 1 }
  ];

  var LINES = [
    '\u55e8\uff0c\u6211\u662f Hijiki\uff0c\u5728\u8fd9\u91cc\u966a\u4f60\u5199\u535a\u5ba2\u3002',
    '\u4eca\u5929\u4e5f\u6162\u6162\u63a8\u8fdb\uff0c\u5148\u5b8c\u6210\u4e00\u4e2a\u5c0f\u76ee\u6807\u3002',
    '\u6211\u5b88\u5728\u5de6\u4e0b\u89d2\uff0c\u6709\u7075\u611f\u5c31\u6233\u6233\u6211\u3002',
    '\u4f11\u606f\u4e00\u4e0b\u4e5f\u6ca1\u5173\u7cfb\uff0c\u56de\u6765\u7ee7\u7eed\u5c31\u597d\u3002',
    '\u62d6\u52a8\u6211\u53ef\u4ee5\u6362\u4f4d\u7f6e\uff0c\u653e\u5f00\u540e\u6211\u4f1a\u8bb0\u4f4f\u3002'
  ];

  var state = window.__timeinrainLive2dHijiki || {
    ready: false,
    loading: false,
    app: null,
    model: null,
    root: null,
    idleTimer: null,
    talkTimer: null,
    catHopTimer: null,
    catHopClassTimer: null,
    catMeowTimer: null,
    catMeowClassTimer: null,
    resizeTimer: null,
    dragging: false,
    dragMoved: false,
    suppressClick: false,
    dragPointerId: null,
    dragCaptureEl: null,
    dragStartX: 0,
    dragStartY: 0,
    dragStartLeft: 0,
    dragStartTop: 0,
    catHomeLeft: null,
    catHomeTop: null
  };

  window.__timeinrainLive2dHijiki = state;

  function randomItem(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function safelyStore(value) {
    try {
      localStorage.setItem(STORE_KEY, value);
    } catch (error) {
      // Local storage can be unavailable in private or restricted contexts.
    }
  }

  function safelyReadStore() {
    try {
      return localStorage.getItem(STORE_KEY);
    } catch (error) {
      return null;
    }
  }

  function safelyReadPosition() {
    try {
      return JSON.parse(localStorage.getItem(POSITION_KEY) || 'null');
    } catch (error) {
      return null;
    }
  }

  function safelyStorePosition(root) {
    var rect = root.getBoundingClientRect();

    try {
      localStorage.setItem(POSITION_KEY, JSON.stringify({
        left: Math.round(rect.left),
        top: Math.round(rect.top)
      }));
    } catch (error) {
      // Local storage can be unavailable in private or restricted contexts.
    }
  }

  function placeRoot(root, left, top) {
    var maxLeft = Math.max(0, window.innerWidth - root.offsetWidth);
    var maxTop = Math.max(0, window.innerHeight - root.offsetHeight);

    root.style.left = clamp(left, 0, maxLeft) + 'px';
    root.style.top = clamp(top, 0, maxTop) + 'px';
    root.style.right = 'auto';
    root.style.bottom = 'auto';
  }

  function applySavedPosition(root) {
    var position = safelyReadPosition();

    if (!position || typeof position.left !== 'number' || typeof position.top !== 'number') return;

    placeRoot(root, position.left, position.top);
  }

  function clampRootToViewport() {
    var root = getRoot();
    var rect;

    if (!root.style.top || !root.style.left) return;

    rect = root.getBoundingClientRect();
    placeRoot(root, rect.left, rect.top);
  }

  function loadScriptOnce(item) {
    var existing;

    if (item.ready()) {
      return Promise.resolve();
    }

    existing = document.querySelector('script[data-live2d-kanban="' + item.key + '"]');

    if (existing) {
      return new Promise(function (resolve, reject) {
        if (item.ready()) {
          resolve();
          return;
        }

        existing.addEventListener('load', function () {
          item.ready() ? resolve() : reject(new Error(item.key + ' did not expose its API.'));
        }, { once: true });
        existing.addEventListener('error', function () {
          reject(new Error('Failed to load ' + item.src));
        }, { once: true });
      });
    }

    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');

      script.src = item.src;
      script.async = false;
      script.defer = true;
      script.setAttribute('data-live2d-kanban', item.key);
      script.onload = function () {
        item.ready() ? resolve() : reject(new Error(item.key + ' did not expose its API.'));
      };
      script.onerror = function () {
        reject(new Error('Failed to load ' + item.src));
      };

      document.head.appendChild(script);
    });
  }

  function loadDependencies() {
    return DEPENDENCIES.reduce(function (promise, item) {
      return promise.then(function () {
        return loadScriptOnce(item);
      });
    }, Promise.resolve());
  }

  function createKanban() {
    var root = document.createElement('aside');

    root.id = ROOT_ID;
    root.className = 'live2d-kanban is-loading';
    root.setAttribute('aria-label', 'Hijiki Live2D \u770b\u677f');
    root.innerHTML = [
      '<div class="live2d-kanban__bubble" aria-live="polite"></div>',
      '<div class="live2d-kanban__controls">',
      '<button class="live2d-kanban__button" type="button" data-kanban-action="minimize"></button>',
      '</div>',
      '<button class="live2d-kanban__restore" type="button" data-kanban-action="restore"></button>',
      '<div class="live2d-kanban__stage">',
      '<div class="live2d-kanban__canvas-wrap">',
      '<canvas class="live2d-kanban__canvas"></canvas>',
      '</div>',
      '<div class="live2d-kanban__loading">Loading Hijiki...</div>',
      '</div>'
    ].join('');

    root.querySelector('[data-kanban-action="minimize"]').setAttribute('aria-label', '\u6536\u8d77\u770b\u677f');
    root.querySelector('[data-kanban-action="restore"]').setAttribute('aria-label', '\u5c55\u5f00\u770b\u677f');

    document.body.appendChild(root);
    return root;
  }

  function getRoot() {
    state.root = document.getElementById(ROOT_ID) || createKanban();
    return state.root;
  }

  function setMinimized(minimized) {
    var root = getRoot();

    root.classList.toggle('is-minimized', minimized);
    root.classList.remove('is-talking');
    safelyStore(minimized ? '1' : '0');

    if (minimized) {
      setCatHome(root);
      scheduleCatHop();
      scheduleCatMeow();
    } else {
      stopCatIdle();
    }
  }

  function setCatHome(root) {
    var rect;

    root = root || getRoot();
    rect = root.getBoundingClientRect();
    state.catHomeLeft = rect.left;
    state.catHomeTop = rect.top;
  }

  function ensureCatHome(root) {
    if (typeof state.catHomeLeft !== 'number' || typeof state.catHomeTop !== 'number') {
      setCatHome(root);
    }
  }

  function stopCatHop() {
    window.clearTimeout(state.catHopTimer);
    window.clearTimeout(state.catHopClassTimer);
    state.catHopTimer = null;
    state.catHopClassTimer = null;
    getRoot().classList.remove('is-hopping');
  }

  function stopCatMeow() {
    window.clearTimeout(state.catMeowTimer);
    window.clearTimeout(state.catMeowClassTimer);
    state.catMeowTimer = null;
    state.catMeowClassTimer = null;
    getRoot().classList.remove('is-meowing');
  }

  function stopCatIdle() {
    stopCatHop();
    stopCatMeow();
  }

  function scheduleCatHop() {
    var delay = CAT_HOP_MIN_DELAY + Math.random() * (CAT_HOP_MAX_DELAY - CAT_HOP_MIN_DELAY);

    window.clearTimeout(state.catHopTimer);
    state.catHopTimer = window.setTimeout(function () {
      var root = getRoot();
      var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var dx;
      var dy;

      if (!root.classList.contains('is-minimized') || root.classList.contains('is-hidden') || state.dragging || reduceMotion) {
        if (root.classList.contains('is-minimized') && !root.classList.contains('is-hidden')) {
          scheduleCatHop();
        }
        return;
      }

      ensureCatHome(root);
      dx = Math.round(Math.random() * 14) - 7;
      dy = Math.round(Math.random() * 12) - 8;

      root.classList.add('is-hopping');
      placeRoot(root, state.catHomeLeft + dx, state.catHomeTop + dy);
      window.clearTimeout(state.catHopClassTimer);
      state.catHopClassTimer = window.setTimeout(function () {
        root.classList.remove('is-hopping');
      }, 520);
      scheduleCatHop();
    }, delay);
  }

  function scheduleCatMeow() {
    var delay = CAT_MEOW_MIN_DELAY + Math.random() * (CAT_MEOW_MAX_DELAY - CAT_MEOW_MIN_DELAY);

    window.clearTimeout(state.catMeowTimer);
    state.catMeowTimer = window.setTimeout(function () {
      var root = getRoot();

      if (!root.classList.contains('is-minimized') || root.classList.contains('is-hidden') || state.dragging || root.classList.contains('is-hopping')) {
        if (root.classList.contains('is-minimized') && !root.classList.contains('is-hidden')) {
          scheduleCatMeow();
        }
        return;
      }

      root.classList.add('is-meowing');
      window.clearTimeout(state.catMeowClassTimer);
      state.catMeowClassTimer = window.setTimeout(function () {
        root.classList.remove('is-meowing');
      }, CAT_MEOW_DURATION);
      scheduleCatMeow();
    }, delay);
  }

  function speak(text, duration) {
    var root = getRoot();
    var bubble = root.querySelector('.live2d-kanban__bubble');

    if (!bubble || root.classList.contains('is-minimized') || root.classList.contains('is-hidden')) return;

    window.clearTimeout(state.talkTimer);
    bubble.textContent = text || randomItem(LINES);
    root.classList.add('is-talking');

    state.talkTimer = window.setTimeout(function () {
      root.classList.remove('is-talking');
    }, duration || TALK_DURATION);
  }

  function showError(message) {
    var root = getRoot();
    var bubble = root.querySelector('.live2d-kanban__bubble');

    root.classList.remove('is-loading');
    root.classList.add('is-error');

    if (bubble) {
      bubble.textContent = message || 'Hijiki \u52a0\u8f7d\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u7f51\u7edc\u4f9d\u8d56\u3002';
    }
  }

  function playMotion(group, index) {
    var model = state.model;
    var priority = window.PIXI && window.PIXI.live2d && window.PIXI.live2d.MotionPriority;

    if (!model) return;

    try {
      if (typeof model.motion === 'function') {
        model.motion(group, index || 0, priority ? priority.FORCE : undefined);
      } else if (model.internalModel && model.internalModel.motionManager) {
        model.internalModel.motionManager.startMotion(group, index || 0, priority ? priority.FORCE : 3);
      }
    } catch (error) {
      // Some runtimes reject a motion while another one is fading out.
    }
  }

  function playRandomTapMotion() {
    var motion = randomItem(TAP_MOTIONS);
    var index = Math.floor(Math.random() * motion.count);

    playMotion(motion.group, index);
  }

  function scheduleIdle() {
    window.clearTimeout(state.idleTimer);

    state.idleTimer = window.setTimeout(function () {
      if (state.model && !document.hidden) {
        playMotion('Idle', Math.floor(Math.random() * 3));
      }

      scheduleIdle();
    }, 18000 + Math.random() * 12000);
  }

  function layoutModel() {
    var root = getRoot();
    var stage = root.querySelector('.live2d-kanban__stage');
    var app = state.app;
    var model = state.model;
    var width;
    var height;
    var bounds;
    var scale;

    if (!stage || !app || !model) return;

    width = Math.max(180, Math.round(stage.clientWidth || 282));
    height = Math.max(240, Math.round(stage.clientHeight || 362));

    app.renderer.resize(width, height);

    bounds = model.getLocalBounds ? model.getLocalBounds() : {
      x: 0,
      y: 0,
      width: model.width || width,
      height: model.height || height
    };

    scale = Math.min(
      width * 0.98 / Math.max(1, bounds.width),
      height * 1.08 / Math.max(1, bounds.height)
    );

    model.scale.set(scale);
    model.x = width / 2 - (bounds.x + bounds.width / 2) * scale;
    model.y = height - 12 - (bounds.y + bounds.height) * scale;
  }

  function bindModelEvents() {
    var root = getRoot();
    var stage = root.querySelector('.live2d-kanban__stage');
    var restore = root.querySelector('.live2d-kanban__restore');

    if (!stage || stage.dataset.hijikiEventsReady === 'true') return;

    stage.dataset.hijikiEventsReady = 'true';

    function startDrag(event) {
      var actionButton;
      var dragHandle;
      var rect;

      if (event.button !== undefined && event.button !== 0) return;

      actionButton = event.target.closest('[data-kanban-action]');
      if (actionButton && actionButton.getAttribute('data-kanban-action') !== 'restore') return;

      dragHandle = event.currentTarget;
      window.clearTimeout(state.catHopTimer);
      window.clearTimeout(state.catHopClassTimer);
      window.clearTimeout(state.catMeowTimer);
      window.clearTimeout(state.catMeowClassTimer);
      state.catHopTimer = null;
      state.catHopClassTimer = null;
      state.catMeowTimer = null;
      state.catMeowClassTimer = null;
      root.classList.remove('is-hopping', 'is-meowing');

      rect = root.getBoundingClientRect();
      state.dragging = true;
      state.dragMoved = false;
      state.dragPointerId = event.pointerId;
      state.dragCaptureEl = dragHandle;
      state.dragStartX = event.clientX;
      state.dragStartY = event.clientY;
      state.dragStartLeft = rect.left;
      state.dragStartTop = rect.top;
      root.classList.add('is-dragging');
      placeRoot(root, rect.left, rect.top);

      if (dragHandle && dragHandle.setPointerCapture) {
        try {
          dragHandle.setPointerCapture(event.pointerId);
        } catch (error) {
          // Pointer capture is best effort across browsers.
        }
      }
    }

    function drag(event) {
      var dx;
      var dy;

      if (!state.dragging || event.pointerId !== state.dragPointerId) return;

      dx = event.clientX - state.dragStartX;
      dy = event.clientY - state.dragStartY;

      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        state.dragMoved = true;
      }

      placeRoot(root, state.dragStartLeft + dx, state.dragStartTop + dy);
      event.preventDefault();
    }

    function endDrag(event) {
      var dragCaptureEl;

      if (!state.dragging || event.pointerId !== state.dragPointerId) return;

      dragCaptureEl = state.dragCaptureEl || stage;

      if (dragCaptureEl && dragCaptureEl.releasePointerCapture) {
        try {
          dragCaptureEl.releasePointerCapture(event.pointerId);
        } catch (error) {
          // Pointer capture is best effort across browsers.
        }
      }

      root.classList.remove('is-dragging');
      state.dragging = false;
      state.dragPointerId = null;
      state.dragCaptureEl = null;
      state.suppressClick = state.dragMoved;

      if (state.dragMoved) {
        if (root.classList.contains('is-minimized')) {
          setCatHome(root);
        }

        safelyStorePosition(root);
      }

      if (root.classList.contains('is-minimized')) {
        scheduleCatHop();
        scheduleCatMeow();
      }

      window.setTimeout(function () {
        state.suppressClick = false;
      }, 120);
    }

    stage.addEventListener('pointerdown', startDrag, { passive: false });
    if (restore) {
      restore.addEventListener('pointerdown', startDrag, { passive: false });
    }
    window.addEventListener('pointermove', drag, { passive: false });
    window.addEventListener('pointerup', endDrag, { passive: true });
    window.addEventListener('pointercancel', endDrag, { passive: true });

    stage.addEventListener('pointermove', function (event) {
      if (state.dragging) return;

      if (state.model && typeof state.model.focus === 'function') {
        state.model.focus(event.clientX, event.clientY);
      }
    }, { passive: true });

    stage.addEventListener('pointerleave', function () {
      if (state.model && typeof state.model.focus === 'function') {
        state.model.focus(window.innerWidth / 2, window.innerHeight / 2);
      }
    }, { passive: true });

    stage.addEventListener('click', function (event) {
      if (event.target.closest('button')) return;
      if (state.suppressClick) {
        state.suppressClick = false;
        event.preventDefault();
        return;
      }

      playRandomTapMotion();
      speak(randomItem(LINES));
    });
  }

  function bindControls() {
    var root = getRoot();

    if (root.dataset.hijikiControlsReady === 'true') return;

    root.dataset.hijikiControlsReady = 'true';
    root.addEventListener('click', function (event) {
      var button = event.target.closest('[data-kanban-action]');
      var action;

      if (!button || !root.contains(button)) return;

      if (state.suppressClick) {
        state.suppressClick = false;
        event.preventDefault();
        return;
      }

      action = button.getAttribute('data-kanban-action');

      if (action === 'minimize') {
        setMinimized(true);
      }

      if (action === 'restore') {
        setMinimized(false);
        speak('Hijiki \u56de\u6765\u4e86\uff0c\u7ee7\u7eed\u966a\u4f60\u3002');
      }
    });
  }

  function bindResize() {
    if (state.resizeReady) return;

    state.resizeReady = true;
    window.addEventListener('resize', function () {
      window.clearTimeout(state.resizeTimer);
      state.resizeTimer = window.setTimeout(function () {
        var root = getRoot();

        layoutModel();
        clampRootToViewport();

        if (root.classList.contains('is-minimized')) {
          setCatHome(root);
        }
      }, 120);
    }, { passive: true });
  }

  function createPixiApp(canvas) {
    return new window.PIXI.Application({
      view: canvas,
      autoStart: true,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2)
    });
  }

  function initModel() {
    var root = getRoot();
    var canvas = root.querySelector('.live2d-kanban__canvas');
    var Live2DModel;

    if (!canvas || state.loading || state.model) return Promise.resolve();

    state.loading = true;
    root.classList.add('is-loading');

    return loadDependencies()
      .then(function () {
        Live2DModel = window.PIXI.live2d.Live2DModel;
        state.app = createPixiApp(canvas);

        return Live2DModel.from(MODEL_URL, {
          autoInteract: false,
          autoUpdate: true
        });
      })
      .then(function (model) {
        state.model = model;
        state.app.stage.addChild(model);
        state.app.stage.sortableChildren = true;

        layoutModel();
        bindModelEvents();
        bindResize();
        scheduleIdle();

        root.classList.remove('is-loading', 'is-error');
        playMotion('Idle', 0);
        window.setTimeout(function () {
          speak('Hijiki \u767b\u573a\u4e86\uff0c\u4eca\u5929\u4e5f\u8bf7\u591a\u6307\u6559\u3002');
        }, 600);
      })
      .catch(function () {
        showError('Hijiki \u52a0\u8f7d\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u7f51\u7edc\u4f9d\u8d56\u3002');
      })
      .then(function () {
        state.loading = false;
      });
  }

  function initKanban() {
    var root;

    if (!document.body) return;

    root = getRoot();
    applySavedPosition(root);

    if (safelyReadStore() === '1') {
      root.classList.add('is-minimized');
      setCatHome(root);
      scheduleCatHop();
      scheduleCatMeow();
    }

    bindControls();

    if (state.ready) {
      layoutModel();
      return;
    }

    state.ready = true;
    initModel();
  }

  initKanban();
  document.addEventListener('DOMContentLoaded', initKanban);
  document.addEventListener('pjax:complete', initKanban);
}());
