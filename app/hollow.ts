/** Permanent trail seals and renewable arena formations have separate lifecycles. */
export type CrystalSeal={id:number;x:number;y:number;w:number;h:number};
export const crystalSeals:Record<number,CrystalSeal[]>={
 12:[{id:120,x:975,y:245,w:48,h:170},{id:121,x:1760,y:200,w:48,h:170}],
 13:[{id:130,x:1840,y:80,w:48,h:180}],
};
export const validBrokenIds=[2,120,121,130];
export const EMBERHEART='ember-heart';
export const amberFormations=[1080,1780];
export const amberCrash={recovery:3.2,regrow:9};
export function sweptFormation(from:number,to:number,x:number){return Math.min(from,to)-48<=x&&Math.max(from,to)+48>=x;}
export function trailSealsRemaining(broken:ReadonlySet<number>){return crystalSeals[12].filter(q=>!broken.has(q.id)).length;}
