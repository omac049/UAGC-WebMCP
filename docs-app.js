(function () {
  var ALLOWED_DOCS = [
    'UAGC_WebMCP_WhitePaper.md',
    'UAGC_WebMCP_ExecutiveBrief.md',
    'UAGC_WebMCP_Appendices.md'
  ];
  var DEFAULT_DOC = ALLOWED_DOCS[0];

  var articleEl = document.getElementById('article');
  var loaderEl = document.getElementById('loader');
  var navLinks = document.querySelectorAll('[data-doc]');
  var currentDoc = null;

  function getDocFromHash() {
    var hash = location.hash.replace('#', '');
    if (ALLOWED_DOCS.indexOf(hash) !== -1) return hash;
    return DEFAULT_DOC;
  }

  function setActiveNav(doc) {
    navLinks.forEach(function (link) {
      link.classList.toggle('is-active', link.getAttribute('data-doc') === doc);
    });
  }

  function loadDoc(doc) {
    if (ALLOWED_DOCS.indexOf(doc) === -1) doc = DEFAULT_DOC;
    if (doc === currentDoc) return;
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
      })
      .catch(function (err) {
        loaderEl.textContent = err.message;
      });
  }

  navLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var doc = link.getAttribute('data-doc');
      location.hash = doc;
      loadDoc(doc);
    });
  });

  window.addEventListener('hashchange', function () {
    loadDoc(getDocFromHash());
  });

  loadDoc(getDocFromHash());
})();
