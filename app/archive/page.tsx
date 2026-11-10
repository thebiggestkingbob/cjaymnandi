import Experience from '../../components/experience';
import { getContactConfig } from '../../lib/contact/config';
export const metadata={title:'Archive — C.JayMnandi'};
export default function ArchivePage(){const config=getContactConfig();return <Experience initialPanel="archive" contactFormsEnabled={config.ready} supportEmail={config.supportEmail}/>}
