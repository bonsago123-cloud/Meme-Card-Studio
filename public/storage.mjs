const MAX_BYTES=20*1024*1024;
async function json(response){let data;try{data=await response.json();}catch{throw Error('저장 서버의 응답을 읽지 못했습니다. 잠시 후 다시 시도해주세요.');}if(!response.ok)throw Error(data.error||'저장 요청에 실패했습니다. 기존 목록은 유지됩니다.');return data;}
export async function loadRemote(fetcher=fetch){const meta=await json(await fetcher('/api/templates',{cache:'no-store',credentials:'same-origin'}));if(!meta.downloadUrl)return meta;const response=await fetcher(meta.downloadUrl,{cache:'no-store',credentials:'omit'});if(!response.ok)throw Error('저장된 파일을 읽지 못했습니다. 새로고침해주세요.');const blob=await response.blob();if(blob.size>MAX_BYTES)throw Error('보관함 파일이 허용 크기를 넘습니다.');const data=JSON.parse(await blob.text());return {...data,revision:meta.revision};}
export async function saveRemote(templates,revision,fetcher=fetch){
 const blob=new Blob([JSON.stringify({version:1,templates})],{type:'application/json'});
 if(blob.size>MAX_BYTES)throw Error('템플릿 전체 크기는 20MB 이하여야 합니다. 작은 이미지를 사용하거나 일부 템플릿을 JSON으로 보관해주세요.');
 const post=body=>fetcher('/api/templates',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(json);
 const prepared=await post({action:'prepare',revision,bytes:blob.size});
 const upload=await fetcher(prepared.uploadUrl,{method:'PUT',credentials:'omit',headers:{'Content-Type':'application/json','x-upsert':'false'},body:blob});
 if(!upload.ok)throw Error('이미지를 보관함으로 전송하지 못했습니다. 기존 목록은 유지됩니다. 다시 저장해주세요.');
 const commit={action:'commit',path:prepared.path,revision,expires:prepared.expires,ticket:prepared.ticket};
 return post(commit);
}
