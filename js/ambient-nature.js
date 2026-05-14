(function () {
  var ROOT_ID = 'pixel-nature-layer';
  var HERO_ID = 'pixel-hero-ambient';
  var REDUCED_QUERY = '(prefers-reduced-motion: reduce)';
  var SMALL_QUERY = '(max-width: 720px)';
  var resizeTimer = 0;
  var reducedMotionQuery = window.matchMedia ? window.matchMedia(REDUCED_QUERY) : null;
  var smallScreenQuery = window.matchMedia ? window.matchMedia(SMALL_QUERY) : null;

  var HERO_CLOUD_ASSETS = [
    {
      url: '/img/pixel-medieval/ambient/hero-cloud-real-1.png?v=soft-1',
      ratio: 150 / 520
    },
    {
      url: '/img/pixel-medieval/ambient/hero-cloud-real-2.png?v=soft-1',
      ratio: 150 / 510
    },
    {
      url: '/img/pixel-medieval/ambient/hero-cloud-real-3.png?v=soft-1',
      ratio: 130 / 420
    },
    {
      url: '/img/pixel-medieval/ambient/hero-cloud-real-4.png?v=soft-1',
      ratio: 116 / 520
    },
    {
      url: '/img/pixel-medieval/ambient/hero-cloud-real-5.png?v=soft-1',
      ratio: 150 / 520
    },
    {
      url: '/img/pixel-medieval/ambient/hero-cloud-real-6.png?v=soft-1',
      ratio: 120 / 520
    }
  ];

  var HERO_BIRDS = [
    {
      x0: '-8vw',
      y0: '27vh',
      x1: '44vw',
      y1: '22vh',
      x2: '108vw',
      y2: '29vh',
      direction: '1',
      scale: '0.78',
      duration: '34s',
      delay: '-13s'
    },
    {
      x0: '108vw',
      y0: '17vh',
      x1: '58vw',
      y1: '20vh',
      x2: '-10vw',
      y2: '15vh',
      direction: '-1',
      scale: '0.62',
      duration: '42s',
      delay: '-29s'
    },
    {
      x0: '-12vw',
      y0: '20vh',
      x1: '28vw',
      y1: '18vh',
      x2: '106vw',
      y2: '23vh',
      direction: '1',
      scale: '0.48',
      duration: '48s',
      delay: '-5s'
    },
    {
      x0: '110vw',
      y0: '31vh',
      x1: '72vw',
      y1: '27vh',
      x2: '-14vw',
      y2: '34vh',
      direction: '-1',
      scale: '0.52',
      duration: '52s',
      delay: '-34s'
    },
    {
      x0: '-10vw',
      y0: '13vh',
      x1: '38vw',
      y1: '15vh',
      x2: '112vw',
      y2: '12vh',
      direction: '1',
      scale: '0.38',
      duration: '58s',
      delay: '-41s'
    },
    {
      x0: '104vw',
      y0: '24vh',
      x1: '62vw',
      y1: '18vh',
      x2: '-12vw',
      y2: '21vh',
      direction: '-1',
      scale: '0.44',
      duration: '46s',
      delay: '-18s'
    }
  ];

  var FIREFLY_PATHS = [
    ['8vw', '76vh', '15vw', '68vh', '22vw', '73vh', '30vw', '64vh', '0.74', '10s', '-1s'],
    ['18vw', '48vh', '12vw', '40vh', '23vw', '34vh', '31vw', '42vh', '0.56', '12s', '-6s'],
    ['76vw', '72vh', '86vw', '66vh', '79vw', '58vh', '92vw', '55vh', '0.66', '11s', '-4s'],
    ['88vw', '43vh', '79vw', '39vh', '90vw', '31vh', '72vw', '35vh', '0.48', '13s', '-9s'],
    ['45vw', '82vh', '50vw', '74vh', '42vw', '69vh', '55vw', '62vh', '0.52', '14s', '-2s'],
    ['6vw', '36vh', '14vw', '29vh', '9vw', '23vh', '21vw', '30vh', '0.44', '15s', '-11s'],
    ['63vw', '52vh', '58vw', '45vh', '69vw', '40vh', '73vw', '48vh', '0.5', '12s', '-8s'],
    ['35vw', '60vh', '29vw', '52vh', '38vw', '45vh', '48vw', '53vh', '0.6', '10s', '-5s'],
    ['93vw', '78vh', '84vw', '74vh', '89vw', '68vh', '78vw', '63vh', '0.7', '13s', '-3s'],
    ['55vw', '32vh', '49vw', '26vh', '60vw', '22vh', '68vw', '29vh', '0.42', '16s', '-12s']
  ];

  function prefersReducedMotion() {
    return Boolean(reducedMotionQuery && reducedMotionQuery.matches);
  }

  function isSmallScreen() {
    return Boolean(smallScreenQuery && smallScreenQuery.matches);
  }

  function createElement(className) {
    var element = document.createElement('span');
    element.className = className;
    return element;
  }

  function setVars(element, vars) {
    Object.keys(vars).forEach(function (key) {
      element.style.setProperty(key, vars[key]);
    });
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function randomItem(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function appendGarden(root, side) {
    var garden = document.createElement('div');
    var variants = ['a', 'b', 'c', 'd'];

    garden.className = 'pixel-nature-garden pixel-nature-garden--' + side;

    variants.forEach(function (variant) {
      garden.appendChild(createElement('pixel-nature-tuft pixel-nature-tuft--' + variant));
    });

    root.appendChild(garden);
  }

  function appendFireflies(root) {
    var count = isSmallScreen() ? 5 : FIREFLY_PATHS.length;

    FIREFLY_PATHS.slice(0, count).forEach(function (path) {
      var firefly = createElement('pixel-nature-firefly');

      setVars(firefly, {
        '--x0': path[0],
        '--y0': path[1],
        '--x1': path[2],
        '--y1': path[3],
        '--x2': path[4],
        '--y2': path[5],
        '--x3': path[6],
        '--y3': path[7],
        '--glow': path[8],
        '--duration': path[9],
        '--delay': path[10]
      });

      root.appendChild(firefly);
    });
  }

  function appendHeroClouds(root) {
    var count = isSmallScreen() ? 4 : 8;
    var usedAssets = HERO_CLOUD_ASSETS.slice();

    for (var index = 0; index < count; index += 1) {
      var asset = usedAssets.length ? usedAssets.splice(Math.floor(Math.random() * usedAssets.length), 1)[0] : randomItem(HERO_CLOUD_ASSETS);
      var direction = Math.random() > 0.5 ? 1 : -1;
      var duration = Math.round(randomBetween(88, 168));
      var width = Math.round(randomBetween(14, index % 3 === 0 ? 34 : 26));
      var isFar = index % 3 === 1;
      var element = createElement('pixel-hero-cloud' + (isFar ? ' pixel-hero-cloud--far' : '') + (index > 4 ? ' pixel-hero-cloud--quiet' : ''));

      setVars(element, {
        '--cloud-url': 'url("' + asset.url + '")',
        '--cloud-width': 'clamp(120px, ' + width + 'vw, ' + Math.round(width * 18) + 'px)',
        '--cloud-ratio': asset.ratio.toFixed(4),
        '--y': randomBetween(5, 36).toFixed(2) + '%',
        '--x0': direction > 0 ? randomBetween(-42, -18).toFixed(2) + 'vw' : randomBetween(102, 128).toFixed(2) + 'vw',
        '--x1': direction > 0 ? randomBetween(104, 132).toFixed(2) + 'vw' : randomBetween(-46, -20).toFixed(2) + 'vw',
        '--duration': duration + 's',
        '--delay': '-' + Math.round(randomBetween(0, duration)) + 's',
        '--scale': randomBetween(0.72, 1.18).toFixed(2),
        '--opacity': randomBetween(isFar ? 0.18 : 0.28, isFar ? 0.32 : 0.46).toFixed(2)
      });

      root.appendChild(element);
    }
  }

  function appendHeroBirds(root) {
    HERO_BIRDS.forEach(function (bird) {
      var element = createElement('pixel-hero-bird');
      var sprite = createElement('pixel-hero-bird__sprite');

      setVars(element, {
        '--x0': bird.x0,
        '--y0': bird.y0,
        '--x1': bird.x1,
        '--y1': bird.y1,
        '--x2': bird.x2,
        '--y2': bird.y2,
        '--direction': bird.direction,
        '--scale': bird.scale,
        '--duration': bird.duration,
        '--delay': bird.delay
      });

      element.appendChild(sprite);
      root.appendChild(element);
    });
  }

  function buildHeroScene() {
    var existing = document.getElementById(HERO_ID);
    var header = document.querySelector('#page-header.full_page');
    var root;

    if (existing) existing.remove();
    if (!header) return;

    root = document.createElement('div');
    root.id = HERO_ID;
    root.className = 'pixel-hero-ambient';
    root.setAttribute('aria-hidden', 'true');

    appendHeroClouds(root);

    if (!prefersReducedMotion()) {
      appendHeroBirds(root);
    }

    header.appendChild(root);
  }

  function buildLayer() {
    var root = document.getElementById(ROOT_ID);

    if (!document.body) return;

    if (root) root.remove();

    root = document.createElement('div');
    root.id = ROOT_ID;
    root.className = 'pixel-nature-layer';
    root.setAttribute('aria-hidden', 'true');

    appendGarden(root, 'left');
    appendGarden(root, 'right');

    if (!prefersReducedMotion()) {
      appendFireflies(root);
    }

    document.body.appendChild(root);
  }

  function scheduleRebuild() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(initAmbientNature, 180);
  }

  function initAmbientNature() {
    buildLayer();
    buildHeroScene();
  }

  initAmbientNature();
  document.addEventListener('DOMContentLoaded', initAmbientNature);
  document.addEventListener('pjax:complete', initAmbientNature);
  window.addEventListener('resize', scheduleRebuild, { passive: true });

  if (reducedMotionQuery) {
    if (typeof reducedMotionQuery.addEventListener === 'function') {
      reducedMotionQuery.addEventListener('change', scheduleRebuild);
    } else if (typeof reducedMotionQuery.addListener === 'function') {
      reducedMotionQuery.addListener(scheduleRebuild);
    }
  }

  if (smallScreenQuery) {
    if (typeof smallScreenQuery.addEventListener === 'function') {
      smallScreenQuery.addEventListener('change', scheduleRebuild);
    } else if (typeof smallScreenQuery.addListener === 'function') {
      smallScreenQuery.addListener(scheduleRebuild);
    }
  }
}());
