import Experience from '../components/experience';
import { getContactConfig } from '../lib/contact/config';
import { parsePanel } from '../lib/site/navigation';
export default async function Home({searchParams}:{searchParams:Promise<{panel?:string|string[]}>}){
  const panel=parsePanel((await searchParams).panel),config=getContactConfig();
  return <Experience key={panel||'home'} initialPanel={panel} contactFormsEnabled={config.ready} supportEmail={config.supportEmail}/>;
}
