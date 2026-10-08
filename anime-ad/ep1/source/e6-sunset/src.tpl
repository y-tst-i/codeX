<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>e6-sunset</title>
    <script src="assets/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #1d1647; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; background: #1d1647;
        font-family: "Noto Sans JP", sans-serif; }
      .layer { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; will-change: transform; }
      .abs { position: absolute; left: 0; top: 0; }
      svg { overflow: visible; display: block; }
      #sky { position: absolute; left: -200px; top: -1400px; width: 2320px; height: 2300px;
        background: linear-gradient(180deg,
          #1d1647 0%, #2e2062 18%, #4a2c7c 32%, #6b3f8f 44%, #8f4d97 53%, #b85a9d 61%,
          #e4739a 69%, #ff8f86 76%, #ffa97c 83%, #ffc785 89%, #ffe0a6 94%, #ffecbd 100%); }
      .glowdiv { position: absolute; border-radius: 50%; }
      #sunglow { left: -120px; top: -380px; width: 2800px; height: 2800px;
        background: radial-gradient(circle at 50% 50%, rgba(255,236,170,.95) 0%, rgba(255,214,140,.55) 5%, rgba(255,170,110,.28) 14%, rgba(255,120,120,.10) 30%, rgba(255,120,140,0) 52%); }
      #sundisc { left: 1160px; top: 480px; width: 240px; height: 240px;
        background: radial-gradient(circle, #fffbe6 0%, #fff0b8 55%, #ffd98a 100%); box-shadow: 0 0 120px 60px rgba(255,224,150,.6); }
      #bloom { position: absolute; left: 280px; top: -300px; width: 2000px; height: 1800px; border-radius: 50%;
        background: radial-gradient(circle, rgba(255,190,110,.34) 0%, rgba(255,150,110,.16) 35%, rgba(255,120,120,0) 70%);
        mix-blend-mode: screen; }
      .sub { position: absolute; left: 210px; top: 930px; width: 1500px; height: 80px; display: flex;
        align-items: center; justify-content: center; text-align: center; opacity: 0; white-space: nowrap;
        font-family: "Noto Sans JP", sans-serif; font-weight: 700; font-size: 48px; line-height: 1.2; color: #fffdf5;
        text-shadow: __RING__; }
      #fontpre { position: absolute; left: 0; top: 0; opacity: 0; font-family: "Noto Sans JP", sans-serif; font-weight: 700; font-size: 48px; pointer-events: none; }
      #vignette { position: absolute; inset: 0; pointer-events: none;
        background: radial-gradient(ellipse 75% 70% at 52% 48%, rgba(20,8,40,0) 55%, rgba(24,10,44,.46) 100%); }
      #grade { position: absolute; inset: 0; pointer-events: none; mix-blend-mode: soft-light; opacity: .55;
        background: linear-gradient(180deg, rgba(120,70,170,.55) 0%, rgba(255,150,120,.2) 55%, rgba(255,190,110,.35) 100%); }
      #grain { position: absolute; inset: 0; pointer-events: none; mix-blend-mode: overlay; opacity: .22; }
      .char { position: absolute; left: 0; top: 0; width: 520px; height: 900px; }
      .char svg { width: 520px; height: 900px; }
      #leon svg { filter: sepia(.28) saturate(1.15) brightness(.8) contrast(1.05); }
      .dust { position: absolute; width: 90px; height: 90px; border-radius: 50%; opacity: 0;
        background: radial-gradient(circle, rgba(236,190,150,.62) 0%, rgba(210,150,130,.34) 50%, rgba(200,140,130,0) 72%); }
      .spark { position: absolute; width: 14px; height: 14px; border-radius: 50%; opacity: 0;
        background: radial-gradient(circle, #fffbe0 0%, #ffd76a 50%, rgba(255,200,90,0) 75%); }
      #ring { position: absolute; width: 120px; height: 120px; border-radius: 50%; border: 4px solid #ffe9a0; opacity: 0;
        box-shadow: 0 0 24px 6px rgba(255,220,130,.8), inset 0 0 20px 4px rgba(255,220,130,.6); }
      #flash { position: absolute; width: 260px; height: 260px; border-radius: 50%; opacity: 0;
        background: radial-gradient(circle, rgba(255,255,230,.95) 0%, rgba(255,226,140,.6) 35%, rgba(255,210,120,0) 70%); }
      #herbglow { position: absolute; width: 260px; height: 260px; border-radius: 50%;
        background: radial-gradient(circle, rgba(190,255,150,.55) 0%, rgba(255,230,130,.30) 38%, rgba(255,210,120,0) 70%); }
      #fx { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="9" data-width="1920" data-height="1080">

      <!-- SKY (painted gradient + sun) -->
      <div class="layer" id="L-sky"><div id="sky"></div></div>
      <div class="layer" id="L-sun">
        <div class="glowdiv" id="sunglow" data-layout-allow-overflow></div>
        <div class="glowdiv" id="sundisc"></div>
      </div>
      <div class="layer" id="L-stars"><svg id="stars" width="1920" height="1080" viewBox="0 0 1920 1080"></svg></div>
      <!-- cloud bands -->
      <div class="layer" id="L-cloudHi"><svg id="cloudHi" width="1920" height="1080" viewBox="0 0 1920 1080"></svg></div>
      <div class="layer" id="L-cloudMid"><svg id="cloudMid" width="1920" height="1080" viewBox="0 0 1920 1080"></svg></div>
      <div class="layer" id="L-cloudLow"><svg id="cloudLow" width="1920" height="1080" viewBox="0 0 1920 1080"></svg></div>
      <div class="layer" id="L-birds"><svg id="birds" width="1920" height="1080" viewBox="0 0 1920 1080"></svg></div>
      <!-- ruins -->
      <div class="layer" id="L-far"><svg id="far" width="1920" height="1080" viewBox="0 0 1920 1080"></svg></div>
      <div class="layer" id="L-haze"><div class="abs" style="left:-100px;top:480px;width:2120px;height:520px;background:linear-gradient(180deg,rgba(255,170,140,0) 0%,rgba(255,176,140,.42) 55%,rgba(240,150,150,.5) 100%);"></div></div>
      <div class="layer" id="L-bloom"><div id="bloom"></div></div>
      <div class="layer" id="L-mid"><svg id="mid" width="1920" height="1080" viewBox="0 0 1920 1080"></svg></div>
      <div class="layer" id="L-low"><svg id="low" width="1920" height="1080" viewBox="0 0 1920 1080"></svg></div>
      <!-- ground -->
      <div class="layer" id="L-ground">
        <svg id="gBack" class="abs" width="1920" height="1080" viewBox="0 0 1920 1080"></svg>
        <div class="char" id="leon"><!--LEON--></div>
        <svg id="gBlocks" class="abs" width="1920" height="1080" viewBox="0 0 1920 1080"></svg>
        <svg id="hand" class="abs" width="63" height="70" viewBox="0 0 90 100" style="left:1462px;top:768px"></svg>
        <div id="akWrap" class="abs" style="width:520px;height:900px">
          <svg id="akShadow" class="abs" width="520" height="100" viewBox="0 0 520 100" style="top:830px"></svg>
          <div class="char" id="akBody"><!--HERO--></div>
        </div>
        <div id="herbglow" style="left:610px;top:790px"></div>
        <svg id="herbG" class="abs" width="200" height="200" viewBox="0 0 200 200" style="left:640px;top:830px"></svg>
        <svg id="gFront" class="abs" width="1920" height="1080" viewBox="0 0 1920 1080"></svg>
        <div id="fx">
          <div class="dust" id="d1"></div><div class="dust" id="d2"></div><div class="dust" id="d3"></div>
          <div class="dust" id="d4"></div><div class="dust" id="d5"></div><div class="dust" id="d6"></div>
          <div id="flash"></div><div id="ring"></div>
          <div class="spark"></div><div class="spark"></div><div class="spark"></div><div class="spark"></div>
          <div class="spark"></div><div class="spark"></div><div class="spark"></div><div class="spark"></div>
          <div class="spark"></div><div class="spark"></div><div class="spark"></div><div class="spark"></div>
        </div>
      </div>
            <canvas id="ff" class="abs" width="1920" height="1080"></canvas>
      <!-- foreground (fast parallax) -->
      <div class="layer" id="L-fg"><svg id="fg" width="1920" height="1080" viewBox="0 0 1920 1080"></svg></div>

      <div id="grade"></div>
      <svg id="grain" width="1920" height="1080" viewBox="0 0 1920 1080">
        <filter id="fgrain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9 0.55" numOctaves="2" seed="7" result="n"/>
          <feColorMatrix type="saturate" values="0"/>
        </filter>
        <rect width="1920" height="1080" filter="url(#fgrain)"/>
      </svg>
      <div id="vignette"></div>

      <div class="sub" id="sub1">あった！ 薬草！</div>
      <div class="sub" id="sub2">あいつは……何者だ……。</div>
      <div id="fontpre">あった！ 薬草！あいつは……何者だ……。</div>

      <!-- defs shared -->
      <svg width="0" height="0" style="position:absolute">
        <defs>
          <filter id="paint" x="-10%" y="-40%" width="120%" height="180%">
            <feTurbulence type="fractalNoise" baseFrequency="0.006 0.03" numOctaves="3" seed="3" result="t"/>
            <feDisplacementMap in="SourceGraphic" in2="t" scale="34" xChannelSelector="R" yChannelSelector="G" result="d"/>
            <feGaussianBlur in="d" stdDeviation="3 1.2"/>
          </filter>
          <filter id="paintHi" x="-10%" y="-40%" width="120%" height="180%">
            <feTurbulence type="fractalNoise" baseFrequency="0.005 0.025" numOctaves="3" seed="11" result="t"/>
            <feDisplacementMap in="SourceGraphic" in2="t" scale="40" xChannelSelector="R" yChannelSelector="G" result="d"/>
            <feGaussianBlur in="d" stdDeviation="5 2"/>
          </filter>
          <filter id="soft"><feGaussianBlur stdDeviation="5"/></filter>
          <filter id="softfg"><feGaussianBlur stdDeviation="3.5"/></filter>
          <linearGradient id="cgA" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#9a64b0"/><stop offset=".45" stop-color="#f08aa6"/><stop offset=".8" stop-color="#ffb887"/><stop offset="1" stop-color="#ffe0a0"/>
          </linearGradient>
          <linearGradient id="cgB" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#7d4ea4"/><stop offset=".5" stop-color="#d878a4"/><stop offset="1" stop-color="#ffa88a"/>
          </linearGradient>
          <linearGradient id="cgC" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#ff9a8a"/><stop offset=".6" stop-color="#ffc58a"/><stop offset="1" stop-color="#fff0b8"/>
          </linearGradient>
          <linearGradient id="farG" gradientUnits="userSpaceOnUse" x1="0" y1="300" x2="0" y2="660">
            <stop offset="0" stop-color="#92609a"/><stop offset="1" stop-color="#e79a8e"/>
          </linearGradient>
          <linearGradient id="midG" gradientUnits="userSpaceOnUse" x1="0" y1="380" x2="0" y2="960">
            <stop offset="0" stop-color="#54346a"/><stop offset=".55" stop-color="#7b4a79"/><stop offset=".7" stop-color="#96607f"/><stop offset="1" stop-color="#4a2f5e"/>
          </linearGradient>
          <linearGradient id="gndG" gradientUnits="userSpaceOnUse" x1="0" y1="900" x2="0" y2="1100">
            <stop offset="0" stop-color="#3a2849"/><stop offset="1" stop-color="#1c1230"/>
          </linearGradient>
          <linearGradient id="blkG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#4a3556"/><stop offset="1" stop-color="#26193a"/>
          </linearGradient>
          <pattern id="brick" width="46" height="22" patternUnits="userSpaceOnUse">
            <rect width="46" height="22" fill="none"/>
            <path d="M0 .5 H46 M0 11.5 H46 M12 0 V11 M34 11 V22" stroke="rgba(255,190,150,.16)" stroke-width="1.4" fill="none"/>
          </pattern>
        </defs>
      </svg>
    </div>

    <script>
      (function () {
        const W = 1920, H = 1080;
        function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
        const rr = (r,a,b)=>a+(b-a)*r();
        const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
        const sstep=(x)=>{x=clamp(x,0,1);return x*x*(3-2*x);};
        const $ = (id)=>document.getElementById(id);
        const f1 = (n)=>Math.round(n*10)/10;

        /* ---------- camera: crane up ---------- */
        function rise(t){
          const drift = 34*clamp(t/9,0,1);
          const u = clamp((t-5.6)/3.4,0,1);
          return drift + 690*(1-Math.cos(Math.PI*u))/2;
        }

        /* ---------- ruins generator ---------- */
        function ruins(seed,x0,x1,base,hMin,hMax,o){
          o=o||{};
          const r=mulberry32(seed); let x=x0; const top=[[x0-40,base]]; const holes=[]; const rim=[]; const vines=[];
          while(x<x1){
            const k=r();
            if(k<(o.pillar==null?.2:o.pillar)){
              const w=rr(r,34,64), h=rr(r,hMin,hMax)*rr(r,.85,1.15);
              top.push([x,base-hMin*.3],[x,base-h],[x+w*.4,base-h-rr(r,2,16)],[x+w,base-h+rr(r,12,46)],[x+w,base-hMin*.3]);
              rim.push([x,base-h],[x+w*.4,base-h-6],[x+w,base-h+20]);
              x+=w+rr(r,6,36);
            } else if(k<.34){
              const w=rr(r,90,210), n=Math.ceil(w/26);
              for(let i=0;i<=n;i++){const p=[x+i*w/n,base-rr(r,hMin*.1,hMin*.5)];top.push(p);rim.push(p);}
              x+=w;
            } else {
              const w=rr(r,130,320), h=rr(r,hMin*.75,hMax);
              const n=Math.ceil(w/rr(r,28,46)); let y=base-h*rr(r,.85,1); let maxY=0;
              const pts=[];
              for(let i=0;i<=n;i++){ y+=rr(r,-.2,.2)*h*.5; y=clamp(y,base-h*1.1,base-h*.45); pts.push([x+i*w/n,y]); maxY=Math.max(maxY,y);
                if(r()<.18 && i>0 && i<n){ pts.push([x+i*w/n+4,y+h*rr(r,.12,.3)]); } }
              pts.forEach(p=>{top.push(p);rim.push(p);});
              if(o.windows!==false && r()<.65 && base-maxY>130){
                const ww=rr(r,34,56), wh=rr(r,64,110), wx=x+w*rr(r,.18,.62), wy=maxY+rr(r,24,50);
                if(wy+wh<base-30){
                  const rad=ww/2;
                  holes.push(`M${f1(wx)} ${f1(wy+wh)} L${f1(wx)} ${f1(wy+rad)} A${f1(rad)} ${f1(rad)} 0 0 1 ${f1(wx+ww)} ${f1(wy+rad)} L${f1(wx+ww)} ${f1(wy+wh)} Z`);
                }
              }
              if(o.vines && r()<.7){ const p=pts[Math.floor(r()*pts.length)]; vines.push([p[0],p[1],rr(r,50,150)]); }
              x+=w;
            }
          }
          top.push([x1+40,base]);
          const d='M'+top.map(p=>f1(p[0])+' '+f1(p[1])).join(' L')+' Z '+holes.join(' ');
          const rimd='M'+rim.map(p=>f1(p[0])+' '+f1(p[1])).join(' L');
          return {d,rimd,vines};
        }
        function vineMarkup(v,r,col){
          let s='';
          v.forEach(([x,y,len])=>{
            const sway=rr(r,-14,14);
            s+=`<path d="M${f1(x)} ${f1(y)} q ${f1(sway)} ${f1(len*.5)} ${f1(sway*.5)} ${f1(len)}" stroke="${col}" stroke-width="${f1(rr(r,2,3.4))}" fill="none" stroke-linecap="round"/>`;
            for(let i=1;i<=5;i++){ const ly=y+len*i/6, lx=x+sway*.5*i/6*1.2; s+=`<ellipse cx="${f1(lx+rr(r,-6,6))}" cy="${f1(ly)}" rx="6" ry="3.2" fill="${col}" transform="rotate(${f1(rr(r,-50,50))} ${f1(lx)} ${f1(ly)})"/>`; }
          });
          return s;
        }

        /* far ruins: pale, hazy, with a broken castle on the horizon */
        (function(){
          const g=ruins(31,-80,2000,650,95,230,{pillar:.14});
          const castle = 'M1410 660 L1410 360 L1430 354 L1436 326 L1462 334 L1470 300 L1492 322 L1518 350 L1540 342 L1556 388 L1584 394 L1584 660 Z M1452 446 L1452 420 A16 16 0 0 1 1484 420 L1484 470 L1452 470 Z M1514 456 L1514 436 A13 13 0 0 1 1540 436 L1540 482 L1514 482 Z';
          const castle2 = 'M300 660 L300 430 L322 424 L330 398 L354 410 L366 440 L392 452 L392 660 Z M330 492 L330 470 A12 12 0 0 1 354 470 L354 520 L330 520 Z';
          $('far').innerHTML =
            `<path d="${g.d}" fill="url(#farG)" fill-rule="evenodd" opacity=".95"/>` +
            `<path d="${castle}" fill="url(#farG)" fill-rule="evenodd"/>` +
            `<path d="${castle2}" fill="url(#farG)" fill-rule="evenodd"/>` +
            `<path d="${g.rimd}" stroke="rgba(255,226,170,.55)" stroke-width="2" fill="none"/>` +
            `<path d="M1410 360 L1430 354 L1436 326 L1462 334 L1470 300 L1492 322 L1518 350 L1540 342 L1556 388 L1584 394" stroke="rgba(255,230,180,.6)" stroke-width="2.4" fill="none"/>` +
            `<rect x="-100" y="640" width="2200" height="500" fill="url(#farG)" />`;
        })();

        /* mid ruins: bricks, arches, vines, rim light */
        (function(){
          const g=ruins(77,-120,2040,780,170,420,{pillar:.16,vines:true});
          const rv=mulberry32(5);
          $('mid').innerHTML =
            `<path d="${g.d}" fill="url(#midG)" fill-rule="evenodd"/>` +
            `<path d="${g.d}" fill="url(#brick)" fill-rule="evenodd" opacity=".9"/>` +
            `<path d="${g.rimd}" stroke="rgba(255,196,140,.7)" stroke-width="2.6" fill="none" stroke-linejoin="round"/>` +
            vineMarkup(g.vines,rv,'#3f5a46') +
            `<rect x="-100" y="779" width="2200" height="440" fill="url(#midG)"/>`;
        })();

        (function(){
          const g=ruins(133,-120,2040,935,40,150,{pillar:.1,windows:false});
          $('low').innerHTML=`<path d="${g.d}" fill="#3a2650" fill-rule="evenodd"/><path d="${g.rimd}" stroke="rgba(255,190,130,.55)" stroke-width="2.2" fill="none"/><rect x="-100" y="934" width="2200" height="300" fill="#3a2650"/>`;
        })();

        /* clouds: soft underlit bands, wobbled by a displacement filter for a brush-stroke feel */
        function cloudBand(r,cx,cy,w,h,grad,op){
          let s=''; const n=3+Math.floor(r()*3);
          for(let i=0;i<n;i++){
            const ew=w*rr(r,.35,.7), eh=h*rr(r,.45,1), ex=cx+(i/(n-1)-.5)*w*.55+rr(r,-w*.05,w*.05), ey=cy+rr(r,-h*.3,h*.3);
            s+=`<ellipse cx="${f1(ex)}" cy="${f1(ey)}" rx="${f1(ew/2)}" ry="${f1(eh/2)}" fill="url(#${grad})" opacity="${op}"/>`;
          }
          return s;
        }
        (function(){
          let r=mulberry32(101), s='';
          // high clouds: violet/pink, above the initial view (appear when the crane rises)
          [[260,-520,900,70],[1120,-430,1100,86],[1700,-640,820,60],[600,-300,1000,90],[1450,-190,1200,80],[200,-60,980,74],[1040,-20,1100,60]].forEach(a=>{ s+=cloudBand(r,a[0],a[1],a[2],a[3],'cgB',.8); });
          $('cloudHi').innerHTML=`<g filter="url(#paintHi)">${s}</g>`;
          r=mulberry32(202); s='';
          [[420,160,1200,74],[1500,230,1300,90],[900,330,1500,62],[200,420,900,54],[1650,450,980,50],[1000,520,1400,38]].forEach(a=>{ s+=cloudBand(r,a[0],a[1],a[2],a[3],'cgA',.88); });
          $('cloudMid').innerHTML=`<g filter="url(#paint)">${s}</g>`;
          r=mulberry32(303); s='';
          [[350,560,1100,26],[1350,590,1300,22],[900,610,800,16],[1750,540,700,20]].forEach(a=>{ s+=cloudBand(r,a[0],a[1],a[2],a[3],'cgC',.82); });
          $('cloudLow').innerHTML=`<g filter="url(#paint)">${s}</g>`;
        })();

        /* stars (only reachable once the crane lifts) */
        (function(){
          const r=mulberry32(909); let s='';
          for(let i=0;i<70;i++){ const x=r()*1920, y=-1000+r()*620, a=rr(r,.25,.7), rad=rr(r,.8,1.9); s+=`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rad)}" fill="#fff4dc" opacity="${f1(a)}"/>`; }
          $('stars').innerHTML=s;
        })();

        /* birds */
        const birds=[]; (function(){
          const r=mulberry32(404); let s='';
          for(let i=0;i<7;i++){ const x=rr(r,200,1700), y=rr(r,240,470), sc=rr(r,.7,1.3); birds.push({x,y,sc,ph:r()*6,sp:rr(r,10,22)});
            s+=`<g id="bird${i}"><path d="M-16 0 Q-8 -10 0 0 Q8 -10 16 0" stroke="#4a2a5c" stroke-width="2.6" fill="none" stroke-linecap="round"/></g>`; }
          $('birds').innerHTML=s;
        })();

        /* ground: hill, rubble, grass, mound */
        function block(r,cx,cy,w,h,col){
          const a=[ [cx-w/2,cy+h/2],[cx-w/2+rr(r,0,w*.1),cy-h*rr(r,.2,.45)],[cx-w*rr(r,.05,.25),cy-h/2],[cx+w*rr(r,.1,.3),cy-h/2+rr(r,0,h*.15)],[cx+w/2,cy-h*rr(r,0,.3)],[cx+w/2,cy+h/2] ];
          const d='M'+a.map(p=>f1(p[0])+' '+f1(p[1])).join(' L')+' Z';
          const rim='M'+[a[1],a[2],a[3],a[4]].map(p=>f1(p[0])+' '+f1(p[1])).join(' L');
          return `<path d="${d}" fill="${col||'url(#blkG)'}"/><path d="${rim}" stroke="rgba(255,196,130,.75)" stroke-width="2.4" fill="none" stroke-linejoin="round"/>`;
        }
        function tuft(r,x,y,n,hmax,col,tip){
          let s=''; for(let i=0;i<n;i++){ const bx=x+rr(r,-18,18), h=rr(r,hmax*.4,hmax), bend=rr(r,-18,18);
            s+=`<path d="M${f1(bx-3)} ${f1(y)} Q${f1(bx+bend*.4)} ${f1(y-h*.55)} ${f1(bx+bend)} ${f1(y-h)} Q${f1(bx+bend*.3+3)} ${f1(y-h*.5)} ${f1(bx+3.5)} ${f1(y)} Z" fill="${col}"/>`;
            if(tip) s+=`<path d="M${f1(bx+bend*.6)} ${f1(y-h*.7)} L${f1(bx+bend)} ${f1(y-h)}" stroke="${tip}" stroke-width="1.6" stroke-linecap="round"/>`; }
          return s;
        }
        const tufts=[];
        (function(){
          const r=mulberry32(55);
          // ground silhouette
          let gd='M-100 962 C 200 950 400 958 640 952 C 900 944 1100 940 1250 912 L1400 868 L1480 830 L1560 800 L1650 820 L1740 856 L1860 896 L2040 920 L2040 1300 L-100 1300 Z';
          let back=`<path d="${gd}" fill="url(#gndG)"/><path d="M-100 962 C 200 950 400 958 640 952 C 900 944 1100 940 1250 912" stroke="rgba(255,190,130,.5)" stroke-width="2.6" fill="none"/>`;
          // back mound
          back+=`<path d="M1180 960 L1300 900 L1400 850 L1480 808 L1560 778 L1650 796 L1740 836 L1840 884 L1940 910 L1940 1010 L1180 1010 Z" fill="#33244a"/>`;
          back+=`<path d="M1400 850 L1480 808 L1560 778 L1650 796 L1740 836 L1840 884" stroke="rgba(255,190,130,.7)" stroke-width="2.6" fill="none"/>`;
          // scattered rubble behind the heroes
          back+=block(r,1290,930,120,64)+block(r,1345,915,70,46)+block(r,1870,925,150,70)+block(r,200,960,200,86,'#2b1d3d')+block(r,420,972,120,60)+block(r,1130,950,90,50);
          // fallen column drum on the left
          back+=`<g><rect x="30" y="900" width="240" height="64" rx="10" fill="#47315a"/><rect x="30" y="900" width="240" height="14" rx="6" fill="rgba(255,196,130,.45)"/><ellipse cx="30" cy="932" rx="14" ry="32" fill="#2d1f40"/><path d="M80 906 V960 M140 906 V960 M200 906 V960" stroke="rgba(0,0,0,.25)" stroke-width="3"/></g>`;
          // back tufts (swaying)
          let bt=''; for(let i=0;i<26;i++){ const x=rr(r,-40,1960); bt+=`<g class="tuft" data-ph="${f1(r()*6)}" style="transform-box:fill-box;transform-origin:50% 100%">${tuft(r,x,962-(x>1200?(x-1200)*.05:0)+rr(r,-6,6),6,rr(r,36,70),'#2d3a40','#e9b86a')}</g>`; }
          $('gBack').innerHTML=back+bt;

          // front blocks of the mound (Leon rises from behind these)
          let fb='';
          fb+=`<path d="M1440 1010 L1448 880 L1478 846 L1512 826 L1540 808 L1620 806 L1668 822 L1712 852 L1726 1010 Z" fill="url(#blkG)"/>`;
          fb+=`<path d="M1448 880 L1478 846 L1512 826 L1540 808 L1620 806 L1668 822 L1712 852" stroke="rgba(255,196,130,.85)" stroke-width="3" fill="none" stroke-linejoin="round"/>`;
          fb+=`<path d="M1500 850 L1560 900 M1620 830 L1596 910 L1650 960" stroke="rgba(0,0,0,.3)" stroke-width="3" fill="none"/>`;
          fb+=block(r,1410,925,110,86)+block(r,1760,915,140,84)+block(r,1830,950,90,60);
          fb+=`<path d="M1380 1010 C1420 950 1500 930 1560 940 C1640 936 1700 950 1760 1010 Z" fill="#241736"/>`;
          $('gBlocks').innerHTML=fb;

          // hand gripping the block (Leon)
          $('hand').innerHTML=
            `<g stroke="#0a0a12" stroke-width="3" stroke-linejoin="round">`+
            `<path d="M54 100 L40 52 L72 46 L84 100 Z" fill="#c4c8d4"/>`+
            `<path d="M36 52 L76 44" stroke="#ffc400" stroke-width="5"/>`+
            `<rect x="22" y="14" width="62" height="40" rx="16" fill="#e9bf94"/>`+
            `<rect x="14" y="2" width="16" height="30" rx="8" fill="#e9bf94" transform="rotate(-18 22 16)"/>`+
            `<rect x="30" y="-4" width="15" height="34" rx="7.5" fill="#e9bf94"/>`+
            `<rect x="46" y="-4" width="15" height="34" rx="7.5" fill="#e9bf94"/>`+
            `<rect x="62" y="0" width="14" height="30" rx="7" fill="#e9bf94" transform="rotate(10 69 15)"/>`+
            `</g><path d="M26 40 Q50 52 80 38" stroke="rgba(120,70,40,.4)" stroke-width="2" fill="none"/>`;

          // shadow of Akira (long, falling to the left away from the sun)
          $('akShadow').innerHTML=`<defs><radialGradient id="shg"><stop offset="0" stop-color="#150a24" stop-opacity=".75"/><stop offset="1" stop-color="#150a24" stop-opacity="0"/></radialGradient></defs><ellipse cx="150" cy="40" rx="190" ry="20" fill="url(#shg)"/>`;

          // front grass lip (hides Akira's legs when he crouches)
          let fr=`<path d="M-100 1000 L-100 978 C 150 964 380 986 600 972 C 760 968 860 982 1000 970 C 1180 962 1260 972 1400 966 L1400 1300 L-100 1300 Z" fill="#1b1230"/>`;
          fr+=`<path d="M-100 978 C 150 964 380 986 600 972 C 760 968 860 982 1000 970 C 1180 962 1260 972 1400 966" stroke="rgba(255,190,130,.45)" stroke-width="2.4" fill="none"/>`;
          for(let i=0;i<40;i++){ const x=rr(r,300,1260); fr+=`<g class="tuft" data-ph="${f1(r()*6)}" style="transform-box:fill-box;transform-origin:50% 100%">${tuft(r,x,978+rr(r,-4,4),7,rr(r,40,92),'#202a33','#ffcc7a')}</g>`; }
          for(let i=0;i<14;i++){ const x=rr(r,-60,300); fr+=`<g class="tuft" data-ph="${f1(r()*6)}" style="transform-box:fill-box;transform-origin:50% 100%">${tuft(r,x,978,7,rr(r,40,80),'#202a33','#ffcc7a')}</g>`; }
          $('gFront').innerHTML=fr;

          // foreground: out-of-focus dark weeds and ferns, fast parallax
          let fg='<g filter="url(#softfg)">';
          for(let i=0;i<18;i++){ const x=rr(r,-60,1980); fg+=`<g class="tuft" data-ph="${f1(r()*6)}" style="transform-box:fill-box;transform-origin:50% 100%">${tuft(r,x,1090,9,rr(r,120,300),'#120b20','#ffb36a')}</g>`; }
          fg+=`<path d="M1500 1100 C1560 960 1700 900 1790 880 C1700 940 1640 1010 1600 1100 Z M1560 1100 C1640 1000 1790 960 1900 970 C1780 1000 1700 1050 1660 1100 Z" fill="#150c24"/>`;
          fg+='</g>';
          $('fg').innerHTML=fg;
        })();

        /* ---------- herb art ---------- */
        function herbArt(){
          return `<g>`+
            `<path d="M0 0 C-4 -26 4 -52 0 -84" stroke="#2e8a4a" stroke-width="5" fill="none" stroke-linecap="round"/>`+
            `<g stroke="#17543a" stroke-width="1.6" stroke-linejoin="round">`+
            `<path d="M0 -26 C-34 -30 -48 -52 -42 -74 C-18 -66 -4 -50 0 -26 Z" fill="#6fe07c"/>`+
            `<path d="M0 -34 C36 -36 50 -58 44 -80 C20 -72 4 -58 0 -34 Z" fill="#59d070"/>`+
            `<path d="M0 -54 C-30 -64 -38 -88 -28 -104 C-10 -94 -2 -76 0 -54 Z" fill="#8cf08a"/>`+
            `<path d="M0 -58 C30 -68 38 -92 26 -108 C8 -98 2 -78 0 -58 Z" fill="#72dc7e"/>`+
            `<path d="M0 -80 C-14 -96 -10 -116 0 -130 C10 -116 14 -96 0 -80 Z" fill="#a8f89a"/>`+
            `</g>`+
            `<path d="M-6 -34 L-34 -60 M6 -42 L34 -66 M-2 -62 L-20 -90 M2 -66 L18 -94 M0 -84 L0 -118" stroke="#d6ffc0" stroke-width="1.4" fill="none" opacity=".75"/>`+
            `<circle cx="-10" cy="-100" r="3.4" fill="#fff6c0"/><circle cx="12" cy="-108" r="2.8" fill="#fff6c0"/>`+
            `</g>`;
        }
        // ground herb (root tuft stays, plant disappears on pluck)
        $('herbG').innerHTML=`<g transform="translate(60 176) scale(1.3)"><g id="herbPlant">${herbArt()}</g></g><g id="herbRoot"><ellipse cx="60" cy="180" rx="26" ry="8" fill="#14301f"/><path d="M40 182 L46 168 L54 180 L60 164 L68 180 L76 170 L80 184 Z" fill="#1e5230"/></g>`;
        // glint on the herb
        $('herbG').insertAdjacentHTML('beforeend',
          `<g id="glint" transform="translate(66 78)" opacity="0"><path d="M0 -26 Q2 -2 26 0 Q2 2 0 26 Q-2 2 -26 0 Q-2 -2 0 -26 Z" fill="#fffbe0"/></g>`);

        /* ---------- characters ---------- */
        const heroSvg = document.querySelector('#akBody svg');
        const leonSvg = document.querySelector('#leon svg');
        // basket in Akira's back hand
        heroSvg.querySelector('.backarm').insertAdjacentHTML('beforeend',
          `<g stroke="#ffd34d" stroke-width="2" stroke-linejoin="round"><path d="M126 524 Q156 452 188 524" stroke="#7a4f2a" stroke-width="7" fill="none" stroke-linecap="round"/>`+
          `<path d="M112 540 L204 540 L190 616 L126 616 Z" fill="#7a4f2a"/>`+
          `<path d="M118 562 H198 M122 588 H194 M136 540 V616 M156 540 V616 M176 540 V616" stroke="#4a2c14" stroke-width="2.4" fill="none"/></g>`);
        // herb held in Akira's fist (hidden until the pluck)
        heroSvg.querySelector('.fistg').insertAdjacentHTML('beforeend',
          `<g id="heldHerb" opacity="0" transform="translate(470 267) rotate(90) scale(1.45)">${herbArt()}</g>`);
        // dust and dents on Leon's armor
        leonSvg.insertAdjacentHTML('beforeend',
          `<g opacity=".3"><ellipse cx="270" cy="330" rx="46" ry="30" fill="#4a3426"/><ellipse cx="208" cy="450" rx="30" ry="40" fill="#3a2a22"/><ellipse cx="300" cy="500" rx="40" ry="24" fill="#4a3426"/><path d="M226 120 L262 150" stroke="#8a2a2a" stroke-width="3"/></g>`);

        /* ---------- fireflies (canvas, pure function of t) ---------- */
        const cv=$('ff'), ctx=cv.getContext('2d');
        const sprites=[]; for(let k=0;k<=10;k++){
          const c=document.createElement('canvas'); c.width=c.height=96; const g=c.getContext('2d');
          const m=k/10, R=Math.round(255), G=Math.round(52+(214-52)*m), B=Math.round(70+(108-70)*m);
          const gr=g.createRadialGradient(48,48,0,48,48,48);
          gr.addColorStop(0,`rgba(255,${Math.round(246-(1-m)*120)},${Math.round(210-(1-m)*130)},1)`);
          gr.addColorStop(.12,`rgba(255,${Math.round(238-(1-m)*100)},${Math.round(190-(1-m)*100)},.95)`);
          gr.addColorStop(.3,`rgba(${R},${G},${B},.5)`);
          gr.addColorStop(.62,`rgba(${R},${G},${B},.14)`);
          gr.addColorStop(1,`rgba(${R},${G},${B},0)`);
          g.fillStyle=gr; g.fillRect(0,0,96,96); sprites.push(c);
        }
        const P=[]; (function(){
          const r=mulberry32(2024);
          // red embers (the demon army), present from the start
          for(let i=0;i<48;i++){ P.push({x:rr(r,80,1860),y:rr(r,620,1000),f:rr(r,.7,1.1),rad:rr(r,9,17),tb:0,ember:true,cd:r()*.5,vx:rr(r,-6,8),vy:rr(r,14,30),ax:rr(r,6,24),fx:rr(r,.5,1.2),ph:r()*6,fb:rr(r,.8,1.6),pb:r()*6,a:1}); }
          // golden fireflies born after CUE-A
          for(let i=0;i<190;i++){
            const f=rr(r,.35,1.5); const hi=r()<.55;
            P.push({x:rr(r,-40,1960),y:hi?rr(r,-780,640):rr(r,560,1020),f,rad:rr(r,4,11)*(0.7+f*.45),tb:1.5+r()*3.2,ember:false,cd:0,vx:rr(r,-8,10),vy:rr(r,10,34),ax:rr(r,8,34),fx:rr(r,.4,1.1),ph:r()*6,fb:rr(r,.9,2.2),pb:r()*6,a:rr(r,.55,1)});
          }
          // extra fireflies that fill the sky as the crane rises
          for(let i=0;i<130;i++){ const f=rr(r,.4,.9); P.push({x:rr(r,-40,1960),y:rr(r,-560,560),f,rad:rr(r,6,13),tb:2.5+r()*4.5,ember:false,cd:0,vx:rr(r,-8,10),vy:rr(r,10,30),ax:rr(r,10,36),fx:rr(r,.4,1.1),ph:r()*6,fb:rr(r,.9,2.0),pb:r()*6,a:rr(r,.7,1)}); }
          // big soft bokeh motes
          for(let i=0;i<14;i++){ P.push({x:rr(r,0,1920),y:rr(r,200,1000),f:rr(r,1.2,1.6),rad:rr(r,26,52),tb:2+r()*3,ember:false,cd:0,vx:rr(r,-6,6),vy:rr(r,8,20),ax:rr(r,20,50),fx:rr(r,.3,.7),ph:r()*6,fb:rr(r,.5,1),pb:r()*6,a:.2,bokeh:true}); }
        })();
        function drawFF(t){
          ctx.clearRect(0,0,W,H); ctx.globalCompositeOperation='lighter';
          const h=rise(t), drift=Math.max(0,t-1.5);
          const cxm=40*t/9;
          for(const p of P){
            let life = p.ember ? 0.35+0.65*sstep((t-0.1)/1.0) : sstep((t-p.tb)/1.0);
            if(life<=0) continue;
            const m = p.ember ? sstep((t-1.5-p.cd)/0.9) : 1;
            const tw = .5+.5*Math.sin(t*p.fb*2.2+p.pb);
            const flick = p.bokeh ? .6+.4*tw : (p.ember && m<1 ? .55+.25*tw : Math.pow(tw,1.6)*.85+.18);
            const al = clamp(life*flick*p.a*(p.ember?1:1),0,1);
            if(al<.01) continue;
            const dr = p.ember ? drift : Math.max(0,t-p.tb)+ (drift-Math.max(0,t-p.tb)>0?0:0);
            const x = p.x - p.f*cxm*.6 + Math.sin(t*p.fx+p.ph)*p.ax + p.vx*dr;
            const y = p.y + p.f*h - p.vy*dr + Math.cos(t*p.fx*.8+p.ph*1.7)*p.ax*.5;
            const rad = p.rad*(0.85+0.3*tw)*(p.ember?(0.8+.5*m):1);
            if(x<-80||x>W+80||y<-80||y>H+80) continue;
            ctx.globalAlpha=al;
            ctx.drawImage(sprites[Math.round(m*10)],x-rad*1.6,y-rad*1.6,rad*3.2,rad*3.2);
          }
          ctx.globalAlpha=1;
        }

        /* ---------- layers ---------- */
        const layerDefs=[['L-sky',.6,0],['L-sun',.5,0],['L-stars',.58,0],['L-cloudHi',.32,5],['L-cloudMid',.44,8],['L-cloudLow',.54,6],['L-birds',.4,0],['L-far',.7,0],['L-haze',.72,0],['L-bloom',.5,0],['L-mid',.86,0],['L-low',.94,0],['L-ground',1,0],['L-fg',1.55,0]];
        const layers=layerDefs.map(a=>({el:$(a[0]),f:a[1],dx:a[2]}));
        const tufts_=[...document.querySelectorAll('.tuft')].map(el=>({el,ph:parseFloat(el.dataset.ph)}));
        const birdEls=birds.map((b,i)=>({el:$('bird'+i),b}));
        const glowEl=$('herbglow'), glintEl=$('glint');

        function render(t){
          const h=rise(t), cx=40*t/9;
          for(const L of layers) L.el.style.transform=`translate3d(${f1(-L.f*cx*.6+L.dx*t)}px,${f1(L.f*h)}px,0)`;
          for(const T of tufts_) T.el.style.transform=`skewX(${f1(Math.sin(t*1.25+T.ph)*3.2)}deg)`;
          for(const B of birdEls){ const x=B.b.x+B.b.sp*t, y=B.b.y+Math.sin(t*.9+B.b.ph)*10; const fl=.55+.45*Math.sin(t*6.5+B.b.ph*3);
            B.el.setAttribute('transform',`translate(${f1(x)} ${f1(y)}) scale(${f1(B.b.sc)} ${f1(B.b.sc*fl)})`); }
          // herb glow breathes until it is plucked
          const gl = t<4.5 ? (.55+.35*Math.sin(t*3.1)) * sstep((t-0.3)/1.2) * (1+0.35*sstep((t-2.9)/0.2)) : 0;
          glowEl.style.opacity=f1(clamp(gl,0,1));
          drawFF(t);
        }

        /* ---------- timeline ---------- */
        const tl=gsap.timeline({paused:true});
        const clock={t:0};
        tl.to(clock,{t:9,duration:9,ease:'none',onUpdate:()=>render(clock.t)},0);

        // subtitles (BIBLE: 0.1s fade in / 0.1s fade out)
        tl.fromTo('#sub1',{opacity:0},{opacity:1,duration:.1,ease:'none'},3.0);
        tl.to('#sub1',{opacity:0,duration:.1,ease:'none'},4.1);
        tl.fromTo('#sub2',{opacity:0},{opacity:1,duration:.1,ease:'none'},5.0);
        tl.to('#sub2',{opacity:0,duration:.1,ease:'none'},6.9);

        /* Akira */
        const FEETY=975, S=.5, FY=FEETY-874;
        const ORG='260px 874px';
        gsap.set('#akBody',{x:0,y:FY,scaleX:-S,scaleY:S,rotation:0,transformOrigin:ORG});
        gsap.set('#akWrap',{x:1130-260});
        gsap.set('#akShadow',{x:0});
        gsap.set('#akBody .arm',{rotation:84,svgOrigin:'322 267'});
        gsap.set('#akBody .backarm',{rotation:0,svgOrigin:'190 262'});
        gsap.set('#akBody .scarf',{rotation:0,svgOrigin:'208 270'});
        gsap.set('#akBody .head',{rotation:0,svgOrigin:'254 210'});
        const akSel='#akWrap, #akShadow';
        // walk (0-2.6): constant speed, step bob on every beat
        tl.to('#akWrap',{x:880-260,duration:2.6,ease:'none'},0);
        for(let i=0;i<5;i++){
          const t0=i*.5, sgn=i%2?1:-1;
          tl.to('#akBody',{y:FY-9,rotation:1.4*sgn,duration:.25,ease:'sine.out'},t0);
          tl.to('#akBody',{y:FY,rotation:0,duration:.25,ease:'sine.in'},t0+.25);
          tl.to('#akBody .arm',{rotation:84+9*sgn,duration:.5,ease:'sine.inOut'},t0);
          tl.to('#akBody .backarm',{rotation:-7*sgn,duration:.5,ease:'sine.inOut'},t0);
        }
        tl.to('#akBody .arm',{rotation:84,duration:.4,ease:'sine.out'},2.5);
        tl.to('#akBody .backarm',{rotation:0,duration:.4,ease:'sine.out'},2.5);
        // scarf flutter
        for(let i=0;i<18;i++){ tl.to('#akBody .scarf',{rotation:(i%2?5:-4),duration:.5,ease:'sine.inOut'},i*.5); }
        // 3.00 CUE-B: notices the herb (small startled hop) + glint
        tl.to('#akBody',{y:FY-30,scaleY:S*1.05,duration:.12,ease:'power2.out'},3.0);
        tl.to('#akBody',{y:FY,scaleY:S*.93,duration:.14,ease:'power2.in'},3.12);
        tl.to('#akBody',{scaleY:S,duration:.1,ease:'sine.out'},3.27);
        tl.to('#akBody .head',{rotation:-8,duration:.2,ease:'sine.out'},3.0);
        tl.to('#akBody .arm',{rotation:60,duration:.2,ease:'sine.out'},3.0);
        tl.fromTo('#glint',{opacity:0,scale:.2,svgOrigin:'66 78'},{opacity:1,scale:1,duration:.1,ease:'power2.out'},3.0);
        tl.to('#glint',{opacity:0,scale:.3,duration:.3,ease:'power2.in'},3.22);
        // shuffle toward the herb and crouch
        tl.to('#akWrap',{x:800-260,duration:.5,ease:'sine.inOut'},3.25);
        tl.to('#akBody',{y:FY-7,duration:.12,ease:'sine.out'},3.3);
        tl.to('#akBody',{y:FY,duration:.12,ease:'sine.in'},3.42);
        tl.to('#akBody',{y:FY-7,duration:.12,ease:'sine.out'},3.54);
        tl.to('#akBody',{y:FY,duration:.1,ease:'sine.in'},3.66);
        tl.to('#akBody',{y:FY+105,scaleY:S*.86,rotation:9,duration:.42,ease:'power2.out'},3.77);
        tl.to('#akBody .arm',{rotation:80,duration:.5,ease:'sine.inOut'},3.65);
        tl.to('#akBody .head',{rotation:6,duration:.4,ease:'sine.inOut'},3.7);
        tl.to('#akBody',{rotation:7,duration:.1,ease:'sine.inOut'},4.2);
        tl.to('#akBody',{rotation:10.5,duration:.1,ease:'sine.inOut'},4.3);
        tl.to('#akBody',{rotation:8,duration:.1,ease:'sine.inOut'},4.4);
        tl.to('#akBody .arm',{rotation:90,duration:.3,ease:'sine.inOut'},4.15);
        // 4.50 CUE-C: pluck. pop + small light
        tl.set('#herbPlant',{opacity:0},4.5);
        tl.set('#heldHerb',{opacity:1},4.5);
        tl.set('#glint',{opacity:0},4.5);
        tl.to('#akBody .arm',{rotation:64,duration:.14,ease:'power2.out'},4.5);
        tl.to('#akBody',{y:FY+93,duration:.14,ease:'power2.out'},4.5);
        // light burst
        tl.set('#flash',{left:740-130,top:880-130,opacity:1,scale:.3},4.5);
        tl.to('#flash',{scale:1.3,opacity:0,duration:.5,ease:'power2.out'},4.5);
        tl.set('#ring',{left:740-60,top:880-60,opacity:.95,scale:.2},4.5);
        tl.to('#ring',{scale:1.5,opacity:0,duration:.55,ease:'power2.out'},4.5);
        document.querySelectorAll('.spark').forEach((el,i)=>{
          const a=(i/12)*Math.PI*2+.3, d=70+(i%3)*28;
          tl.set(el,{left:740-7,top:880-7,opacity:1,scale:1},4.5);
          tl.to(el,{x:Math.cos(a)*d,y:Math.sin(a)*d-24,scale:.2,opacity:0,duration:.7,ease:'power2.out'},4.5);
        });
        // stand up and lift the herb to the sky
        tl.to('#akBody',{y:FY,scaleY:S,rotation:0,duration:.6,ease:'power2.out'},4.7);
        tl.to('#akBody .arm',{rotation:-62,duration:.7,ease:'back.out(1.3)'},4.75);
        tl.to('#akBody .head',{rotation:-9,duration:.5,ease:'sine.out'},4.8);
        tl.to('#akWrap',{x:830-260,duration:.9,ease:'sine.inOut'},4.7);
        // joyful sway to the end
        for(let i=0;i<9;i++){
          const t0=5.5+i*.5; if(t0>=9) break;
          tl.to('#akBody',{y:FY-12,duration:.2,ease:'power2.out'},t0);
          tl.to('#akBody',{y:FY,duration:.3,ease:'sine.in'},t0+.2);
          tl.to('#akBody .arm',{rotation:(i%2?-70:-54),duration:.5,ease:'sine.inOut'},t0);
          tl.to('#akBody .head',{rotation:(i%2?-12:-4),duration:.5,ease:'sine.inOut'},t0);
        }

        /* Leon: 5.00 CUE-D hand, then rises from the rubble */
        gsap.set('#leon',{x:1600-260,y:964+340-874,scaleX:-.44,scaleY:.44,rotation:-8,transformOrigin:ORG});
        gsap.set('#leon .arm',{rotation:104,svgOrigin:'322 266'});
        gsap.set('#leon .head',{rotation:0,svgOrigin:'258 210'});
        gsap.set('#hand',{opacity:0,y:46,rotation:0,transformOrigin:'50% 100%'});
        tl.to('#hand',{opacity:1,y:0,duration:.12,ease:'power2.out'},5.0);
        tl.to('#hand',{rotation:-4,duration:.1,ease:'sine.inOut'},5.2);
        tl.to('#hand',{rotation:3,y:-4,duration:.1,ease:'sine.inOut'},5.3);
        tl.to('#hand',{rotation:0,y:0,duration:.15,ease:'sine.inOut'},5.4);
        const LY=964-874;
        tl.to('#leon',{y:LY+190,duration:.5,ease:'power2.out'},5.35);
        tl.to('#leon',{y:LY+160,duration:.18,ease:'sine.inOut'},5.85);
        tl.to('#leon',{y:LY,rotation:-9,duration:.8,ease:'power3.out'},6.03);
        tl.to('#leon .head',{rotation:-6,duration:.6,ease:'sine.inOut'},6.1);
        for(let i=0;i<5;i++){ tl.to('#leon',{y:LY+(i%2?0:-3),duration:.5,ease:'sine.inOut'},6.8+i*.5); }
        // dust puffs at the two heaves
        [['d1',1520,800,5.35],['d2',1660,806,5.4],['d3',1580,792,5.45],['d4',1500,812,5.98],['d5',1690,818,6.02],['d6',1600,800,6.08]].forEach(([id,x,y,at])=>{
          tl.set('#'+id,{left:x-45,top:y-45,opacity:0,scale:.4},at);
          tl.to('#'+id,{opacity:.7,duration:.12,ease:'sine.out'},at);
          tl.to('#'+id,{x:(x%3-1)*30,y:-48,scale:2.4,duration:1.3,ease:'sine.out'},at);
          tl.to('#'+id,{opacity:0,duration:.9,ease:'sine.in'},at+.4);
        });

        window.__timelines['main']=tl;
        render(0);
      })();
    </script>
  </body>
</html>
