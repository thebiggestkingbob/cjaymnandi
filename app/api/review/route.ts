import 'server-only';
import { isReviewHost } from '../../../lib/site/navigation';
import { checkProjectReadiness } from '../../../lib/review/checks';
export const runtime='nodejs';
export async function POST(request: Request) {
  const host=request.headers.get('host')||'';
  if(!isReviewHost(host)) return new Response(null,{status:404});
  try {
    const source=new URL(request.headers.get('origin')||'');
    if(source.host!==host || source.protocol!==new URL(request.url).protocol) return new Response(null,{status:403});
  } catch {return new Response(null,{status:403});}
  const report=await checkProjectReadiness(process.env);
  return Response.json(report,{headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}});
}
