/** Always display the approved artwork; never rebuild its lettering in CSS. */
export function BrandLogo({className=''}:{className?:string}){
  return <img className={`brand-approved ${className}`} src="/brand/nestaffiliate-transparent-v2.webp"
    srcSet="/brand/nestaffiliate-transparent-v2-256.webp 256w, /brand/nestaffiliate-transparent-v2-512.webp 512w, /brand/nestaffiliate-transparent-v2.webp 1166w"
    sizes="(max-width: 520px) 200px, 360px" width="1166" height="170" alt="NestAffiliate" decoding="async"/>;
}
