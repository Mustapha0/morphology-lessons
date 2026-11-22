/* Shared engine for the Understanding Morphology lessons. Chapters call Lesson.start({label, sections}). */
(()=>{
'use strict';
/* ---------- helpers ---------- */
const el=(tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;};
const seg=s=>(window.Intl&&Intl.Segmenter)?Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(s),x=>x.segment):Array.from(s);
const T=(s,p,k='stem',x={})=>seg(s).map((c,i)=>({id:p+i,t:c,k,...x}));
const tl=(id,t,k='stem',w=1,x={})=>({id,t,k,w,...x});
const R=(tiles,label,br)=>({tiles,label,br});
const S=(...rows)=>({rows});
const chg=(tiles,map,k='mod')=>tiles.map((t,i)=>(i in map)?{...t,t:map[i],k}:t);
const mark=(tiles,idx,k='mod')=>tiles.map((t,i)=>idx.includes(i)?{...t,k}:t);
const strip=h=>h.replace(/<[^>]+>/g,'').replace(/&amp;/g,'and').replace(/⇔/g,' corresponds to ').replace(/→/g,' becomes ').replace(/\s+/g,' ').trim();
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};

/* ---------- Stage: animated tiles ---------- */
class Stage{
  constructor(host){this.host=host;this.layer=el('div','layer');host.appendChild(this.layer);
    this.nodes=new Map();this.pos=new Map();this.labs=[];this.brs=new Map();this.last=null;}
  set(spec){
    this.last=spec;
    const W=this.host.clientWidth||320,GAP=4,PAD=14,rows=spec.rows;
    let TW=40;
    rows.forEach(r=>{const sw=r.tiles.reduce((a,t)=>a+(t.w??1),0);const n=r.tiles.length;
      TW=Math.min(TW,(W-2*PAD-GAP*Math.max(0,n-1))/Math.max(sw,1));});
    TW=Math.max(16,TW);const TH=Math.round(TW*1.22);
    let y=PAD;const seen=new Set(),seenBr=new Set(),newPos=new Map();
    rows.forEach((r,ri)=>{
      const labH=r.label?22:0;
      const maxLvl=r.br&&r.br.length?Math.max(...r.br.map(b=>b.lvl||1)):0;
      const brH=maxLvl?maxLvl*14+24:0;
      const sw=r.tiles.reduce((a,t)=>a+(t.w??1),0)*TW+GAP*Math.max(0,r.tiles.length-1);
      let x=Math.round((W-sw)/2);const ty=y+labH+brH;
      let lab=this.labs[ri];
      if(r.label){if(!lab){lab=el('div','lab');lab.style.opacity=0;this.layer.appendChild(lab);this.labs[ri]=lab;lab.style.transform=`translateY(${y}px)`;lab.getBoundingClientRect();}
        lab.textContent=r.label;lab.style.transform=`translateY(${y}px)`;lab.style.opacity=1;}
      else if(lab){lab.style.opacity=0;}
      const xs=[];
      r.tiles.forEach(t=>{const w=(t.w??1)*TW;xs.push([x,w]);newPos.set(t.id,{x,y:ty,w,h:TH});
        this.place(t,x,ty,w,TH,TW);seen.add(t.id);x+=w+GAP;});
      (r.br||[]).forEach(b=>{
        const x0=xs[b.from][0],x1=xs[b.to][0]+xs[b.to][1],lv=b.lvl||1;
        let n=this.brs.get(b.id);
        if(!n){n=el('div','br','<span></span>');n.style.opacity=0;this.layer.appendChild(n);this.brs.set(b.id,n);
          n.style.width=(x1-x0)+'px';n.style.transform=`translate(${x0}px,${ty-6-lv*14}px)`;n.getBoundingClientRect();}
        n.firstChild.textContent=b.label||'';n.style.width=(x1-x0)+'px';
        n.style.transform=`translate(${x0}px,${ty-6-lv*14}px)`;n.style.opacity=.75;seenBr.add(b.id);
      });
      y=ty+TH+16;
    });
    for(let i=rows.length;i<this.labs.length;i++){if(this.labs[i])this.labs[i].style.opacity=0;}
    this.nodes.forEach((n,id)=>{if(!seen.has(id)){this.nodes.delete(id);n.style.opacity=0;
      const m=/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(n.style.transform);
      if(m)n.style.transform=`translate(${m[1]}px,${(+m[2])+10}px) scale(.6)`;setTimeout(()=>n.remove(),600);}});
    this.brs.forEach((n,id)=>{if(!seenBr.has(id)){n.style.opacity=0;}});
    this.pos=newPos;
    this.host.style.height=Math.max(150,y)+'px';
  }
  place(t,x,y,w,h,TW){
    let n=this.nodes.get(t.id);
    const fs=Math.max(9,Math.min(TW*0.62,(w-8)/(Math.max(1,t.t.length)*0.56)));
    if(!n){
      n=el('div','tile k-'+t.k);n.appendChild(el('span','in'));this.layer.appendChild(n);
      n.style.width=w+'px';n.style.height=h+'px';
      let sx=x,sy=y,sc=.6,op=0;const f=t.from&&this.pos.get(t.from);
      if(f){sx=f.x+(f.w-w)/2;sy=f.y;sc=1;op=.9;}
      else if(t.enter==='right'){sx=x+80;sc=1}else if(t.enter==='left'){sx=x-80;sc=1}
      else if(t.enter==='top'){sy=y-50;sc=1}else if(t.enter==='bottom'){sy=y+50;sc=1}
      n.style.transform=`translate(${sx}px,${sy}px) scale(${sc})`;n.style.opacity=op;
      n.style.fontSize=fs+'px';n._t=t.t;n._k=t.k;n.firstChild.textContent=t.t;
      n.getBoundingClientRect();this.nodes.set(t.id,n);
    }else if(n._t!==t.t||n._k!==t.k){
      if(n.firstChild.animate)n.firstChild.animate([{transform:'scale(1.4)'},{transform:'scale(1)'}],{duration:450,easing:'ease-out'});
      n.firstChild.textContent=t.t;n._t=t.t;n._k=t.k;
    }
    n.className='tile k-'+t.k;n.style.fontSize=fs+'px';
    n.style.width=w+'px';n.style.height=h+'px';
    n.style.transform=`translate(${x}px,${y}px)`;n.style.opacity=1;
    let sb=n.querySelector('.sub');
    if(t.sub){if(!sb){sb=el('span','sub');n.appendChild(sb);}sb.textContent=t.sub;}else if(sb)sb.remove();
  }
}
let mainStage=null;
window.addEventListener('resize',()=>{if(mainStage&&mainStage.last&&!$('#stageHost').hidden)mainStage.set(mainStage.last);});
const $=s=>document.querySelector(s);

const app={sec:0,step:0,playing:false,speed:1,narrate:false,timer:null,score:{}};
const speechOK='speechSynthesis' in window&&typeof SpeechSynthesisUtterance!=='undefined';

/* ---------- Shared widgets ---------- */
function quizWidget(box,qs){
  let i=0;const wrap=el('div','quiz');box.appendChild(wrap);
  function draw(){
    wrap.innerHTML='';
    if(i>=qs.length){const n=qs.filter(q=>app.score[q.id]).length;
      wrap.append(el('p','res '+(n===qs.length?'good':''),`You got <b>${n} of ${qs.length}</b> on the first try.`));return;}
    const q=qs[i];
    wrap.append(el('p','qn',`Question ${i+1} of ${qs.length}`),el('p','qq',q.q));
    const list=el('div','opts');const order=shuffle(q.o.map((_,k)=>k));let answered=false;
    const fb=el('p','fb');fb.hidden=true;
    const nb=el('button','btn',i<qs.length-1?'Next question':'See result');nb.hidden=true;
    nb.onclick=()=>{i++;draw();};
    order.forEach(k=>{const b=el('button','opt',q.o[k]);
      b.onclick=()=>{if(answered)return;answered=true;const ok=k===q.a;
        if(!(q.id in app.score))app.score[q.id]=ok;
        b.classList.add(ok?'right':'wrong');
        if(!ok)[...list.children].forEach((c,j)=>{if(order[j]===q.a)c.classList.add('right');});
        fb.innerHTML=(ok?'<b>Yes.</b> ':'<b>Not quite.</b> ')+q.w;fb.hidden=false;nb.hidden=false;};
      list.append(b);});
    wrap.append(list,fb,nb);
  }
  draw();
}
function labWidget(box,examples,applyL='Apply the rule',undoL='Undo'){
  const chips=el('div','chips');const host=el('div','stage');const gl=el('p','gl');const res=el('div','res');
  const btn=el('button','btn',applyL);
  box.append(chips,host,gl,res,btn);
  const st=new Stage(host);let cur=null,applied=false,tm=null;
  const chipEls=examples.map((ex,i)=>{const c=el('button','chip',ex.name);c.onclick=()=>pick(i);chips.append(c);return c;});
  function show(on){applied=on;st.set(on?cur.b:cur.a);btn.textContent=on?undoL:applyL;}
  function pick(i){
    clearTimeout(tm);cur=examples[i];chipEls.forEach((c,j)=>{c.classList.toggle('on',j===i);});chipEls[i].classList.add('done');
    gl.textContent=cur.lang;res.innerHTML=cur.desc;
    show(false);tm=setTimeout(()=>show(true),950);
  }
  btn.onclick=()=>{clearTimeout(tm);show(!applied);};
  requestAnimationFrame(()=>pick(0));
}

/* Three-way sorter */
function sort3Widget(box,items,labels){
  let i=0,right=0;const wrap=el('div');box.append(wrap);
  function draw(){
    wrap.innerHTML='';
    if(i>=items.length){wrap.append(el('p','res good',`Done: <b>${right} of ${items.length}</b> correct.`));
      const b=el('button','btn ghost','Try again');b.onclick=()=>{i=0;right=0;draw();};wrap.append(b);return;}
    const [w,k,why]=items[i];
    wrap.append(el('p','qn',`Word ${i+1} of ${items.length}`),el('p','qq',`<span style="font-family:var(--serif);font-size:24px">${w}</span>`));
    const fb=el('p','fb');fb.hidden=true;const nx=el('button','btn','Next');nx.hidden=true;nx.onclick=()=>{i++;draw();};
    const row=el('div','opts');let done=false;
    Object.entries(labels).forEach(([key,l])=>{const b=el('button','opt',l);
      b.onclick=()=>{if(done)return;done=true;const ok=key===k;if(ok)right++;b.classList.add(ok?'right':'wrong');
        if(!ok)[...row.children].forEach(c=>{if(c.textContent===labels[k])c.classList.add('right');});
        fb.innerHTML=(ok?'<b>Yes.</b> ':'<b>Not quite.</b> ')+why;fb.hidden=false;nx.hidden=false;};row.append(b);});
    wrap.append(row,fb,nx);
  }
  draw();
}



const SHELL=(cfg)=>`
<header>
  <a class="home" href="${cfg.home||'../index.html'}">‹ All chapters</a>
  <div class="bar" id="bar" role="tablist" aria-label="Sections"></div>
  <div class="head"><h1 id="title"></h1><button class="menu" id="menuBtn">Sections</button></div>
</header>
<main id="main">
  <div class="stage" id="stageHost" role="img" aria-label="Animated word diagram"></div>
  <div class="card" id="card" aria-live="polite"></div>
</main>
<footer>
  <button class="cb" id="prev" aria-label="Previous step">‹</button>
  <button class="cb main" id="play">▶ Play</button>
  <button class="cb" id="next" aria-label="Next step">›</button>
  <button class="cb" id="speed" aria-label="Speed">1×</button>
  <button class="cb" id="voice" aria-pressed="false" aria-label="Narration">🔊</button>
</footer>`;

function start(cfg){
  const SECTIONS=cfg.sections;
  document.title=cfg.label+' · Understanding Morphology';
  document.body.insertAdjacentHTML('afterbegin',SHELL(cfg));
  if(!speechOK)$('#voice').hidden=true;
/* ---------- Player ---------- */
const bar=$('#bar'),card=$('#card'),host=$('#stageHost');
mainStage=new Stage(host);
const segs=SECTIONS.map((s,i)=>{const b=el('button','seg','<i></i>');b.setAttribute('role','tab');b.setAttribute('aria-label',s.title);b.onclick=()=>go(i,0);bar.append(b);return b;});
const cur=()=>SECTIONS[app.sec].steps[app.step];
function cancelSpeech(){if(speechOK)speechSynthesis.cancel();}
function speak(text,done){
  if(!speechOK)return false;cancelSpeech();
  const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=Math.min(1.6,app.speed*0.95);
  if(done)u.onend=done;speechSynthesis.speak(u);return true;}
function updateChrome(){
  const s=SECTIONS[app.sec];
  $('#title').innerHTML=`${s.title}<small>${cfg.label} · step ${app.step+1} of ${s.steps.length}</small>`;
  segs.forEach((b,i)=>{b.classList.toggle('cur',i===app.sec);
    const n=SECTIONS[i].steps.length;const f=i<app.sec?1:(i===app.sec?(app.step+1)/n:0);b.firstChild.style.width=(f*100)+'%';});
  const first=app.sec===0&&app.step===0,last=app.sec===SECTIONS.length-1&&app.step===s.steps.length-1;
  $('#prev').disabled=first;$('#next').disabled=last;
}
function show(){
  clearTimeout(app.timer);cancelSpeech();
  const st=cur();card.innerHTML='';
  const capText=st.say||strip(st.cap||'');
  if(st.cap)card.append(el('p','',st.cap));
  if(st.type==='stage'){host.hidden=false;mainStage.set(st.spec);}
  else{host.hidden=true;const box=el('div','widget');card.append(box);
    if(st.type==='quiz')quizWidget(box,st.qs);else st.build(box);}
  updateChrome();$('#main').scrollTop=0;
  if(app.playing)schedule();else if(app.narrate)speak(capText);
}
function schedule(){
  clearTimeout(app.timer);const st=cur();
  if(st.type!=='stage'){setPlaying(false);if(app.narrate)speak(strip(st.cap||''));return;}
  const text=st.say||strip(st.cap);
  const est=Math.max(3300,text.split(/\s+/).length*380)/app.speed;
  let fired=false;const adv=()=>{if(fired)return;fired=true;clearTimeout(app.timer);if(app.playing)next();};
  if(app.narrate&&speechOK){speak(text,()=>setTimeout(adv,600));app.timer=setTimeout(adv,est*2+2500);}
  else app.timer=setTimeout(adv,est+900);
}
function go(s,t){app.sec=s;app.step=t;show();}
function next(){const s=SECTIONS[app.sec];
  if(app.step<s.steps.length-1)go(app.sec,app.step+1);
  else if(app.sec<SECTIONS.length-1)go(app.sec+1,0);else setPlaying(false);}
function prev(){if(app.step>0)go(app.sec,app.step-1);else if(app.sec>0)go(app.sec-1,SECTIONS[app.sec-1].steps.length-1);}
function setPlaying(p){app.playing=p;$('#play').textContent=p?'❚❚ Pause':'▶ Play';if(!p){clearTimeout(app.timer);if(speechOK&&!app.narrate)cancelSpeech();}}
$('#play').onclick=()=>{if(app.playing){setPlaying(false);cancelSpeech();}else{setPlaying(true);
  if(cur().type!=='stage'){next();}else schedule();}};
$('#next').onclick=()=>{next();};$('#prev').onclick=()=>{prev();};
const SPEEDS=[0.75,1,1.25,1.5];
$('#speed').onclick=()=>{app.speed=SPEEDS[(SPEEDS.indexOf(app.speed)+1)%SPEEDS.length];$('#speed').textContent=app.speed+'×';};
$('#voice').onclick=()=>{app.narrate=!app.narrate;$('#voice').setAttribute('aria-pressed',app.narrate);
  if(app.narrate)speak(strip(cur().cap||''));else cancelSpeech();};
$('#menuBtn').onclick=()=>{
  const sh=el('div','sheet'),inner=el('div');sh.append(inner);inner.append(el('h2','','Sections'));
  SECTIONS.forEach((s,i)=>{let n=0,g=0;s.steps.forEach(x=>{if(x.type==='quiz')x.qs.forEach(q=>{n++;if(app.score[q.id])g++;});});
    const b=el('button','mi'+(i===app.sec?' cur':''),`<span>${i+1}. ${s.title}</span><em>${n?g+'/'+n+' quiz':s.steps.length+' steps'}</em>`);
    b.onclick=()=>{sh.remove();setPlaying(false);go(i,0);};inner.append(b);});
  sh.onclick=e=>{if(e.target===sh)sh.remove();};document.body.append(sh);};
document.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;if(e.key==='ArrowRight')next();else if(e.key==='ArrowLeft')prev();});
requestAnimationFrame(()=>show());

}
window.Lesson={el,seg,T,tl,R,S,chg,mark,strip,shuffle,Stage,app,quizWidget,labWidget,sort3Widget,start};
})();
