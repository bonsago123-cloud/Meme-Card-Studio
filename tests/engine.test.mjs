import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT,validateState,parseTemplates,imageSourceRect,dimensions} from '../public/engine.mjs';

test('이전 버전의 완전한 템플릿은 새 편집 필드를 기본값으로 보완한다',()=>{
  const old={...DEFAULT};
  for(const k of ['imageScale','imageX','imageY','cropTop','cropRight','cropBottom','cropLeft','rotation','fontFamily'])delete old[k];
  const v=validateState(old);
  assert.equal(v.cropTop,0);assert.equal(v.cropLeft,0);assert.equal(v.rotation,0);assert.equal(v.fontFamily,'studio');
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
