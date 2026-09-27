import {randomBytes,randomUUID,createHmac,timingSafeEqual} from 'node:crypto';
import {parseTemplates} from '../public/engine.mjs';
export const MAX_BYTES=20*1024*1024;
const cookieName='card_studio_session';
export class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
function mac(value,secret){return createHmac('sha256',secret).update(value).digest('hex');}
function equal(a,b){return typeof a==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));}
export function session(cookie,secret){
 const value=(cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1)||'';
 const [id,signature]=value.split('.');
 if(/^[a-f0-9]{64}$/.test(id||'')&&equal(signature,mac(id,secret)))return {owner:id,fresh:false};
 return {owner:randomBytes(32).toString('hex'),fresh:true};
}
export function sessionCookie(s,secret,secure){return `${cookieName}=${s.owner}.${mac(s.owner,secret)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000${secure?'; Secure':''}`;}
function checkRevision(n){if(!Number.isSafeInteger(n)||n<0||n>2147483646)throw new HttpError(400,'저장 버전이 올바르지 않습니다.');}
function conflict(){throw new HttpError(409,'다른 창에서 목록이 바뀌었습니다. JSON으로 현재 목록을 보관한 뒤 새로고침해주세요.');}
function ticket(owner,path,revision,expires,secret){return mac(JSON.stringify([owner,path,revision,expires]),secret);}
export async function getCollection(store,owner){const row=await store.read(owner);return row?{revision:row.revision,downloadUrl:await store.signedRead(row.object_key)}:{revision:0,version:1,templates:[]};}
export async function prepareUpload(store,owner,body,secret){
 checkRevision(body.revision);if(!Number.isInteger(body.bytes)||body.bytes<1||body.bytes>MAX_BYTES)throw new HttpError(413,'템플릿 전체 크기는 20MB 이하여야 합니다. 기존 목록은 유지됩니다.');
 const row=await store.read(owner);if((row?.revision||0)!==body.revision)conflict();
 const path=`uploads/${owner}/${randomUUID()}.json`,expires=Date.now()+15*60*1000;
 return {path,expires,revision:body.revision,ticket:ticket(owner,path,body.revision,expires,secret),uploadUrl:await store.signedUpload(path)};
}
export async function commitUpload(store,owner,body,secret){
 checkRevision(body.revision);
 if(typeof body.path!=='string'||!body.path.startsWith(`uploads/${owner}/`)||!/^[a-z0-9/-]+\.json$/.test(body.path)||!Number.isSafeInteger(body.expires)||body.expires<Date.now()||!equal(body.ticket,ticket(owner,body.path,body.revision,body.expires,secret)))throw new HttpError(400,'저장 요청이 만료되었거나 올바르지 않습니다. 다시 저장해주세요.');
 const before=await store.read(owner);
 // A lost response can be retried safely with the same ticket.
 const finalPath=body.path.replace(/^uploads\//,'collections/');
 if(before?.object_key===finalPath&&before.revision===body.revision+1)return {revision:before.revision};
 if((before?.revision||0)!==body.revision)conflict();
 const blob=await store.download(body.path);if(blob.size>MAX_BYTES)throw new HttpError(413,'템플릿 파일이 20MB를 넘습니다.');
 let templates;try{templates=parseTemplates(await blob.text());}catch(e){await store.remove(body.path).catch(()=>{});throw new HttpError(400,e.message);}
 // Copy validated data to a different path: a still-valid upload URL cannot change saved data.
 const clean=JSON.stringify({version:1,templates});
 try{await store.upload(finalPath,clean);}catch(e){
  const row=await store.read(owner);if(row?.object_key===finalPath&&row.revision===body.revision+1)return {revision:row.revision};
  // An earlier attempt may have uploaded the immutable file but lost the DB request.
  let existing;try{existing=await store.download(finalPath);}catch{throw e;}
  if(existing.size>MAX_BYTES||await existing.text()!==clean)throw e;
 }
 // Do not delete finalPath on ambiguous transport failure: the DB commit might have succeeded.
 const result=await store.commit(owner,body.revision,finalPath);
 if(result.conflict){await store.remove(finalPath).catch(()=>{});conflict();}
 await store.remove(body.path).catch(()=>{});
 if(result.previous_key)await store.remove(result.previous_key).catch(()=>{});
 return {revision:result.revision};
}
