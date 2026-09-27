import {createHash} from 'node:crypto';
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const fn=source.slice(source.indexOf('function drawOutsidePhoto('),source.indexOf('function draw(){'));
const rows=[];
for(const [x,y] of [[-2000,100],[2200,100],[100,-2200],[100,2300]]){
 const calls=[];const c={scale(){},drawImage(...args){calls.push(args);},fillRect(...args){this.cut=args;}};
 const ghost={style:{},getContext:()=>c};const state={canvasEnabled:true,photo:{x,y,w:600,h:400,sx:0,sy:0,sw:1200,sh:800}};
 vm.runInNewContext(fn+';drawOutsidePhoto(1080,1080);',{state,image:{},$:()=>ghost,viewX:0,viewY:0,viewZoom:1,VIEW:1080});
 assert.equal(ghost.hidden,false);assert.equal(calls.length,1);assert.equal(calls[0][7],600);assert.deepEqual(c.cut,[-x,-y,1080,1080]);assert.equal(c.globalCompositeOperation,'destination-out');assert.equal(parseFloat(ghost.style.left),x/1080*100);
 rows.push({x,y,result:'PASS: full exterior photo element retained beyond old viewport'});
}
const ghost={style:{},getContext(){throw Error('must not draw when canvas deleted');}};
vm.runInNewContext(fn+';drawOutsidePhoto(1080,1080);',{state:{canvasEnabled:false,photo:{x:2000,y:0,w:600,h:400}},image:{},$:()=>ghost});assert.equal(ghost.hidden,true);
const baseline=JSON.parse(fs.readFileSync(new URL('./free-path-baseline.json',import.meta.url),'utf8'));
const hash=s=>createHash('sha256').update(s).digest('hex');
const free=s=>s.slice(s.indexOf(' if(free){',s.indexOf('function draw(){')),s.indexOf(' }else{',s.indexOf(' if(free){',s.indexOf('function draw(){'))));
assert.equal(hash(free(source)),baseline.free);
const move=s=>s.match(/stage.addEventListener\('pointermove',e=>\{(.+)\}\);/)[0];assert.equal(hash(move(source)),baseline.move);
console.log(JSON.stringify({scope:'Actual exterior renderer with canvas substitute; original free-render and pointermove code compared unchanged; not real browser QA',tests:rows,canvasDeleted:'PASS: no exterior layer, existing draw/move paths unchanged'},null,2));
