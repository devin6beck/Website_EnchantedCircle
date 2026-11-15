/* Enchanted Circle site behaviour: review carousel and "Join our circle" sign-up. */
(function () {
  'use strict';

  /*
   * Mailing-list settings. Sign-ups are saved to Supabase through the
   * join_mailing_list() database function (see supabase/website_mailing_list.sql).
   * Fill in the project URL and its *publishable* (public) key once that
   * function exists. Never put a secret or service-role key here.
   */
  var MAILING_LIST = {
    supabaseUrl: '',
    publishableKey: ''
  };

  /* ---------- Land on #anchors (e.g. services.html#faqs) after web fonts shift the layout ---------- */
  if (location.hash.length > 1 && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) target.scrollIntoView({ block: 'start' });
    });
  }

  /* ---------- Reviews carousel ---------- */
  document.querySelectorAll('.reviews-carousel').forEach(function (carousel) {
    var track = carousel.querySelector('.reviews-track');
    var next = carousel.querySelector('.reviews-next');
    var prev = carousel.querySelector('.reviews-prev');
    if (!track || !next) return;

    function step() {
      var card = track.querySelector('.review');
      if (!card) return track.clientWidth;
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return card.getBoundingClientRect().width + gap;
    }
    function atEnd() { return track.scrollLeft + track.clientWidth >= track.scrollWidth - 4; }

    /* One dot per scroll position: 6 reviews with 2 visible gives 5 dots. */
    var cards = track.querySelectorAll('.review');
    var dotsBox = document.createElement('div');
    dotsBox.className = 'reviews-dots';
    dotsBox.setAttribute('role', 'group');
    dotsBox.setAttribute('aria-label', 'Choose reviews to show');
    carousel.querySelector('.reviews-controls').prepend(dotsBox);
    var dots = [];

    function positions() {
      var visible = Math.max(1, Math.round(track.clientWidth / step()));
      return Math.max(1, cards.length - visible + 1);
    }
    function current() {
      return atEnd() ? dots.length - 1 : Math.round(track.scrollLeft / step());
    }
    function buildDots() {
      var count = positions();
      if (count === dots.length) return;
      dotsBox.textContent = '';
      dots = [];
      for (var i = 0; i < count; i++) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'reviews-dot';
        dot.setAttribute('aria-label', 'Show review ' + (i + 1) + ' of ' + cards.length);
        dot.addEventListener('click', (function (index) {
          return function () { track.scrollTo({ left: index * step() }); mark(index); };
        })(i));
        dotsBox.appendChild(dot);
        dots.push(dot);
      }
      dotsBox.hidden = count < 2;
    }
    function mark(active) {
      dots.forEach(function (dot, i) {
        if (i === active) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
      if (prev) prev.hidden = active === 0;
    }
    function update() {
      mark(current());
      if (prev) prev.hidden = track.scrollLeft <= 4;
    }

    next.addEventListener('click', function () {
      if (atEnd()) { track.scrollTo({ left: 0 }); mark(0); }
      else { var target = Math.min(current() + 1, dots.length - 1); track.scrollBy({ left: step() }); mark(target); }
    });
    if (prev) prev.addEventListener('click', function () {
      var target = Math.max(current() - 1, 0);
      track.scrollBy({ left: -step() });
      mark(target);
    });
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', function () { buildDots(); update(); });
    buildDots();
    update();
  });

  /* ---------- Gentle fade-in as sections scroll into view ---------- */
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ('IntersectionObserver' in window && !reduceMotion) {
    var targets = document.querySelectorAll(
      '.comfort-copy, .comfort-art, .care-squares > a, .moment > *, .people-art, .people-copy, ' +
      '.reviews-intro, .reviews-carousel, .walkthrough > h2, .walkthrough-lede, .walkthrough > .button, .walkthrough-list > li, ' +
      'main > section:not(.hero):not(.page-hero) > h2, .service-row, .faq-list article, .story-inner, .split-cta > div, ' +
      '.faq-card article, .story-gallery-row > img, .about-quote-inner > *, .extra-copy'
    );
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add('is-visible');
        /* Drop the stagger once shown, so hover effects respond immediately. */
        if (el.style.transitionDelay) {
          setTimeout(function () { el.style.transitionDelay = ''; }, 800 + (parseFloat(el.style.transitionDelay) || 0) + 100);
        }
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    targets.forEach(function (el) {
      /* Leave anything already on screen at load alone, so nothing flashes. */
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
      el.classList.add('reveal');
      var siblings = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      if (el.matches('.care-squares > a, .walkthrough-list > li, .story-gallery-row > img')) el.style.transitionDelay = (siblings * 90) + 'ms';
      observer.observe(el);
    });
  }

  /* ---------- Join our circle ---------- */
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  document.querySelectorAll('.join-form').forEach(function (form) {
    var input = form.querySelector('input[type=email]');
    var trap = form.querySelector('.join-trap');
    var status = form.parentElement.querySelector('.join-status');
    function say(text) { if (status) status.textContent = text; }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var email = (input.value || '').trim();
      if (!EMAIL.test(email) || email.length > 254) {
        say('Please enter a valid email address.');
        input.focus();
        return;
      }
      if (trap && trap.value) { form.reset(); say('Thank you for joining our circle!'); return; }
      if (!MAILING_LIST.supabaseUrl || !MAILING_LIST.publishableKey) {
        say('Email sign-up opens soon. Until then, write to info@enchantedhomecare.com.');
        return;
      }

      form.setAttribute('aria-busy', 'true');
      say('Joining…');
      fetch(MAILING_LIST.supabaseUrl.replace(/\/$/, '') + '/rest/v1/rpc/join_mailing_list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: MAILING_LIST.publishableKey
        },
        body: JSON.stringify({ p_email: email, p_source: 'website-footer' })
      }).then(function (response) {
        if (!response.ok) throw new Error('Sign-up failed: ' + response.status);
        form.reset();
        say('Thank you for joining our circle!');
      }).catch(function () {
        say('Sorry, that didn’t go through. Please try again or email info@enchantedhomecare.com.');
      }).then(function () {
        form.removeAttribute('aria-busy');
      });
    });
  });
})();
