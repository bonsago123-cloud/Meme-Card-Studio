import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {wrapText,clamp} from '../dist/core.mjs';
const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const old=fs.readFileSync(new URL('./legacy-preview.txt',import.meta.url),'utf8');
function functionText(src,name,next){const a=src.indexOf('function '+name+'('),b=src.indexOf(next,a);return src.slice(a,b);}
function check(src){const calls=[];const ctx=new Proxy({measureText:t=>({width:t.length*10})},{get:(obj,k)=>k in obj?obj[k]:(...args)=>calls.push([k,...args]),set:(o,k,v)=>(o[k]=v,true)});const canvas={width:1080,height:1080,style:{}};const stage={style:{},classList:{toggle(){}},parentElement:{classList:{toggle(){}}}};const dom={dimensions:{},format:{value:'png'}};const state={canvasEnabled:false,photoCanvas:false,photo:{x:-200,y:100,w:600,h:400,sx:0,sy:0,sw:600,sh:400},text:'문구',fontSize:64,textX:50,textY:50,textColor:'#ffffff',background:'#ffffff'};const sandbox={state,canvas,stage,ctx,VIEW:1080,viewX:0,viewY:0,viewZoom:1,dimensions:()=>[600,400],normalizeSurface(){},canvasControls(){},selection(){},typography(){},image:{},wrapText,clamp,$:id=>dom[id]};vm.runInNewContext(functionText(src,'render','function draw')+functionText(src,'draw','\nconst handles=')+';draw();',sandbox);return {calls,canvas};}
const before=check(old),after=check(source);
assert.ok(before.calls.some(x=>x[0]==='translate'&&x[1]===-200&&x[2]===100));assert.equal(before.canvas.width,1080);
assert.equal(after.calls.find(x=>x[0]==='drawImage')[6],0);
assert.equal(after.calls.find(x=>x[0]==='drawImage')[8],600);
assert.equal(after.canvas.width,600);assert.equal(after.canvas.height,400);
assert.ok(Number.parseFloat(after.canvas.style.left)<0);
const css=fs.readFileSync(new URL('../dist/style.css',import.meta.url),'utf8');assert.ok(css.includes('.stage.free-photo{overflow:visible!important}'));assert.ok(css.includes('background:transparent!important'));
console.log(JSON.stringify({scope:'Actual draw/render functions with a recording canvas stub, not real browser visual QA',input:'600x400 photo moved to x=-200,y=100 without canvas',before:'FAIL: image drawn at negative x inside fixed bitmap and clipped',after:'PASS: full image drawn at local x=0; whole photo element positioned at negative workspace x',checks:7},null,2));
