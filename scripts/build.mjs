import {cp,rm,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
for(const file of ['public/index.html','public/app.js','public/engine.mjs','supabase/setup.sql'])await access(file);
for(const file of ['public/app.js','public/storage.mjs','api/templates.js','server/service.mjs','server/supabase.mjs'])execFileSync(process.execPath,['--check',file]);
await rm('dist',{recursive:true,force:true});await cp('public','dist',{recursive:true});
console.log('Build complete: static editor + Vercel Node API. No secrets copied to dist.');
