import {validState as validLegacy, setCanvasRatio, wrapText, clamp} from './core.mjs';
export const FONTS={gothic:'"Malgun Gothic", "Apple SD Gothic Neo", sans-serif',batang:'Batang, "Noto Serif CJK KR", serif',gungseo:'Gungsuh, "Nanum Myeongjo", serif',gulim:'Gulim, "Apple SD Gothic Neo", sans-serif',dotum:'Dotum, "Apple SD Gothic Neo", sans-serif',serif:'Georgia, Batang, serif',mono:'Consolas, "Courier New", monospace',templateSerif:'Georgia, Batang, serif',templateBold:'Arial, "Malgun Gothic", sans-serif',templateSmall:'Arial, "Malgun Gothic", sans-serif'};
export const newText=(id,text='새 문구')=>({id,text,textColor:'#ffffff',fontSize:64,textX:50,textY:50,fontFamily:'gothic'});
const baseState=()=>({schema:2,ratio:'1:1',background:'#e9e4db',shading:{enabled:false,color:'#000000',opacity:35,angle:90},design:'quiet',canvasEnabled:true,canvasPhotoId:null,keepAspect:false,photos:[],texts:[{...newText('first-text','오늘의 작은 순간을\n오래 기억하기'),textY:72}]});
export function templateTexts(design,ratio,makeId){
 const h=ratio==='4:5'?1350:ratio==='9:16'?1920:1080;
 const specs=design==='quiet'?[
  ['M O M E N T S   T O   K E E P',18,.13,'templateSmall','#ffffff'],
  ['a little',110,.39,'templateSerif','#ffffff'],['moment.',110,.51,'templateSerif','#ffffff']
 ]:design==='bold'?[
  ['MAKE',150,.28,'templateBold','#334531'],['IT YOURS.',150,.43,'templateBold','#334531']
 ]:design==='note'?[['Dear, today',90,.3,'templateSerif','#71614f']]:[];
 return specs.map(([text,fontSize,baseline,fontFamily,textColor])=>({...newText(makeId(),text),fontSize,fontFamily,textColor,textY:100*(baseline-.125*fontSize/h),templateRole:'title'}));
}
export function initialState(){const s=baseState();s.editableTemplateText=true;s.texts[0].templateRole='body';let n=0;s.texts.unshift(...templateTexts(s.design,s.ratio,()=>`initial-title-${++n}`));return s;}
export function migrate(s){
 let n;if(s?.schema===2)n=structuredClone(s);else{
  if(!validLegacy(s))throw Error('템플릿 내용이 올바르지 않습니다.');n=baseState();
  for(const k of ['ratio','background','design','canvasEnabled'])if(s[k]!==undefined)n[k]=s[k];
  n.photos=s.photo?[{...s.photo,id:'legacy-photo'}]:[];
  n.texts=[{...newText('legacy-text'),...Object.fromEntries(['text','textColor','fontSize','textX','textY'].map(k=>[k,s[k]]))}];n.canvasPhotoId=s.photoCanvas?'legacy-photo':null;
 }
 // Upgrade once only: deleted template wording must never return on reload.
 if(!n.editableTemplateText&&!n.photos.length&&n.canvasEnabled&&!n.canvasPhotoId){
  const ids=new Set([...n.photos,...n.texts].map(o=>o.id));let i=0;
  n.texts.unshift(...templateTexts(n.design,n.ratio,()=>{let id;do{id=`converted-title-${++i}`;}while(ids.has(id));ids.add(id);return id;}));
 }
 n.editableTemplateText=true;n.keepAspect=false;return n;
}

const num=(v,a,b)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;
const color=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
export function validState(s){
 if(s?.schema!==2)return validLegacy(s);
 if(!['1:1','4:5','9:16'].includes(s.ratio)||!color(s.background)||!['quiet','bold','note','plain'].includes(s.design)||typeof s.canvasEnabled!=='boolean'||typeof s.keepAspect!=='boolean'||!Array.isArray(s.photos)||!Array.isArray(s.texts)||s.photos.length>100||s.texts.length>103)return false;
 if(s.editableTemplateText!==undefined&&typeof s.editableTemplateText!=='boolean')return false;
 const sh=s.shading;if(!sh||typeof sh.enabled!=='boolean'||!color(sh.color)||!num(sh.opacity,0,100)||!num(sh.angle,0,360))return false;
 const ids=new Set;for(const o of [...s.photos,...s.texts]){if(!o||typeof o.id!=='string'||!o.id||o.id.length>100||ids.has(o.id))return false;ids.add(o.id);}
 for(const p of s.photos){if(typeof p.src!=='string'||!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(p.src)||p.src.length>29000000)return false;for(const k of ['x','y'])if(!num(p[k],-Number.MAX_VALUE,Number.MAX_VALUE))return false;for(const k of ['w','h'])if(!num(p[k],.001,Number.MAX_VALUE))return false;for(const k of ['sx','sy'])if(!num(p[k],0,12000))return false;for(const k of ['sw','sh'])if(!num(p[k],.001,12000))return false;}
 for(const t of s.texts)if(typeof t.text!=='string'||t.text.length>1500||!color(t.textColor)||!num(t.fontSize,16,160)||!num(t.textX,0,100)||!num(t.textY,0,100)||!Object.hasOwn(FONTS,t.fontFamily)||(t.templateRole!==undefined&&!['body','title'].includes(t.templateRole)))return false;
 return s.canvasPhotoId===null||(s.canvasEnabled&&s.photos.some(p=>p.id===s.canvasPhotoId));
}
export function validateBundle(b){if(!b||![1,2].includes(b.version)||!Array.isArray(b.templates)||b.templates.length>100)throw Error('템플릿 JSON 형식이 올바르지 않습니다.');const ids=new Set;for(const t of b.templates){if(!t||typeof t.id!=='string'||!t.id||ids.has(t.id)||typeof t.name!=='string'||!t.name.trim()||t.name.length>60||!validState(t.state))throw Error('필수 항목이 없거나 잘못된 템플릿이 있습니다.');ids.add(t.id);}return b.templates.map(t=>({...t,state:migrate(t.state)}));}
export function union(rects){if(!rects.length)return{x:0,y:0,w:1080,h:1080};const x=Math.min(...rects.map(r=>r.x)),y=Math.min(...rects.map(r=>r.y));return{x,y,w:Math.max(...rects.map(r=>r.x+r.w))-x,h:Math.max(...rects.map(r=>r.y+r.h))-y};}
export function outputRect(s){const anchor=s.photos.find(p=>p.id===s.canvasPhotoId);if(anchor)return{x:anchor.x,y:anchor.y,w:Math.max(1,Math.round(anchor.w)),h:Math.max(1,Math.round(anchor.h))};if(!s.canvasEnabled&&s.photos.length){const r=union(s.photos);return{...r,w:Math.max(1,Math.round(r.w)),h:Math.max(1,Math.round(r.h))};}return{x:0,y:0,w:1080,h:s.ratio==='1:1'?1080:s.ratio==='4:5'?1350:1920};}
export const sceneRect=s=>union([outputRect(s),...s.photos]);
export const backgroundEnabled=s=>s.canvasEnabled&&!s.canvasPhotoId;
export function changeRatio(s,ratio,selectedId){const photo=s.photos.find(p=>p.id===s.canvasPhotoId)||(!s.canvasEnabled&&(s.photos.find(p=>p.id===selectedId)||s.photos[0]));const temp={ratio:s.ratio,canvasEnabled:s.canvasEnabled,photoCanvas:!!s.canvasPhotoId,keepAspect:false,photo};setCanvasRatio(temp,ratio);s.ratio=ratio;}
export function removeObject(s,id){const count=s.photos.length+s.texts.length;s.photos=s.photos.filter(p=>p.id!==id);s.texts=s.texts.filter(t=>t.id!==id);if(s.canvasPhotoId===id)s.canvasPhotoId=null;return count!==s.photos.length+s.texts.length;}
export function drawBackground(c,s,w,h){if(!backgroundEnabled(s))return;c.fillStyle=s.background;c.fillRect(0,0,w,h);if(s.shading.enabled){const a=s.shading.angle*Math.PI/180,dx=Math.cos(a),dy=Math.sin(a),length=Math.abs(w*dx)+Math.abs(h*dy);const g=c.createLinearGradient(w/2-dx*length/2,h/2-dy*length/2,w/2+dx*length/2,h/2+dy*length/2);g.addColorStop(0,s.shading.color+'00');g.addColorStop(1,s.shading.color+Math.round(s.shading.opacity/100*255).toString(16).padStart(2,'0'));c.fillStyle=g;c.fillRect(0,0,w,h);}}
export function layoutText(c,t,r){let size=t.fontSize,lines;const maxWidth=r.w*.88,maxHeight=r.h*.88;do{c.font=`${t.fontFamily==='templateSerif'?'italic ':''}${t.fontFamily==='templateSerif'?400:t.fontFamily==='templateBold'?900:t.fontFamily==='templateSmall'?500:700} ${size}px ${FONTS[t.fontFamily]}`;lines=wrapText(t.text,maxWidth,x=>c.measureText(x).width);if(lines.length*size*1.35<=maxHeight)break;size--;}while(size>8);const lineH=size*1.35,bw=Math.min(maxWidth,Math.max(1,...lines.map(l=>c.measureText(l).width))),bh=t.text?lines.length*lineH:0;const x=clamp(t.textX/100*r.w,bw/2+12,r.w-bw/2-12),y=clamp(t.textY/100*r.h-bh/2,12,r.h-bh-12);return{lines,lineH,x:r.x+x,y:r.y+y,box:{x:r.x+x-bw/2,y:r.y+y,w:bw,h:bh}};}
