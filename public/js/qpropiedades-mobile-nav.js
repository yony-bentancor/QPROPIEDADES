document.addEventListener('DOMContentLoaded',()=>{
  const button=document.querySelector('[data-qp-mobile-toggle]');
  const nav=document.querySelector('[data-qp-mobile-nav]');
  const backdrop=document.querySelector('[data-qp-mobile-backdrop]');
  if(button&&nav){
    const setOpen=(open)=>{
      nav.classList.toggle('is-mobile-open',open);
      button.classList.toggle('is-open',open);
      backdrop?.classList.toggle('is-open',open);
      button.setAttribute('aria-expanded',String(open));
      button.setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');
      document.body.classList.toggle('qp-mobile-nav-open',open);
    };
    button.addEventListener('click',()=>setOpen(!nav.classList.contains('is-mobile-open')));
    backdrop?.addEventListener('click',()=>setOpen(false));
    nav.querySelectorAll('a,button').forEach(el=>el.addEventListener('click',()=>setOpen(false)));
    document.addEventListener('keydown',e=>{if(e.key==='Escape')setOpen(false)});
  }

  /* PARCHE 5.4 — QPROPIEDADES
     Footer centrado en móvil + “Volver arriba”.
     Se aplica desde JS para no reemplazar el CSS consolidado. */
  const style=document.createElement('style');
  style.textContent=`
    .qp-back-to-top{
      color:#222;
      text-decoration:none;
      font-size:11px;
      font-weight:800;
      white-space:nowrap;
    }
    .qp-back-to-top:hover{color:var(--qp-orange,#f05a1a)}
    @media(max-width:600px){
      .qp-footer,
      .qp-footer.qp-footer-light{
        text-align:center!important;
        align-items:center!important;
        justify-items:center!important;
      }
      .qp-footer-brand{
        justify-content:center!important;
        width:100%!important;
      }
      .qp-footer-light .qp-footer-links,
      .qp-footer-links{
        justify-content:center!important;
        width:100%!important;
      }
      .qp-footer-meta{
        justify-content:center!important;
        width:100%!important;
      }
      .qp-back-to-top{
        display:inline-flex!important;
        align-items:center;
        justify-content:center;
        min-height:34px;
        margin:0 auto;
      }
    }`;
  document.head.appendChild(style);

  const footer=document.querySelector('.qp-footer');
  if(footer&&!footer.querySelector('.qp-back-to-top')){
    const back=document.createElement('a');
    back.href='#';
    back.className='qp-back-to-top';
    back.textContent='↑ Volver arriba';
    back.addEventListener('click',e=>{
      e.preventDefault();
      window.scrollTo({top:0,behavior:'smooth'});
    });
    footer.appendChild(back);
  }
});
