document.addEventListener('DOMContentLoaded',()=>{
  function activateGroup(buttonSelector,panelSelector,name){
    const buttons=[...document.querySelectorAll(buttonSelector)];
    const panels=[...document.querySelectorAll(panelSelector)];
    if(!buttons.length||!panels.length)return;

    const fallback=buttons[0]?.dataset.ownerTab||buttons[0]?.dataset.propertyTab;
    const target=name||fallback;

    buttons.forEach(btn=>{
      const value=btn.dataset.ownerTab||btn.dataset.propertyTab;
      const active=value===target;
      btn.classList.toggle('is-active',active);
      btn.setAttribute('aria-selected',active?'true':'false');
    });

    panels.forEach(panel=>{
      const value=panel.dataset.ownerPanel||panel.dataset.propertyPanel;
      panel.classList.toggle('is-active',value===target);
    });
  }

  const ownerButtons=[...document.querySelectorAll('[data-owner-tab]')];
  if(ownerButtons.length){
    const valid=new Set(ownerButtons.map(b=>b.dataset.ownerTab));

    const currentFromHash=()=>{
      const h=window.location.hash.replace('#','');
      return valid.has(h)?h:'resumen';
    };

    const activate=name=>activateGroup(
      '[data-owner-tab]',
      '[data-owner-panel]',
      name
    );

    ownerButtons.forEach(btn=>btn.addEventListener('click',()=>{
      const name=btn.dataset.ownerTab;
      activate(name);
      history.replaceState(null,'',`#${name}`);
      window.scrollTo({top:0,behavior:'smooth'});
    }));

    document.querySelectorAll('[data-jump-owner-tab]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const name=btn.dataset.jumpOwnerTab;
        activate(name);
        history.replaceState(null,'',`#${name}`);
        window.scrollTo({top:0,behavior:'smooth'});
      });
    });

    activate(currentFromHash());
    window.addEventListener('hashchange',()=>activate(currentFromHash()));
  }

  const propertyButtons=[...document.querySelectorAll('[data-property-tab]')];
  if(propertyButtons.length){
    const valid=new Set(propertyButtons.map(b=>b.dataset.propertyTab));

    const currentFromHash=()=>{
      const h=window.location.hash.replace('#','');
      return valid.has(h)?h:'ficha';
    };

    const activate=name=>activateGroup(
      '[data-property-tab]',
      '[data-property-panel]',
      name
    );

    propertyButtons.forEach(btn=>btn.addEventListener('click',()=>{
      const name=btn.dataset.propertyTab;
      activate(name);
      history.replaceState(null,'',`#${name}`);
      window.scrollTo({top:0,behavior:'smooth'});
    }));

    activate(currentFromHash());
    window.addEventListener('hashchange',()=>activate(currentFromHash()));
  }

  const search=document.querySelector('[data-owner-property-search]');
  const cards=[...document.querySelectorAll('[data-property-card]')];
  const noResults=document.querySelector('[data-owner-no-results]');
  const filters=[...document.querySelectorAll('[data-property-filter]')];

  if(search&&cards.length){
    let filter='todas';

    const normalize=value=>String(value||'')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .toLowerCase()
      .trim();

    const apply=()=>{
      const query=normalize(search.value);
      let visible=0;

      cards.forEach(card=>{
        const haystack=normalize(card.dataset.search);
        const status=normalize(card.dataset.status);
        const complaintCount=Number(card.dataset.complaints)||0;

        const matchesSearch=!query||haystack.includes(query);
        const matchesFilter=
          filter==='todas' ||
          (filter==='alquilada'&&status==='alquilada') ||
          (filter==='vacía'&&status==='vacia') ||
          (filter==='reclamos'&&complaintCount>0);

        const show=matchesSearch&&matchesFilter;
        card.hidden=!show;
        if(show)visible++;
      });

      if(noResults)noResults.hidden=visible!==0;
    };

    search.addEventListener('input',apply);

    filters.forEach(btn=>btn.addEventListener('click',()=>{
      filter=btn.dataset.propertyFilter;
      filters.forEach(x=>x.classList.toggle('is-active',x===btn));
      apply();
    }));

    apply();
  }
});