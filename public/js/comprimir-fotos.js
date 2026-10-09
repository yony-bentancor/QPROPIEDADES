/*
  Achica las fotos en el navegador antes de enviarlas (máx. 1920 px, JPEG).
  Una foto de celular de 4–8 MB queda en unos 300–600 KB sin pérdida visible.
  En iPhone también convierte las fotos HEIC a JPEG. Los videos no se tocan.
  Si algo falla, se envía el archivo original: nunca bloquea el formulario.
*/
(function () {
  'use strict';
  var MAX_LADO = 1920, CALIDAD = 0.82, MINIMO = 400 * 1024;

  function achicar(file) {
    var esImagen = /^image\//.test(file.type) || /\.(heic|heif)$/i.test(file.name);
    if (!esImagen || file.type === 'image/gif') return Promise.resolve(file);
    if (file.size < MINIMO && /^image\/(jpeg|png|webp)$/.test(file.type)) return Promise.resolve(file);
    if (!window.createImageBitmap || !HTMLCanvasElement.prototype.toBlob) return Promise.resolve(file);
    return createImageBitmap(file, { imageOrientation: 'from-image' }).then(function (img) {
      var escala = Math.min(1, MAX_LADO / Math.max(img.width, img.height));
      var c = document.createElement('canvas');
      c.width = Math.round(img.width * escala); c.height = Math.round(img.height * escala);
      var ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); // PNG con transparencia → fondo blanco
      ctx.drawImage(img, 0, 0, c.width, c.height);
      if (img.close) img.close();
      return new Promise(function (ok) { c.toBlob(ok, 'image/jpeg', CALIDAD); });
    }).then(function (blob) {
      if (!blob || (blob.size >= file.size && /^image\/(jpeg|png|webp)$/.test(file.type))) return file;
      var nombre = file.name.replace(/\.[^.]+$/, '') + '.jpg';
      return new File([blob], nombre, { type: 'image/jpeg', lastModified: Date.now() });
    }).catch(function () { return file; });
  }

  function iniciar(form) {
    var input = form.querySelector('input[type=file]');
    var estado = form.querySelector('[data-estado-fotos]');
    var boton = form.querySelector('button, [type=submit]');
    if (!input || !window.DataTransfer) return;
    var textoOriginal = estado ? estado.textContent : '';
    var trabajando = null;

    input.addEventListener('change', function () {
      var archivos = Array.prototype.slice.call(input.files || []);
      if (!archivos.length) return;
      if (boton) boton.disabled = true;
      if (estado) estado.textContent = 'Preparando ' + archivos.length + (archivos.length === 1 ? ' archivo…' : ' archivos…');
      var antes = archivos.reduce(function (s, f) { return s + f.size; }, 0);
      trabajando = Promise.all(archivos.map(achicar)).then(function (listos) {
        var dt = new DataTransfer();
        listos.forEach(function (f) { dt.items.add(f); });
        input.files = dt.files;
        var despues = listos.reduce(function (s, f) { return s + f.size; }, 0);
        if (estado) estado.textContent = listos.length + (listos.length === 1 ? ' archivo listo' : ' archivos listos') +
          ' (' + (despues / 1048576).toFixed(1) + ' MB' + (despues < antes * 0.9 ? ', antes ' + (antes / 1048576).toFixed(1) + ' MB' : '') + ').';
      }).catch(function () {
        if (estado) estado.textContent = textoOriginal;
      }).then(function () {
        if (boton) boton.disabled = false;
        trabajando = null;
      });
    });

    form.addEventListener('submit', function (e) {
      if (!trabajando) return;
      e.preventDefault();
      trabajando.then(function () { form.submit(); });
    });
  }

  document.querySelectorAll('form[data-comprimir-fotos]').forEach(iniciar);
})();
