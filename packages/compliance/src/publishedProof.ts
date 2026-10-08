/**
 * A user-supplied URL is a pointer to a public Pin, not proof of affiliate
 * attribution or a network verification of the resource. Never auto-publish.
 */
export function isPublicPinterestPinUrl(value:string):boolean {
  try{
    const u=new URL(value.trim());
    const host=u.hostname.toLowerCase();
    return u.protocol==='https:' && !u.username && !u.password &&
      (host==='pinterest.com'||host.endsWith('.pinterest.com')) &&
      /^\/pin\/\d+\/?$/.test(u.pathname);
  }catch{return false;}
}
