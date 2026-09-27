import assert from 'node:assert/strict';
import {setCanvasRatio,canvasDimensions,validState} from '../dist/core.mjs';
const base={ratio:'1:1',background:'#e9e4db',text:'검사',textColor:'#ffffff',fontSize:64,textX:50,textY:72,design:'quiet',canvasEnabled:true,photoCanvas:true,keepAspect:true,photo:{src:'data:image/png;base64,iVBORw0KGgo=',x:0,y:0,w:600,h:400,sx:100,sy:50,sw:1200,sh:800}};
const tests=[];
function test(name,fn){fn();tests.push({name,result:'PASS'});}
for(const ratio of ['1:1','4:5','9:16'])test(ratio+' 중앙 자르기 및 배율 유지',()=>{const s=structuredClone(base);setCanvasRatio(s,ratio);const p=s.photo,[a,b]=ratio.split(':').map(Number);assert.ok(Math.abs(p.w/p.h-a/b)<1e-9);assert.equal(p.w/p.sw,.5);assert.equal(p.h/p.sh,.5);assert.ok(p.w<=600&&p.h<=400);assert.equal(p.sx+p.sw/2,700);assert.equal(p.sy+p.sh/2,450);assert.deepEqual(canvasDimensions(s),[Math.round(p.w),Math.round(p.h)]);});
test('세로 사진의 위아래 자르기',()=>{const s=structuredClone(base);Object.assign(s.photo,{w:400,h:800,sw:800,sh:1600});setCanvasRatio(s,'1:1');assert.equal(s.photo.sy,450);assert.equal(s.photo.h,400);});
test('체크 해제 시 기존 늘리기 유지',()=>{const s=structuredClone(base);s.keepAspect=false;setCanvasRatio(s,'9:16');assert.equal(s.photo.w,1080);assert.equal(s.photo.h,1920);assert.equal(s.photo.sw,1200);});
test('사진 캔버스 해제 상태에서도 사진 자르기',()=>{const s=structuredClone(base);s.photoCanvas=false;setCanvasRatio(s,'1:1');assert.equal(s.photo.w,400);assert.equal(s.photo.x,100);});
test('반복 비율 변경에도 배율과 원본 경계 유지',()=>{const s=structuredClone(base);for(const r of ['9:16','1:1','4:5'])setCanvasRatio(s,r);assert.equal(s.photo.w/s.photo.sw,.5);assert.equal(s.photo.h/s.photo.sh,.5);assert.ok(s.photo.sx>=100&&s.photo.sx+s.photo.sw<=1300);});
test('템플릿 JSON 선택 상태 보존 및 잘못된 타입 거부',()=>{const s=JSON.parse(JSON.stringify(base));assert.equal(s.keepAspect,true);assert.equal(validState(s),true);s.keepAspect='true';assert.equal(validState(s),false);});
console.log(JSON.stringify({scope:'Node geometry/state tests, not browser QA',tests},null,2));
