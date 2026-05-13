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
    var cssSize = Math.max(220, Math.round(canvas.getBoundingClientRect().width || 280));
    var center = cssSize / 2;
    var radius = cssSize * 0.28;
    var labelRadius = cssSize * 0.39;
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

      context.font = '700 14px "Ark Pixel 12px Proportional SC", "Microsoft YaHei", monospace';
      context.textAlign = align;
      context.textBaseline = 'middle';
      context.fillStyle = '#fff0b5';
      context.shadowColor = '#050302';
      context.shadowOffsetX = 2;
      context.shadowOffsetY = 2;
      context.shadowBlur = 0;
      context.fillText((item.label || '') + ' ' + item.value + '/10', label.x, label.y);
      context.shadowOffsetX = 0;
      context.shadowOffsetY = 0;
    });

    context.fillStyle = '#3a250d';
    context.strokeStyle = '#e0a33e';
    context.lineWidth = 2;
    context.fillRect(center - 62, center - 20, 124, 40);
    context.strokeRect(center - 62, center - 20, 124, 40);
    context.font = '700 17px "Ark Pixel 12px Proportional SC", "Microsoft YaHei", monospace';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#fff2b8';
    context.fillText('总评 ' + (total / items.length).toFixed(1) + '/10', center, center + 1);
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
    playground.setAttribute('aria-label', 'Slime hunt playground');
    playground.innerHTML = [
      '<div class="footer-playground-hud" aria-live="polite">',
      '<span>SLIME HUNT</span>',
      '<strong>0</strong>',
      '</div>',
      '<div class="footer-slime-field"></div>',
      '<div class="footer-playground-ground"></div>'
    ].join('');
    footer.insertBefore(playground, footer.firstChild);

    var field = playground.querySelector('.footer-slime-field');
    var scoreNode = playground.querySelector('.footer-playground-hud strong');
    var sword = document.createElement('div');
    var active = false;
    var currentSlime = null;
    var rafId = null;
    var spawnTimer = null;
    var slashTimer = null;
    var score = 0;
    var mouseX = 0;
    var mouseY = 0;

    sword.className = 'footer-sword-cursor';
    sword.setAttribute('aria-hidden', 'true');
    sword.innerHTML = [
      '<span class="footer-sword-inner">',
      '<span class="footer-sword-blade"></span>',
      '<span class="footer-sword-guard"></span>',
      '<span class="footer-sword-handle"></span>',
      '</span>'
    ].join('');
    document.body.appendChild(sword);

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

    function updateSword(event) {
      mouseX = event.clientX;
      mouseY = event.clientY;
      sword.style.left = mouseX + 'px';
      sword.style.top = mouseY + 'px';
      sword.classList.add('is-slashing');

      if (slashTimer) window.clearTimeout(slashTimer);
      slashTimer = window.setTimeout(function () {
        sword.classList.remove('is-slashing');
      }, 180);
    }

    function createSlime() {
      var slime = document.createElement('div');

      slime.className = 'footer-slime';
      slime.setAttribute('aria-hidden', 'true');
      slime.innerHTML = [
        '<span class="footer-slime-shadow"></span>',
        '<span class="footer-slime-core">',
        '<span class="footer-slime-body"></span>',
        '<span class="footer-slime-eye footer-slime-eye-left"></span>',
        '<span class="footer-slime-eye footer-slime-eye-right"></span>',
        '<span class="footer-slime-mouth"></span>',
        '</span>'
      ].join('');

      return slime;
    }

    function createBurst(x, y) {
      for (var index = 0; index < 10; index++) {
        var particle = document.createElement('span');
        var angle = Math.PI * 2 * index / 10 + randomBetween(-0.18, 0.18);
        var distance = randomBetween(24, 58);

        particle.className = 'footer-hit-burst';
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

    function scheduleSpawn(delay) {
      if (spawnTimer) window.clearTimeout(spawnTimer);

      spawnTimer = window.setTimeout(function () {
        spawnTimer = null;
        spawnSlime();
      }, delay || randomBetween(active ? 650 : 1400, active ? 1500 : 2800));
    }

    function spawnSlime() {
      var footerWidth = footer.clientWidth;
      var footerHeight = footer.clientHeight;
      var side = Math.random() > 0.5 ? 'right' : 'left';
      var slime = createSlime();
      var safeTarget = clamp(randomBetween(76, footerWidth - 120), 52, Math.max(52, footerWidth - 116));

      if (currentSlime || footerWidth < 180 || footerHeight < 180) {
        scheduleSpawn(1200);
        return;
      }

      field.appendChild(slime);
      slime.classList.add(side === 'left' ? 'from-left' : 'from-right');

      currentSlime = {
        node: slime,
        start: performance.now(),
        duration: randomBetween(1250, 1750),
        startX: side === 'left' ? -96 : footerWidth + 96,
        endX: safeTarget,
        groundY: footerHeight - randomBetween(76, 94),
        jump: randomBetween(72, 116),
        defeated: false
      };

      startLoop();
    }

    function defeatSlime() {
      var slimeRect;
      var fieldRect;

      if (!currentSlime || currentSlime.defeated) return;

      currentSlime.defeated = true;
      currentSlime.node.classList.add('is-defeated');
      slimeRect = currentSlime.node.getBoundingClientRect();
      fieldRect = field.getBoundingClientRect();
      score += 1;
      scoreNode.textContent = String(score);
      createBurst(slimeRect.left - fieldRect.left + slimeRect.width / 2, slimeRect.top - fieldRect.top + slimeRect.height / 2);
      sword.classList.add('is-slashing');

      window.setTimeout(function (slime) {
        slime.remove();
        currentSlime = null;
        scheduleSpawn(randomBetween(600, 1300));
      }, 560, currentSlime.node);
    }

    function checkCollision() {
      var hitBox;

      if (!active || !currentSlime || currentSlime.defeated) return;

      hitBox = {
        left: mouseX - 34,
        top: mouseY - 54,
        right: mouseX + 46,
        bottom: mouseY + 20
      };

      if (overlaps(hitBox, currentSlime.node.getBoundingClientRect())) {
        defeatSlime();
      }
    }

    function loop(now) {
      var progress;
      var eased;
      var x;
      var y;

      rafId = null;

      if (currentSlime && !currentSlime.defeated && !currentSlime.escaping) {
        progress = clamp((now - currentSlime.start) / currentSlime.duration, 0, 1);
        eased = easeOutCubic(progress);
        x = currentSlime.startX + (currentSlime.endX - currentSlime.startX) * eased;
        y = currentSlime.groundY - Math.sin(progress * Math.PI) * currentSlime.jump;
        currentSlime.node.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
        checkCollision();

        if (progress >= 1) {
          currentSlime.escaping = true;
          currentSlime.node.classList.add('is-escaping');

          window.setTimeout(function (slime) {
            if (currentSlime && currentSlime.node === slime) currentSlime = null;
            slime.remove();
            scheduleSpawn();
          }, 320, currentSlime.node);
        }
      }

      if (currentSlime || active) startLoop();
    }

    function startLoop() {
      if (!rafId) rafId = window.requestAnimationFrame(loop);
    }

    footer.addEventListener('mouseenter', function (event) {
      active = true;
      footer.classList.add('is-sword-zone');
      sword.classList.add('is-visible');
      updateSword(event);
      startLoop();
    });

    footer.addEventListener('mousemove', function (event) {
      if (!active) return;
      updateSword(event);
      checkCollision();
    });

    footer.addEventListener('mouseleave', function () {
      active = false;
      footer.classList.remove('is-sword-zone');
      sword.classList.remove('is-visible', 'is-slashing');
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden && spawnTimer) {
        window.clearTimeout(spawnTimer);
        spawnTimer = null;
      } else if (!document.hidden && !currentSlime && !spawnTimer) {
        scheduleSpawn(900);
      }
    });

    scheduleSpawn(700);
  }

  function initFantasyPixel() {
    initAdventurerRadar();
    initCareerMap();
    initFooterSlimeGame();
  }

  initFantasyPixel();
  document.addEventListener('DOMContentLoaded', initFantasyPixel);
  document.addEventListener('pjax:complete', initFantasyPixel);
  window.addEventListener('resize', initAdventurerRadar);
}());
