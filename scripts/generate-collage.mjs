import { readdir, readFile, mkdir, writeFile, access } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
const source='assets/photography/originals', output='public/media/photography';
await mkdir(output,{recursive:true});
const provenance=JSON.parse(await readFile('assets/photography/sources.json','utf8').catch(()=>'[]'));
const photos=[];
for(const file of (await readdir(source)).sort()){
  if(!/\.(jpe?g|png|webp|avif)$/i.test(file))continue;
  const input=join(source,file), data=await readFile(input), hash=createHash('sha256').update(data).digest('hex').slice(0,16);
  const meta=await sharp(data).metadata();
  const swap=[5,6,7,8].includes(meta.orientation), width=swap?meta.height:meta.width, height=swap?meta.width:meta.height;
  if(!width||!height)throw new Error(`Cannot determine dimensions: ${file}`);
  const variants=[];
  for(const size of [...new Set([320,640,960,Math.min(1600,width)].filter(x=>x<=width))].sort((a,b)=>a-b)){
    const name=`${hash}-v1-${size}.webp`, target=join(output,name);
    try{await access(target)}catch{await sharp(data).rotate().resize({width:size,withoutEnlargement:true}).webp({quality:84,effort:4}).toFile(target)}
    variants.push({width:size,src:`/media/photography/${name}`});
  }
  const original=provenance.find(x=>x.file===file)?.source||basename(file,extname(file));
  const caption=original.replace(/\.[^.]+$/,'').replace(/\s*\(\d+\)$/,'').split(/📸|#|NEW VERSE OUT/)[0].replace(/@[^\s]+/g,'').replace(/[^\p{L}\p{N}\s!.,’'-]/gu,'').replace(/\s+/g,' ').trim();
  photos.push({id:hash,width,height,alt:caption?`C.JayMnandi — ${caption}`:'C.JayMnandi photographic archive',variants});
}
if(!photos.length)throw new Error('No collage photographs found');
await mkdir('lib/collage',{recursive:true});
await writeFile('lib/collage/manifest.json',JSON.stringify(photos,null,2)+'\n');
console.log(`Collage manifest: ${photos.length} originals; ${photos.reduce((n,p)=>n+p.variants.length,0)} responsive variants. Originals unchanged.`);
