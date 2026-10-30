// Progressive enhancement: native details still works without this enhancement script.
(() => {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.sp-fold').forEach(details => {
    const summary = details.querySelector(':scope > summary');
    const body = details.querySelector(':scope > .sp-fold-body');
    if (!summary || !body) return;
    let animation;
    let expanded = details.open;
    const finish = () => {
      animation?.cancel();
      animation = undefined;
      details.open = expanded;
      body.inert = !expanded;
      details.removeAttribute('data-fold-closing');
      details.style.removeProperty('height');
      details.dispatchEvent(new CustomEvent('sp-fold-settled', {detail:{open:expanded}}));
    };
    const move = () => {
      const from = details.getBoundingClientRect().height;
      animation?.cancel();
      details.style.height = `${from}px`;
      details.open = true;
      body.inert = !expanded;
      summary.setAttribute('aria-expanded', String(expanded));
      details.toggleAttribute('data-fold-closing', !expanded);
      if (motion.matches) { finish(); return; }
      const style = getComputedStyle(details);
      const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
      const to = summary.getBoundingClientRect().height + (expanded ? body.getBoundingClientRect().height : 0) + border;
      animation = details.animate([{height:`${from}px`},{height:`${to}px`}], {
        duration:360, easing:'cubic-bezier(.42,0,.12,1)', fill:'forwards'
      });
      animation.onfinish = finish;
    };
    summary.addEventListener('click', event => {
      if (event.defaultPrevented) return;
      event.preventDefault();
      expanded = !expanded;
      details.dispatchEvent(new CustomEvent('sp-fold-change', {detail:{open:expanded}}));
      move();
    });
    // Native toggle remains the content lifecycle signal (video, charts, etc.).
    details.addEventListener('toggle', () => {
      if (animation) return;
      expanded = details.open;
      body.inert = !expanded;
      summary.setAttribute('aria-expanded', String(expanded));
    });
    new ResizeObserver(() => { if (animation && expanded) move(); }).observe(body);
    motion.addEventListener('change', () => { if (animation && motion.matches) finish(); });
    body.inert = !expanded;
    summary.setAttribute('aria-expanded', String(expanded));
  });
})();
