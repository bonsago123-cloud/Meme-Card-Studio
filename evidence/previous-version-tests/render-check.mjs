import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {wrapText,clamp,outputRect} from '../dist/core.mjs';
const app=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const body=app.slice(app.indexOf('function render('),app.indexOf('function draw('));
const rows=[];
for(const ratio of ['1:1','4:5','9:16']){
 const state={ratio,canvasEnabled:true,photoCanvas:false,photo:{x:-300,y:200,w:800,h:600,sx:0,sy:0,sw:1600,sh:1200},text:'한글 테스트\nHello 😀',fontSize:64,textX:50,textY:72,textColor:'#ffffff',background:'#eeeeee'};
 const record=preview=>{const log=[],ctx=new Proxy({measureText:t=>({width:t.length*32})},{get:(o,k)=>k in o?o[k]:(...args)=>log.push([k,...args]),set:(o,k,v)=>(o[k]=v,true)});const {w,h}=outputRect(state);vm.runInNewContext(body+`;render(ctx,${w},${h},${preview});`,{ctx,state,image:{},$:()=>({value:'png'}),typography(){},wrapText,clamp});return log;};
 assert.deepEqual(record(true),record(false));rows.push({ratio,result:'PASS: preview/export same render calls, including clip/image/text'});
}
const fit=app.slice(app.indexOf('function frameRect('),app.indexOf("$('fitView').onclick="));
const state={ratio:'9:16',canvasEnabled:true,photoCanvas:false,photo:{x:5000,y:-2000,w:400,h:300}};const ctx={state,VIEW:1080,viewZoom:1,viewX:0,viewY:0,$:()=>({}),draw(){},outputRect};vm.runInNewContext(fit+';frameOutput();',ctx);assert.ok(ctx.viewX<0&&ctx.viewY<0);assert.ok((1920-ctx.viewY)*ctx.viewZoom<1080);rows.push({result:'PASS: frameOutput centers tall canvas, ignoring displaced photo'});
console.log(JSON.stringify({scope:'Actual renderer and framing functions with recording substitutes; not browser pixel verification',tests:rows},null,2));
