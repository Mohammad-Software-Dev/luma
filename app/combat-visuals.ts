import { creatureFrames, bossFrames } from './art-atlas';

/** One clock drives the painted pose, blade trail, and damage window. */
export const strikeTiming = { duration: .29, anticipation: .045, activeEnd: .205, cooldown: .29 };
export function strikeActive(remaining: number) {
  const elapsed = strikeTiming.duration - remaining;
  return remaining > 0 && elapsed >= strikeTiming.anticipation && elapsed <= strikeTiming.activeEnd;
}
export function strikeFrame(remaining: number) {
  const elapsed = strikeTiming.duration - remaining;
  return elapsed < strikeTiming.anticipation ? 0 : elapsed < .105 ? 1 : elapsed < .205 ? 2 : 3;
}
type Creature = { x:number;y:number;kind:string;boss?:number;hp:number;hit:number;phase:number;mode:string;timer:number;windup:number;direction:number;defeat:number;pattern?:string };
type Hero = {x:number;y:number;vx:number;vy:number;face:number;grounded:boolean};
type Impact = {x:number;y:number;life:number;max:number;kind:'hit'|'guard'|'parry'|'land'|'cast'|'awake';power:number;angle:number};
type Ghost = {x:number;y:number;face:number;life:number};
type Frame = readonly [number,number,number,number,number,number];
const clamp = (n:number,min=0,max=1)=>Math.max(min,Math.min(max,n));

export class CombatVisuals {
  private combat = new Image();
  private movement = new Image();
  private creatures = new Image();
  private bosses = new Image();
  private effects = new Image();
  private tints = new Map<string,HTMLCanvasElement>();
  private impacts: Impact[] = [];
  private ghosts: Ghost[] = [];
  private trailClock = 0;
  readonly ready: Promise<void>;
  constructor() {
    this.ready = Promise.all([
      this.load(this.combat,'luma-combat'), this.load(this.movement,'luma-movement'),
      this.load(this.creatures,'creatures'), this.load(this.bosses,'bosses'), this.load(this.effects,'effects'),
    ]).then(()=>{});
  }
  private load(image:HTMLImageElement,name:string) {
    return new Promise<void>(resolve=>{image.onload=()=>resolve();image.onerror=()=>resolve();image.src=`/art/${name}.webp`;});
  }
  reset(){this.impacts=[];this.ghosts=[];this.trailClock=0;}
  emit(kind:Impact['kind'],x:number,y:number,power=1,angle=0){
    const max=kind==='awake'?.7:kind==='land'?.36:.28;
    this.impacts.push({kind,x,y,power,angle,max,life:max});
    if(this.impacts.length>32)this.impacts.shift();
  }
  update(dt:number,p:Hero,dashing:boolean,reduced:boolean){
    this.impacts=this.impacts.filter(q=>(q.life-=dt)>0);
    this.ghosts=reduced?[]:this.ghosts.filter(q=>(q.life-=dt)>0);
    this.trailClock-=dt;
    if(dashing&&!reduced&&this.trailClock<=0){this.ghosts.push({x:p.x,y:p.y,face:p.face,life:.18});this.trailClock=.035;if(this.ghosts.length>6)this.ghosts.shift();}
  }
  private texture(c:CanvasRenderingContext2D,index:number,x:number,y:number,w:number,h:number,angle=0,alpha=1,color='#ffe0a0'){
    if(!this.effects.naturalWidth)return;
    let atlas=this.tints.get(color);
    if(!atlas){
      atlas=document.createElement('canvas');atlas.width=1024;atlas.height=512;
      const a=atlas.getContext('2d')!;a.drawImage(this.effects,0,0,1024,512);a.globalCompositeOperation='source-in';
      const g=a.createLinearGradient(0,0,0,512);g.addColorStop(0,'#ffffff');g.addColorStop(1,color);a.fillStyle=g;a.fillRect(0,0,1024,512);this.tints.set(color,atlas);
    }
    c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha*=clamp(alpha);c.drawImage(atlas,(index%4)*256,Math.floor(index/4)*256,256,256,-w/2,-h/2,w,h);c.restore();
  }
  private frame(c:CanvasRenderingContext2D,image:HTMLImageElement,frame:Frame,scale:number){
    const [x,y,w,h,px,py]=frame;c.drawImage(image,x,y,w,h,-px*scale,-py*scale,w*scale,h*scale);
  }
  hero(c:CanvasRenderingContext2D,p:Hero,attack:number,combo:number,dash:boolean,t:number,reduced:boolean):boolean{
    const moving=p.grounded&&Math.abs(p.vx)>40;
    if(attack>0&&this.combat.naturalWidth){
      const col=strikeFrame(attack),row=clamp(combo-1,0,2),sourceY=[0,338,673][row],height=[338,335,351][row];
      // Foot registration keeps the body planted while shoulders and arms swing.
      const pivotX=[[232,230,229,236],[230,232,232,238],[213,229,226,233]][row][col];
      c.drawImage(this.combat,col*384,sourceY,384,height,-pivotX*.31,-[325,321,306][row]*.31,384*.31,height*.31);
      return true;
    }
    if((dash||!p.grounded||!moving)&&this.movement.naturalWidth){
      const size=this.movement.naturalWidth/2;
      const pose=dash?3:!p.grounded?p.vy<0?1:2:0;
      const scale=pose===3?.185:.16;
      const pivotX=[400,408,389,391][pose]/627*size,pivotY=[614,598,575,465][pose]/627*size;
      const bob=pose===0&&!reduced?Math.sin(t*2.5)*1.2:0;
      c.drawImage(this.movement,(pose%2)*size,Math.floor(pose/2)*size,size,size,-pivotX*scale,-pivotY*scale+bob,size*scale,size*scale);
      return true;
    }
    return false;
  }
  trails(c:CanvasRenderingContext2D,reduced:boolean){
    if(reduced||!this.movement.naturalWidth)return;
    for(const q of this.ghosts){c.save();c.globalAlpha=.26*q.life/.18;c.translate(q.x,q.y);c.scale(q.face,1);this.hero(c,{...q,vx:0,vy:0,grounded:false},0,0,true,0,true);c.restore();}
  }
  slash(c:CanvasRenderingContext2D,p:Hero,remaining:number,combo:number,reduced:boolean){
    if(remaining<=0)return;
    const elapsed=strikeTiming.duration-remaining;
    c.save();c.translate(p.x,p.y-42);c.scale(p.face,1);
    if(elapsed<strikeTiming.anticipation){this.texture(c,6,24,-3,35,35,0,.65);c.restore();return;}
    const progress=clamp((elapsed-strikeTiming.anticipation)/.19),fade=Math.sin(progress*Math.PI);
    const angle=combo===2?1.1-progress*2.2:combo===3?-1.4+progress*2.5:-.65+progress*1.45;
    const reach=combo===3?150:135;
    // The front edge matches the existing melee reach; no screen-wide flashes.
    c.globalCompositeOperation='lighter';
    this.texture(c,combo===2?1:0,45,combo===3?-9:0,reach*1.35,combo===3?132:108,angle,fade*(reduced?.48:.82));
    c.strokeStyle='#fff7dc';c.lineCap='round';c.lineWidth=combo===3?3.5:2;c.globalAlpha=fade*.85;
    c.beginPath();c.ellipse(25,0,reach-27,combo===3?88:68,combo===2?-.4:.2,-1.1+progress*.35,1.1+progress*.35);c.stroke();
    if(!reduced)for(let i=0;i<5;i++){const a=angle+(i-2)*.17,r=reach*.64+i*4;this.texture(c,3,24+Math.cos(a)*r,Math.sin(a)*r,9,9,a,fade*.65);}
    c.restore();
  }
  enemy(c:CanvasRenderingContext2D,e:Creature,t:number,reduced:boolean):boolean{
    const boss=e.boss!==undefined,image=boss?this.bosses:this.creatures;
    if(!image.naturalWidth)return false;
    const windup=e.mode==='windup',attack=e.mode==='attack',recover=e.mode==='recover',alive=e.hp>0;
    const cycle=reduced?0:Math.sin(t*3+e.phase),progress=windup?clamp(1-e.timer/Math.max(.01,e.windup)):0;
    const y=e.y+(e.kind==='charger'&&!boss?12:cycle*3);
    c.save();c.translate(e.x,y);
    if(!alive){const fade=clamp(e.defeat/.65);c.globalAlpha=fade;if(!reduced){c.translate(0,-(1-fade)*20);c.scale(.8+fade*.2,.8+fade*.2);}}
    const facing=e.kind==='charger'||e.boss===0||e.boss===2?e.direction:1;c.scale(facing,1);
    const lean=windup?-.09*progress:attack?.08:recover?.035:0;
    c.rotate(lean);if(e.hit>0&&alive)c.filter=`brightness(${1+e.hit*1.7}) saturate(.8)`;
    if(boss){
      const f=bossFrames[e.boss!],[sx,sy,w,h]=f,scale=e.boss===3?.31:e.boss===5?.32:.3;
      const targetW=w*scale,targetH=h*scale;
      c.translate(0,attack&&e.pattern==='slam'?8:windup?-progress*4:0);
      c.scale(1+progress*.035,1-progress*.055);
      // Mesh-like strip deformation keeps the textured wing/body silhouettes alive.
      const winged=[1,3,4,5].includes(e.boss!),slices=winged&&!reduced?16:1;
      for(let i=0;i<slices;i++){
        const a=i/slices,b=(i+1)/slices,edge=Math.pow(Math.abs((a+b)/2-.5)*2,1.7);
        const bend=winged&&!reduced?Math.sin(t*(attack?12:4)+e.phase)*edge*(e.boss===3?9:5):0;
        c.drawImage(image,sx+w*a,sy,w/slices,h,-targetW/2+targetW*a,60-targetH+bend,targetW/slices+.25,targetH);
      }
      if(windup)this.texture(c,5,0,-9,90+progress*42,65+progress*32,t*.6,progress*.65,e.boss===1?'#9de8ff':e.boss===4?'#d1b6ff':'#ffe0a0');
      if(recover)this.texture(c,6,0,-5,38,38,0,.35,'#c6ffd8');
    }else{
      const row=e.kind==='drifter'?0:e.kind==='charger'?1:e.kind==='sentry'?2:3;
      const pose=row===0?(reduced?1:[0,1,2,1][Math.floor(t*8+e.phase)%4]):windup?1:attack||recover&&e.timer>1.8?2:recover?3:0;
      const scale=[.25,.26,.23,.3][row];
      // A small compression before a charge and leg-driven bounce during the run.
      if(row===1){c.translate(0,!reduced&&attack?Math.sin(t*35)*2:0);c.scale(1+progress*.04,1-progress*.08);}
      this.frame(c,image,creatureFrames[row*4+pose],scale);
      if(row===2&&windup)this.texture(c,6,10,-6,22+progress*40,22+progress*40,0,.8);
    }
    c.restore();return true;
  }
  projectile(c:CanvasRenderingContext2D,q:{x:number;y:number;vx:number;vy:number;radius:number},t:number){
    if(!this.effects.naturalWidth)return false;
    const angle=Math.atan2(q.vy,q.vx),size=q.radius*3;
    c.save();c.globalCompositeOperation='lighter';
    this.texture(c,2,q.x-Math.cos(angle)*14,q.y-Math.sin(angle)*14,size*2.2,size,angle,.7);
    this.texture(c,5,q.x,q.y,size,size,t*3,.65);
    this.texture(c,6,q.x,q.y,size*.9,size*.9,0,.85);
    c.restore();return true;
  }
  impactsDraw(c:CanvasRenderingContext2D,reduced:boolean){
    for(const q of this.impacts){
      const p=1-q.life/q.max,alpha=(1-p)*(reduced?.65:1),size=q.kind==='awake'?90:q.kind==='land'?40:35+q.power*14;
      const color=q.kind==='guard'?'#afdfff':q.kind==='parry'?'#bcffd6':'#ffe0a0';
      c.save();c.globalCompositeOperation=q.kind==='land'?'source-over':'lighter';
      if(q.kind==='land'){this.texture(c,4,q.x,q.y-6,55+p*35,20+p*14,q.angle,alpha*.38);}
      else{
        this.texture(c,q.kind==='cast'?5:q.kind==='awake'?7:3,q.x,q.y,size*(.65+p*.7),size*(.65+p*.7),q.angle,alpha,color);
        if(!reduced){
          c.strokeStyle=color;c.lineWidth=1.5;c.globalAlpha=alpha*.7;c.beginPath();c.arc(q.x,q.y,5+p*size*.75,0,Math.PI*2);c.stroke();
          for(let n=0;n<6;n++){const angle=q.angle+n*Math.PI/3+.2,len=(10+p*size*.8);c.beginPath();c.moveTo(q.x+Math.cos(angle)*len,q.y+Math.sin(angle)*len);c.lineTo(q.x+Math.cos(angle)*(len+8*(1-p)),q.y+Math.sin(angle)*(len+8*(1-p)));c.stroke();}
        }
      }
      c.restore();
    }
  }
  pillar(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,active:boolean,t:number,reduced:boolean){
    c.save();
    const g=c.createLinearGradient(x,y,x,y+h);g.addColorStop(0,'#ffd09100');g.addColorStop(.65,'#ffcb7377');g.addColorStop(1,'#fff1bdcc');
    if(active){c.fillStyle=g;c.fillRect(x-w/2,y,w,h);this.texture(c,5,x,y+h-12,w*1.5,40,t, .8);if(!reduced)for(let i=0;i<7;i++){const rise=((t*1.5+i*.13)%1);this.texture(c,6,x+Math.sin(i*8+t*2)*w*.35,y+h-rise*h,10,28,0,(1-rise)*.7);}}
    else{this.texture(c,7,x,y+h-8,w*1.3,24,0,.65);}
    c.restore();
  }
}
