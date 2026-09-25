import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT,validateState,parseTemplates,imageSourceRect,imageDestinationRect,dimensions} from '../public/engine.mjs';

test('이전 버전의 완전한 템플릿은 새 편집 필드를 기본값으로 보완한다',()=>{
  const old={...DEFAULT};
  for(const k of ['imageScale','imageX','imageY','cropTop','cropRight','cropBottom','cropLeft','rotation','fontFamily','stretchToRatio'])delete old[k];
  const v=validateState(old);
  assert.equal(v.cropTop,0);assert.equal(v.cropLeft,0);assert.equal(v.rotation,0);assert.equal(v.fontFamily,'studio');assert.equal(v.stretchToRatio,false);
});

test('필수 편집 항목이 빠진 JSON state는 거부한다',()=>{
  assert.throws(()=>validateState({text:'누락'}),/필수/);
  assert.throws(()=>parseTemplates(JSON.stringify({version:1,templates:[{id:'x',name:'x',state:{text:'누락'}}]})),/필수/);
});

test('사진은 상하좌우를 독립적으로 자를 수 있다',()=>{
  const s=validateState({...DEFAULT,cropTop:10,cropRight:20,cropBottom:15,cropLeft:5});
  assert.deepEqual(imageSourceRect(s,{width:1000,height:800}),{sx:50,sy:80,sw:750,sh:600});
});

test('과도한 자르기는 거부한다',()=>{
  assert.throws(()=>validateState({...DEFAULT,cropLeft:45,cropRight:45}),/너무 많이/);
  assert.throws(()=>validateState({...DEFAULT,cropTop:45,cropBottom:45}),/너무 많이/);
});

test('세 과제 화면비의 출력 크기를 유지한다',()=>{
  assert.deepEqual(dimensions('1:1'),[1080,1080]);
  assert.deepEqual(dimensions('4:5'),[1080,1350]);
  assert.deepEqual(dimensions('9:16'),[1080,1920]);
});


test('비율 맞춤 체크 시 사진은 자동 잘림 없이 캔버스 크기에 맞게 늘어나거나 압축된다',()=>{
  const img={width:1600,height:900};
  const s=validateState({...DEFAULT,ratio:'4:5',stretchToRatio:true,imageScale:100});
  const [w,h]=dimensions(s.ratio);
  const d=imageDestinationRect(s,img,w,h);
  assert.deepEqual(d,{x:0,y:0,width:1080,height:1350,centerX:540,centerY:675});
});

test('비율 맞춤 해제 시 cover 방식은 원본 비율을 유지하며 필요 부분이 잘린다',()=>{
  const img={width:1600,height:900};
  const s=validateState({...DEFAULT,ratio:'4:5',stretchToRatio:false,fit:'cover',imageScale:100});
  const [w,h]=dimensions(s.ratio);
  const d=imageDestinationRect(s,img,w,h);
  assert.equal(Math.round(d.height),1350);
  assert.ok(d.width>1080);
  assert.equal(Math.round(d.width/d.height*1000),Math.round((1600/900)*1000));
});
