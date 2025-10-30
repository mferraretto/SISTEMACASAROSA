export async function convertToWebp(file, quality=0.8){
  const img = await readImage(file);
  const maxDim = 1600; // limit dimensions to save space
  const ratio = Math.min(1, maxDim/Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width*ratio));
  const h = Math.max(1, Math.round(img.height*ratio));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  const blob = await new Promise(res => canvas.toBlob(res, 'image/webp', quality));
  return { blob, name: file.name.replace(/\.[^.]+$/, '') + '.webp' };
}

function readImage(file){
  return new Promise((resolve, reject)=>{
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = ()=> resolve(img);
      img.onerror = reject;
      img.src = fr.result;
    };
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}
