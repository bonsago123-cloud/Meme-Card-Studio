import {createClient} from '@supabase/supabase-js';
export function createStore(env){
 const key=env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY;
 if(!env.SUPABASE_URL||!key||!env.SESSION_SECRET||env.SESSION_SECRET.length<32||key.startsWith('REPLACE_')||env.SESSION_SECRET.startsWith('REPLACE_'))throw new Error('CONFIG_MISSING');
 const client=createClient(env.SUPABASE_URL,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const storage=client.storage.from('card-studio');
 function unwrap(result){if(result.error)throw result.error;return result.data;}
 return {
  async read(owner){return unwrap(await client.from('card_collections').select('revision,object_key').eq('owner_id',owner).maybeSingle());},
  async signedRead(path){return unwrap(await storage.createSignedUrl(path,120)).signedUrl;},
  async signedUpload(path){return unwrap(await storage.createSignedUploadUrl(path,{upsert:false})).signedUrl;},
  async download(path){return unwrap(await storage.download(path));},
  async upload(path,data){return unwrap(await storage.upload(path,data,{contentType:'application/json',upsert:false}));},
  async remove(path){return unwrap(await storage.remove([path]));},
  async commit(owner,revision,path){return unwrap(await client.rpc('card_commit_collection',{p_owner:owner,p_expected_revision:revision,p_object_key:path}));}
 };
}
