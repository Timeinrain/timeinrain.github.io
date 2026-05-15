'use strict';

(function () {
  var cleanup = null;
  var desktopQuery = window.matchMedia('(min-width: 901px)');

  function isPaneActive(post) {
    return desktopQuery.matches && post && post.scrollHeight > post.clientHeight + 8;
  }

  function getTargetId(link) {
    var href = link && link.getAttribute('href');
    if (!href || href.charAt(0) !== '#') return '';

    try {
      return decodeURI(href.slice(1));
    } catch (error) {
      return href.slice(1);
    }
  }

  function getHeadingTop(scroller, heading) {
    return heading.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
  }

  function initPostScrollPane() {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }

    var post = document.getElementById('post');
    var article = document.getElementById('article-container');
    var toc = document.querySelector('#card-toc .toc-content');
    var tocPercentage = document.querySelector('#card-toc .toc-percentage');
    if (!post || !article) return;

    var links = toc ? Array.prototype.slice.call(toc.querySelectorAll('.toc-link')) : [];
    var headings = Array.prototype.slice.call(article.querySelectorAll('h1,h2,h3,h4,h5,h6'));
    var rafId = 0;

    function refreshHeadings() {
      headings = Array.prototype.slice.call(article.querySelectorAll('h1,h2,h3,h4,h5,h6')).filter(function (heading) {
        return heading.id;
      });
    }

    function clearActive() {
      if (!toc) return;
      Array.prototype.forEach.call(toc.querySelectorAll('.active'), function (item) {
        item.classList.remove('active');
      });
    }

    function setActiveLink(activeId) {
      if (!toc || !activeId) return;

      var activeHref = '#' + encodeURI(activeId);
      var currentActive = links.find(function (link) {
        return link.getAttribute('href') === activeHref || getTargetId(link) === activeId;
      });
      if (!currentActive) return;

      clearActive();
      currentActive.classList.add('active');

      var parent = currentActive.parentNode;
      while (parent && !parent.matches('.toc')) {
        if (parent.matches('li')) parent.classList.add('active');
        parent = parent.parentNode;
      }

      var tocTop = toc.scrollTop;
      var offset = currentActive.offsetTop - tocTop;
      var middle = (toc.clientHeight - currentActive.clientHeight) / 2;
      if (Math.abs(offset - middle) > 1) {
        toc.scrollTop = tocTop + offset - middle;
      }
    }

    function updateTocState() {
      rafId = 0;
      if (!isPaneActive(post)) return;

      if (tocPercentage) {
        var maxScroll = Math.max(1, post.scrollHeight - post.clientHeight);
        tocPercentage.textContent = Math.max(0, Math.min(100, Math.round(post.scrollTop / maxScroll * 100)));
      }

      if (!headings.length) return;

      var currentId = headings[0].id;
      var currentTop = post.scrollTop + 96;
      for (var i = 0; i < headings.length; i += 1) {
        if (currentTop >= getHeadingTop(post, headings[i])) {
          currentId = headings[i].id;
        } else {
          break;
        }
      }

      setActiveLink(currentId);
    }

    function scheduleUpdate() {
      if (!rafId) rafId = window.requestAnimationFrame(updateTocState);
    }

    function scrollToHeading(event) {
      var link = event.target.closest && event.target.closest('.toc-link');
      if (!link || !isPaneActive(post)) return;

      var target = document.getElementById(getTargetId(link));
      if (!target) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      refreshHeadings();

      var top = Math.max(0, getHeadingTop(post, target) - 24);
      post.scrollTo({
        top: top,
        behavior: 'smooth'
      });
    }

    function refreshAndUpdate() {
      refreshHeadings();
      scheduleUpdate();
    }

    refreshAndUpdate();
    window.setTimeout(refreshAndUpdate, 300);
    window.setTimeout(refreshAndUpdate, 1200);

    post.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', refreshAndUpdate, { passive: true });
    if (toc) toc.addEventListener('click', scrollToHeading, true);

    cleanup = function () {
      if (rafId) window.cancelAnimationFrame(rafId);
      post.removeEventListener('scroll', scheduleUpdate, { passive: true });
      window.removeEventListener('resize', refreshAndUpdate, { passive: true });
      if (toc) toc.removeEventListener('click', scrollToHeading, true);
    };
  }

  document.addEventListener('DOMContentLoaded', initPostScrollPane);
  document.addEventListener('pjax:complete', initPostScrollPane);
})();
