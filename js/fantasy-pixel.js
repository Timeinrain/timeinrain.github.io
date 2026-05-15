(function () {
  var FOOTER_LIGHTNING_DURATION = 1280;

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

  document.addEventListener('click', function (event) {
    var stage;

    if (event.button !== 0) return;

    stage = footerPlaygroundAtPoint(event);
    if (stage) {
      if (typeof stage.__castFooterMagic === 'function') {
        stage.__castFooterMagic({
          clientX: event.clientX,
          clientY: event.clientY
        });
      }
      return;
    }

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
    var shakeTimer = null;
    var score = 0;
    var mouseX = 0;
    var mouseY = 0;
    var minMonsters = 4;
    var maxMonsters = 5;
    var monsterSize = 32;
    var magicPitDuration = FOOTER_LIGHTNING_DURATION;
    var monsterSpawnRevealDelay = 260;
    var monsterSpawnJumpOutDuration = 430;
    var monsterSpawnEffectDuration = 930;
    var monsterSpawnMoveDelay = 80;
    var monsterSpawnEffectWidth = 64;
    var monsterSpawnEffectHeight = 40;
    var monsterSpawnEffectAnchorX = 32.5;
    var monsterSpawnEffectAnchorY = 24.5;
    var monsterTypes = ['slime', 'bunny', 'ghost', 'flame'];

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

    function getMonsterEntryRange(side, footerWidth) {
      var fieldRange = getMonsterFieldRange(footerWidth);
      var maxEntryDepth = Math.min(180, Math.max(fieldRange.min, footerWidth * 0.3));

      if (side === 'left') {
        return {
          min: fieldRange.min,
          max: Math.min(fieldRange.max, maxEntryDepth)
        };
      }

      return {
        min: Math.max(fieldRange.min, footerWidth - maxEntryDepth),
        max: fieldRange.max
      };
    }

    function chooseMonsterEntryTarget(side, footerWidth, targetX) {
      var range = getMonsterEntryRange(side, footerWidth);

      if (typeof targetX === 'number') {
        return clamp(targetX, range.min, range.max);
      }

      return randomBetween(range.min, range.max);
    }

    function chooseMonsterRoute(side, type, footerWidth, targetX, quick) {
      var fromOutside = typeof targetX !== 'number' && Math.random() < (quick ? 0.34 : 0.24);
      var fieldRange = getMonsterFieldRange(footerWidth);
      var target;
      var step;
      var startX;

      if (fromOutside) {
        target = chooseMonsterEntryTarget(side, footerWidth, targetX);

        return {
          side: side,
          fromOutside: true,
          startX: side === 'left' ? -monsterSize - 28 : footerWidth + monsterSize + 28,
          endX: target
        };
      }

      target = typeof targetX === 'number' ?
        clamp(targetX, fieldRange.min, fieldRange.max) :
        randomBetween(fieldRange.min, fieldRange.max);
      step = randomBetween(
        type === 'ghost' ? 30 : 36,
        quick ? 68 : type === 'bunny' ? 92 : 84
      );

      if (target - step < fieldRange.min) {
        side = 'right';
      } else if (target + step > fieldRange.max) {
        side = 'left';
      }

      startX = side === 'left' ? target - step : target + step;

      return {
        side: side,
        fromOutside: false,
        startX: clamp(startX, fieldRange.min, fieldRange.max),
        endX: target
      };
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

    function monsterGroundOffset(type) {
      if (type === 'bunny') return randomBetween(44, 58);
      if (type === 'ghost') return randomBetween(54, 72);
      if (type === 'flame') return randomBetween(40, 55);
      return randomBetween(38, 52);
    }

    function monsterJumpRange(type) {
      if (type === 'bunny') return { min: 8, max: 12 };
      if (type === 'ghost') return { min: 5, max: 8 };
      if (type === 'flame') return { min: 7, max: 11 };
      return { min: 6, max: 10 };
    }

    function monsterFootAnchorX(type, side) {
      var anchor = type === 'slime' ? 18 : type === 'ghost' ? 16 : 15.5;

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
    }

    function createMonsterSpawnEffect(monster) {
      var effect = document.createElement('img');

      effect.className = 'footer-monster-spawn is-' + monster.type + '-spawn';
      effect.src = '/anim/monster_spawn_' + monster.type + '.gif?v=5';
      effect.alt = '';
      effect.width = monsterSpawnEffectWidth;
      effect.height = monsterSpawnEffectHeight;
      effect.setAttribute('aria-hidden', 'true');
      effect.draggable = false;
      effect.style.left = (monster.startX + monster.spawnFootAnchorX - monsterSpawnEffectAnchorX).toFixed(2) + 'px';
      effect.style.top = (monster.groundY + monster.spawnFootAnchorY - monsterSpawnEffectAnchorY).toFixed(2) + 'px';
      effectsLayer.appendChild(effect);
      monster.spawnEffect = effect;

      window.setTimeout(function () {
        if (monster.spawnEffect === effect) {
          monster.spawnEffect = null;
        }

        effect.remove();
      }, monsterSpawnEffectDuration);
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
      var distance;
      var hopCount;
      var hopDuration;
      var spawnDelay;
      var route;
      var jumpRange;
      var spawnAt;
      var groundY;

      options = options || {};

      if (footerWidth < 140 || footerHeight < 120 || liveMonsterCount() >= maxMonsters) {
        return;
      }

      if (options.type) type = options.type;

      if (typeof options.targetX === 'number') {
        side = options.targetX < footerWidth / 2 ? 'left' : 'right';
      }

      route = chooseMonsterRoute(side, type, footerWidth, options.targetX, options.quick);
      monsterNode = createMonsterNode(type);
      field.appendChild(monsterNode);
      monsterNode.classList.add(route.side === 'left' ? 'from-left' : 'from-right');
      distance = Math.abs(route.endX - route.startX);
      hopCount = chooseMonsterHopCount(type, distance, options.quick);
      if (!route.fromOutside) {
        hopCount = Math.max(2, hopCount);
        if (distance > 62) {
          hopCount = Math.max(3, hopCount);
        }
      }
      hopDuration = type === 'flame' ? randomBetween(230, 320) : randomBetween(260, 370);
      spawnDelay = Math.max(0, options.spawnDelay || 0);
      spawnAt = performance.now() + spawnDelay;
      jumpRange = monsterJumpRange(type);
      groundY = footerHeight - monsterGroundOffset(type);

      monster = {
        node: monsterNode,
        type: type,
        spawnAt: spawnAt,
        spawnRevealAt: spawnAt + (route.fromOutside ? 0 : monsterSpawnRevealDelay),
        spawnEffectStarted: route.fromOutside,
        spawned: route.fromOutside,
        spawnFinished: route.fromOutside,
        start: spawnAt + (route.fromOutside ? 0 : monsterSpawnEffectDuration + monsterSpawnMoveDelay),
        duration: hopCount * hopDuration,
        hopCount: hopCount,
        hopDuration: hopDuration,
        fromOutside: route.fromOutside,
        side: route.side,
        startX: route.startX,
        endX: route.endX,
        groundY: groundY,
        spawnFootAnchorX: monsterFootAnchorX(type, route.side),
        spawnFootAnchorY: monsterFootAnchorY(type),
        jump: randomBetween(jumpRange.min, jumpRange.max) + (route.fromOutside ? 0 : 2),
        idleFor: options.quick ? randomBetween(3200, 5200) : randomBetween(6800, 12000),
        settledAt: null,
        defeated: false
      };

      if (!monster.fromOutside) {
        monsterNode.classList.add('is-awaiting-spawn');
      }

      monsterNode.style.transform = 'translate(' + monster.startX + 'px, ' + monster.groundY + 'px)';
      monsters.push(monster);
      startLoop();
    }

    function maintainMonsters(fillToMax) {
      var target = fillToMax ? maxMonsters : minMonsters + Math.floor(Math.random() * 2);
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

    function createMagicStrike(x, y, autoRemove) {
      var pit = document.createElement('span');

      pit.className = 'footer-magic-pit';
      pit.setAttribute('aria-hidden', 'true');
      pit.innerHTML = [
        '<span class="footer-magic-bolt"></span>',
        '<span class="footer-magic-flash"></span>',
        '<span class="footer-magic-ring"></span>'
      ].join('');
      pit.style.left = Math.round(x) + 'px';
      pit.style.top = Math.round(y) + 'px';
      effectsLayer.appendChild(pit);

      if (autoRemove) {
        window.setTimeout(function () {
          pit.remove();
        }, magicPitDuration);
      }

      return pit;
    }

    function triggerLightningShake() {
      stage.classList.remove('is-lightning-shake');
      void stage.offsetWidth;
      stage.classList.add('is-lightning-shake');

      if (shakeTimer) window.clearTimeout(shakeTimer);
      shakeTimer = window.setTimeout(function () {
        stage.classList.remove('is-lightning-shake');
        shakeTimer = null;
      }, 180);
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
        expiresAt: performance.now() + magicPitDuration
      };

      pit = createMagicStrike(event.clientX - effectRect.left, event.clientY - effectRect.top, false);
      magicPit.node = pit;
      pits.push(magicPit);
      triggerLightningShake();

      wand.classList.add('is-casting');

      if (castingTimer) window.clearTimeout(castingTimer);
      castingTimer = window.setTimeout(function () {
        wand.classList.remove('is-casting');
      }, 420);

      window.setTimeout(function () {
        pit.remove();
        pits = pits.filter(function (item) {
          return item !== magicPit;
        });
      }, magicPitDuration);

      checkMagicHits();
      startLoop();
    }

    stage.__castFooterMagic = function (event) {
      if (!isInsideStage(event)) return;

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
      var x;
      var y;
      var idleBob;
      var jumpOutProgress;

      if (!monster.spawnEffectStarted && now >= monster.spawnAt) {
        monster.spawnEffectStarted = true;
        createMonsterSpawnEffect(monster);
      }

      if (!monster.spawned && now >= monster.spawnRevealAt) {
        monster.spawned = true;
        monster.node.classList.remove('is-awaiting-spawn');
        monster.node.classList.add('is-spawning');

        window.setTimeout(function () {
          finishMonsterSpawn(monster);
        }, monsterSpawnJumpOutDuration);
      }

      if (elapsed < 0) {
        if (monster.spawned && !monster.spawnFinished) {
          jumpOutProgress = clamp((now - monster.spawnRevealAt) / monsterSpawnJumpOutDuration, 0, 1);
          y = Math.round(monster.groundY + (1 - easeInOut(jumpOutProgress)) * 12 - Math.sin(jumpOutProgress * Math.PI) * 5);
        } else {
          y = monster.groundY;
        }

        monster.node.style.transform = 'translate(' + monster.startX + 'px, ' + y + 'px)';
        return;
      }

      finishMonsterSpawn(monster);
      clearMonsterSpawnEffect(monster);

      hopIndex = Math.min(monster.hopCount - 1, Math.floor(elapsed / monster.hopDuration));
      hopProgress = clamp((elapsed - hopIndex * monster.hopDuration) / monster.hopDuration, 0, 1);
      fromProgress = hopIndex / monster.hopCount;
      toProgress = (hopIndex + 1) / monster.hopCount;
      hopEase = easeInOut(hopProgress);
      fromX = monster.startX + (monster.endX - monster.startX) * fromProgress;
      toX = monster.startX + (monster.endX - monster.startX) * toProgress;
      x = Math.round(fromX + (toX - fromX) * hopEase);
      y = Math.round(monster.groundY - Math.sin(hopProgress * Math.PI) * monster.jump * (hopIndex === 0 ? 1.08 : 1));
      progress = clamp(elapsed / monster.duration, 0, 1);

      if (progress >= 1) {
        if (!monster.settledAt) {
          monster.settledAt = now;
          monster.node.classList.add('is-idling');
        }

        idleBob = monsterIdleBob(monster.type, now - monster.settledAt);
        monster.node.style.transform = 'translate(' + Math.round(monster.endX) + 'px, ' + (Math.round(monster.groundY) + idleBob) + 'px)';

        if (now - monster.settledAt >= monster.idleFor) {
          escapeMonster(monster);
        }

        return;
      }

      monster.node.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
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

    stage.addEventListener('click', function (event) {
      if (event.button === 0) event.preventDefault();
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
  var themeAssetsPreloaded = false;

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function createThemeTransitionNode(mode) {
    var transition = document.createElement('div');

    transition.className = 'pixel-theme-transition is-to-' + mode;
    transition.setAttribute('aria-hidden', 'true');
    transition.innerHTML = [
      '<span class="pixel-theme-transition__sun"></span>',
      '<span class="pixel-theme-transition__moon"></span>'
    ].join('');

    return transition;
  }

  function preloadThemeAssets() {
    var assets = [
      '/img/pixel-medieval/hero-castle-day.png',
      '/img/pixel-medieval/hero-castle.png',
      '/img/pixel-medieval/grassland-layout.png',
      '/img/pixel-medieval/forest-layout.png',
      '/anim/lightning_strike.gif?v=4',
      '/anim/ghost_move_sheet.png?v=32',
      '/anim/ghost_idle_sheet.png?v=32',
      '/anim/ghost_death_sheet.png?v=32',
      '/anim/flame_move_sheet.png?v=32',
      '/anim/flame_idle_sheet.png?v=32',
      '/anim/flame_death_sheet.png?v=32'
    ];

    if (themeAssetsPreloaded || typeof window.Image !== 'function') return;

    themeAssetsPreloaded = true;
    assets.forEach(function (src) {
      var image = new window.Image();

      image.decoding = 'async';
      image.src = src;
    });
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
    var viewTransition;

    if (!document.startViewTransition || prefersReducedMotion()) {
      applyThemeMode(mode);
      return;
    }

    try {
      viewTransition = document.startViewTransition(function () {
        applyThemeMode(mode);
      });

      if (viewTransition && viewTransition.finished) {
        viewTransition.finished.catch(function () {});
      }
    } catch (error) {
      applyThemeMode(mode);
    }
  }

  function setTheme(mode) {
    var metaThemeColor = document.querySelector('meta[name="theme-color"]');

    if (mode !== 'dark' && mode !== 'light') return;
    if (currentThemeMode() === mode) return;

    runThemeModeChange(mode);

    saveTheme(mode);

    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', mode === 'dark' ? '#0d1110' : '#211a13');
    }

    lastObservedTheme = mode;
    updateHangingThemeToggle(mode);
    scheduleThemeTransition(mode);

    window.setTimeout(function () {
      notifyThemeChange(mode);
    }, 0);
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

  function initFantasyPixel() {
    preloadThemeAssets();
    initThemeTransitionObserver();
    initHangingThemeToggle();
    initRightsideControls();
    initAdventurerRadar();
    initCareerMap();
    initFooterSlimeGame();
  }

  initFantasyPixel();
  document.addEventListener('DOMContentLoaded', initFantasyPixel);
  document.addEventListener('pjax:complete', initFantasyPixel);
  window.addEventListener('resize', initAdventurerRadar);
}());
