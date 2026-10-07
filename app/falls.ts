/** Whisper Falls teaches, tests, then combines the same current-riding mechanic with combat. */
export type WaterCurrent={x:number;y:number;w:number;h:number;speed:number;period?:number;offset?:number};
export const fallsCurrents:Record<number,WaterCurrent[]>={
 // A safe first fountain beside the lower stepping stone.
 1:[{x:530,y:390,w:140,h:315,speed:350}],
 // Optional western alcove, then a pulsing lift to the high beacon.
 9:[{x:650,y:180,w:140,h:525,speed:360},{x:1100,y:175,w:150,h:530,speed:410,period:5.5,offset:0}],
 // A fast route to the elevated sentry; approaching on foot remains possible.
 10:[{x:1160,y:190,w:150,h:515,speed:390}],
 // Symmetric escape routes remain available throughout Tidewing's fight.
 11:[{x:940,y:405,w:150,h:300,speed:410},{x:1800,y:405,w:150,h:300,speed:410}],
};
export const RIVERHEART='river-heart';
export function currentState(q:WaterCurrent,time:number){
 if(!q.period)return 'flowing' as const;
 const phase=((time+(q.offset||0))%q.period+q.period)%q.period/q.period;
 return phase<.64?'flowing':phase>.84?'rising':'resting';
}
export function ridingCurrent(room:number,x:number,y:number,time:number){
 return fallsCurrents[room]?.find(q=>currentState(q,time)==='flowing'&&x>q.x&&x<q.x+q.w&&y>q.y&&y-40<q.y+q.h);
}
export const tideSurge={warning:1.8,active:2.6,recovery:2.8,waterline:620};
