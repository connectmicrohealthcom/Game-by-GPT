const canvas=document.getElementById('game');const ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);let W=innerWidth,H=innerHeight;function resize(){W=canvas.width=innerWidth;H=canvas.height=innerHeight}addEventListener('resize',resize);resize();

const keys={};addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase()))e.preventDefault();if(e.key.toLowerCase()==='e')interact();if(e.key==='Enter'&&state==='title')startGame()});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);

let state='title',last=0,shake=0,flash=1,objective='Find the emergency key.',messageTimer=0,messageText='';let audio=null;
const world={w:2600,h:1700};
const player={x:480,y:850,r:15,speed:185,run:1,dir:0};
const walls=[
{x:0,y:0,w:2600,h:55},{x:0,y:1645,w:2600,h:55},{x:0,y:0,w:55,h:1700},{x:2545,y:0,w:55,h:1700},
{x:55,y:55,w:2490,h:70},{x:55,y:1520,w:2490,h:125},
{x:55,y:55,w:125,h:500},{x:55,y:1050,w:125,h:470},{x:2420,y:55,w:125,h:610},{x:2420,y:940,w:125,h:580},
{x:650,y:55,w:80,h:410},{x:650,y:560,w:80,h:460},{x:650,y:1170,w:80,h:350},
{x:1260,y:55,w:80,h:610},{x:1260,y:790,w:80,h:730},
{x:1860,y:55,w:80,h:430},{x:1860,y:610,w:80,h:470},{x:1860,y:1210,w:80,h:310},
{x:730,y:560,w:530,h:70},{x:1340,y:560,w:520,h:70},{x:730,y:1080,w:530,h:70},{x:1340,y:1080,w:520,h:70},
{x:1820,y:610,w:40,h:400},{x:760,y:1150,w:470,h:35},{x:1380,y:1150,w:430,h:35}
];
const objects=[
{x:355,y:850,type:'elevator',label:'ELEVATOR',used:false},
{x:1030,y:310,type:'key',label:'EMERGENCY KEY',used:false},
{x:1070,y:890,type:'radio',label:'RADIO',used:false},
{x:1540,y:330,type:'note',label:'MAINTENANCE LOG',used:false},
{x:2110,y:830,type:'mirror',label:'MIRROR',used:false},
{x:2160,y:1320,type:'fuse',label:'FUSE BOX',used:false}
];
let enemy={active:false,x:2260,y:1340,r:19,speed:72,phase:0};let collected={key:false,fuse:false,radio:false,note:false};let anomaly=0;let particles=[];

function reset(){Object.assign(player,{x:480,y:850});enemy.active=false;enemy.x=2260;enemy.y=1340;flash=1;objective='Find the emergency key.';collected={key:false,fuse:false,radio:false,note:false};objects.forEach(o=>o.used=false);anomaly=0;particles=[]}
function startGame(){state='play';reset();document.querySelector('#start').classList.add('hidden');beep(90,.05);showMessage('The elevator doors close behind you.\nThere is no button for this floor.',5)}
$('startBtn').onclick=startGame;

function beep(freq,dur=.08,vol=.035,type='sine'){try{if(!audio)audio=new (window.AudioContext||window.webkitAudioContext)();let o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=freq;g.gain.value=vol;o.connect(g);g.connect(audio.destination);o.start();g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+dur);o.stop(audio.currentTime+dur)}catch{}}
function showMessage(t,time=3){messageText=t;messageTimer=time;$('message').innerHTML=t.replaceAll('\n','<br>');$('message').classList.remove('hidden');}
function objectiveText(t){objective=t;$('objective').textContent=t}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function blocked(x,y,r){for(const w of walls){const cx=Math.max(w.x,Math.min(x,w.x+w.w)),cy=Math.max(w.y,Math.min(y,w.y+w.h));if((x-cx)**2+(y-cy)**2<r*r)return true}return false}
function moveEntity(ent,dx,dy,r){let nx=ent.x+dx;if(!blocked(nx,ent.y,r))ent.x=nx;let ny=ent.y+dy;if(!blocked(ent.x,ny,r))ent.y=ny}
function camera(){return{x:Math.max(0,Math.min(world.w-W,player.x-W/2)),y:Math.max(0,Math.min(world.h-H,player.y-H/2))}}

function interact(){if(state!=='play')return;let target=objects.find(o=>dist(player,o)<58);if(!target){return}
if(target.type==='key'&&!collected.key){collected.key=true;target.used=true;objectiveText('The elevator needs power. Find the fuse box.');showMessage('The key is warm.\nSomeone was holding it recently.',4);beep(520,.12);burst(target.x,target.y,16)}
else if(target.type==='radio'&&!collected.radio){collected.radio=true;target.used=true;showMessage('RADIO // 03:19:42\n"...do not let it see you in the mirror.\nIf you hear your own footsteps, stop moving."',7);beep(230,.3,'',.03);}
else if(target.type==='note'&&!collected.note){collected.note=true;target.used=true;showMessage('MAINTENANCE LOG\n"Floor 14 was sealed after the night crew began reporting\nan extra person on the cameras. There are only six of us."',7);beep(310,.1)}
else if(target.type==='mirror'){if(collected.radio){showMessage('Your reflection moves a fraction too late.\nYou are no longer alone.',4);anomaly=3;shake=5}else showMessage('A black rectangle of glass.\nYou cannot see your face.',3);}
else if(target.type==='fuse'&&!collected.fuse&&collected.key){collected.fuse=true;target.used=true;enemy.active=true;objectiveText('The elevator is powered. Go back.');showMessage('POWER RESTORED.\nSomething just woke up.',4);beep(70,.45,'sawtooth',.04);shake=8;flash=.5}
else if(target.type==='elevator'&&collected.fuse){finish('escape')}else if(target.type==='elevator'&&!collected.fuse){showMessage('The elevator has no power.\nThe emergency key fits, but the panel is dead.',3)}
}

function burst(x,y,n){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*180,vy:(Math.random()-.5)*180,a:1})}
function update(dt){
let mx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),my=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);let l=Math.hypot(mx,my)||1;let run=keys.shift?1.65:1;moveEntity(player,mx/l*player.speed*run*dt,my/l*player.speed*run*dt,player.r);if(mx||my){player.dir=Math.atan2(my,mx);if(Math.random()<dt*5)beep(65+Math.random()*20,.025,.008,'square')}
flash=Math.max(.05,flash-dt*.004*(enemy.active?1.2:0));if(keys['f'])flash=Math.min(1,flash+dt*.45);
if(collected.key&&!enemy.active)anomaly+=dt;if(anomaly>12&&!enemy.active){enemy.active=true;objectiveText('Something is following you. Return to the elevator.');showMessage('You hear a door close somewhere behind you.',3);beep(42,.25,'sine',.04)}
if(enemy.active){enemy.phase+=dt;let d=dist(enemy,player);let s=enemy.speed+(d<350?38:0);if(d<900){let dx=(player.x-enemy.x)/(d||1),dy=(player.y-enemy.y)/(d||1);moveEntity(enemy,dx*s*dt,dy*s*dt,enemy.r);if(d<80){finish('caught');return}}if(Math.random()<dt*.8)burst(enemy.x+(Math.random()-.5)*20,enemy.y+(Math.random()-.5)*20,2)}
for(let i=particles.length-1;i>=0;i--){let p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.a-=dt*1.7;if(p.a<=0)particles.splice(i,1)}
if(messageTimer>0){messageTimer-=dt;if(messageTimer<=0)$('message').classList.add('hidden')}
if(shake>0)shake=Math.max(0,shake-dt*14);
$('batteryFill').style.width=Math.max(4,100-flash*0)+'%';$('batteryText').textContent=flash>0.65?'100%':flash>0.3?'LOW':'CRITICAL';
}

function finish(kind){state='end';document.querySelector('#end').classList.remove('hidden');let end=$('end');if(kind==='caught'){end.innerHTML='<div class="eyebrow">03:21 AM // INCIDENT REPORT</div><h1>YOU WERE<br><em>SEEN.</em></h1><p>The last camera recording contains two shadows.<br>Only one belongs to you.</p><button onclick="location.reload()">TRY AGAIN</button>'}else{end.innerHTML='<div class="eyebrow">03:22 AM // FLOOR 14</div><h1>YOU<br><em>ESCAPED.</em></h1><p>The elevator opens onto the lobby.<br>When the doors close, the display reads <b>14</b>.</p><button onclick="location.reload()">RETURN TO THE FLOOR</button>'}beep(kind==='caught'?48:880,.5, .05,kind==='caught'?'sawtooth':'sine')}

function draw(){ctx.clearRect(0,0,W,H);if(state==='title')return;let c=camera(),sx=(Math.random()-.5)*shake,sy=(Math.random()-.5)*shake;ctx.save();ctx.translate(-c.x+sx,-c.y+sy);drawWorld();drawObjects();drawEnemy();drawPlayer();drawParticles();ctx.restore();drawLight(c)}
function drawWorld(){ctx.fillStyle='#090b0b';ctx.fillRect(0,0,world.w,world.h);ctx.fillStyle='#101311';ctx.fillRect(55,55,2490,1590);ctx.strokeStyle='#171a17';ctx.lineWidth=2;for(let x=180;x<2420;x+=120){ctx.beginPath();ctx.moveTo(x,125);ctx.lineTo(x,1520);ctx.stroke()}for(let y=180;y<1520;y+=120){ctx.beginPath();ctx.moveTo(180,y);ctx.lineTo(2420,y);ctx.stroke()}ctx.fillStyle='#070807';walls.forEach(w=>{ctx.fillRect(w.x,w.y,w.w,w.h);ctx.strokeStyle='#252822';ctx.strokeRect(w.x+.5,w.y+.5,w.w-1,w.h-1)});
ctx.fillStyle='#1b1d1a';ctx.font='12px DM Mono,monospace';ctx.fillText('SERVICE CORRIDOR',830,520);ctx.fillText('MAINTENANCE',1430,520);ctx.fillText('14',1240,805);ctx.fillText('14',1345,805);ctx.fillStyle='#242720';ctx.fillRect(245,790,170,120);ctx.fillStyle='#0a0b0a';ctx.fillRect(260,805,140,90);ctx.fillStyle='#373a32';ctx.fillRect(242,785,176,5)}
function drawObjects(){for(const o of objects){let active=!o.used;ctx.save();ctx.translate(o.x,o.y);if(o.type==='elevator'){ctx.strokeStyle='#74766d';ctx.strokeRect(-45,-65,90,130);ctx.fillStyle='#161916';ctx.fillRect(-40,-60,80,120);ctx.fillStyle='#60635a';ctx.fillRect(-2,-54,4,108);ctx.fillStyle=collected.fuse?'#a7a58e':'#373a33';ctx.fillRect(35,-15,5,12)}else if(o.type==='key'){if(active){ctx.rotate(.5);ctx.strokeStyle='#c7c1a0';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-12,0);ctx.lineTo(14,0);ctx.stroke();ctx.beginPath();ctx.arc(-14,0,7,0,7);ctx.stroke();ctx.fillRect(9,0,4,10);ctx.fillRect(2,0,4,7)}}else if(o.type==='radio'){ctx.fillStyle='#373b35';ctx.fillRect(-25,-18,50,36);ctx.fillStyle='#77796e';ctx.fillRect(-18,-10,26,4);ctx.fillRect(14,-10,5,18)}else if(o.type==='note'){ctx.fillStyle='#8b8979';ctx.fillRect(-20,-25,40,50);ctx.strokeStyle='#35372f';ctx.strokeRect(-20,-25,40,50)}else if(o.type==='mirror'){ctx.fillStyle='#111514';ctx.strokeStyle='#696b61';ctx.lineWidth=4;ctx.fillRect(-38,-60,76,120);ctx.strokeRect(-38,-60,76,120);ctx.fillStyle='rgba(100,110,104,.1)';ctx.fillRect(-32,-54,64,108)}else if(o.type==='fuse'){ctx.fillStyle='#292c27';ctx.fillRect(-28,-25,56,50);ctx.fillStyle='#5f6257';ctx.fillRect(-15,-8,30,16);if(!collected.fuse){ctx.strokeStyle='#b5b19c';ctx.strokeRect(-8,-5,16,10)}}if(active&&dist(player,o)<85){ctx.fillStyle='#bdb9a7';ctx.font='10px DM Mono,monospace';ctx.textAlign='center';ctx.fillText(o.label,0,82)}ctx.restore()}}
function drawEnemy(){if(!enemy.active)return;let pulse=1+Math.sin(enemy.phase*5)*.1;ctx.save();ctx.translate(enemy.x,enemy.y);ctx.globalAlpha=.78;ctx.fillStyle='#020303';ctx.beginPath();ctx.arc(0,0,enemy.r*pulse,0,7);ctx.fill();ctx.fillStyle='#c7c5b3';ctx.globalAlpha=.25;ctx.fillRect(-8,-4,4,3);ctx.fillRect(5,-4,4,3);ctx.restore()}
function drawPlayer(){ctx.save();ctx.translate(player.x,player.y);ctx.rotate(player.dir);ctx.fillStyle='#d4d1c3';ctx.beginPath();ctx.arc(0,0,player.r,0,7);ctx.fill();ctx.fillStyle='#85877d';ctx.fillRect(4,-3,12,6);ctx.restore()}
function drawParticles(){for(const p of particles){ctx.globalAlpha=p.a;ctx.fillStyle='#b7b29b';ctx.fillRect(p.x,p.y,2,2)}ctx.globalAlpha=1}
function drawLight(c){let px=player.x-c.x,py=player.y-c.y;let g=ctx.createRadialGradient(px,py,20,px,py,260+flash*120);g.addColorStop(0,'rgba(215,212,190,.14)');g.addColorStop(.3,'rgba(180,180,160,.07)');g.addColorStop(1,'rgba(0,0,0,.82)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.fillStyle='rgba(0,0,0,.34)';ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation='destination-out';let glow=ctx.createRadialGradient(px,py,5,px,py,210+flash*100);glow.addColorStop(0,'rgba(0,0,0,.92)');glow.addColorStop(.65,'rgba(0,0,0,.38)');glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(px,py,330,0,7);ctx.fill();ctx.globalCompositeOperation='source-over';if(enemy.active&&dist(player,enemy)<480){ctx.fillStyle=`rgba(125,25,18,${Math.max(0,(480-dist(player,enemy))/1000)})`;ctx.fillRect(0,0,W,H)}}
function loop(t){let dt=Math.min(.035,(t-last)/1000||0);last=t;if(state==='play')update(dt);draw();requestAnimationFrame(loop)}requestAnimationFrame(loop);
