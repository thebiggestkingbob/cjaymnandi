export async function musicMetadataFixture(page){
  await page.route(/\/api\/music-metadata\?id=/,route=>{
    const id=new URL(route.request().url()).searchParams.get('id');
    const titles={'2JYLBbngIOycsumS0b9TCA':'LAX!', '5Q4uyRnSm7ar6qHgOaU6SK':"Don't Kill My Qwaa!",'3fRud4kn6iXSPimTlWgbJf':'Ntjwaka My Dawgo','1IIfSDNRJTULIwjKg5j6RK':'Album release','0dXvoI3H71ehlBrJ5kTBBw':'Single release'};
    return route.fulfill({contentType:'application/json',body:JSON.stringify({id,title:titles[id],image:`https://i.scdn.co/image/${id}`})});
  });
  await page.route('https://i.scdn.co/**',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#003c1e"/><text x="7" y="44" fill="white" font-size="9">Art fixture</text></svg>'}));
}
