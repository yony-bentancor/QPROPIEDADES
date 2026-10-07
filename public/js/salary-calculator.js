document.addEventListener('DOMContentLoaded',()=>{
  const root=document.querySelector('[data-salary-calculator]');
  if(!root)return;

  const totalRent=Math.max(0,Number(root.dataset.totalRent)||0);
  const complaintCount=Math.max(0,parseInt(root.dataset.complaints,10)||0);

  const percentInput=root.querySelector('[data-rent-percent]');
  const claimPriceInput=root.querySelector('[data-claim-price]');
  const rentIncomeEl=root.querySelector('[data-rent-income]');
  const claimsIncomeEl=root.querySelector('[data-claims-income]');
  const totalEl=root.querySelector('[data-salary-total]');
  const rentFormulaEl=root.querySelector('[data-rent-formula]');
  const claimsFormulaEl=root.querySelector('[data-claims-formula]');
  const messageEl=root.querySelector('[data-salary-message]');

  const money=new Intl.NumberFormat('es-UY',{
    style:'currency',
    currency:'UYU',
    maximumFractionDigits:0
  });

  function safeValue(input,max){
    const raw=String(input.value||'').replace(',','.');
    const value=Number(raw);
    if(!Number.isFinite(value)||value<0)return 0;
    return Math.min(value,max);
  }

  function formatPercent(value){
    return new Intl.NumberFormat('es-UY',{maximumFractionDigits:2}).format(value);
  }

  function calculate(){
    const percent=safeValue(percentInput,100);
    const claimPrice=safeValue(claimPriceInput,100000000);

    const rentIncome=totalRent*(percent/100);
    const claimsIncome=complaintCount*claimPrice;
    const total=rentIncome+claimsIncome;

    rentIncomeEl.textContent=money.format(rentIncome);
    claimsIncomeEl.textContent=money.format(claimsIncome);
    totalEl.textContent=money.format(total);

    rentFormulaEl.textContent=`${formatPercent(percent)}% de ${money.format(totalRent)}`;
    claimsFormulaEl.textContent=`${complaintCount} reclamos × ${money.format(claimPrice)}`;

    if(percent===0&&claimPrice===0){
      messageEl.textContent='Ingresá un porcentaje y/o un valor por reclamo. El resultado se actualiza automáticamente.';
    }else{
      messageEl.textContent=`Estimación actual: ${money.format(total)} por mes.`;
    }
  }

  percentInput.addEventListener('input',calculate);
  claimPriceInput.addEventListener('input',calculate);
  calculate();
});