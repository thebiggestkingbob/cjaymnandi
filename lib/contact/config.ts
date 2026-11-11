import 'server-only';
import { formsReady,officialEmail } from '../email/settings';
export function getContactConfig(){return {ready:formsReady(process.env),supportEmail:officialEmail,operatorName:process.env.CONTACT_OPERATOR_NAME?.trim()||'',privacyApproved:process.env.CONTACT_PRIVACY_APPROVED==='true'}}
