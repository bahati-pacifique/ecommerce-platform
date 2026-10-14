(function () {
  const $c = $('#deals-scroll-container');
  if (!$c.length) return;

  $('#deals-next').on('click', () => $c.scrollLeft($c.scrollLeft() + 260));
  $('#deals-prev').on('click', () => $c.scrollLeft($c.scrollLeft() - 260));
})();