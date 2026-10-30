// Example state only. Production pages own their data and playback behavior.
document.querySelectorAll('.sp-segmented').forEach(group => {
  group.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    group.querySelectorAll('button').forEach(item => {
      item.setAttribute('aria-pressed', String(item === button));
    });
  });
});

document.querySelectorAll('[data-demo-play]').forEach(button => {
  button.addEventListener('click', () => {
    const playing = button.getAttribute('aria-pressed') !== 'true';
    const label = playing ? '暂停' : '播放';
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-label', label);
    button.title = label;
    button.parentElement.nextElementSibling.textContent = playing ? '播放中' : '已暂停';
  });
});
