document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{
    const href=a.getAttribute('href');
    if(!href || href==='#') return;
    const el=document.querySelector(href);
    if(el){e.preventDefault();el.scrollIntoView({behavior:'smooth',block:'start'})}
  }));

  const modal=document.querySelector('[data-qr-reader-modal]');
  if(!modal) return;

  const video=modal.querySelector('[data-qr-video]');
  const status=modal.querySelector('[data-qr-status]');
  const startBtn=modal.querySelector('[data-start-qr]');
  const codeInput=modal.querySelector('[data-qr-code]');
  let stream=null;
  let scanning=false;

  const normalizeAndGo=(value)=>{
    let raw=String(value||'').trim();
    if(!raw) return;

    try{
      const url=new URL(raw,window.location.origin);
      const match=url.pathname.match(/\/r\/(QC-\d+)/i);
      if(match){
        window.location.href=`/r/${match[1].toUpperCase()}`;
        return;
      }
    }catch(_){}

    const code=raw.toUpperCase().replace(/\s+/g,'');
    if(/^QC-\d{4}$/.test(code)){
      window.location.href=`/r/${code}`;
      return;
    }

    status.textContent='Ese código no parece ser un QR de QPROPIEDADES.';
  };

  const stopCamera=()=>{
    scanning=false;
    if(stream){
      stream.getTracks().forEach(t=>t.stop());
      stream=null;
    }
    if(video) video.srcObject=null;
  };

  const close=()=>{
    stopCamera();
    modal.hidden=true;
    document.body.style.overflow='';
  };

  document.querySelectorAll('[data-open-qr-reader]').forEach(btn=>btn.addEventListener('click',()=>{
    modal.hidden=false;
    document.body.style.overflow='hidden';
    status.textContent='Presioná “Activar cámara” para comenzar.';
  }));

  modal.querySelectorAll('[data-close-qr-reader]').forEach(el=>el.addEventListener('click',close));

  const scanLoop=async(detector)=>{
    if(!scanning) return;
    try{
      const codes=await detector.detect(video);
      if(codes && codes.length){
        scanning=false;
        status.textContent='QR detectado. Abriendo propiedad…';
        normalizeAndGo(codes[0].rawValue);
        return;
      }
    }catch(_){}
    requestAnimationFrame(()=>scanLoop(detector));
  };

  startBtn.addEventListener('click',async()=>{
    if(!navigator.mediaDevices?.getUserMedia){
      status.textContent='Tu navegador no permite usar la cámara. Ingresá el código manualmente.';
      return;
    }
    if(!('BarcodeDetector' in window)){
      status.textContent='Este navegador no admite lectura automática. Ingresá el código QC-0001 manualmente.';
      return;
    }

    try{
      status.textContent='Solicitando acceso a la cámara…';
      stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
      video.srcObject=stream;
      await video.play();

      const detector=new BarcodeDetector({formats:['qr_code']});
      scanning=true;
      status.textContent='Apuntá al QR de QPROPIEDADES.';
      scanLoop(detector);
    }catch(err){
      stopCamera();
      status.textContent='No se pudo abrir la cámara. Revisá los permisos del navegador.';
    }
  });

  modal.querySelector('[data-go-qr]').addEventListener('click',()=>normalizeAndGo(codeInput.value));
  codeInput.addEventListener('keydown',e=>{
    if(e.key==='Enter') normalizeAndGo(codeInput.value);
  });

  document.addEventListener('keydown',e=>{
    if(e.key==='Escape' && !modal.hidden) close();
  });
});