import test from 'node:test';import assert from 'node:assert/strict';
import {makeHandler} from '../api/templates.js';
const env={SESSION_SECRET:'test-only-session-secret-01234567890123456789'};
async function request(handler,{method='GET',headers={},body}={}){const out={headers:{}};const res={setHeader(k,v){out.headers[k]=v;},set statusCode(v){out.status=v;},end(v){out.body=JSON.parse(v);}};await handler({method,headers:{host:'example.test',...headers},body},res);return out;}
test('환경변수 미설정은 안내 오류이고 비밀값을 출력하지 않는다',async()=>{const r=await request(makeHandler({}));assert.equal(r.status,503);assert.match(r.body.error,/설정/);});
test('로그인 없이 빈 보관함과 HttpOnly 쿠키를 제공한다',async()=>{const h=makeHandler(env,()=>({read:async()=>null}));const r=await request(h);assert.equal(r.status,200);assert.deepEqual(r.body.templates,[]);assert.match(r.headers['Set-Cookie'],/HttpOnly/);assert.equal(r.headers['Cache-Control'],'private, no-store');});
test('교차 출처 쓰기는 거부한다',async()=>{const h=makeHandler(env,()=>({}));const r=await request(h,{method:'POST',headers:{origin:'https://other.test'},body:{action:'prepare'}});assert.equal(r.status,403);});
test('쿠키 없는 쓰기는 거부한다',async()=>{const h=makeHandler(env,()=>({}));const r=await request(h,{method:'POST',headers:{origin:'https://example.test'},body:{action:'prepare'}});assert.equal(r.status,401);});
test('provider 오류 원문이 공개 응답에 노출되지 않는다',async()=>{const h=makeHandler(env,()=>({read:async()=>{throw Error('provider error with a private credential');}}));const r=await request(h);assert.equal(r.status,503);assert(!JSON.stringify(r).includes('private credential'));});
test('알 수 없는 메서드는 405를 반환한다',async()=>{const r=await request(makeHandler(env,()=>({})),{method:'DELETE'});assert.equal(r.status,405);assert.equal(r.headers.Allow,'GET, POST');});
