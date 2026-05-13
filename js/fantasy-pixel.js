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

  initCareerMap();
  document.addEventListener('DOMContentLoaded', initCareerMap);
  document.addEventListener('pjax:complete', initCareerMap);
}());
