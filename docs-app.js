(function () {
  var ALLOWED_DOCS = [
    'UAGC_WebMCP_WhitePaper.md',
    'UAGC_WebMCP_ExecutiveBrief.md',
    'UAGC_WebMCP_Appendices.md'
  ];
  var DEFAULT_DOC = ALLOWED_DOCS[0];

  function slugify(text) {
    return text.toLowerCase()
      .replace(/<[^>]*>/g, '')
      .replace(/&[^;]+;/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  var renderer = new marked.Renderer();
  renderer.heading = function (data) {
    var id = slugify(data.text);
    return '<h' + data.depth + ' id="' + id + '">' + data.text + '</h' + data.depth + '>\n';
  };
  marked.use({ renderer: renderer });

  var articleEl = document.getElementById('article');
  var loaderEl = document.getElementById('loader');
  var navLinks = document.querySelectorAll('[data-doc]');
  var currentDoc = null;

  function parseHash() {
    var raw = location.hash.replace(/^#/, '');
    if (!raw) return { doc: DEFAULT_DOC, anchor: null };
    if (ALLOWED_DOCS.indexOf(raw) !== -1) return { doc: raw, anchor: null };
    var parts = raw.split(':');
    if (parts.length === 2 && ALLOWED_DOCS.indexOf(parts[0]) !== -1) {
      return { doc: parts[0], anchor: parts[1] };
    }
    if (currentDoc) return { doc: currentDoc, anchor: raw };
    return { doc: DEFAULT_DOC, anchor: raw };
  }

  function setActiveNav(doc) {
    navLinks.forEach(function (link) {
      link.classList.toggle('is-active', link.getAttribute('data-doc') === doc);
    });
  }

  function scrollToAnchor(id) {
    if (!id) return;
    var target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function loadDoc(doc, anchor) {
    if (ALLOWED_DOCS.indexOf(doc) === -1) doc = DEFAULT_DOC;

    if (doc === currentDoc) {
      if (anchor) scrollToAnchor(anchor);
      return;
    }

    currentDoc = doc;
    setActiveNav(doc);
    articleEl.style.display = 'none';
    loaderEl.style.display = 'flex';
    window.scrollTo(0, 0);

    fetch(doc)
      .then(function (r) {
        if (!r.ok) throw new Error('Could not load ' + doc);
        return r.text();
      })
      .then(function (md) {
        var rawHtml = marked.parse(md);
        articleEl.innerHTML = DOMPurify.sanitize(rawHtml);
        loaderEl.style.display = 'none';
        articleEl.style.display = 'block';
        document.title = 'UAGC WebMCP \u2014 ' + doc.replace('UAGC_WebMCP_', '').replace('.md', '').replace(/([A-Z])/g, ' $1').trim();
        if (anchor) {
          requestAnimationFrame(function () { scrollToAnchor(anchor); });
        }
      })
      .catch(function (err) {
        loaderEl.textContent = err.message;
      });
  }

  articleEl.addEventListener('click', function (e) {
    var link = e.target.closest('a');
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href || !href.startsWith('#')) return;
    e.preventDefault();
    var anchor = href.replace(/^#/, '');
    var target = document.getElementById(anchor);
    if (target) {
      history.pushState(null, '', '#' + currentDoc + ':' + anchor);
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });

  navLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var doc = link.getAttribute('data-doc');
      location.hash = doc;
    });
  });

  window.addEventListener('hashchange', function () {
    var parsed = parseHash();
    loadDoc(parsed.doc, parsed.anchor);
  });

  var initial = parseHash();
  loadDoc(initial.doc, initial.anchor);
})();
