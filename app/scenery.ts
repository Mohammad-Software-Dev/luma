/** Authored depth compositions: landmarks frame the route; the central play space stays open. */
export type SceneryLandmark={kind:0|1|2;x:number;base:number;height:number;flip?:boolean};
export type SceneryPlan={far:SceneryLandmark[];middle:SceneryLandmark[];weather:'pollen'|'water'|'embers'|'leaves'|'spores'|'sun';ground:number;raised:number};
export const sceneryPlans:SceneryPlan[]=[
 {ground:0,raised:0,weather:'pollen',far:[{kind:0,x:460,base:800,height:470},{kind:0,x:2050,base:810,height:590}],middle:[{kind:0,x:-160,base:865,height:760},{kind:0,x:1990,base:865,height:680,flip:true}]},
 {ground:2,raised:2,weather:'water',far:[{kind:1,x:220,base:815,height:420},{kind:1,x:1810,base:825,height:560}],middle:[{kind:0,x:-250,base:855,height:670},{kind:1,x:2050,base:835,height:610}]},
 {ground:3,raised:3,weather:'embers',far:[{kind:1,x:190,base:830,height:430},{kind:1,x:1890,base:850,height:530}],middle:[{kind:1,x:-70,base:865,height:640},{kind:1,x:2100,base:860,height:710,flip:true}]},
 {ground:1,raised:1,weather:'leaves',far:[{kind:0,x:350,base:870,height:520},{kind:0,x:2110,base:880,height:680}],middle:[{kind:0,x:-220,base:935,height:850},{kind:0,x:2240,base:930,height:790,flip:true}]},
 {ground:4,raised:4,weather:'spores',far:[{kind:2,x:160,base:825,height:390},{kind:1,x:1970,base:835,height:510}],middle:[{kind:2,x:-100,base:860,height:560},{kind:2,x:2190,base:860,height:630,flip:true}]},
 {ground:5,raised:5,weather:'sun',far:[{kind:1,x:300,base:825,height:480},{kind:1,x:2100,base:825,height:570,flip:true}],middle:[{kind:1,x:-70,base:860,height:720},{kind:1,x:2140,base:860,height:720,flip:true}]},
];
export function roomComposition(stage:number,part:number){
 const plan=sceneryPlans[stage];
 // Arenas have a balanced proscenium; traversal rooms leave a wider central sightline.
 const shift=part===1?160:part===3?90:0;
 return {...plan,middle:plan.middle.map((p,i)=>({...p,x:p.x+(i===0?-shift:shift)}))};
}
