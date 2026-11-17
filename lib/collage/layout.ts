export type Photograph = {id:string;width:number;height:number;alt:string;variants:{width:number;src:string}[]};
export type Tile = {photo:Photograph;x:number;y:number;width:number;height:number};
export const collageSpeed = 32; // CSS pixels per second, independent of refresh rate.
export const wrapOffset=(offset:number,height:number)=>height>0?((offset%height)+height)%height:0;
export function shufflePhotos<T>(photos:readonly T[],random:()=>number=Math.random):T[]{
  const result=[...photos];
  for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
}
export function composeCollage(photos:readonly Photograph[],width:number){
  const gap=6, columns=width<600?3:width<1000?5:8;
  const unit=(width-gap*(columns-1))/columns, skyline=Array<number>(columns).fill(0), tiles:Tile[]=[];
  for(let i=0;i<photos.length;i++){
    const photo=photos[i];
    // Mixed spans interrupt vertical columns; only bridge near-level neighbours.
    const wanted=i%20===3?3:[0,2,6,9,13,17].includes(i%20)?2:1;
    let span=Math.min(wanted,columns), bestX=0, bestY=Infinity;
    while(span>=1){
      bestY=Infinity;
      for(let col=0;col<=columns-span;col++){
        const segment=skyline.slice(col,col+span), top=Math.max(...segment);
        if(span>1&&top-Math.min(...segment)>unit*.35)continue;
        if(top<bestY){bestX=col;bestY=top;}
      }
      if(Number.isFinite(bestY))break;
      span--;
    }
    const tileWidth=unit*span+gap*(span-1), height=tileWidth*photo.height/photo.width;
    tiles.push({photo,x:bestX*(unit+gap),y:bestY,width:tileWidth,height});
    for(let col=bestX;col<bestX+span;col++)skyline[col]=bestY+height+gap;
  }
  // Close the seam with proportional photographs in the shorter final lanes.
  // These are bounded extra instances, never cropped or stretched.
  const end=Math.max(...skyline);
  const fillers=new Set<string>();
  for(let col=0;col<columns;col++){
    const room=end-skyline[col]-gap;
    if(room<unit*.45)continue;
    const neighbours=tiles.filter(t=>t.x<=col*(unit+gap)+unit&&t.x+t.width>=col*(unit+gap)&&(t.y<1||t.y+t.height>skyline[col]-unit*2));
    const candidates=photos.filter(p=>!fillers.has(p.id)&&!neighbours.some(t=>t.photo.id===p.id));
    if(!candidates.length)continue;
    const photo=candidates.reduce((best,p)=>Math.abs(p.height/p.width-room/unit)<Math.abs(best.height/best.width-room/unit)?p:best,candidates[0]);
    if(!photo)continue;
    fillers.add(photo.id);
    const w=Math.min(unit,room*photo.width/photo.height), h=w*photo.height/photo.width;
    tiles.push({photo,x:col*(unit+gap)+(unit-w)/2,y:skyline[col],width:w,height:h});
  }
  return {tiles,height:end,width};
}
