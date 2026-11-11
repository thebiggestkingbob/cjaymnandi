import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { isReviewHost } from '../../lib/site/navigation';
import ReviewWorkspace from '../../components/review-workspace';
export const metadata={title:'Website review — C.JayMnandi',robots:{index:false,follow:false}};
export default async function ReviewPage(){
  if(!isReviewHost((await headers()).get('host')||''))notFound();
  return <ReviewWorkspace/>;
}
