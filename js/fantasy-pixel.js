(function () {
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

  document.addEventListener('click', function (event) {
    if (event.button !== 0) return;
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

    if (!footer || footer.dataset.slimeGameReady === 'true') return;

    footer.dataset.slimeGameReady = 'true';
    footer.classList.add('footer-slime-zone');

    var playground = document.createElement('div');
    playground.className = 'footer-slime-playground';
    playground.setAttribute('aria-label', 'Magic monster playground');
    playground.innerHTML = [
      '<div class="footer-playground-hud" aria-live="polite">',
      '<span>MAGIC HUNT</span>',
      '<strong>0</strong>',
      '</div>',
      '<div class="footer-slime-field"></div>',
      '<div class="footer-playground-ground"></div>'
    ].join('');
    footer.insertBefore(playground, footer.firstChild);

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
    var minMonsters = 3;
    var maxMonsters = 5;

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

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
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

    function createMonsterNode(type) {
      var monster = document.createElement('div');

      monster.className = 'footer-monster footer-' + type;
      monster.setAttribute('aria-hidden', 'true');

      if (type === 'bunny') {
        monster.innerHTML = [
          '<span class="footer-monster-shadow"></span>',
          '<span class="footer-bunny-core"></span>'
        ].join('');
      } else {
        monster.innerHTML = [
          '<span class="footer-monster-shadow"></span>',
          '<span class="footer-slime-core"></span>'
        ].join('');
      }

      return monster;
    }

    function createMagicBurst(x, y, type) {
      for (var index = 0; index < 14; index++) {
        var particle = document.createElement('span');
        var angle = Math.PI * 2 * index / 14 + randomBetween(-0.18, 0.18);
        var distance = randomBetween(28, 70);

        particle.className = 'footer-hit-burst ' + (type === 'bunny' ? 'is-bunny-hit' : 'is-slime-hit');
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

    function scheduleMaintain(delay) {
      if (maintainTimer) window.clearTimeout(maintainTimer);

      maintainTimer = window.setTimeout(function () {
        maintainTimer = null;
        maintainMonsters(active);
        scheduleMaintain(randomBetween(850, 1500));
      }, delay || randomBetween(700, 1200));
    }

    function spawnMonster(options) {
      var footerWidth = footer.clientWidth;
      var footerHeight = footer.clientHeight;
      var side = Math.random() > 0.5 ? 'right' : 'left';
      var type = Math.random() > 0.52 ? 'bunny' : 'slime';
      var monsterNode;
      var monster;
      var safeTarget = clamp(randomBetween(76, footerWidth - 120), 52, Math.max(52, footerWidth - 116));

      options = options || {};

      if (footerWidth < 180 || footerHeight < 180 || liveMonsterCount() >= maxMonsters) {
        return;
      }

      if (options.type) type = options.type;

      if (typeof options.targetX === 'number') {
        safeTarget = clamp(options.targetX, 70, Math.max(70, footerWidth - 116));
        side = safeTarget < footerWidth / 2 ? 'left' : 'right';
      }

      monsterNode = createMonsterNode(type);
      field.appendChild(monsterNode);
      monsterNode.classList.add(side === 'left' ? 'from-left' : 'from-right');

      monster = {
        node: monsterNode,
        type: type,
        start: performance.now(),
        duration: options.quick ? randomBetween(1250, 1650) : randomBetween(2300, 3600),
        startX: side === 'left' ? -110 : footerWidth + 110,
        endX: safeTarget,
        groundY: footerHeight - randomBetween(type === 'bunny' ? 112 : 96, type === 'bunny' ? 150 : 128),
        jump: randomBetween(type === 'bunny' ? 118 : 92, type === 'bunny' ? 168 : 140),
        defeated: false
      };

      monsters.push(monster);
      startLoop();
    }

    function maintainMonsters(fillToMax) {
      var target = fillToMax ? maxMonsters : minMonsters + Math.floor(Math.random() * 2);
      var guard = 0;

      while (liveMonsterCount() < target && guard < maxMonsters) {
        spawnMonster({ quick: fillToMax });
        guard += 1;
      }
    }

    function removeMonster(monster) {
      var index = monsters.indexOf(monster);

      if (index !== -1) monsters.splice(index, 1);
      monster.node.remove();
      maintainMonsters(active);
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
      maintainMonsters(active);

      window.setTimeout(function () {
        removeMonster(monster);
      }, monster.type === 'bunny' ? 720 : 620);
    }

    function createMagicPit(event) {
      var fieldRect = field.getBoundingClientRect();
      var pit = document.createElement('span');
      var localX = event.clientX - fieldRect.left;
      var localY = event.clientY - fieldRect.top;
      var magicPit = {
        node: pit,
        expiresAt: performance.now() + 2000
      };

      pit.className = 'footer-magic-pit';
      pit.style.left = localX + 'px';
      pit.style.top = localY + 'px';
      field.appendChild(pit);
      pits.push(magicPit);

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
      }, 2000);

      checkMagicHits();
    }

    function checkMagicHits() {
      if (!pits.length || !monsters.length) return;

      pits.forEach(function (pit) {
        var pitRect = pit.node.getBoundingClientRect();

        monsters.forEach(function (monster) {
          if (monster.defeated || monster.escaping) return;

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
      maintainMonsters(active);

      window.setTimeout(function () {
        removeMonster(monster);
      }, 360);
    }

    function moveMonster(monster, now) {
      var progress = clamp((now - monster.start) / monster.duration, 0, 1);
      var eased = easeOutCubic(progress);
      var x = monster.startX + (monster.endX - monster.startX) * eased;
      var y = monster.groundY - Math.sin(progress * Math.PI) * monster.jump;

      monster.node.style.transform = 'translate(' + x + 'px, ' + y + 'px)';

      if (progress >= 1) {
        escapeMonster(monster);
      }
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

    footer.addEventListener('mouseenter', function (event) {
      var footerRect = footer.getBoundingClientRect();

      active = true;
      footer.classList.add('is-magic-zone');
      wand.classList.add('is-visible');
      updateWand(event);
      maintainMonsters(true);

      if (liveMonsterCount() < maxMonsters) {
        spawnMonster({
          quick: true,
          targetX: event.clientX - footerRect.left + randomBetween(-120, 120)
        });
      }

      startLoop();
    });

    footer.addEventListener('mousemove', function (event) {
      if (!active) return;
      updateWand(event);
    });

    footer.addEventListener('click', function (event) {
      if (!active) return;

      event.preventDefault();
      event.stopPropagation();
      updateWand(event);
      createMagicPit(event);
    });

    footer.addEventListener('mouseleave', function () {
      active = false;
      footer.classList.remove('is-magic-zone');
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
      '/img/pixel-medieval/forest-layout.png'
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
