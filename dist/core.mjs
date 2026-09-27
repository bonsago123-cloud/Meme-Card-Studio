export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function resizeRect(r,handle,dx,dy,lock=false){
 const mw=Math.min(24,r.w),mh=Math.min(24,r.h);let l=r.x,t=r.y,rr=r.x+r.w,b=r.y+r.h;
 if(handle.includes('w'))l=Math.min(l+dx,rr-mw);
 if(handle.includes('e'))rr=Math.max(rr+dx,l+mw);
 if(handle.includes('n'))t=Math.min(t+dy,b-mh);
 if(handle.includes('s'))b=Math.max(b+dy,t+mh);
 let w=rr-l,h=b-t;
 if(lock&&handle.length===2){const ratio=r.w/r.h;if(handle==='n'||handle==='s'||(handle.length===2&&Math.abs(dy/r.h)>Math.abs(dx/r.w))){w=h*ratio;l=handle.includes('w')?rr-w:handle.includes('e')?l:r.x+(r.w-w)/2;}else{h=w/ratio;t=handle.includes('n')?b-h:handle.includes('s')?t:r.y+(r.h-h)/2;}}
 return {x:l,y:t,w:Math.max(w,0.001),h:Math.max(h,0.001)};
}
export function cropRect(r,h,dx,dy,bounds){const mw=Math.min(24,bounds.w),mh=Math.min(24,bounds.h);let q=resizeRect(r,h,dx,dy,false);const l=clamp(q.x,bounds.x,bounds.x+bounds.w-mw),t=clamp(q.y,bounds.y,bounds.y+bounds.h-mh);const rr=clamp(q.x+q.w,l+mw,bounds.x+bounds.w),bb=clamp(q.y+q.h,t+mh,bounds.y+bounds.h);return{x:l,y:t,w:rr-l,h:bb-t};}
export function validState(s){const num=(v,a,b)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;const color=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);if(!s||!['1:1','4:5','9:16'].includes(s.ratio)||!color(s.background)||!color(s.textColor)||typeof s.text!=='string'||s.text.length>1500||!num(s.fontSize,16,160)||!num(s.textX,0,100)||!num(s.textY,0,100)||!['quiet','bold','note'].includes(s.design))return false;if(s.applyPhotoRatio!==undefined&&typeof s.applyPhotoRatio!=='boolean')return false;if(s.keepAspect!==undefined&&typeof s.keepAspect!=='boolean')return false;if(s.canvasEnabled!==undefined&&typeof s.canvasEnabled!=='boolean')return false;if(s.photoCanvas!==undefined&&typeof s.photoCanvas!=='boolean')return false;if(s.photoCanvas&&(!s.photo||s.canvasEnabled===false))return false;if(s.photo!==null){const p=s.photo;if(!p||typeof p.src!=='string'||!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(p.src)||p.src.length>29000000)return false;for(const k of ['x','y'])if(!num(p[k],-Number.MAX_VALUE,Number.MAX_VALUE))return false;for(const k of ['w','h'])if(!num(p[k],0.001,Number.MAX_VALUE))return false;for(const k of ['sx','sy'])if(!num(p[k],0,12000))return false;for(const k of ['sw','sh'])if(!num(p[k],0.001,12000))return false;}return true;}
export function validateBundle(value){if(!value||value.version!==1||!Array.isArray(value.templates)||value.templates.length>100)throw Error('템플릿 JSON 형식이 올바르지 않습니다.');const ids=new Set;for(const t of value.templates){if(!t||typeof t.id!=='string'||!t.id||ids.has(t.id)||typeof t.name!=='string'||!t.name.trim()||t.name.length>60||!validState(t.state))throw Error('필수 항목이 없거나 잘못된 템플릿이 있습니다.');ids.add(t.id);}return value.templates;}
export function wrapText(text,maxWidth,measure){const graphemes=s=>typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('ko',{granularity:'grapheme'}).segment(s)].map(x=>x.segment):Array.from(s);return text.split('\n').flatMap(p=>{let lines=[],line='';for(const ch of graphemes(p)){if(line&&measure(line+ch)>maxWidth){lines.push(line);line=ch;}else line+=ch;}lines.push(line);return lines;});}

export function canvasDimensions(s){if((s.photoCanvas||s.canvasEnabled===false)&&s.photo)return [Math.max(1,Math.round(s.photo.w)),Math.max(1,Math.round(s.photo.h))];return [1080,s.ratio==='1:1'?1080:s.ratio==='4:5'?1350:1920];}
export function setCanvasRatio(s,ratio){
 if(!['1:1','4:5','9:16'].includes(ratio))throw Error('Invalid ratio');
 s.ratio=ratio;
 // A regular canvas owns its dimensions. Changing it must not modify photo geometry.
 if(s.canvasEnabled!==false&&!s.photoCanvas)return;
 const p=s.photo;if(!p)return;
 if(s.keepAspect){
  const [rw,rh]=ratio.split(':').map(Number),target=rw/rh,old={...p};
  const w=Math.min(old.w,old.h*target),h=Math.min(old.h,old.w/target);
  const dx=(old.w-w)/2,dy=(old.h-h)/2;
  Object.assign(p,{sx:old.sx+dx/old.w*old.sw,sy:old.sy+dy/old.h*old.sh,sw:old.sw*w/old.w,sh:old.sh*h/old.h,w,h,x:old.x+dx,y:old.y+dy});
 }else{
  const w=1080,h=ratio==='1:1'?1080:ratio==='4:5'?1350:1920;
  Object.assign(p,{x:p.x+(p.w-w)/2,y:p.y+(p.h-h)/2,w,h});
 }
 if(s.photoCanvas){p.x=0;p.y=0;}
}
export function outputRect(s){const [w,h]=canvasDimensions(s);return {x:s.canvasEnabled===false&&s.photo?s.photo.x:0,y:s.canvasEnabled===false&&s.photo?s.photo.y:0,w,h};}
export function sceneRect(s){const a=outputRect(s),p=s.photo;if(!p)return a;const x=Math.min(a.x,p.x),y=Math.min(a.y,p.y);return{x,y,w:Math.max(a.x+a.w,p.x+p.w)-x,h:Math.max(a.y+a.h,p.y+p.h)-y};}
export function checkedExportSize(w,h){w=Math.max(1,Math.round(w));h=Math.max(1,Math.round(h));if(!Number.isSafeInteger(w)||!Number.isSafeInteger(h)||w*h>40000000)throw Error('저장 영역이 너무 큽니다. 사진 크기를 줄여 주세요. 편집은 유지됩니다.');return [w,h];}
