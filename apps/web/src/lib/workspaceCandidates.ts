/** Candidate IDs do not grant access. Every ID must still pass server-backed entitlement
 * AND active membership (unless the user's global role permits owner access).
 */
export function workspaceCandidates(profile:Record<string,unknown>):string[]{
  const raw:unknown[]=[
    profile.activeOrganizationId,
    profile.organizationId,
    profile.primaryOrganizationId,
    profile.defaultOrganizationId,
    ...(Array.isArray(profile.organizations)?profile.organizations:[]),
  ];
  return [...new Set(raw.filter((id):id is string=>
    typeof id==='string'&&id.trim().length>0&&id.trim().length<256
  ).map(id=>id.trim()))].slice(0,12);
}
export function hasNestAffiliateEntitlement(organization:Record<string,unknown>):boolean{
  const apps=organization.apps;
  if(!apps||typeof apps!=='object'||Array.isArray(apps))return false;
  const grant=(apps as Record<string,unknown>).nestaffiliate;
  if(grant===true)return true;
  if(!grant||typeof grant!=='object'||Array.isArray(grant))return false;
  const access=grant as Record<string,unknown>;
  return ['active','trialing'].includes(String(access.status??'').toLowerCase()) ||
    access.enabled===true;
}
