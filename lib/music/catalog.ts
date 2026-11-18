export type Release={id:string;kind:'track'|'album';title?:string;audioSrc?:string};
export const releases:Release[]=[
  {title:'LAX!',kind:'track',id:'2JYLBbngIOycsumS0b9TCA'},
  {title:"Don't Kill My Qwaa!",kind:'track',id:'5Q4uyRnSm7ar6qHgOaU6SK'},
  {title:'Ntjwaka Mei Dawgo',kind:'album',id:'3fRud4kn6iXSPimTlWgbJf'},
  // Spotify supplies the visible release names inside these new embeds.
  {kind:'album',id:'1IIfSDNRJTULIwjKg5j6RK'},
  {kind:'track',id:'0dXvoI3H71ehlBrJ5kTBBw'},
];
export const featureVideos=[
  {id:'OlXTom_jz-s',title:'LAX! · Official visualizer',category:'Visualizer / Features'},
  {id:'Xc4u61qS5uQ',title:'Featured appearance',category:'Features'},
  {id:'ZKFxonhUVdA',title:'C.JayMnandi x Homecoming Africa 2024',category:'Features / Past performance'},
  {id:'89--pR19iUg',title:'Featured appearance',category:'Features'},
];
export const visualVideos=[{id:'6c42u8MHtfc',title:'Ntjwaka Mei Dawgo',category:'Visuals'}];
export const videoThumbnail=(id:string)=>`https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
