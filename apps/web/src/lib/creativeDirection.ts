import type {CampaignVersion,PinterestCreativePack} from '@nestaffiliate/core';
import { compactPinText } from '@nestaffiliate/creative-engine';

/** Same narrative for saved concept and in-canvas compare. No invented product claims. */
export function narrativeForConcept(
 version:CampaignVersion,pack:PinterestCreativePack,index:number,
):CampaignVersion['narrative']{
 const copy=pack.copy;
 if(index<0)return version.narrative;
 const title=copy.titles[index]??copy.titles[0]??version.narrative.pinterestTitle;
 const description=copy.descriptions[index%Math.max(1,copy.descriptions.length)]??version.narrative.description;
 return {
  ...version.narrative,
  headline:compactPinText(title,57),
  pinterestTitle:title,
  description,
 };
}
