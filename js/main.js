(function () {
  'use strict';

  /* ── 0. Matrix boot screen ───────────────────────────── */
  if (document.body.classList.contains('booting')) {
    sessionStorage.setItem('rsc_booted', '1');
    var bootEl = document.getElementById('matrix-boot');

    var canvas = document.createElement('canvas');
    bootEl.appendChild(canvas);
    var tagEl = document.createElement('div');
    tagEl.className = 'boot-tagline';
    bootEl.appendChild(tagEl);

    var ctx = canvas.getContext('2d');
    var fs = 14;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    var cols  = Math.floor(canvas.width / fs);
    var drops = Array.from({ length: cols }, function () { return Math.random() * -40; });
    var chars = 'アイウエオカキクケコサシスセソタチツテト0110';

    function drawMatrix() {
      ctx.fillStyle = 'rgba(7,7,15,0.06)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drops.forEach(function (y, i) {
        var ch = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillStyle = Math.random() > 0.97 ? '#ffffff' : '#00ff88';
        ctx.globalAlpha = 0.4 + Math.random() * 0.6;
        ctx.font = fs + 'px JetBrains Mono,monospace';
        ctx.fillText(ch, i * fs, y * fs);
        ctx.globalAlpha = 1;
        if (y * fs > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 0.6;
      });
    }

    var iv = setInterval(drawMatrix, 35);

    setTimeout(function () {
      tagEl.textContent = 'rawscorp@akin.im:~$';
      tagEl.classList.add('visible');
    }, 1100);

    function dismissBoot() {
      clearInterval(iv);
      bootEl.style.transition = 'opacity 0.5s';
      bootEl.style.opacity = '0';
      setTimeout(function () { document.body.classList.remove('booting'); }, 500);
      bootEl.removeEventListener('click', dismissBoot);
      document.removeEventListener('keydown', dismissBoot);
    }

    setTimeout(dismissBoot, 2400);
    bootEl.addEventListener('click', dismissBoot);
    document.addEventListener('keydown', dismissBoot, { once: true });
  }

  /* ── 1. Language toggle (about page) ─────────────────── */
  var langBtns = document.querySelectorAll('.lang-btn');
  if (langBtns.length) {
    langBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var lang = btn.dataset.lang;
        langBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        document.querySelectorAll('.about-block').forEach(function (b) { b.classList.add('hidden'); });
        var t = document.getElementById('about-' + lang);
        if (t) t.classList.remove('hidden');
      });
    });
  }

  /* ── 2. Twitch live status ────────────────────────────── */
  var dot   = document.getElementById('twitch-dot');
  var label = document.getElementById('twitch-label');
  if (dot && label) {
    var link = document.querySelector('#twitch-status .status-link');
    var m    = link && link.href.match(/twitch\.tv\/([^/?#]+)/i);
    if (m) {
      fetch('https://img.shields.io/twitch/status/' + m[1] + '.json', { cache: 'no-cache' })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d.message === 'online') {
            dot.classList.add('live');
            label.classList.add('live');
            label.textContent = 'live';
          } else {
            label.textContent = 'offline';
          }
        })
        .catch(function () { label.textContent = 'offline'; });
    }
  }

  /* ── 3. Reading progress bar ──────────────────────────── */
  var progressBar = document.getElementById('progress-bar');
  if (progressBar) {
    var onScroll = function () {
      var st = document.documentElement.scrollTop;
      var sh = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      progressBar.style.width = (sh > 0 ? (st / sh) * 100 : 0) + '%';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ── 4. Copy code buttons ─────────────────────────────── */
  document.querySelectorAll('.post-content pre').forEach(function (pre) {
    var btn = document.createElement('button');
    btn.className   = 'copy-btn';
    btn.textContent = 'copy';
    btn.addEventListener('click', function () {
      var code = pre.querySelector('code');
      var text = (code || pre).innerText;
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = 'copied!';
        btn.classList.add('copied');
        setTimeout(function () {
          btn.textContent = 'copy';
          btn.classList.remove('copied');
        }, 2000);
      });
    });
    pre.appendChild(btn);
  });

  /* ── 5. Command palette ───────────────────────────────── */
  var NAV_ITEMS = [
    { title: 'home',           url: '/',        icon: '~',  date: '' },
    { title: 'about / hakkında', url: '/about/', icon: '$',  date: '' },
    { title: 'now / şu an',    url: '/now/',    icon: '◎',  date: '' },
    { title: 'posts / yazılar', url: '/posts/', icon: '//>', date: '' },
  ];

  var pal        = document.getElementById('cmdpal');
  var palInput   = document.getElementById('cmdpal-input');
  var palList    = document.getElementById('cmdpal-list');
  var palBackdrop = document.getElementById('cmdpal-backdrop');
  var allItems   = [];
  var filtered   = [];
  var activeIdx  = -1;
  var loaded     = false;

  function palOpen() {
    if (!pal) return;
    pal.hidden = false;
    palInput.value = '';
    palInput.focus();
    document.body.style.overflow = 'hidden';
    if (!loaded) {
      loaded = true;
      fetch('/index.json')
        .then(function (r) { return r.json(); })
        .then(function (d) {
          allItems = NAV_ITEMS.concat((d.posts || []).map(function (p) {
            return { title: p.title, url: p.url, icon: '▸', date: p.date };
          }));
          palRender('');
        })
        .catch(function () {
          allItems = NAV_ITEMS;
          palRender('');
        });
    } else {
      palRender(palInput.value);
    }
  }

  function palClose() {
    if (!pal) return;
    pal.hidden = true;
    document.body.style.overflow = '';
    activeIdx = -1;
  }

  function palRender(q) {
    q = q.toLowerCase().trim();
    filtered = q
      ? allItems.filter(function (i) { return i.title.toLowerCase().includes(q) || i.url.toLowerCase().includes(q); })
      : allItems;
    activeIdx = filtered.length ? 0 : -1;

    palList.innerHTML = '';

    var navEnd = 0;
    filtered.forEach(function (item, i) {
      if (item.date && navEnd === 0) {
        navEnd = i;
        if (i > 0) {
          var sep = document.createElement('li');
          sep.className = 'cmdpal-separator';
          palList.appendChild(sep);
        }
      }
      var li = document.createElement('li');
      li.className = 'cmdpal-item' + (i === activeIdx ? ' active' : '');
      li.setAttribute('role', 'option');
      li.innerHTML =
        '<span class="cmdpal-item-icon">' + (item.icon || '→') + '</span>' +
        '<span class="cmdpal-item-title">' + item.title + '</span>' +
        (item.date ? '<span class="cmdpal-item-date">' + item.date + '</span>' : '');
      li.addEventListener('click', function () { palGo(item.url); });
      li.addEventListener('mouseenter', function () {
        activeIdx = i;
        palHighlight();
      });
      palList.appendChild(li);
    });

    var hint = document.createElement('div');
    hint.className = 'cmdpal-hint';
    hint.innerHTML = '<span><kbd>↑↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span>';
    palList.appendChild(hint);
  }

  function palHighlight() {
    palList.querySelectorAll('.cmdpal-item').forEach(function (el, i) {
      el.classList.toggle('active', i === activeIdx);
    });
    var active = palList.querySelector('.cmdpal-item.active');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  function palGo(url) {
    palClose();
    window.location.href = url;
  }

  if (pal) {
    palInput.addEventListener('input', function () { palRender(palInput.value); });

    palInput.addEventListener('keydown', function (e) {
      var items = palList.querySelectorAll('.cmdpal-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIdx = Math.min(activeIdx + 1, items.length - 1);
        palHighlight();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIdx = Math.max(activeIdx - 1, 0);
        palHighlight();
      } else if (e.key === 'Enter' && activeIdx >= 0 && filtered[activeIdx]) {
        palGo(filtered[activeIdx].url);
      } else if (e.key === 'Escape') {
        palClose();
      }
    });

    palBackdrop.addEventListener('click', palClose);

    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        pal.hidden ? palOpen() : palClose();
      }
      if (!pal.hidden && e.key === 'Escape') palClose();
    });
  }

  /* ── 6. Image lightbox ───────────────────────────────── */
  document.querySelectorAll('.post-content img').forEach(function (img) {
    img.classList.add('zoomable');
    img.addEventListener('click', function () {
      var lb = document.createElement('div');
      lb.className = 'lightbox';

      var wrap = document.createElement('div');
      wrap.className = 'lightbox-wrap';

      var clone = document.createElement('img');
      clone.src = img.src;
      clone.alt = img.alt;

      var hint = document.createElement('span');
      hint.className = 'lightbox-hint';
      hint.textContent = 'esc / tıkla → kapat';

      wrap.appendChild(clone);
      lb.appendChild(wrap);
      lb.appendChild(hint);
      document.body.appendChild(lb);
      document.body.style.overflow = 'hidden';

      requestAnimationFrame(function () { lb.classList.add('open'); });

      function closeLb() {
        lb.classList.remove('open');
        setTimeout(function () {
          if (lb.parentNode) lb.parentNode.removeChild(lb);
        }, 180);
        document.body.style.overflow = '';
        document.removeEventListener('keydown', onKey);
      }

      function onKey(e) { if (e.key === 'Escape') closeLb(); }

      lb.addEventListener('click', function (e) {
        if (e.target !== clone) closeLb();
      });
      document.addEventListener('keydown', onKey);
    });
  });

  /* ── 7. Console easter egg ────────────────────────────── */
  var s = 'color:#00ff88;font-family:monospace;font-size:12px';
  var m = 'color:#3d4466;font-family:monospace;font-size:11px';
  console.log('%crawscorp@akin.im:~$', s);
  console.log('%c  type help() in console for commands', m);

  window.help = function () {
    console.log('%c> available commands', 'color:#00d4ff;font-family:monospace');
    ['whoami   → kimim', 'ls       → sayfalar', 'contact  → iletişim', 'matrix   → ...'].forEach(function (l) {
      console.log('%c  ' + l, m);
    });
  };
  window.whoami = function () {
    console.log('%cakın abdullahoğlu / rawscorp', s);
    console.log('%csoftware engineer · cybersec msc · streamer', m);
  };
  window.ls = function () {
    console.log('%cdrw  /', m);
    console.log('%cdrw  /about', m);
    console.log('%cdrw  /now', m);
    console.log('%cdrw  /posts', m);
  };
  window.contact = function () {
    console.log('%chttps://twitch.tv/rawscorp', s);
    console.log('%chttps://twitter.com/rootturk', s);
  };
  window.matrix = function () {
    var chars = '01アイウエオカキクケコサシスセソ';
    var i = 0;
    var iv = setInterval(function () {
      var line = Array.from({ length: 50 }, function () {
        return chars[Math.floor(Math.random() * chars.length)];
      }).join('');
      console.log('%c' + line, 'color:#00ff88;font-family:monospace;font-size:10px');
      if (++i > 15) clearInterval(iv);
    }, 80);
  };

}());
