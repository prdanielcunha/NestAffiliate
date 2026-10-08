/** Reports a user-supplied public Reel link; never confirms provider monetization. */
export function isPublicFacebookReelUrl(value:string):boolean {
  try{
    const url=new URL(value.trim());
    const host=url.hostname.toLowerCase();
    return url.protocol==='https:'&&!url.username&&!url.password &&
      (host==='facebook.com'||host.endsWith('.facebook.com')) &&
      /^\/reel\/\d+\/?$/.test(url.pathname);
  }catch{return false;}
}
