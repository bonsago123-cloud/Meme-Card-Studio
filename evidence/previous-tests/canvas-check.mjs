import assert from 'node:assert/strict';
import {resizeRect,canvasDimensions,setCanvasRatio,validState,validateBundle} from '../dist/core.mjs';
const base={ratio:'1:1',background:'#e9e4db',text:'검사',textColor:'#ffffff',fontSize:64,textX:50,textY:72,design:'quiet',canvasEnabled:true,photoCanvas:false,photo:{src:'data:image/png;base64,iVBORw0KGgo=',x:10,y:20,w:600,h:400,sx:0,sy:0,sw:1200,sh:800}};
let rows=[];function check(name,f){try{f();rows.push({name,result:'PASS'});}catch(e){rows.push({name,result:'FAIL',error:e.message});process.exitCode=1;}}
check('위쪽 드래그: 너비·아래 위치 고정',()=>{const r=resizeRect(base.photo,'n',0,-100,true);assert.equal(r.w,600);assert.equal(r.h,500);assert.equal(r.y+r.h,420);});
check('오른쪽 드래그: 높이·왼쪽 위치 고정',()=>{const r=resizeRect(base.photo,'e',200,0,true);assert.equal(r.w,800);assert.equal(r.h,400);assert.equal(r.x,10);});
check('아래쪽 드래그: 너비·위쪽 위치 고정',()=>{const r=resizeRect(base.photo,'s',0,100,true);assert.equal(r.w,600);assert.equal(r.h,500);assert.equal(r.y,20);});
check('왼쪽 드래그: 높이·오른쪽 위치 고정',()=>{const r=resizeRect(base.photo,'w',-200,0,true);assert.equal(r.w,800);assert.equal(r.h,400);assert.equal(r.x+r.w,610);});
check('꼭짓점 자유 변형',()=>{const r=resizeRect(base.photo,'se',100,200,false);assert.equal(r.w,700);assert.equal(r.h,600);});
check('사진 캔버스 체크: 사진 크기 사용',()=>{const s=structuredClone(base);s.photoCanvas=true;assert.deepEqual(canvasDimensions(s),[600,400]);});
check('체크 후 3개 비율: 사진 전체 크기 자동 변경, 원본 영역 유지',()=>{for(const [ratio,h] of [['1:1',1080],['4:5',1350],['9:16',1920]]){const s=structuredClone(base);s.photoCanvas=true;setCanvasRatio(s,ratio);assert.deepEqual(canvasDimensions(s),[1080,h]);assert.equal(s.photo.w,1080);assert.equal(s.photo.h,h);assert.equal(s.photo.sw,1200);assert.equal(s.photo.sh,800);assert.equal(s.photo.x,0);}});
check('체크 해제 후 비율 변경: 사진은 그대로',()=>{const s=structuredClone(base);setCanvasRatio(s,'9:16');assert.deepEqual(s.photo,base.photo);assert.deepEqual(canvasDimensions(s),[1080,1920]);});
check('캔버스 삭제: 사진·문구 데이터 유지',()=>{const s=structuredClone(base);s.canvasEnabled=false;assert.deepEqual(canvasDimensions(s),[600,400]);assert.equal(s.text,base.text);assert.deepEqual(s.photo,base.photo);s.canvasEnabled=true;assert.deepEqual(canvasDimensions(s),[1080,1080]);});
check('새 체크 상태 JSON 왕복 및 이전 템플릿 호환',()=>{const s=structuredClone(base);s.photoCanvas=true;const bundle={version:1,templates:[{id:'test',name:'캔버스',state:s}]};assert.deepEqual(validateBundle(JSON.parse(JSON.stringify(bundle))),bundle.templates);delete s.photoCanvas;delete s.canvasEnabled;assert.equal(validState(s),true);});
check('잘못된 체크 상태 거부',()=>{assert.equal(validState({...base,photoCanvas:'yes'}),false);assert.equal(validState({...base,photoCanvas:true,photo:null}),false);});
console.log(JSON.stringify({scope:'Node geometry/state tests; not real browser interaction',tests:rows},null,2));
