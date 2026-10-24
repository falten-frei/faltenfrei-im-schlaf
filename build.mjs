import {mkdir,rm,cp,writeFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
for(const file of ['index.html','style.css','app.js','core.js','whatsapp.js','legal.js','config.js','catalog.json','assets']) await cp(file,'dist/'+file,{recursive:true});
await writeFile('dist/.nojekyll','');
console.log('Static site ready in dist/');
