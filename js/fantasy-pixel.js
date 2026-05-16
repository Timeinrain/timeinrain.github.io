(function () {
  var FOOTER_LIGHTNING_DURATION = 1900;
  var FOOTER_LIGHTNING_CRATER_DURATION = 2000;
  var FOOTER_LIGHTNING_ASSET_VERSION = 10;
  var FOOTER_LIGHTNING_PREWARM_TIMEOUT = 420;
  var FOOTER_LIGHTNING_READY_TIMEOUT = 1800;
  var messageBoardTwikooObserver = null;
  var messageBoardTwikooCleanupTimer = null;
  var messageBoardTwikooCleanupRuns = 0;
  var transparentPixelGif = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
  var footerLightningBlob = null;
  var footerLightningBlobPromise = null;
  var footerLightningPreloadImage = null;
  var lastFooterMagicTouchAt = 0;

  function footerLightningStrikeSrc() {
    return '/anim/lightning_strike.gif?v=' + FOOTER_LIGHTNING_ASSET_VERSION;
  }

  function isCoarsePointerDevice() {
    return Boolean(
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
      'ontouchstart' in window
    );
  }

  function preloadFooterLightningStrike() {
    var fallbackImage;

    if (footerLightningBlob) return Promise.resolve(footerLightningBlob);
    if (footerLightningBlobPromise) return footerLightningBlobPromise;

    if (
      !isCoarsePointerDevice() &&
      typeof window.fetch === 'function' &&
      window.URL &&
      typeof window.URL.createObjectURL === 'function'
    ) {
      footerLightningBlobPromise = window.fetch(footerLightningStrikeSrc(), {
        cache: 'force-cache',
        credentials: 'same-origin'
      }).then(function (response) {
        if (!response || !response.ok) throw new Error('Lightning preload failed');

        return response.blob();
      }).then(function (blob) {
        if (blob && blob.size > 0) footerLightningBlob = blob;

        return footerLightningBlob;
      }).catch(function () {
        return null;
      }).then(function (blob) {
        footerLightningBlobPromise = null;

        return blob;
      });

      return footerLightningBlobPromise;
    }

    if (typeof window.Image === 'function') {
      fallbackImage = new window.Image();
      footerLightningPreloadImage = fallbackImage;
      fallbackImage.decoding = 'async';
      if ('fetchPriority' in fallbackImage) fallbackImage.fetchPriority = 'high';
      if ('loading' in fallbackImage) fallbackImage.loading = 'eager';
      fallbackImage.src = footerLightningStrikeSrc();
    }

    footerLightningBlobPromise = Promise.resolve(null);
    return footerLightningBlobPromise;
  }

  function createFooterLightningPlaybackSrc(runId) {
    var objectUrl;

    if (
      !isCoarsePointerDevice() &&
      footerLightningBlob &&
      window.URL &&
      typeof window.URL.createObjectURL === 'function'
    ) {
      objectUrl = window.URL.createObjectURL(footerLightningBlob);

      return {
        src: objectUrl,
        objectUrl: objectUrl
      };
    }

    return {
      src: footerLightningStrikeSrc() + '&run=' + runId,
      objectUrl: ''
    };
  }

  function resolveWithTimeout(promise, timeout, fallback) {
    return new Promise(function (resolve) {
      var done = false;
      var timer = window.setTimeout(function () {
        if (done) return;
        done = true;
        resolve(fallback);
      }, timeout);

      promise.then(function (value) {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        resolve(value);
      }, function () {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        resolve(fallback);
      });
    });
  }

  function waitForFooterLightningImage(bolt, timeout) {
    return new Promise(function (resolve) {
      var done = false;
      var timer;

      function finish(ready) {
        if (done) return;
        done = true;
        if (timer) window.clearTimeout(timer);
        bolt.removeEventListener('load', onLoad);
        bolt.removeEventListener('error', onError);
        resolve(ready);
      }

      function finishLoaded() {
        if (typeof bolt.decode === 'function') {
          bolt.decode().then(function () {
            finish(true);
          }, function () {
            finish(true);
          });
          return;
        }

        finish(true);
      }

      function onLoad() {
        finishLoaded();
      }

      function onError() {
        finish(false);
      }

      if (!bolt || !bolt.isConnected) {
        resolve(false);
        return;
      }

      if (bolt.complete && bolt.naturalWidth > 0) {
        finishLoaded();
        return;
      }

      bolt.addEventListener('load', onLoad);
      bolt.addEventListener('error', onError);
      timer = window.setTimeout(function () {
        finish(false);
      }, timeout);
    });
  }

  function setFooterLightningBoltSrc(bolt, runId) {
    var playback = createFooterLightningPlaybackSrc(runId);

    bolt.src = playback.src;
    if (playback.objectUrl) {
      bolt.dataset.footerLightningObjectUrl = playback.objectUrl;
    } else {
      bolt.removeAttribute('data-footer-lightning-object-url');
    }

    return waitForFooterLightningImage(bolt, FOOTER_LIGHTNING_READY_TIMEOUT);
  }

  function prepareFooterLightningBolt(bolt, runId) {
    if (!bolt) return Promise.resolve(false);

    return resolveWithTimeout(
      preloadFooterLightningStrike(),
      FOOTER_LIGHTNING_PREWARM_TIMEOUT,
      null
    ).then(function () {
      if (!bolt.isConnected) return false;

      if (isCoarsePointerDevice()) {
        return resolveWithTimeout(setFooterLightningBoltSrc(bolt, runId), 180, false);
      }

      return setFooterLightningBoltSrc(bolt, runId);
    });
  }

  function revokeFooterLightningBoltSrc(node) {
    var bolt;
    var objectUrl;

    if (!node || !window.URL || typeof window.URL.revokeObjectURL !== 'function') return;

    bolt = node.querySelector && node.querySelector('.footer-magic-bolt');
    objectUrl = bolt && bolt.dataset.footerLightningObjectUrl;
    if (!objectUrl) return;

    window.URL.revokeObjectURL(objectUrl);
    bolt.removeAttribute('data-footer-lightning-object-url');
  }

  function createSpark(x, y) {
    var spark = document.createElement('span');
    spark.className = 'pixel-spark';
    spark.style.left = x + 'px';
    spark.style.top = y + 'px';
    document.body.appendChild(spark);

    window.setTimeout(function () {
      spark.remove();
    }, 700);
  }

  function footerPlaygroundAtPoint(event) {
    var stage = document.getElementById('fantasy-footer-playground');
    var rect;

    if (!stage) return null;

    if (event.target && event.target.closest && event.target.closest('#fantasy-footer-playground')) {
      return stage;
    }

    rect = stage.getBoundingClientRect();

    if (
      rect.width > 0 &&
      rect.height > 0 &&
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    ) {
      return stage;
    }

    return null;
  }

  function castFooterMagicFromClick(event) {
    var stage;

    if ((typeof event.button === 'number' && event.button !== 0) || event.__footerMagicHandled) return false;

    stage = footerPlaygroundAtPoint(event);
    if (stage) {
      if (lastFooterMagicTouchAt && Date.now() - lastFooterMagicTouchAt < 700) {
        event.__footerMagicHandled = true;
        return true;
      }

      if (typeof stage.__castFooterMagic === 'function') {
        stage.__castFooterMagic({
          clientX: event.clientX,
          clientY: event.clientY
        });
      }
      event.__footerMagicHandled = true;
      return true;
    }

    return false;
  }

  document.addEventListener('click', function (event) {
    castFooterMagicFromClick(event);
  }, { capture: true, passive: true });

  document.addEventListener('click', function (event) {
    if (event.button !== 0 || event.__footerMagicHandled) return;

    createSpark(event.clientX, event.clientY);
  }, { passive: true });

  function drawAdventurerRadar(canvas) {
    var context = canvas.getContext('2d');
    var items = [];
    var dpr = window.devicePixelRatio || 1;
    var measuredSize = Math.round(canvas.getBoundingClientRect().width || canvas.clientWidth || 0);
    var cssSize = Math.min(420, measuredSize || 340);
    var center = cssSize / 2;
    var radius = cssSize * (cssSize < 260 ? 0.22 : 0.24);
    var labelRadius = cssSize * (cssSize < 260 ? 0.34 : 0.36);
    var total = 0;

    try {
      items = JSON.parse(canvas.dataset.adventurerRadar || '[]');
    } catch (error) {
      items = [];
    }

    if (!context || !items.length) return;

    canvas.width = Math.round(cssSize * dpr);
    canvas.height = Math.round(cssSize * dpr);
    canvas.style.height = cssSize + 'px';
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, cssSize, cssSize);
    context.imageSmoothingEnabled = false;
    context.lineJoin = 'miter';
    context.lineCap = 'square';

    items.forEach(function (item) {
      total += Number(item.value) || 0;
    });

    function point(index, valueRadius) {
      var angle = -Math.PI / 2 + index * Math.PI * 2 / items.length;

      return {
        x: center + Math.cos(angle) * valueRadius,
        y: center + Math.sin(angle) * valueRadius
      };
    }

    function polygon(points, stroke, fill, lineWidth) {
      context.beginPath();
      points.forEach(function (p, index) {
        if (index === 0) {
          context.moveTo(p.x, p.y);
        } else {
          context.lineTo(p.x, p.y);
        }
      });
      context.closePath();

      if (fill) {
        context.fillStyle = fill;
        context.fill();
      }

      if (stroke) {
        context.strokeStyle = stroke;
        context.lineWidth = lineWidth || 2;
        context.stroke();
      }
    }

    function drawPixelLabel(text, x, y, align) {
      var paddingX = 6;
      var paddingY = 4;
      var fontSize = cssSize < 240 ? 10 : cssSize < 320 ? 11 : 13;
      var textWidth;
      var boxWidth;
      var boxHeight = fontSize + paddingY * 2 + 2;
      var boxX;
      var boxY;

      context.font = '700 ' + fontSize + 'px "Ark Pixel 12px Proportional SC", "Microsoft YaHei", monospace';
      textWidth = context.measureText(text).width;
      boxWidth = Math.min(cssSize - 6, Math.ceil(textWidth + paddingX * 2));
      boxX = align === 'right' ? x - boxWidth : align === 'center' ? x - boxWidth / 2 : x;
      boxY = y - boxHeight / 2;

      boxX = Math.max(3, Math.min(cssSize - boxWidth - 3, boxX));
      boxY = Math.max(3, Math.min(cssSize - boxHeight - 3, boxY));

      context.fillStyle = 'rgba(44, 27, 10, 0.92)';
      context.fillRect(Math.round(boxX), Math.round(boxY), boxWidth, boxHeight);

      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = '#fff0b5';
      context.shadowColor = '#050302';
      context.shadowOffsetX = 2;
      context.shadowOffsetY = 2;
      context.shadowBlur = 0;
      context.fillText(text, Math.round(boxX + boxWidth / 2), Math.round(boxY + boxHeight / 2 + 1), Math.max(10, boxWidth - paddingX * 2));
      context.shadowOffsetX = 0;
      context.shadowOffsetY = 0;
    }

    for (var level = 2; level <= 10; level += 2) {
      polygon(items.map(function (_, index) {
        return point(index, radius * level / 10);
      }), '#8a571b', null, 2);
    }

    items.forEach(function (_, index) {
      var p = point(index, radius);
      context.beginPath();
      context.moveTo(center, center);
      context.lineTo(p.x, p.y);
      context.strokeStyle = '#c89543';
      context.lineWidth = 2;
      context.stroke();
    });

    polygon(items.map(function (item, index) {
      return point(index, radius * Math.max(0, Math.min(10, Number(item.value) || 0)) / 10);
    }), '#ffe08a', 'rgba(219, 151, 48, 0.48)', 4);

    items.forEach(function (item, index) {
      var p = point(index, radius * Math.max(0, Math.min(10, Number(item.value) || 0)) / 10);
      var label = point(index, labelRadius);
      var align = 'center';

      context.fillStyle = '#fff0ac';
      context.fillRect(p.x - 4, p.y - 4, 8, 8);

      if (label.x < center - 20) align = 'right';
      if (label.x > center + 20) align = 'left';

      drawPixelLabel((item.label || '') + ' ' + item.value + '/10', label.x, label.y, align);
    });

    context.fillStyle = '#3a250d';
    context.strokeStyle = '#e0a33e';
    context.lineWidth = 2;
    var scoreBoxWidth = Math.min(124, Math.max(92, cssSize * 0.52));
    var scoreBoxHeight = Math.min(40, Math.max(30, cssSize * 0.15));
    var scoreFontSize = Math.min(17, Math.max(13, cssSize * 0.045));
    context.fillRect(center - scoreBoxWidth / 2, center - scoreBoxHeight / 2, scoreBoxWidth, scoreBoxHeight);
    context.strokeRect(center - scoreBoxWidth / 2, center - scoreBoxHeight / 2, scoreBoxWidth, scoreBoxHeight);
    context.font = '700 ' + scoreFontSize + 'px "Ark Pixel 12px Proportional SC", "Microsoft YaHei", monospace';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#fff2b8';
    context.fillText('总评 ' + (total / items.length).toFixed(1) + '/10', center, center + 1, scoreBoxWidth - 8);
  }

  function initAdventurerRadar() {
    var canvases = document.querySelectorAll('.adventurer-radar-canvas[data-adventurer-radar]');

    Array.prototype.forEach.call(canvases, drawAdventurerRadar);
  }

  function initCareerMap() {
    var board = document.querySelector('.career-map-board[data-career-map]');
    var dataNode = document.getElementById('career-map-data');

    if (!board || !dataNode || board.dataset.mapReady === 'true') return;

    var panel = board.querySelector('.career-map-info');
    var closeButton = board.querySelector('.career-map-info-close');
    var kickerNode = board.querySelector('.career-map-info-kicker');
    var titleNode = board.querySelector('.career-map-info-title');
    var textNode = board.querySelector('.career-map-info-text');
    var widgets = board.querySelectorAll('.career-map-widget[data-map-panel]');
    var mapData = {};
    var typingTimer = null;
    var activeKey = '';

    try {
      mapData = JSON.parse(dataNode.textContent || '{}');
    } catch (error) {
      mapData = {};
    }

    if (!panel || !kickerNode || !titleNode || !textNode || !widgets.length) return;

    board.dataset.mapReady = 'true';

    function clearTyping() {
      if (typingTimer) {
        window.clearTimeout(typingTimer);
        typingTimer = null;
      }

      panel.classList.remove('is-typing');
    }

    function setWidgetState(key) {
      Array.prototype.forEach.call(widgets, function (widget) {
        widget.classList.toggle('is-active', widget.dataset.mapPanel === key);
      });
    }

    function typeText(text) {
      var index = 0;
      var chunkSize = 4;
      var delay = 12;

      clearTyping();
      textNode.textContent = '';
      panel.classList.add('is-typing');

      function tick() {
        index = Math.min(text.length, index + chunkSize);
        textNode.textContent = text.slice(0, index);

        if (index < text.length) {
          typingTimer = window.setTimeout(tick, delay);
        } else {
          typingTimer = null;
          panel.classList.remove('is-typing');
        }
      }

      tick();
    }

    function activate(key) {
      var item = mapData[key];

      if (!item) return;

      if (activeKey === key && board.classList.contains('is-open')) return;

      activeKey = key;
      board.dataset.active = key;
      board.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
      kickerNode.textContent = item.kicker || '';
      titleNode.textContent = item.title || '';
      setWidgetState(key);
      typeText(item.text || '');
    }

    function reset() {
      activeKey = '';
      clearTyping();
      board.classList.remove('is-open');
      board.removeAttribute('data-active');
      panel.setAttribute('aria-hidden', 'true');
      kickerNode.textContent = '';
      titleNode.textContent = '';
      textNode.textContent = '';
      setWidgetState('');
    }

    Array.prototype.forEach.call(widgets, function (widget) {
      var key = widget.dataset.mapPanel;

      widget.addEventListener('mouseenter', function () {
        activate(key);
      });

      widget.addEventListener('focus', function () {
        activate(key);
      });
    });

    board.addEventListener('mouseleave', function () {
      reset();
    });

    if (closeButton) {
      closeButton.addEventListener('click', function (event) {
        event.preventDefault();
        reset();
      });
    }

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') reset();
    });
  }

  function initFooterSlimeGame() {
    var footer = document.getElementById('footer');
    var stage;
    var playground;

    if (!footer) return;

    footer.classList.remove('footer-slime-zone', 'is-magic-zone');
    stage = document.getElementById('fantasy-footer-playground');

    if (!stage) {
      stage = document.createElement('section');
      stage.id = 'fantasy-footer-playground';
      stage.className = 'footer-playground-zone footer-slime-zone';
      stage.setAttribute('aria-label', 'Magic monster playground');
      stage.innerHTML = [
        '<div class="footer-slime-playground">',
        '<div class="footer-playground-hud" aria-live="polite">',
        '<span>MAGIC HUNT</span>',
        '<strong>0</strong>',
        '</div>',
        '<div class="footer-slime-field"></div>',
        '<div class="footer-effects-layer"></div>',
        '<div class="footer-playground-ground"></div>',
        '</div>'
      ].join('');
      footer.parentNode.insertBefore(stage, footer);
    }

    playground = stage.querySelector('.footer-slime-playground');
    if (!playground) return;

    var effectsLayer = playground.querySelector('.footer-effects-layer');

    if (!effectsLayer) {
      effectsLayer = document.createElement('div');
      effectsLayer.className = 'footer-effects-layer';
      playground.appendChild(effectsLayer);
    }

    preloadFooterLightningStrike();

    if (stage.dataset.slimeGameReady === 'true') return;

    stage.dataset.slimeGameReady = 'true';

    var field = playground.querySelector('.footer-slime-field');
    var scoreNode = playground.querySelector('.footer-playground-hud strong');
    var wand = document.createElement('div');
    var active = false;
    var monsters = [];
    var pits = [];
    var rafId = null;
    var maintainTimer = null;
    var castingTimer = null;
    var score = 0;
    var mouseX = 0;
    var mouseY = 0;
    var minMonsters = 4;
    var maxMonsters = 15;
    var monsterSize = 32;
    var magicPitDuration = FOOTER_LIGHTNING_DURATION;
    var magicEffectRun = 0;
    var maxMagicPitNodes = 8;
    var maxLightningCraterNodes = 10;
    var maxHitBurstNodes = 70;
    var monsterSpawnRevealDelay = 280;
    var monsterSpawnJumpOutDuration = 430;
    var monsterSpawnEffectTail = 110;
    var monsterSpawnMoveDelay = 90;
    var monsterSpawnEffectWidth = 64;
    var monsterSpawnEffectHeight = 40;
    var monsterSpawnEffectAnchorX = 32.5;
    var monsterSpawnEffectAnchorY = 24.5;
    var monsterSpawnEffectVersion = 8;
    var monsterSpawnEffectRun = 0;
    var monsterTurnLeadDuration = 160;
    var monsterTypes = ['slime', 'slime-green', 'slime-yellow', 'bunny', 'ghost', 'flame'];

    wand.className = 'footer-magic-cursor';
    wand.setAttribute('aria-hidden', 'true');
    wand.innerHTML = [
      '<span class="footer-wand-inner">',
      '<span class="footer-wand-crystal"></span>',
      '<span class="footer-wand-ring"></span>',
      '<span class="footer-wand-shaft"></span>',
      '<span class="footer-wand-handle"></span>',
      '</span>'
    ].join('');
    document.body.appendChild(wand);

    function randomBetween(min, max) {
      return min + Math.random() * (max - min);
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function easeInOut(t) {
      return t * t * (3 - 2 * t);
    }

    function getMonsterFieldRange(footerWidth) {
      var minTarget = monsterSize + 16;
      var maxTarget = Math.max(minTarget, footerWidth - monsterSize - 16);

      return {
        min: minTarget,
        max: maxTarget
      };
    }

    function chooseMonsterRoute(side, type, footerWidth, targetX, quick) {
      var fieldRange = getMonsterFieldRange(footerWidth);
      var startX;
      var step;
      var endX;

      startX = typeof targetX === 'number' ?
        clamp(targetX, fieldRange.min, fieldRange.max) :
        randomBetween(fieldRange.min, fieldRange.max);
      step = randomBetween(
        type === 'ghost' ? 34 : 40,
        quick ? 76 : type === 'bunny' ? 96 : 88
      );

      if (startX - step < fieldRange.min) {
        side = 'right';
      } else if (startX + step > fieldRange.max) {
        side = 'left';
      }

      endX = side === 'left' ? startX - step : startX + step;

      return {
        side: side,
        fromOutside: false,
        startX: startX,
        endX: clamp(endX, fieldRange.min, fieldRange.max)
      };
    }

    function chooseMonsterWanderTarget(monster, footerWidth) {
      var fieldRange = getMonsterFieldRange(footerWidth);
      var fromX = clamp(monster.endX, fieldRange.min, fieldRange.max);
      var direction = Math.random() > 0.5 ? 1 : -1;
      var minStep = monster.type === 'ghost' ? 28 : 34;
      var maxStep = monster.type === 'bunny' ? 78 : monster.type === 'flame' ? 66 : 72;
      var step;
      var endX;

      if (fromX < fieldRange.min + maxStep * 0.72) direction = 1;
      if (fromX > fieldRange.max - maxStep * 0.72) direction = -1;

      step = randomBetween(minStep, maxStep);
      endX = clamp(fromX + step * direction, fieldRange.min, fieldRange.max);

      if (Math.abs(endX - fromX) < minStep * 0.55) {
        endX = clamp(fromX - step * direction, fieldRange.min, fieldRange.max);
      }

      return endX;
    }

    function chooseMonsterHopCount(type, distance, quick) {
      var maxHopDistance = type === 'bunny' ? 56 : type === 'ghost' ? 54 : type === 'flame' ? 48 : 52;
      var desiredHops = Math.ceil(distance / maxHopDistance);

      return clamp(desiredHops, 1, quick ? 3 : 4);
    }

    function chooseMonsterType() {
      var missingTypes = monsterTypes.filter(function (type) {
        return !monsters.some(function (monster) {
          return monster.type === type && !monster.defeated && !monster.escaping;
        });
      });
      var pool = missingTypes.length ? missingTypes : monsterTypes;

      return pool[Math.floor(Math.random() * pool.length)] || 'slime';
    }

    function isSlimeMonster(type) {
      return type === 'slime' || type === 'slime-green' || type === 'slime-yellow';
    }

    function monsterCapacity(footerWidth, footerHeight) {
      var area = Math.max(0, footerWidth * footerHeight);

      return Math.round(clamp(area / 30000, minMonsters, maxMonsters));
    }

    function monsterVerticalRange(footerHeight) {
      var lowerY = Math.max(monsterSize + 44, footerHeight - 42);
      var upperY = Math.max(monsterSize + 42, footerHeight * 0.46);

      return {
        min: Math.min(upperY, lowerY),
        max: lowerY
      };
    }

    function chooseMonsterGroundY(type, footerHeight) {
      var range = monsterVerticalRange(footerHeight);
      var typeLift = type === 'ghost' ? -8 : type === 'bunny' ? 2 : type === 'flame' ? 4 : 0;

      return clamp(randomBetween(range.min, range.max) + typeLift, range.min, range.max);
    }

    function chooseMonsterWanderGroundY(monster, footerHeight) {
      var range = monsterVerticalRange(footerHeight);
      var step = randomBetween(-28, 28);
      var currentY = clamp(monster.groundY, range.min, range.max);

      if (currentY < range.min + 14) step = Math.abs(step);
      if (currentY > range.max - 14) step = -Math.abs(step);

      return clamp(currentY + step, range.min, range.max);
    }

    function monsterJumpRange(type) {
      if (type === 'bunny') return { min: 8, max: 12 };
      if (type === 'ghost') return { min: 5, max: 8 };
      if (type === 'flame') return { min: 7, max: 11 };
      return { min: 6, max: 10 };
    }

    function monsterFootAnchorX(type, side) {
      var anchor = isSlimeMonster(type) ? 18 : type === 'ghost' ? 16 : 15.5;

      return side === 'right' ? monsterSize - anchor : anchor;
    }

    function monsterFootAnchorY(type) {
      if (type === 'bunny') return 31;
      if (type === 'ghost') return 27;
      if (type === 'flame') return 28;
      return 26;
    }

    function monsterIdleBob(type, elapsed) {
      if (type === 'bunny') return Math.round(Math.sin(elapsed / 260) * 1.2);
      if (type === 'ghost') return Math.round(Math.sin(elapsed / 340) * 1.7);
      if (type === 'flame') return Math.round(Math.sin(elapsed / 220) * 1.1);
      return Math.round(Math.sin(elapsed / 300) * 0.9);
    }

    function monsterDeathDuration(type) {
      if (type === 'bunny') return 720;
      if (type === 'ghost') return 760;
      if (type === 'flame') return 680;
      return 620;
    }

    function overlaps(a, b) {
      return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    }

    function liveMonsterCount() {
      return monsters.filter(function (monster) {
        return !monster.defeated && !monster.escaping;
      }).length;
    }

    function updateWand(event) {
      mouseX = event.clientX;
      mouseY = event.clientY;
      wand.style.left = mouseX + 'px';
      wand.style.top = mouseY + 'px';
    }

    function isInsideStage(event) {
      var rect = stage.getBoundingClientRect();

      return rect.width > 0 &&
        rect.height > 0 &&
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
    }

    function createMonsterNode(type) {
      var monster = document.createElement('div');

      monster.className = 'footer-monster footer-' + type;
      monster.setAttribute('aria-hidden', 'true');
      monster.innerHTML = [
        '<span class="footer-monster-shadow"></span>',
        '<span class="footer-' + type + '-core"></span>'
      ].join('');

      return monster;
    }

    function createMagicBurst(x, y, type) {
      for (var index = 0; index < 14; index++) {
        var particle = document.createElement('span');
        var angle = Math.PI * 2 * index / 14 + randomBetween(-0.18, 0.18);
        var distance = randomBetween(28, 70);

        particle.className = 'footer-hit-burst is-' + type + '-hit';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.setProperty('--dx', Math.cos(angle) * distance + 'px');
        particle.style.setProperty('--dy', Math.sin(angle) * distance + 'px');
        field.appendChild(particle);

        window.setTimeout(function (node) {
          node.remove();
        }, 620, particle);
      }

      trimEffectNodes(field, '.footer-hit-burst', maxHitBurstNodes);
    }

    function monsterSpawnEffectSrc(type) {
      return '/anim/monster_spawn_' + type + '.gif?v=' + monsterSpawnEffectVersion;
    }

    function scheduleMonsterSpawnTimeline(monster, spawnAt) {
      monster.spawnAt = spawnAt;
      monster.spawnRevealAt = spawnAt + monsterSpawnRevealDelay;
      monster.spawnFinishedAt = monster.spawnRevealAt + monsterSpawnJumpOutDuration;
      monster.spawnEffectEndsAt = monster.spawnFinishedAt + monsterSpawnEffectTail;
      monster.start = monster.spawnEffectEndsAt + monsterSpawnMoveDelay;
    }

    function restartMonsterSpawnEffect(monster) {
      var effect = monster && monster.spawnEffect;

      if (!effect) return;

      effect.src = transparentPixelGif;
      window.requestAnimationFrame(function () {
        if (effect.isConnected) {
          effect.src = monsterSpawnEffectSrc(monster.type);
        }
      });
    }

    function createMonsterSpawnEffect(monster) {
      var effect = document.createElement('img');

      monsterSpawnEffectRun += 1;
      effect.className = 'footer-monster-spawn is-' + monster.type + '-spawn';
      effect.src = monsterSpawnEffectSrc(monster.type);
      effect.alt = '';
      effect.width = monsterSpawnEffectWidth;
      effect.height = monsterSpawnEffectHeight;
      effect.setAttribute('aria-hidden', 'true');
      effect.dataset.effectRun = String(monsterSpawnEffectRun);
      effect.draggable = false;
      effect.style.left = (monster.startX + monster.spawnFootAnchorX - monsterSpawnEffectAnchorX).toFixed(2) + 'px';
      effect.style.top = (monster.groundY + monster.spawnFootAnchorY - monsterSpawnEffectAnchorY).toFixed(2) + 'px';
      field.appendChild(effect);
      monster.spawnEffect = effect;
    }

    function finishMonsterSpawn(monster) {
      if (!monster || monster.spawnFinished) return;

      monster.spawnFinished = true;
      monster.node.classList.remove('is-spawning');
    }

    function clearMonsterSpawnEffect(monster) {
      if (!monster || !monster.spawnEffect) return;

      monster.spawnEffect.remove();
      monster.spawnEffect = null;
    }

    function activateEffectNode(node, onActivated) {
      window.requestAnimationFrame(function () {
        if (!node.isConnected) return;

        node.classList.add('is-active');
        if (typeof onActivated === 'function') onActivated();
      });
    }

    function armMagicPitNode(pit, bolt, runId, onActivated) {
      pit.classList.add('is-arming');
      prepareFooterLightningBolt(bolt, runId).then(function () {
        if (!pit.isConnected) return;

        pit.classList.remove('is-arming');
        activateEffectNode(pit, onActivated);
      });
    }

    function trimEffectNodes(container, selector, maxCount, removeNode) {
      var nodes;
      var removeCount;
      var index;

      if (!container || maxCount <= 0) return;

      nodes = container.querySelectorAll(selector);
      removeCount = nodes.length - maxCount;
      if (removeCount <= 0) return;

      for (index = 0; index < removeCount; index += 1) {
        if (removeNode) {
          removeNode(nodes[index]);
        } else {
          nodes[index].remove();
        }
      }
    }

    function removeMagicPitNode(node) {
      if (!node) return;

      revokeFooterLightningBoltSrc(node);
      node.remove();
      pits = pits.filter(function (pit) {
        return pit.node !== node;
      });
    }

    function setMonsterDirection(monster, side) {
      monster.side = side;
      monster.node.classList.remove('from-left', 'from-right');
      monster.node.classList.add(side === 'left' ? 'from-left' : 'from-right');
    }

    function setMonsterPosition(monster, x, y) {
      monster.node.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
      monster.node.style.zIndex = String(10 + Math.round(y));
    }

    function monsterMoveSide(startX, endX) {
      return endX < startX ? 'right' : 'left';
    }

    function configureMonsterMove(monster, startX, endX, startY, endY, startAt, quick, keepSpawnState) {
      var distance = Math.abs(endX - startX);
      var jumpRange = monsterJumpRange(monster.type);
      var hopDuration = monster.type === 'flame' ? randomBetween(210, 285) : randomBetween(230, 315);

      setMonsterDirection(monster, monsterMoveSide(startX, endX));
      monster.startX = startX;
      monster.endX = endX;
      monster.startY = startY;
      monster.endY = endY;
      monster.groundY = startY;
      monster.start = startAt;
      monster.hopCount = chooseMonsterHopCount(monster.type, distance, quick);
      monster.hopDuration = hopDuration;
      monster.duration = monster.hopCount * hopDuration;
      monster.jump = randomBetween(jumpRange.min, jumpRange.max);
      monster.idleFor = quick ? randomBetween(520, 1150) : randomBetween(760, 1750);
      monster.settledAt = null;
      monster.pendingMove = null;

      monster.node.classList.remove('is-idling');
      if (!keepSpawnState) monster.node.classList.remove('is-spawning');
    }

    function prepareMonsterWander(monster, now) {
      var fromX = monster.endX;
      var endX = chooseMonsterWanderTarget(monster, stage.clientWidth);
      var fromY = monster.groundY;
      var endY = chooseMonsterWanderGroundY(monster, stage.clientHeight);

      setMonsterDirection(monster, monsterMoveSide(fromX, endX));
      monster.pendingMove = {
        startX: fromX,
        endX: endX,
        startY: fromY,
        endY: endY,
        startAt: now + monsterTurnLeadDuration
      };
    }

    function startMonsterWander(monster, now) {
      var pendingMove = monster.pendingMove;

      if (!pendingMove) {
        prepareMonsterWander(monster, now);
        pendingMove = monster.pendingMove;
      }

      configureMonsterMove(
        monster,
        pendingMove.startX,
        pendingMove.endX,
        pendingMove.startY,
        pendingMove.endY,
        Math.max(now, pendingMove.startAt),
        false,
        false
      );
    }

    function scheduleMaintain(delay) {
      if (maintainTimer) window.clearTimeout(maintainTimer);

      maintainTimer = window.setTimeout(function () {
        maintainTimer = null;
        maintainMonsters(false);
        scheduleMaintain(randomBetween(850, 1500));
      }, delay || randomBetween(700, 1200));
    }

    function spawnMonster(options) {
      var footerWidth = stage.clientWidth;
      var footerHeight = stage.clientHeight;
      var side = Math.random() > 0.5 ? 'right' : 'left';
      var type = chooseMonsterType();
      var monsterNode;
      var monster;
      var capacity;
      var spawnDelay;
      var route;
      var spawnAt;
      var spawnFinishedAt;
      var spawnEffectEndsAt;
      var moveStartAt;
      var groundY;
      var visualSide;

      options = options || {};
      capacity = monsterCapacity(footerWidth, footerHeight);

      if (footerWidth < 140 || footerHeight < 120 || liveMonsterCount() >= capacity) {
        return;
      }

      if (options.type) type = options.type;

      if (typeof options.targetX === 'number') {
        side = options.targetX < footerWidth / 2 ? 'left' : 'right';
      }

      route = chooseMonsterRoute(side, type, footerWidth, options.targetX, options.quick);
      visualSide = monsterMoveSide(route.startX, route.endX);
      monsterNode = createMonsterNode(type);
      field.appendChild(monsterNode);
      monsterNode.classList.add(visualSide === 'left' ? 'from-left' : 'from-right');
      spawnDelay = Math.max(0, options.spawnDelay || 0);
      spawnAt = performance.now() + spawnDelay;
      spawnFinishedAt = spawnAt + monsterSpawnRevealDelay + monsterSpawnJumpOutDuration;
      spawnEffectEndsAt = spawnFinishedAt + monsterSpawnEffectTail;
      moveStartAt = spawnEffectEndsAt + monsterSpawnMoveDelay;
      groundY = chooseMonsterGroundY(type, footerHeight);

      monster = {
        node: monsterNode,
        type: type,
        spawnAt: spawnAt,
        spawnRevealAt: spawnAt + monsterSpawnRevealDelay,
        spawnFinishedAt: spawnFinishedAt,
        spawnEffectEndsAt: spawnEffectEndsAt,
        spawnEffectStarted: false,
        spawned: false,
        spawnFinished: false,
        start: moveStartAt,
        duration: 0,
        hopCount: 1,
        hopDuration: 260,
        fromOutside: false,
        side: visualSide,
        startX: route.startX,
        endX: route.endX,
        startY: groundY,
        endY: groundY,
        groundY: groundY,
        spawnFootAnchorX: monsterFootAnchorX(type, visualSide),
        spawnFootAnchorY: monsterFootAnchorY(type),
        jump: 0,
        idleFor: 0,
        settledAt: null,
        defeated: false
      };

      configureMonsterMove(monster, route.startX, route.endX, groundY, groundY, moveStartAt, options.quick, true);
      monster.jump += 2;
      monsterNode.classList.add('is-awaiting-spawn');

      monsters.push(monster);
      setMonsterPosition(monster, monster.startX, monster.groundY);
      startLoop();
    }

    function maintainMonsters(fillToMax) {
      var capacity = monsterCapacity(stage.clientWidth, stage.clientHeight);
      var target = fillToMax ? capacity : clamp(capacity - Math.floor(randomBetween(0, 2.6)), minMonsters, capacity);
      var guard = 0;

      while (liveMonsterCount() < target && guard < maxMonsters) {
        spawnMonster({
          quick: fillToMax,
          spawnDelay: guard * randomBetween(fillToMax ? 120 : 180, fillToMax ? 260 : 360)
        });
        guard += 1;
      }
    }

    function removeMonster(monster) {
      var index = monsters.indexOf(monster);

      if (index !== -1) monsters.splice(index, 1);
      clearMonsterSpawnEffect(monster);
      monster.node.remove();
      maintainMonsters(false);
    }

    function createMagicStrike(x, y, autoRemove, onActivated) {
      var pit = document.createElement('span');
      var bolt;
      var runId;

      magicEffectRun += 1;
      runId = magicEffectRun;
      pit.className = 'footer-magic-pit';
      pit.setAttribute('aria-hidden', 'true');
      pit.dataset.effectRun = String(runId);
      pit.innerHTML = [
        '<img class="footer-magic-bolt" alt="" draggable="false">',
        '<span class="footer-magic-flash"></span>',
        '<span class="footer-magic-ring"></span>'
      ].join('');
      bolt = pit.querySelector('.footer-magic-bolt');
      if (bolt) {
        bolt.decoding = 'async';
        bolt.fetchPriority = 'high';
        bolt.loading = 'eager';
      }
      pit.style.left = Math.round(x) + 'px';
      pit.style.top = Math.round(y) + 'px';
      effectsLayer.appendChild(pit);
      armMagicPitNode(pit, bolt, runId, function () {
        if (typeof onActivated === 'function') onActivated();

        if (autoRemove) {
          window.setTimeout(function () {
            removeMagicPitNode(pit);
          }, magicPitDuration);
        }
      });

      return pit;
    }

    function createLightningCrater(event) {
      var fieldRect = field.getBoundingClientRect();
      var crater = document.createElement('span');

      crater.className = 'footer-lightning-crater';
      crater.setAttribute('aria-hidden', 'true');
      crater.style.left = Math.round(event.clientX - fieldRect.left) + 'px';
      crater.style.top = Math.round(event.clientY - fieldRect.top) + 'px';
      field.appendChild(crater);
      activateEffectNode(crater);
      trimEffectNodes(field, '.footer-lightning-crater', maxLightningCraterNodes);

      window.setTimeout(function () {
        crater.remove();
      }, FOOTER_LIGHTNING_CRATER_DURATION);
    }

    function defeatMonster(monster) {
      var monsterRect;
      var fieldRect;

      if (!monster || monster.defeated || monster.escaping) return;

      monster.defeated = true;
      monster.node.classList.add('is-defeated');
      monsterRect = monster.node.getBoundingClientRect();
      fieldRect = field.getBoundingClientRect();
      score += 1;
      scoreNode.textContent = String(score);
      createMagicBurst(monsterRect.left - fieldRect.left + monsterRect.width / 2, monsterRect.top - fieldRect.top + monsterRect.height / 2, monster.type);
      wand.classList.add('is-casting');
      maintainMonsters(false);

      window.setTimeout(function () {
        removeMonster(monster);
      }, monsterDeathDuration(monster.type));
    }

    function createMagicPit(event) {
      var effectRect = effectsLayer.getBoundingClientRect();
      var pit;
      var magicPit = {
        node: null,
        expiresAt: performance.now() + magicPitDuration + FOOTER_LIGHTNING_READY_TIMEOUT
      };

      pit = createMagicStrike(event.clientX - effectRect.left, event.clientY - effectRect.top, false, function () {
        magicPit.expiresAt = performance.now() + magicPitDuration;
        window.setTimeout(function () {
          removeMagicPitNode(pit);
        }, magicPitDuration);
      });
      magicPit.node = pit;
      pits.push(magicPit);
      trimEffectNodes(effectsLayer, '.footer-magic-pit', maxMagicPitNodes, removeMagicPitNode);
      createLightningCrater(event);

      wand.classList.add('is-casting');

      if (castingTimer) window.clearTimeout(castingTimer);
      castingTimer = window.setTimeout(function () {
        wand.classList.remove('is-casting');
      }, 420);

      checkMagicHits();
      startLoop();
    }

    stage.__castFooterMagic = function (event) {
      if (!isInsideStage(event)) return;

      preloadFooterLightningStrike();
      updateWand(event);
      createMagicPit(event);
    };

    function checkMagicHits() {
      if (!pits.length || !monsters.length) return;

      pits.forEach(function (pit) {
        var pitRect = pit.node.getBoundingClientRect();

        monsters.forEach(function (monster) {
          if (!monster.spawned || monster.defeated || monster.escaping) return;

          if (overlaps(pitRect, monster.node.getBoundingClientRect())) {
            defeatMonster(monster);
          }
        });
      });
    }

    function clearExpiredPits(now) {
      pits = pits.filter(function (pit) {
        if (pit.expiresAt > now) return true;
        revokeFooterLightningBoltSrc(pit.node);
        pit.node.remove();
        return false;
      });
    }

    function escapeMonster(monster) {
      if (!monster || monster.escaping || monster.defeated) return;

      monster.escaping = true;
      monster.node.classList.add('is-escaping');

      window.setTimeout(function () {
        removeMonster(monster);
      }, 360);
    }

    function moveMonster(monster, now) {
      var elapsed = now - monster.start;
      var progress;
      var hopIndex;
      var hopProgress;
      var fromProgress;
      var toProgress;
      var hopEase;
      var fromX;
      var toX;
      var yProgress;
      var baseY;
      var x;
      var y;
      var idleBob;
      var jumpOutProgress;

      if (!monster.spawnEffectStarted && now >= monster.spawnAt) {
        if (!monster.spawned && now >= monster.spawnRevealAt - 40) {
          scheduleMonsterSpawnTimeline(monster, now);
          elapsed = now - monster.start;
        }

        monster.spawnEffectStarted = true;
        createMonsterSpawnEffect(monster);
      } else if (monster.spawnEffect && !monster.spawned && now >= monster.spawnRevealAt + 120) {
        scheduleMonsterSpawnTimeline(monster, now);
        elapsed = now - monster.start;
        restartMonsterSpawnEffect(monster);
      }

      if (!monster.spawned && now >= monster.spawnRevealAt) {
        monster.spawned = true;
        monster.node.classList.remove('is-awaiting-spawn');
        monster.node.classList.add('is-spawning');
      }

      if (monster.spawned && !monster.spawnFinished && now >= monster.spawnFinishedAt) {
        finishMonsterSpawn(monster);
      }

      if (monster.spawnEffect && now >= monster.spawnEffectEndsAt) {
        clearMonsterSpawnEffect(monster);
      }

      if (elapsed < 0) {
        if (monster.spawned && !monster.spawnFinished) {
          jumpOutProgress = clamp((now - monster.spawnRevealAt) / monsterSpawnJumpOutDuration, 0, 1);
          y = Math.round(monster.groundY + (1 - easeInOut(jumpOutProgress)) * 14 - Math.sin(jumpOutProgress * Math.PI) * 7);
        } else {
          y = monster.groundY;
        }

        setMonsterPosition(monster, monster.startX, y);
        return;
      }

      finishMonsterSpawn(monster);
      clearMonsterSpawnEffect(monster);

      hopIndex = Math.min(monster.hopCount - 1, Math.floor(elapsed / monster.hopDuration));
      hopProgress = clamp((elapsed - hopIndex * monster.hopDuration) / monster.hopDuration, 0, 1);
      fromProgress = hopIndex / monster.hopCount;
      toProgress = (hopIndex + 1) / monster.hopCount;
      hopEase = easeInOut(hopProgress);
      yProgress = fromProgress + (toProgress - fromProgress) * hopEase;
      fromX = monster.startX + (monster.endX - monster.startX) * fromProgress;
      toX = monster.startX + (monster.endX - monster.startX) * toProgress;
      x = Math.round(fromX + (toX - fromX) * hopEase);
      baseY = monster.startY + (monster.endY - monster.startY) * yProgress;
      y = Math.round(baseY - Math.sin(hopProgress * Math.PI) * monster.jump * (hopIndex === 0 ? 1.08 : 1));
      progress = clamp(elapsed / monster.duration, 0, 1);

      if (progress >= 1) {
        if (!monster.settledAt) {
          monster.settledAt = now;
          monster.groundY = monster.endY;
          monster.node.classList.add('is-idling');
        }

        idleBob = monsterIdleBob(monster.type, now - monster.settledAt);
        setMonsterPosition(monster, Math.round(monster.endX), Math.round(monster.groundY) + idleBob);

        if (now - monster.settledAt >= monster.idleFor) {
          if (!monster.pendingMove) {
            prepareMonsterWander(monster, now);
          }

          if (now >= monster.pendingMove.startAt) {
            startMonsterWander(monster, now);
          }
        }

        return;
      }

      setMonsterPosition(monster, x, y);
    }

    function loop(now) {
      rafId = null;
      clearExpiredPits(now);

      monsters.forEach(function (monster) {
        if (!monster.defeated && !monster.escaping) moveMonster(monster, now);
      });

      checkMagicHits();

      if (monsters.length || pits.length || active) startLoop();
    }

    function startLoop() {
      if (!rafId) rafId = window.requestAnimationFrame(loop);
    }

    stage.addEventListener('mouseenter', function (event) {
      active = true;
      stage.classList.add('is-magic-zone');
      wand.classList.add('is-visible');
      preloadFooterLightningStrike();
      updateWand(event);
      startLoop();
    });

    stage.addEventListener('mousemove', function (event) {
      if (!active) return;
      updateWand(event);
    });

    document.addEventListener('footer:magic-cast', function (event) {
      if (!event.detail) return;

      updateWand(event.detail);
      createMagicPit(event.detail);
    });

    stage.addEventListener('pointerdown', function (event) {
      if (event.pointerType === 'mouse') return;
      if (typeof event.button === 'number' && event.button !== 0) return;

      event.preventDefault();
      event.stopPropagation();

      lastFooterMagicTouchAt = Date.now();
      active = true;
      stage.classList.add('is-magic-zone');
      wand.classList.add('is-visible');
      stage.__castFooterMagic({
        clientX: event.clientX,
        clientY: event.clientY
      });
    }, { passive: false });

    if (!window.PointerEvent) {
      stage.addEventListener('touchstart', function (event) {
        var touch = event.changedTouches && event.changedTouches[0];

        if (!touch) return;

        event.preventDefault();
        event.stopPropagation();

        lastFooterMagicTouchAt = Date.now();
        active = true;
        stage.classList.add('is-magic-zone');
        wand.classList.add('is-visible');
        stage.__castFooterMagic({
          clientX: touch.clientX,
          clientY: touch.clientY
        });
      }, { passive: false });
    }

    stage.addEventListener('click', function (event) {
      if (event.button !== 0) return;

      event.preventDefault();
      event.stopPropagation();

      if (event.__footerMagicHandled) return;

      stage.__castFooterMagic({
        clientX: event.clientX,
        clientY: event.clientY
      });
      event.__footerMagicHandled = true;
    });

    stage.addEventListener('mouseleave', function () {
      active = false;
      stage.classList.remove('is-magic-zone');
      wand.classList.remove('is-visible', 'is-casting');
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden && maintainTimer) {
        window.clearTimeout(maintainTimer);
        maintainTimer = null;
      } else if (!document.hidden && !maintainTimer) {
        maintainMonsters(false);
        scheduleMaintain(700);
      }
    });

    maintainMonsters(false);
    scheduleMaintain(900);
    startLoop();
  }

  function saveTheme(mode) {
    var expiry = Date.now() + 2 * 86400000;

    if (window.btf && window.btf.saveToLocal && typeof window.btf.saveToLocal.set === 'function') {
      window.btf.saveToLocal.set('theme', mode, 2);
      return;
    }

    try {
      localStorage.setItem('theme', JSON.stringify({
        value: mode,
        expiry: expiry
      }));
    } catch (error) {
      // Local storage can be unavailable in private or restricted contexts.
    }
  }

  function notifyThemeChange(mode) {
    var themeChange = window.globalFn && window.globalFn.themeChange;

    if (!themeChange) return;

    Object.keys(themeChange).forEach(function (key) {
      if (typeof themeChange[key] === 'function') {
        themeChange[key](mode);
      }
    });
  }

  var themeTransitionObserver = null;
  var lastObservedTheme = document.documentElement.getAttribute('data-theme');
  var themeTransitionState = {
    mode: lastObservedTheme,
    playedAt: 0
  };
  var themeTogglePullTimer = null;
  var themeTogglePullFrame = 0;
  var themeTransitionFrame = 0;
  var themeApplyTimer = null;
  var themeSwitchingTimer = null;
  var PIXEL_THEME_APPLY_DELAY = 110;
  var PIXEL_THEME_SWITCHING_DURATION = 1360;

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function createThemeTransitionNode(mode) {
    var transition = document.createElement('div');

    transition.className = 'pixel-theme-transition is-to-' + mode;
    transition.setAttribute('aria-hidden', 'true');
    transition.innerHTML = [
      '<span class="pixel-theme-transition__sky"></span>',
      '<span class="pixel-theme-transition__clouds"></span>',
      '<span class="pixel-theme-transition__stars"></span>',
      '<span class="pixel-theme-transition__horizon"></span>',
      '<span class="pixel-theme-transition__sun"></span>',
      '<span class="pixel-theme-transition__moon"></span>'
    ].join('');

    return transition;
  }

  function playThemeTransition(mode) {
    var now = Date.now();
    var mount = document.body || document.documentElement;
    var activeTransition;

    if ((mode !== 'dark' && mode !== 'light') || prefersReducedMotion()) return;
    if (themeTransitionState.mode === mode && now - themeTransitionState.playedAt < 760) return;

    themeTransitionState.mode = mode;
    themeTransitionState.playedAt = now;

    activeTransition = document.querySelector('.pixel-theme-transition');
    if (activeTransition) activeTransition.remove();

    activeTransition = createThemeTransitionNode(mode);
    mount.appendChild(activeTransition);

    window.setTimeout(function () {
      if (activeTransition && activeTransition.parentNode) {
        activeTransition.remove();
      }
    }, 1320);
  }

  function markThemeSwitching() {
    document.documentElement.classList.add('is-pixel-theme-switching');

    if (themeSwitchingTimer) window.clearTimeout(themeSwitchingTimer);
    themeSwitchingTimer = window.setTimeout(function () {
      themeSwitchingTimer = null;
      document.documentElement.classList.remove('is-pixel-theme-switching');
    }, PIXEL_THEME_SWITCHING_DURATION);
  }

  function scheduleThemeTransition(mode) {
    if (!window.requestAnimationFrame) {
      playThemeTransition(mode);
      return;
    }

    if (themeTransitionFrame) {
      window.cancelAnimationFrame(themeTransitionFrame);
    }

    themeTransitionFrame = window.requestAnimationFrame(function () {
      themeTransitionFrame = 0;
      playThemeTransition(mode);
    });
  }

  function initThemeTransitionObserver() {
    if (themeTransitionObserver || !window.MutationObserver) return;

    lastObservedTheme = document.documentElement.getAttribute('data-theme');

    themeTransitionObserver = new MutationObserver(function () {
      var mode = document.documentElement.getAttribute('data-theme');

      if (mode === lastObservedTheme) return;
      lastObservedTheme = mode;
      updateHangingThemeToggle(mode);
      markThemeSwitching();
      scheduleThemeTransition(mode);
    });

    themeTransitionObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
  }

  function applyThemeMode(mode) {
    if (window.btf && mode === 'dark' && typeof window.btf.activateDarkMode === 'function') {
      window.btf.activateDarkMode();
    } else if (window.btf && mode === 'light' && typeof window.btf.activateLightMode === 'function') {
      window.btf.activateLightMode();
    } else {
      document.documentElement.setAttribute('data-theme', mode);
    }
  }

  function runThemeModeChange(mode) {
    applyThemeMode(mode);
  }

  function scheduleThemeModeChange(mode) {
    if (themeApplyTimer) {
      window.clearTimeout(themeApplyTimer);
      themeApplyTimer = null;
    }

    if (prefersReducedMotion()) {
      runThemeModeChange(mode);
      notifyThemeChange(mode);
      return;
    }

    markThemeSwitching();
    scheduleThemeTransition(mode);

    themeApplyTimer = window.setTimeout(function () {
      themeApplyTimer = null;
      runThemeModeChange(mode);
      notifyThemeChange(mode);
    }, PIXEL_THEME_APPLY_DELAY);
  }

  function setTheme(mode) {
    var metaThemeColor = document.querySelector('meta[name="theme-color"]');

    if (mode !== 'dark' && mode !== 'light') return;
    if (currentThemeMode() === mode) return;

    saveTheme(mode);

    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', mode === 'dark' ? '#0d1110' : '#211a13');
    }

    lastObservedTheme = mode;
    updateHangingThemeToggle(mode);
    scheduleThemeModeChange(mode);
  }

  function currentThemeMode() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function updateHangingThemeToggle(mode) {
    var toggle = document.getElementById('pixel-theme-toggle');
    var button;
    var normalizedMode = mode === 'dark' ? 'dark' : 'light';
    var nextMode = normalizedMode === 'dark' ? 'light' : 'dark';

    if (!toggle) return;

    button = toggle.querySelector('.pixel-theme-toggle__button');
    toggle.dataset.themeState = normalizedMode;

    if (button) {
      button.setAttribute('aria-label', nextMode === 'dark' ? 'Switch to dark theme' : 'Switch to light theme');
      button.setAttribute('title', nextMode === 'dark' ? 'Switch to dark theme' : 'Switch to light theme');
    }
  }

  function restartThemeTogglePull(toggle) {
    var run = function () {
      themeTogglePullFrame = 0;
      toggle.classList.add('is-pulling');
      themeTogglePullTimer = window.setTimeout(function () {
        toggle.classList.remove('is-pulling');
      }, 860);
    };

    toggle.classList.remove('is-pulling');
    window.clearTimeout(themeTogglePullTimer);

    if (!window.requestAnimationFrame) {
      window.setTimeout(run, 0);
      return;
    }

    if (themeTogglePullFrame) {
      window.cancelAnimationFrame(themeTogglePullFrame);
    }

    themeTogglePullFrame = window.requestAnimationFrame(run);
  }


  function initHangingThemeToggle() {
    var existing = document.getElementById('pixel-theme-toggle');
    var toggle;
    var button;

    if (!document.body) return;

    if (existing) {
      updateHangingThemeToggle(currentThemeMode());
      return;
    }

    toggle = document.createElement('div');
    toggle.id = 'pixel-theme-toggle';
    toggle.className = 'pixel-theme-toggle';
    toggle.innerHTML = [
      '<span class="pixel-theme-toggle__hanger" aria-hidden="true"></span>',
      '<button class="pixel-theme-toggle__button" type="button">',
      '<span class="pixel-theme-toggle__cord" aria-hidden="true"></span>',
      '<span class="pixel-theme-toggle__charm" aria-hidden="true">',
      '<span class="pixel-theme-toggle__sun"></span>',
      '<span class="pixel-theme-toggle__moon"></span>',
      '</span>',
      '</button>'
    ].join('');

    document.body.appendChild(toggle);
    button = toggle.querySelector('.pixel-theme-toggle__button');
    updateHangingThemeToggle(currentThemeMode());

    if (!button) return;

    button.addEventListener('click', function (event) {
      var mode = currentThemeMode() === 'dark' ? 'light' : 'dark';

      event.preventDefault();

      setTheme(mode);
      restartThemeTogglePull(toggle);
    });
  }

  function initRightsideControls() {
    var rightside = document.getElementById('rightside');

    if (!rightside || rightside.dataset.pixelControlsReady === 'true') return;

    rightside.dataset.pixelControlsReady = 'true';

    rightside.addEventListener('click', function (event) {
      var target = event.target.closest('#darkmode, #go-up, #rightside-config');
      var hideLayout;
      var mode;

      if (!target || !rightside.contains(target)) return;

      event.preventDefault();
      event.stopPropagation();

      if (target.id === 'darkmode') {
        mode = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        setTheme(mode);
        return;
      }

      if (target.id === 'go-up') {
        if (window.btf && typeof window.btf.scrollToDest === 'function') {
          window.btf.scrollToDest(0, 500);
        } else {
          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        }
        return;
      }

      hideLayout = rightside.querySelector('#rightside-config-hide');
      if (hideLayout) {
        if (hideLayout.classList.contains('show')) {
          hideLayout.classList.add('status');
          window.setTimeout(function () {
            hideLayout.classList.remove('status');
          }, 300);
        }

        hideLayout.classList.toggle('show');
      }
    }, true);
  }

  function normalizedTwikooLabel(value) {
    return (value || '').replace(/\s+/g, '').trim();
  }

  function removeNode(node) {
    if (node && node.parentNode) {
      node.parentNode.removeChild(node);
    }
  }

  function removeTwikooActionItem(node) {
    var item = node;

    if (node && node.closest) {
      if (node.matches && node.matches('.tk-input-image, input[type="file"]')) {
        item = node.closest('label, .tk-action-icon, .tk-submit-action-icon, .tk-submit-action > *, .tk-action > *, .tk-actions > *, .tk-row.actions > *, a, button') || node;
      } else {
        item = node.closest('.tk-action-icon, .tk-submit-action-icon, a, button, label, .tk-input-image') || node;
      }
    }

    removeNode(item || node);
  }

  function cleanMessageBoardTwikooForm() {
    var twikoo;
    var websitePattern = /网址|网站|website|link|url/i;
    var actionPattern = /预览|preview|图片|图像|上传|picture|photo|image|upload|markdown|markdown语法|m↓/i;
    var actionClassPattern = /(^|\s)(__markdown|__image|__upload|tk-input-image|tk-image|tk-upload|tk-preview|tk-picture|tk-photo)(\s|$)/i;

    if (!document.querySelector('.message-board-page')) return;

    twikoo = document.getElementById('twikoo') || document.getElementById('twikoo-wrap');
    if (!twikoo) return;

    Array.prototype.forEach.call(twikoo.querySelectorAll('.tk-meta-input > *'), function (field, index) {
      var input = field.querySelector('input, .el-input__inner');
      var label = normalizedTwikooLabel([
        input && input.getAttribute('name'),
        input && input.getAttribute('placeholder'),
        input && input.getAttribute('aria-label'),
        field.textContent
      ].filter(Boolean).join(' '));

      if (index === 2 || websitePattern.test(label)) {
        removeNode(field);
      }
    });

    Array.prototype.forEach.call(twikoo.querySelectorAll([
      '.tk-submit-action .tk-preview',
      '.tk-submit-action .tk-image',
      '.tk-submit-action .tk-upload',
      '.tk-submit-action .__preview',
      '.tk-submit-action .__image',
      '.tk-submit-action .__upload',
      '.tk-submit-action .__markdown',
      '.tk-submit-action .tk-input-image',
      '.tk-submit-action > *:has(input[type="file"])',
      '.tk-submit-action > *:has(.tk-input-image)',
      '.tk-submit-action > *:has([title*="图片"])',
      '.tk-submit-action > *:has([title*="上传"])',
      '.tk-submit-action > *:has([aria-label*="图片"])',
      '.tk-submit-action > *:has([aria-label*="上传"])',
      '.tk-submit-action > *:has([class*="image" i])',
      '.tk-submit-action > *:has([class*="upload" i])',
      '.tk-submit-action > *:has(use[href*="image" i])',
      '.tk-submit-action > *:has(use[href*="upload" i])',
      '.tk-submit-action .tk-submit-action-icon.__markdown',
      '.tk-submit-action .tk-action-icon.__preview',
      '.tk-submit-action .tk-action-icon.__image',
      '.tk-submit-action .tk-action-icon.__upload',
      '.tk-submit-action .tk-action-icon.__markdown',
      '.tk-action .tk-preview',
      '.tk-action .tk-image',
      '.tk-action .tk-upload',
      '.tk-action .__preview',
      '.tk-action .__image',
      '.tk-action .__upload',
      '.tk-action .__markdown',
      '.tk-action .tk-input-image',
      '.tk-action > *:has(input[type="file"])',
      '.tk-action > *:has(.tk-input-image)',
      '.tk-action > *:has([title*="图片"])',
      '.tk-action > *:has([title*="上传"])',
      '.tk-action > *:has([aria-label*="图片"])',
      '.tk-action > *:has([aria-label*="上传"])',
      '.tk-action > *:has([class*="image" i])',
      '.tk-action > *:has([class*="upload" i])',
      '.tk-action > *:has(use[href*="image" i])',
      '.tk-action > *:has(use[href*="upload" i])',
      '.tk-action .tk-submit-action-icon.__markdown',
      '.tk-action .tk-action-icon.__preview',
      '.tk-action .tk-action-icon.__image',
      '.tk-action .tk-action-icon.__upload',
      '.tk-action .tk-action-icon.__markdown',
      '.tk-row.actions .tk-preview',
      '.tk-row.actions .tk-image',
      '.tk-row.actions .tk-upload',
      '.tk-row.actions .__preview',
      '.tk-row.actions .__image',
      '.tk-row.actions .__upload',
      '.tk-row.actions .__markdown',
      '.tk-row.actions .tk-input-image',
      '.tk-row.actions > *:has(input[type="file"])',
      '.tk-row.actions > *:has(.tk-input-image)',
      '.tk-row.actions > *:has([title*="图片"])',
      '.tk-row.actions > *:has([title*="上传"])',
      '.tk-row.actions > *:has([aria-label*="图片"])',
      '.tk-row.actions > *:has([aria-label*="上传"])',
      '.tk-row.actions > *:has([class*="image" i])',
      '.tk-row.actions > *:has([class*="upload" i])',
      '.tk-row.actions > *:has(use[href*="image" i])',
      '.tk-row.actions > *:has(use[href*="upload" i])',
      '.tk-row.actions .tk-submit-action-icon.__markdown',
      '.tk-row.actions .tk-action-icon.__preview',
      '.tk-row.actions .tk-action-icon.__image',
      '.tk-row.actions .tk-action-icon.__upload',
      '.tk-row.actions .tk-action-icon.__markdown',
      '.tk-input-image',
      'input[type="file"]',
      '.tk-submit-action-icon.__markdown',
      '.tk-action-icon.__preview',
      '.tk-action-icon.__image',
      '.tk-action-icon.__upload',
      '.tk-action-icon.__markdown'
    ].join(',')), removeTwikooActionItem);

    Array.prototype.forEach.call(twikoo.querySelectorAll([
      '.tk-submit-action > *',
      '.tk-action > *',
      '.tk-row.actions > *',
      '.tk-actions > *'
    ].join(',')), function (item) {
      var label = normalizedTwikooLabel(
        item.getAttribute('title') ||
        item.getAttribute('aria-label') ||
        item.textContent
      );
      var classNames = item && item.className ? String(item.className) : '';
      var nestedAction = item.querySelector && item.querySelector([
        'input[type="file"]',
        '.tk-input-image',
        '[title*="图片"]',
        '[title*="上传"]',
        '[aria-label*="图片"]',
        '[aria-label*="上传"]',
        '[class*="image" i]',
        '[class*="upload" i]',
        '[class*="picture" i]',
        '[class*="photo" i]',
        'use[href*="image" i]',
        'use[href*="upload" i]',
        'use[href*="picture" i]',
        'use[href*="photo" i]'
      ].join(','));

      if (nestedAction || actionPattern.test(label) || actionClassPattern.test(classNames)) {
        removeTwikooActionItem(item);
      }
    });

  }

  function initMessageBoardTwikooCleanup() {
    var target;

    if (messageBoardTwikooObserver) {
      messageBoardTwikooObserver.disconnect();
      messageBoardTwikooObserver = null;
    }

    if (messageBoardTwikooCleanupTimer) {
      window.clearInterval(messageBoardTwikooCleanupTimer);
      messageBoardTwikooCleanupTimer = null;
    }

    if (!document.querySelector('.message-board-page')) return;

    cleanMessageBoardTwikooForm();
    window.setTimeout(cleanMessageBoardTwikooForm, 0);
    window.setTimeout(cleanMessageBoardTwikooForm, 250);
    window.setTimeout(cleanMessageBoardTwikooForm, 800);

    messageBoardTwikooCleanupRuns = 0;
    messageBoardTwikooCleanupTimer = window.setInterval(function () {
      if (!document.querySelector('.message-board-page') || messageBoardTwikooCleanupRuns > 80) {
        window.clearInterval(messageBoardTwikooCleanupTimer);
        messageBoardTwikooCleanupTimer = null;
        return;
      }

      messageBoardTwikooCleanupRuns += 1;
      cleanMessageBoardTwikooForm();
    }, 120);

    if (!window.MutationObserver) return;

    target = document.getElementById('twikoo-wrap') || document.getElementById('post-comment');
    if (!target) return;

    messageBoardTwikooObserver = new MutationObserver(function () {
      cleanMessageBoardTwikooForm();
      window.setTimeout(cleanMessageBoardTwikooForm, 0);
    });
    messageBoardTwikooObserver.observe(target, {
      childList: true,
      subtree: true
    });
  }

  function initFantasyPixel() {
    initThemeTransitionObserver();
    initHangingThemeToggle();
    initRightsideControls();
    initMessageBoardTwikooCleanup();
    initAdventurerRadar();
    initCareerMap();
    initFooterSlimeGame();
  }

  initFantasyPixel();
  document.addEventListener('DOMContentLoaded', initFantasyPixel);
  document.addEventListener('pjax:complete', initFantasyPixel);
  window.addEventListener('resize', initAdventurerRadar);
}());
