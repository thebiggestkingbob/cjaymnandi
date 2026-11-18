import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {composeCollage,shufflePhotos,wrapOffset,collageSpeed,tileRatio} from '../lib/collage/layout.ts';
const photos=JSON.parse(await readFile(new URL('../lib/collage/manifest.json',import.meta.url)));
test('all source photographs use a consistent 4:5 ratio in a bounded non-overlapping responsive composition',()=>{
  assert.ok(photos.length>=65);
  for(const width of [320,390,768,1440,2560]){
    const layout=composeCollage(photos,width);
    assert.equal(new Set(layout.tiles.map(t=>t.photo.id)).size,photos.length);
    assert.ok(layout.tiles.length<=photos.length+8);
    assert.ok(new Set(layout.tiles.slice(0,65).map(t=>t.width.toFixed(2))).size>=2);
    for(const tile of layout.tiles){
      assert.ok(Math.abs(tile.width/tile.height-tileRatio)<1e-8);
      assert.ok(tile.x>=0&&tile.x+tile.width<=width+.001&&tile.y>=0&&tile.y+tile.height<=layout.height);
    }
    for(let i=0;i<layout.tiles.length;i++)for(let j=i+1;j<layout.tiles.length;j++){
      const a=layout.tiles[i],b=layout.tiles[j];
      assert.ok(!(a.x<b.x+b.width-.001&&b.x<a.x+a.width-.001&&a.y<b.y+b.height-.001&&b.y<a.y+a.height-.001),'photographs never overlap at rest');
    }
    assert.deepEqual(composeCollage(photos,width),layout,'geometry is stable after initial shuffle');
  }
});
test('shuffle preserves every original and mathematical wrapping remains seamless in both directions',()=>{
  const shuffled=shufflePhotos(photos,()=>.37);
  assert.equal(shuffled.length,photos.length);assert.notDeepEqual(shuffled,photos);
  assert.deepEqual(photos.map(p=>p.id).sort(),shuffled.map(p=>p.id).sort());
  const height=composeCollage(photos,1440).height;
  for(const offset of [-height*15-17,-height,0,15,height*27+15]){
    const position=wrapOffset(offset,height);assert.ok(position>=0&&position<height);
    assert.ok(Math.abs(position-wrapOffset(offset+height*5,height))<1e-8);
  }
  for(const fps of [30,60,120]){let offset=0;for(let frame=0;frame<fps*600;frame++)offset=wrapOffset(offset+collageSpeed/fps,height);assert.ok(Math.abs(offset-wrapOffset(collageSpeed*600,height))<1e-6);}
});
