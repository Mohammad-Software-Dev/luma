import { bossPattern, stages, type BossPattern } from './campaign';
export const smoothStep=(value:number)=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t)};
export function chooseBossPattern(stage:number,cycle:number,hp:number,max:number,distance:number):BossPattern{
 const planned=bossPattern(stage,cycle,hp,max),available:readonly BossPattern[]=stages[stage].patterns;
 if(cycle>0&&distance<150&&planned==='charge'&&available.includes('slam'))return 'slam';
 if(cycle>0&&distance>520&&planned==='slam'&&available.includes('charge'))return 'charge';
 return planned;
}
export function bossChoreography(stage:number,pattern:BossPattern){
 const flight=stage===1||stage===3||stage===5;
 return {flight,reposition:stage===2?.95:.7,altitude:stage===3?545:flight?590:645,
  active:pattern==='charge'?.75:pattern==='slam'?.7:pattern==='fan'?.66:pattern==='spiral'?.82:.35,
  leap:pattern==='slam'?110:stage===3&&pattern==='fan'?75:0,
  volleys:pattern==='fan'&&flight?3:pattern==='spiral'?2:1};
}
