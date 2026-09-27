import {createStore} from '../server/supabase.mjs';
import {session,sessionCookie,getCollection,prepareUpload,commitUpload,HttpError} from '../server/service.mjs';
export function makeHandler(env=process.env,storeFactory=createStore){return async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
 const send=(status,data)=>{res.statusCode=status;res.end(JSON.stringify(data));};
 if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return send(405,{error:'지원하지 않는 요청입니다.'});}
 try{
  const store=storeFactory(env),secret=env.SESSION_SECRET;
  const s=session(req.headers.cookie,secret);
  if(req.method==='GET'){
   if(s.fresh)res.setHeader('Set-Cookie',sessionCookie(s,secret,!!env.VERCEL||req.headers['x-forwarded-proto']==='https'));
   return send(200,await getCollection(store,s.owner));
  }
  const host=req.headers.host;
  let origin;try{origin=new URL(req.headers.origin);}catch{throw new HttpError(403,'요청 출처가 올바르지 않습니다.');}
  if(origin.host!==host||!['http:','https:'].includes(origin.protocol)||req.headers['sec-fetch-site']==='cross-site')throw new HttpError(403,'다른 사이트에서의 저장 요청은 허용하지 않습니다.');
  if(s.fresh)throw new HttpError(401,'보관함 쿠키가 없습니다. 새로고침 후 다시 저장해주세요.');
  let body=req.body;
  if(body===undefined){const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>8192)throw new HttpError(413,'요청이 너무 큽니다.');chunks.push(chunk);}body=Buffer.concat(chunks).toString();}
  if(typeof body==='string'){if(Buffer.byteLength(body)>8192)throw new HttpError(413,'요청이 너무 큽니다.');try{body=JSON.parse(body);}catch{throw new HttpError(400,'잘못된 JSON 요청입니다.');}}
  if(!body||Array.isArray(body)||typeof body!=='object'||Buffer.byteLength(JSON.stringify(body))>8192)throw new HttpError(400,'잘못된 요청입니다.');
  if(body.action==='prepare')return send(200,await prepareUpload(store,s.owner,body,secret));
  if(body.action==='commit')return send(200,await commitUpload(store,s.owner,body,secret));
  throw new HttpError(400,'지원하지 않는 저장 동작입니다.');
 }catch(e){
  if(e instanceof HttpError)return send(e.status,{error:e.message});
  if(e.message==='CONFIG_MISSING')return send(503,{error:'템플릿 저장 설정이 아직 완료되지 않았습니다. Vercel 환경변수와 Supabase SQL 설정을 확인해주세요. 이미지 편집과 다운로드는 사용할 수 있습니다.'});
  // Never expose provider responses or secret keys to visitors.
  return send(503,{error:'보관함에 연결하지 못했습니다. 기존 작업은 유지됩니다. 잠시 후 다시 시도하거나 JSON으로 보관해주세요.'});
 }
};}
export default makeHandler();
