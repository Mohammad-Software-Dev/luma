/** Campaign content and gate rules shared by the engine, map, and checks. */
export type Hazard = {kind:'thorns'|'jet'|'swing';x:number;y:number;w:number;h:number;period?:number;offset?:number;range?:number};
export type MovingPlatform = {axis:'x'|'y';origin:number;range:number;period:number;phase:number};
export const stages = [
 {name:'Waking Glade',trial:'Bramble Brook',gauntlet:'Rootbound Crossing',arena:'Briarheart Grove',boss:'Briarhorn',color:'#b1d594',hp:18,patterns:['charge','slam'],hint:'Leap over its charge. Jump the ground waves, then strike its open heart.'},
 {name:'Whisper Falls',trial:'The Spillway',gauntlet:'Torrent Stair',arena:'Tidewing’s Basin',boss:'Tidewing',color:'#8be4e4',hp:22,patterns:['fan','rain','surge'],hint:'Hold jump inside a current to escape the flood. Dash toward Tidewing when its wings open.'},
 {name:'Amber Hollow',trial:'Ember Veins',gauntlet:'Crystal Ascent',arena:'Amberback’s Vault',boss:'Amberback',color:'#ffc88b',hp:26,patterns:['eruption','charge'],hint:'Stand beyond a crystal to bait a charge, then jump clear. The crash exposes Amberback for longer.'},
 {name:'Windborne Canopy',trial:'Swaying Boughs',gauntlet:'Stormleaf Watch',arena:'The Gale Crown',boss:'Gale Sovereign',color:'#c7f5b3',hp:28,patterns:['spiral','fan'],hint:'Move between the spiraling lights. Parry a path toward its open wings.'},
 {name:'Moonpetal Sanctuary',trial:'Lunar Causeway',gauntlet:'Starlit Terraces',arena:'Moonbloom Court',boss:'Moonbloom',color:'#c8b8ff',hp:30,patterns:['rain','spiral','eruption'],hint:'Watch the ground marks and rings. Strike during the quiet between blooms.'},
 {name:'Sunspire Ruins',trial:'The Broken Aqueduct',gauntlet:'Dawnward Keep',arena:'The Heart of Dawn',boss:'Solwarden',color:'#ffe1a1',hp:36,patterns:['charge','fan','eruption','spiral','slam'],hint:'Three phases combine the guardians’ attacks. Read each warning, then counter.'}
] as const;
export type BossPattern = typeof stages[number]['patterns'][number];
export const stageRooms=(stage:number)=>[stage,6+stage*3,7+stage*3,8+stage*3];
export function areaStage(room:number){return room<6?room:Math.floor((room-6)/3)}
export function areaPart(room:number){return room<6?0:(room-6)%3+1}
export const beaconId=(stage:number,part:number)=>`${stage}:${part}`;
export type CampaignProgress={bosses:number[];beacons:string[]};
export function unlockedStage(state:Pick<CampaignProgress,'bosses'>,stage:number){return stage>=0&&stage<6&&Array.from({length:stage},(_,i)=>i).every(i=>state.bosses.includes(i))}
export function stageBeacons(state:Pick<CampaignProgress,'beacons'>,stage:number){return [0,1,2].filter(part=>state.beacons.includes(beaconId(stage,part))).length}
export function bossPhase(hp:number,max:number,stage:number){return hp<=max/3&&stage===5?3:hp<=max/2?2:1}
export function bossPattern(stage:number,cycle:number,hp:number,max:number):BossPattern{
 const patterns=stages[stage].patterns;return patterns[(cycle+(bossPhase(hp,max,stage)-1))%patterns.length];
}
export function bossAttack(stage:number,cycle:number,hp:number,max:number,assist=false){
 const phase=bossPhase(hp,max,stage),pattern=bossPattern(stage,cycle,hp,max),speed=(assist?.8:1)*(phase===1?1:1.12),count=pattern==='spiral'?10+phase*2:3+phase*2;
 return {phase,pattern,windup:(phase===3?1.05:1.3)*(assist?1.45:1),recovery:(phase===3?1.5:1.85)*(assist?1.4:1),projectileSpeed:225*speed,chargeSpeed:520*speed,chargeDuration:.75,spread:Array.from({length:count},(_,i)=>pattern==='spiral'?i/count*Math.PI*2+cycle*.3:(i-(count-1)/2)*.16),marks:phase>1?[-270,-135,0,135,270]:[-160,0,160]};
}
const g=(x:number,w:number)=>({x,y:705,w,h:180});
const p=(x:number,y:number,w:number,moving?:MovingPlatform)=>({x,y,w,h:48,...(moving?{moving}:{})});
const mover=(axis:'x'|'y',origin:number,range:number,period=5,phase=0):MovingPlatform=>({axis,origin,range,period,phase});
/** Authored routes: stepping stones, timed water, ember vents, lifts, pendulums, and ruins. */
export const trials=[
 {platforms:[g(0,650),g(1050,350),g(1820,580),p(690,570,210),p(980,440,230),p(1300,560,220),p(1590,470,230,mover('x',1590,115,6)),p(1950,570,220)],beacon:{x:2050,y:530},hazards:[{kind:'thorns',x:1130,y:677,w:105,h:28},{kind:'thorns',x:2150,y:677,w:110,h:28}]},
 {platforms:[g(0,710),g(960,460),g(1740,660),p(500,555,210),p(840,420,230),p(1200,210,230),p(1550,450,240,mover('y',450,80,6)),p(1950,555,230),p(590,230,240)],beacon:{x:1300,y:170},hazards:[{kind:'jet',x:1060,y:480,w:85,h:225,period:4,offset:0},{kind:'jet',x:1820,y:480,w:85,h:225,period:4,offset:2}]},
 {platforms:[g(0,760),g(1110,440),g(1900,500),p(500,550,240),p(880,415,250),p(1300,530,230),p(1660,370,250),p(1990,540,230)],beacon:{x:1770,y:330},hazards:[{kind:'jet',x:1190,y:475,w:90,h:230,period:3.8,offset:1},{kind:'thorns',x:600,y:677,w:130,h:28},{kind:'jet',x:2060,y:345,w:85,h:195,period:4.6,offset:2}]},
 {platforms:[g(0,580),g(1910,490),p(480,550,220),p(810,410,260,mover('x',810,95,6)),p(1230,500,250,mover('y',500,70,5)),p(1580,350,260,mover('x',1580,95,7)),p(1930,530,230)],beacon:{x:1700,y:310},hazards:[{kind:'swing',x:1150,y:360,w:38,h:38,range:170,period:4.8},{kind:'swing',x:1780,y:410,w:38,h:38,range:170,period:5.8}]},
 {platforms:[g(0,670),g(1070,410),g(1850,550),p(430,550,220),p(820,400,240),p(1200,250,260),p(1600,430,250,mover('y',430,90,6)),p(1960,565,220)],beacon:{x:1320,y:210},hazards:[{kind:'swing',x:960,y:360,w:40,h:40,range:150,period:4},{kind:'jet',x:1150,y:465,w:85,h:240,period:4.8,offset:0},{kind:'thorns',x:2080,y:677,w:130,h:28}]},
 {platforms:[g(0,610),g(1050,400),g(1910,490),p(450,555,210),p(790,400,260,mover('x',790,90,5)),p(1200,520,220),p(1580,345,280,mover('y',345,70,6)),p(1980,530,240)],beacon:{x:1690,y:305},hazards:[{kind:'jet',x:1100,y:465,w:80,h:240,period:3.6,offset:0},{kind:'swing',x:1440,y:450,w:40,h:40,range:130,period:4.5},{kind:'thorns',x:2130,y:677,w:110,h:28}]}
] satisfies {platforms:{x:number;y:number;w:number;h:number;moving?:MovingPlatform}[];beacon:{x:number;y:number};hazards:Hazard[]}[];
