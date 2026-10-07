(() => {
  const root=document.querySelector('.admin-payments-v2');
  if(!root)return;

  const modal=root.querySelector('#paymentModal');
  const open=root.querySelector('#openPaymentForm');
  const closes=[...root.querySelectorAll('[data-close-payment-modal]')];
  const filters=[...root.querySelectorAll('[data-payment-filter]')];
  const rows=[...root.querySelectorAll('[data-payment-row]')];
  const empty=root.querySelector('#paymentsNoResults');

  const property=root.querySelector('#paymentProperty');
  const period=root.querySelector('#paymentPeriod');
  const amount=root.querySelector('#paymentAmount');
  const currency=root.querySelector('#paymentCurrency');
  const due=root.querySelector('#paymentDueDate');
  const help=root.querySelector('#paymentPropertyHelp');
  const concept=root.querySelector('#paymentConcept');

  function openModal(){
    if(!modal)return;
    modal.hidden=false;
    document.body.style.overflow='hidden';
    syncPropertyDefaults();
  }

  function closeModal(){
    if(!modal)return;
    modal.hidden=true;
    document.body.style.overflow='';
  }

  function dueDateFor(periodValue,dayValue){
    const match=String(periodValue||'').match(/^(\d{4})-(\d{2})$/);
    if(!match)return '';
    const year=Number(match[1]);
    const month=Number(match[2]);
    const maxDay=new Date(year,month,0).getDate();
    const day=Math.min(Math.max(Number(dayValue)||5,1),maxDay);
    return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }

  function syncPropertyDefaults(){
    if(!property?.selectedOptions?.length)return;
    const option=property.selectedOptions[0];
    amount.value=option.dataset.amount||'';
    currency.value=option.dataset.currency||'UYU';
    due.value=dueDateFor(period.value,option.dataset.paymentDay);
    help.textContent=[
      option.dataset.tenant ? `Inquilino: ${option.dataset.tenant}` : '',
      option.dataset.owner ? `Propietario: ${option.dataset.owner}` : ''
    ].filter(Boolean).join(' · ');
    concept.value=`Alquiler ${period.value||''}`;
  }

  open?.addEventListener('click',openModal);
  closes.forEach(item=>item.addEventListener('click',closeModal));
  property?.addEventListener('change',syncPropertyDefaults);
  period?.addEventListener('input',syncPropertyDefaults);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!modal?.hidden)closeModal();
  });

  filters.forEach(button=>{
    button.addEventListener('click',()=>{
      const selected=button.dataset.paymentFilter||'all';
      filters.forEach(item=>item.classList.toggle('is-active',item===button));
      let visible=0;
      rows.forEach(row=>{
        const show=selected==='all'||row.dataset.status===selected;
        row.hidden=!show;
        if(show)visible++;
      });
      if(empty)empty.hidden=visible!==0;
    });
  });
})();
