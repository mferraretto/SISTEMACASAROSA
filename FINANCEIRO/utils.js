import { db, storage,
  collection, doc, setDoc, getDoc, addDoc, serverTimestamp,
  ref, uploadBytes, getDownloadURL, uploadString
} from './firebase-config.js';

// Hash (SHA-256) for deduplication of attachments
export async function sha256(file){
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buf);
  const arr = Array.from(new Uint8Array(hash));
  return arr.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function fmtBRL(v){
  return (new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'})).format(Number(v||0));
}

export function toDateInputValue(date){
  const d = new Date(date);
  d.setMinutes(d.getMinutes()-d.getTimezoneOffset());
  return d.toISOString().slice(0,10);
}

export async function saveAttachmentSmart({file, empresa='CasaRosa', qualidadeWebp=0.8}){
  // If image -> compress to webp (via compress.js provide convertToWebp)
  // else upload original
  let contentType = file.type;
  let bytes;
  let ext = file.name.split('.').pop().toLowerCase();

  // Deduplicate by hash
  const hash = await sha256(file);
  const hashDoc = doc(collection(db,'uploads_index'), hash);
  const existing = await getDoc(hashDoc);
  if(existing.exists()){
    return existing.data(); // {url, path, contentType, hash}
  }

  if(contentType.startsWith('image/')){
    // dynamic import to avoid circular
    const { convertToWebp } = await import('./compress.js');
    const { blob, name } = await convertToWebp(file, qualidadeWebp);
    bytes = await blob.arrayBuffer();
    contentType = 'image/webp';
    ext = 'webp';
  }else{
    bytes = await file.arrayBuffer();
  }

  const path = `empresas/${empresa}/anexos/${hash}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, new Blob([bytes], {type: contentType}), {contentType});
  const url = await getDownloadURL(storageRef);

  await setDoc(hashDoc, { url, path, contentType, hash, createdAt: serverTimestamp() });
  return { url, path, contentType, hash };
}
