(() => {
  const root = document.querySelector('.admin-properties-v2');
  if (!root) return;

  const search = root.querySelector('#propertySearch');
  const cards = [...root.querySelectorAll('[data-property-card]')];
  const filters = [...root.querySelectorAll('[data-property-filter]')];
  const count = root.querySelector('#propertyVisibleCount');
  const empty = root.querySelector('#propertiesNoResults');

  let activeFilter = 'all';

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function applyFilters() {
    const term = normalize(search?.value);

    let visible = 0;

    cards.forEach(card => {
      const haystack = normalize(card.dataset.search);
      const status = card.dataset.status || '';
      const active = card.dataset.active === 'true';

      const matchesSearch = !term || haystack.includes(term);

      let matchesFilter = true;
      if (activeFilter === 'inactive') {
        matchesFilter = !active;
      } else if (activeFilter !== 'all') {
        matchesFilter = active && status === activeFilter;
      }

      const show = matchesSearch && matchesFilter;
      card.hidden = !show;
      if (show) visible += 1;
    });

    if (count) count.textContent = visible;
    if (empty) empty.hidden = visible !== 0;
  }

  search?.addEventListener('input', applyFilters);

  filters.forEach(button => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.propertyFilter || 'all';
      filters.forEach(item => item.classList.toggle('is-active', item === button));
      applyFilters();
    });
  });

  applyFilters();
})();
