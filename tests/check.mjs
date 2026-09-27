import assert from 'node:assert/strict';
import {resizeRect,cropRect,validateBundle,wrapText,validState} from '../dist/core.mjs';
const state={ratio:'1:1',background:'#e9e4db',text:'한글',textColor:'#ffffff',fontSize:64,textX:50,textY:72,design:'quiet',photo:null};
const rows=[];function test(name,fn){try{fn();rows.push({name,result:'PASS'});}catch(e){rows.push({name,result:'FAIL',error:e.message});process.exitCode=1;}}
const measure=s=>[...s].length*10;
test('긴 한글 1500자: 줄바꿈 후 원문 보존',()=>{let x='가'.repeat(1500),lines=wrapText(x,100,measure);assert.equal(lines.join(''),x);assert.ok(lines.every(s=>measure(s)<=100));});
test('한글·영문 혼합: 원문 보존',()=>{const x='오늘 Hello, world! 123';assert.equal(wrapText(x,70,measure).join(''),x);});
test('명시적 줄바꿈과 빈 줄 보존',()=>assert.deepEqual(wrapText('첫째\n\n셋째',100,measure),['첫째','','셋째']));
test('가족 이모지: grapheme 분리 방지',()=>assert.deepEqual(wrapText('👨‍👩‍👧‍👦👨‍👩‍👧‍👦',70,measure),['👨‍👩‍👧‍👦','👨‍👩‍👧‍👦']));
test('빈 문구 허용',()=>{assert.equal(validState({...state,text:''}),true);assert.deepEqual(wrapText('',100,measure),['']);});
test('세로 사진: 비율 고정 확대',()=>{const r=resizeRect({x:0,y:0,w:300,h:900},'se',100,300,true);assert.equal(r.w/r.h,1/3);});
test('가로 사진: 비율 고정 축소',()=>{const r=resizeRect({x:0,y:0,w:900,h:300},'se',-300,-100,true);assert.equal(r.w/r.h,3);assert.equal(r.w,600);});
test('투명 PNG 데이터 URL 스키마 허용',()=>assert.equal(validState({...state,photo:{src:'data:image/png;base64,iVBORw0KGgo=',x:0,y:0,w:100,h:100,sx:0,sy:0,sw:100,sh:100}}),true));
test('8방향 자르기: 원본 경계 초과 방지',()=>{const r={x:0,y:0,w:600,h:800};for(const h of ['n','s','w','e','nw','ne','sw','se'])for(const d of [-2000,2000]){const c=cropRect(r,h,d,d,r);assert.ok(c.x>=0&&c.y>=0&&c.x+c.w<=600&&c.y+c.h<=800&&c.w>=24&&c.h>=24);}});
test('손상 JSON: 파싱 단계 거부',()=>assert.throws(()=>JSON.parse('{"templates":[')));
test('필수 항목 누락 JSON: 기존 배열 보존',()=>{const existing=[{id:'a',name:'기존',state}];const before=JSON.stringify(existing);assert.throws(()=>validateBundle({version:1,templates:[{id:'b',name:'누락'}]}));assert.equal(JSON.stringify(existing),before);});
test('정상 JSON: 3개 템플릿 왕복 복원',()=>{const a=[1,2,3].map(i=>({id:String(i),name:'카드 '+i,state:{...state,ratio:['1:1','4:5','9:16'][i-1]}}));assert.deepEqual(validateBundle(JSON.parse(JSON.stringify({version:1,templates:a}))),a);});
test('수정 전후: 극단 세로 사진 1×10000 템플릿 저장 허용',()=>assert.equal(validState({...state,ratio:'9:16',photo:{src:'data:image/png;base64,iVBORw0KGgo=',x:0,y:0,w:0.192,h:1920,sx:0,sy:0,sw:1,sh:10000}}),true));
console.log(JSON.stringify({scope:'Node logic checks; image decoding, pointer events, IndexedDB and visual export require browser checks.',tests:rows},null,2));
