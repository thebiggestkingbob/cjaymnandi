import Experience from '../../components/experience';
import { getContactConfig } from '../../lib/contact/config';
export const metadata={title:'Living photographic archive — C.JayMnandi',description:'An endless collage of photographs from C.JayMnandi’s world.'};
export default function PhotosPage(){const config=getContactConfig();return <Experience initialPanel="photos" contactFormsEnabled={config.ready} supportEmail={config.supportEmail}/>}
