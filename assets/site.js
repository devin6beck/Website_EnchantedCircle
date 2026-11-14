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
    function update() { if (prev) prev.hidden = track.scrollLeft <= 4; }

    next.addEventListener('click', function () {
      if (atEnd()) track.scrollTo({ left: 0 });
      else track.scrollBy({ left: step() });
    });
    if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -step() }); });
    track.addEventListener('scroll', update, { passive: true });
    update();
  });

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
