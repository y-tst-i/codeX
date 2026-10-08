/**
 * 動画HTMLに自動で差し込む「演出の道具箱」 window.MGK。
 * 背景・カメラ・転換・文字アニメ・パーティクル・質感を、よく調整された形で用意しておき、
 * 動画を書くClaudeはこれを組み合わせるだけで「背景まで動き続ける」画を作れるようにする。
 * すべて t（秒）だけで絵が決まる（Math.random を使わない）。重い下準備は1回だけキャッシュする。
 */
export const MGK_SCRIPT = String.raw`(function(){
if(window.MGK)return;
var W=1080,H=1920,TAU=Math.PI*2;
function clamp(v,a,b){return v<a?a:v>b?b:v;}
function mix(a,b,p){return a+(b-a)*p;}
function prog(t,a,b){return b===a?(t>=b?1:0):clamp((t-a)/(b-a),0,1);}
function hash(i){var s=Math.sin(i*127.1+311.7)*43758.5453;return s-Math.floor(s);}
function rand(i,seed){return hash(i*1.618+(seed||0)*17.13+0.5);}
function noise(x,seed){var i=Math.floor(x),f=x-i,u=f*f*(3-2*f),o=(seed||0)*57.3;return mix(hash(i+o),hash(i+1+o),u)*2-1;}
var ease={
  linear:function(p){return p;},
  inQuad:function(p){return p*p;},outQuad:function(p){return 1-(1-p)*(1-p);},
  inCubic:function(p){return p*p*p;},outCubic:function(p){return 1-Math.pow(1-p,3);},
  inOutCubic:function(p){return p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;},
  outQuart:function(p){return 1-Math.pow(1-p,4);},
  inExpo:function(p){return p<=0?0:Math.pow(2,10*p-10);},
  outExpo:function(p){return p>=1?1:1-Math.pow(2,-10*p);},
  inOutExpo:function(p){return p<=0?0:p>=1?1:p<.5?Math.pow(2,20*p-10)/2:(2-Math.pow(2,-20*p+10))/2;},
  inBack:function(p){var s=1.70158;return (s+1)*p*p*p-s*p*p;},
  outBack:function(p){var s=1.70158;return 1+(s+1)*Math.pow(p-1,3)+s*Math.pow(p-1,2);},
  outBackBig:function(p){var s=2.6;return 1+(s+1)*Math.pow(p-1,3)+s*Math.pow(p-1,2);},
  outElastic:function(p){return p<=0?0:p>=1?1:Math.pow(2,-10*p)*Math.sin((p*10-.75)*TAU/3)+1;},
  outBounce:function(p){var n=7.5625,d=2.75;if(p<1/d)return n*p*p;if(p<2/d)return n*(p-=1.5/d)*p+.75;if(p<2.5/d)return n*(p-=2.25/d)*p+.9375;return n*(p-=2.625/d)*p+.984375;}
};
function E(name){return typeof name==="function"?name:ease[name]||ease.outCubic;}
function anim(t,start,dur,easeName){return E(easeName)(prog(t,start,start+dur));}
/** 経過 s 秒のバネ（0→1、行き過ぎて戻る） */
function spring(s,freq,damp){if(s<=0)return 0;freq=freq||14;damp=damp||6;return 1-Math.exp(-damp*s)*Math.cos(freq*s);}
/** times の各時刻で 1 に跳ねて dur 秒で 0 に戻る（強調語の「叩き」用） */
function punch(t,times,dur){dur=dur||0.35;var v=0;(times||[]).forEach(function(at){var x=(t-at)/dur;if(x>=0&&x<=1)v=Math.max(v,Math.pow(1-x,3));});return v;}
function envelope(t,start,inDur,hold,outDur){inDur=Math.max(0,inDur||0);hold=Math.max(0,hold||0);outDur=Math.max(0,outDur||0);if(t<start||t>start+inDur+hold+outDur)return 0;if(t<start+inDur)return ease.outCubic((t-start)/inDur);if(t<=start+inDur+hold||outDur===0)return 1;return 1-ease.inCubic((t-start-inDur-hold)/outDur);}
/** キーフレーム補間：[{t:0,x:..,y:..},{t:1.2,x:..,ease:"outBack"}] → その時刻の値 */
function keys(t,frames){
  var out={};if(!frames||!frames.length)return out;
  var names={};frames.forEach(function(f){Object.keys(f).forEach(function(k){if(k!=="t"&&k!=="ease")names[k]=1;});});
  /* 値ごとに「その値を持つ直前・直後のキーフレーム」で補間する（省略した値は前の値を引き継ぐ） */
  Object.keys(names).forEach(function(k){
    var a=null,b=null;
    for(var i=0;i<frames.length;i++){var f=frames[i];if(f[k]===undefined)continue;if(f.t<=t)a=f;else{b=f;break;}}
    if(!a){out[k]=b[k];return;}if(!b||typeof a[k]!=="number"){out[k]=a[k];return;}
    out[k]=mix(a[k],b[k],E(b.ease||"inOutCubic")(prog(t,a.t,b.t)));
  });
  return out;
}
/** ジャンプ：start から dur 秒の放物線。y はマイナス方向の持ち上がり量、sx/sy は踏み切りと着地のつぶれ */
function hop(t,start,dur,height){
  if(!(dur>0))return {y:0,sx:1,sy:1};
  var s=t-start;if(s<-0.12||s>dur+0.2)return {y:0,sx:1,sy:1};
  if(s<0){var q=1-(-s)/0.12;return {y:0,sx:1+0.12*q,sy:1-0.12*q};}
  if(s>dur){var r=1-(s-dur)/0.2;return {y:0,sx:1+0.14*r,sy:1-0.14*r};}
  var x=s/dur;return {y:-4*height*x*(1-x),sx:1-0.06*Math.sin(Math.PI*x),sy:1+0.1*Math.sin(Math.PI*x)};
}
function shake(t,start,dur,amp,seed){var k=!(dur>0)||t<start||t>start+dur?0:Math.pow(1-(t-start)/dur,2);return {x:noise(t*38,seed||1)*amp*k,y:noise(t*41,(seed||1)+9)*amp*k,r:noise(t*29,(seed||1)+4)*amp*k*0.0015};}
function voice(t){return window.MG_VOICE_LEVEL?window.MG_VOICE_LEVEL(t):0;}

/* ---------- 色 ---------- */
function rgb(c){
  if(Array.isArray(c))return c;
  c=String(c).trim();
  if(c[0]==="#"){var h=c.slice(1);if(h.length===3)h=h.split("").map(function(x){return x+x;}).join("");return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
  var m=c.match(/\d+(\.\d+)?/g);return m?[+m[0],+m[1],+m[2]]:[255,255,255];
}
function alpha(c,a){var v=rgb(c);return "rgba("+v[0]+","+v[1]+","+v[2]+","+a+")";}
function mixColor(a,b,p){var x=rgb(a),y=rgb(b);return "rgb("+Math.round(mix(x[0],y[0],p))+","+Math.round(mix(x[1],y[1],p))+","+Math.round(mix(x[2],y[2],p))+")";}

/* ---------- 下準備（1回だけ作る） ---------- */
var CACHE={};
function canvas(w,h){var c=document.createElement("canvas");c.width=w;c.height=h;return c;}
function blob(color){var k="blob"+color;if(CACHE[k])return CACHE[k];var c=canvas(256,256),x=c.getContext("2d"),g=x.createRadialGradient(128,128,0,128,128,128);g.addColorStop(0,alpha(color,1));g.addColorStop(0.45,alpha(color,0.55));g.addColorStop(1,alpha(color,0));x.fillStyle=g;x.fillRect(0,0,256,256);return CACHE[k]=c;}
function grainTiles(){if(CACHE.grain)return CACHE.grain;var tiles=[];var seed=7;for(var n=0;n<4;n++){var c=canvas(256,256),x=c.getContext("2d"),img=x.createImageData(256,256);for(var i=0;i<img.data.length;i+=4){seed=(seed*1103515245+12345)&0x7fffffff;var v=seed%256;img.data[i]=img.data[i+1]=img.data[i+2]=v;img.data[i+3]=255;}x.putImageData(img,0,0);tiles.push(c);}return CACHE.grain=tiles;}
function vignetteSprite(){if(CACHE.vig)return CACHE.vig;var c=canvas(W,H),x=c.getContext("2d"),g=x.createRadialGradient(W/2,H/2,H*0.25,W/2,H/2,H*0.75);g.addColorStop(0,"rgba(0,0,0,0)");g.addColorStop(1,"rgba(0,0,0,1)");x.fillStyle=g;x.fillRect(0,0,W,H);return CACHE.vig=c;}

/* ---------- 図形 ---------- */
var shape={
  heart:function(c,x,y,s){c.beginPath();c.moveTo(x,y+s*0.3);c.bezierCurveTo(x,y-s*0.1,x-s*0.5,y-s*0.1,x-s*0.5,y+s*0.18);c.bezierCurveTo(x-s*0.5,y+s*0.48,x,y+s*0.62,x,y+s*0.8);c.bezierCurveTo(x,y+s*0.62,x+s*0.5,y+s*0.48,x+s*0.5,y+s*0.18);c.bezierCurveTo(x+s*0.5,y-s*0.1,x,y-s*0.1,x,y+s*0.3);c.closePath();},
  star:function(c,x,y,s,n){n=n||5;c.beginPath();for(var i=0;i<n*2;i++){var r=i%2?s*0.42:s,a=i*Math.PI/n-Math.PI/2;c.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}c.closePath();},
  sparkle:function(c,x,y,s){c.beginPath();c.moveTo(x,y-s);c.quadraticCurveTo(x,y,x+s,y);c.quadraticCurveTo(x,y,x,y+s);c.quadraticCurveTo(x,y,x-s,y);c.quadraticCurveTo(x,y,x,y-s);c.closePath();},
  roundRect:function(c,x,y,w,h,r){r=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();},
  circle:function(c,x,y,s){c.beginPath();c.arc(x,y,s,0,TAU);}
};

/* ---------- 背景（どれも全面を描く。重ねて使ってよい） ---------- */
var bg={
  /** 色の雲がゆっくり流れるグラデーション（メッシュグラデーション風）。colors[0]が地の色 */
  mesh:function(c,t,colors,o){o=o||{};if(!colors||!colors.length)colors=["#1a1030","#ff5c8a","#7a5cff"];var n=o.count||5,sp=o.speed||0.12;c.save();c.fillStyle=colors[0];c.fillRect(0,0,W,H);c.globalAlpha=o.alpha||0.85;if(o.blend)c.globalCompositeOperation=o.blend;
    for(var i=0;i<n;i++){var col=colors[1+i%(colors.length-1)]||colors[0];var x=W*(0.5+0.55*noise(t*sp+i*3.7,i+1)),y=H*(0.5+0.5*noise(t*sp*0.8+i*5.1,i+11)),r=W*(0.7+0.3*noise(t*sp*0.5+i,i+21));c.drawImage(blob(col),x-r,y-r,r*2,r*2);}
    c.restore();},
  /** ふわふわ漂う光の玉（奥行きつき） */
  bokeh:function(c,t,o){o=o||{};var n=o.count||26,cols=o.colors||["#ffffff"],sp=o.speed||40;c.save();c.globalCompositeOperation=o.blend||"lighter";
    for(var i=0;i<n;i++){var z=0.35+0.65*rand(i,3),r=(o.size||70)*z*(0.6+rand(i,5)),x=((rand(i,1)*(W+400)+t*sp*z*(rand(i,8)<.5?-1:1))%(W+400)+W+400)%(W+400)-200,y=((rand(i,2)*(H+400)-t*sp*0.8*z)%(H+400)+H+400)%(H+400)-200;
      c.globalAlpha=(o.alpha||0.35)*z*(0.6+0.4*Math.sin(t*1.5+i));c.drawImage(blob(cols[i%cols.length]),x-r,y-r,r*2,r*2);}
    c.restore();},
  /** 奥へ流れるパースのグリッド床（レトロ・サイバー系） */
  grid:function(c,t,o){o=o||{};var hy=o.horizon||H*0.58,col=o.color||"#ffffff",sp=o.speed||0.6,cx=o.cx||W/2;c.save();c.strokeStyle=col;c.lineWidth=o.lineWidth||3;
    for(var i=0;i<18;i++){var z=((i/18+t*sp*0.25)%1);var y=hy+(H-hy)*Math.pow(z,2.2);c.globalAlpha=(o.alpha||0.5)*z;c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}
    for(var j=-12;j<=12;j++){c.globalAlpha=(o.alpha||0.5)*0.8;c.beginPath();c.moveTo(cx+j*12,hy);c.lineTo(cx+j*(W/5),H);c.stroke();}
    c.restore();},
  /** 回転する放射線（サンバースト）。ここぞの見せ場の背景に */
  rays:function(c,t,o){o=o||{};var n=o.count||16,cx=o.x||W/2,cy=o.y||H*0.45,r=H*1.2;c.save();c.translate(cx,cy);c.rotate(t*(o.speed||0.25));c.fillStyle=o.color||"#ffffff";c.globalAlpha=o.alpha||0.18;
    for(var i=0;i<n;i++){c.beginPath();c.moveTo(0,0);c.arc(0,0,r,i*TAU/n,(i+0.5)*TAU/n);c.closePath();c.fill();}c.restore();},
  /** 漫画の集中線。驚き・強調の瞬間に（1秒に12回パラパラ変わる） */
  speedLines:function(c,t,o){o=o||{};var cx=o.x||W/2,cy=o.y||H*0.45,n=o.count||90,f=Math.floor(t*12),inner=o.inner||W*0.33;c.save();c.fillStyle=o.color||"#000000";c.globalAlpha=o.alpha||0.85;
    for(var i=0;i<n;i++){var a=rand(i+f*131,4)*TAU,w=0.004+rand(i+f*17,6)*0.012,r0=inner*(0.85+rand(i+f*7,9)*0.6);c.beginPath();c.moveTo(cx+Math.cos(a)*r0,cy+Math.sin(a)*r0);c.lineTo(cx+Math.cos(a-w)*H*1.3,cy+Math.sin(a-w)*H*1.3);c.lineTo(cx+Math.cos(a+w)*H*1.3,cy+Math.sin(a+w)*H*1.3);c.closePath();c.fill();}
    c.restore();},
  /** 波打つドット模様（ポップ・コミック系） */
  halftone:function(c,t,o){o=o||{};var g=o.size||44,col=o.color||"#ffffff";c.save();c.fillStyle=col;c.globalAlpha=o.alpha||0.25;var off=(t*(o.speed||30))%g;
    for(var y=-g;y<H+g;y+=g)for(var x=-g;x<W+g;x+=g){var px=x+off,py=y+off*0.5,r=g*0.32*(0.5+0.5*Math.sin(px*0.006+py*0.004-t*2));if(r>1){c.beginPath();c.arc(px,py,r,0,TAU);c.fill();}}
    c.restore();},
  /** 斜めに流れるストライプ */
  stripes:function(c,t,o){o=o||{};var w=o.width||90,col=o.color||"#ffffff";c.save();c.translate(W/2,H/2);c.rotate(o.angle===undefined?-0.5:o.angle);c.fillStyle=col;c.globalAlpha=o.alpha||0.12;var off=(t*(o.speed||80))%(w*2);
    for(var x=-H*1.2;x<H*1.2;x+=w*2)c.fillRect(x+off,-H*1.2,w,H*2.4);c.restore();},
  /** 下から浮かぶハート・星・キラキラ（恋愛・ほめる場面に） */
  floaters:function(c,t,o){o=o||{};var n=o.count||16,cols=o.colors||["#ff6b9d"],kind=o.shape||"heart",sp=o.speed||110;c.save();
    for(var i=0;i<n;i++){var z=0.4+0.6*rand(i,2),s=(o.size||46)*z,x=rand(i,1)*W+Math.sin(t*1.3+i)*30*z,y=((H+200-((t*sp*z+rand(i,3)*(H+400))%(H+400)))+H+400)%(H+400)-100;
      c.save();c.translate(x,y);c.rotate(Math.sin(t*1.7+i)*0.3);c.globalAlpha=(o.alpha||0.7)*z;c.fillStyle=cols[i%cols.length];shape[kind]?shape[kind](c,0,0,s):shape.heart(c,0,0,s);c.fill();c.restore();}
    c.restore();}
};

/* ---------- パーティクル（start の瞬間に弾ける） ---------- */
var particles={
  burst:function(c,t,start,o){o=o||{};var s=t-start,life=o.life||1.1;if(s<0||s>life)return;var n=o.count||40,cols=o.colors||["#ffffff"],x0=o.x||W/2,y0=o.y||H/2,sp=o.speed||900,g=o.gravity===undefined?1600:o.gravity,kind=o.shape||"circle";c.save();
    for(var i=0;i<n;i++){var a=(o.angle===undefined?rand(i,1)*TAU:o.angle+(rand(i,1)-0.5)*(o.spread||1.2)),v=sp*(0.35+0.65*rand(i,2)),x=x0+Math.cos(a)*v*s,y=y0+Math.sin(a)*v*s+0.5*g*s*s,k=1-s/life,size=(o.size||16)*(0.5+rand(i,3))*(0.4+0.6*k);
      c.save();c.translate(x,y);c.rotate(s*(rand(i,4)-0.5)*12);c.globalAlpha=Math.min(1,k*1.6);c.fillStyle=cols[i%cols.length];
      if(kind==="confetti"){c.scale(Math.cos(s*(6+rand(i,5)*10)),1);c.fillRect(-size*0.5,-size*0.3,size,size*0.6);}else if(shape[kind]){shape[kind](c,0,0,size);c.fill();}else{c.beginPath();c.arc(0,0,size*0.5,0,TAU);c.fill();}
      c.restore();}
    c.restore();},
  /** 広がる輪（衝撃波）。着地・決めの瞬間に */
  ring:function(c,t,start,o){o=o||{};var s=t-start,life=o.life||0.5;if(s<0||s>life)return;var p=ease.outCubic(s/life);c.save();c.strokeStyle=o.color||"#ffffff";c.globalAlpha=(1-p)*(o.alpha||0.9);c.lineWidth=(o.width||18)*(1-p)+1;c.beginPath();c.arc(o.x||W/2,o.y||H/2,(o.radius||420)*p,0,TAU);c.stroke();c.restore();}
};

/* ---------- 画面全体の質感 ---------- */
var fx={
  grain:function(c,t,amount){var tiles=grainTiles(),f=Math.floor(t*24);c.save();c.globalCompositeOperation="overlay";c.globalAlpha=amount===undefined?0.08:amount;var p=c.createPattern(tiles[((f%4)+4)%4],"repeat");c.translate(-hash(f)*256,-hash(f+3)*256);c.fillStyle=p;c.fillRect(0,0,W+256,H+256);c.restore();},
  vignette:function(c,strength){c.save();c.globalAlpha=strength===undefined?0.35:strength;c.drawImage(vignetteSprite(),0,0);c.restore();},
  flash:function(c,t,at,dur,color){var s=t-at;dur=dur||0.18;if(s<0||s>dur)return;c.save();c.globalAlpha=Math.pow(1-s/dur,2)*0.85;c.fillStyle=color||"#ffffff";c.fillRect(0,0,W,H);c.restore();},
  lightLeak:function(c,t,o){o=o||{};var col=o.color||"#ffb36b";c.save();c.globalCompositeOperation="screen";c.globalAlpha=(o.alpha||0.35)*(0.6+0.4*Math.sin(t*0.9));var x=W*(0.15+0.7*(0.5+0.5*noise(t*0.15,3))),y=H*(0.1+0.3*(0.5+0.5*noise(t*0.12,5))),r=W*0.9;c.drawImage(blob(col),x-r,y-r,r*2,r*2);c.restore();},
  /** 色収差風のにじみ（衝撃の瞬間だけ）。drawFn で同じ絵をずらして重ねる */
  rgbSplit:function(c,t,at,dur,drawFn){var s=t-at;if(s<0||s>dur)return;var k=(1-s/dur)*14;c.save();c.globalCompositeOperation="screen";c.globalAlpha=0.35;c.translate(k,0);drawFn(c);c.translate(-2*k,0);drawFn(c);c.restore();}
};

/* ---------- カメラ ---------- */
/** cam = {x, y, zoom, rot}（中心からのずれ）。world の絵をこの中で描く */
function camera(c,cam){cam=cam||{};c.translate(W/2+(cam.x||0),H/2+(cam.y||0));if(cam.rot)c.rotate(cam.rot);var z=cam.zoom===undefined?1:cam.zoom;c.scale(z,z);c.translate(-W/2,-H/2);}
/** 手持ちカメラのようなゆっくりした揺れ（止まった画面をなくす） */
function drift(t,amount){amount=amount===undefined?1:amount;return {x:noise(t*0.35,2)*14*amount,y:noise(t*0.3,5)*18*amount,zoom:1+0.025*amount*(0.5+0.5*noise(t*0.2,8)),rot:noise(t*0.25,11)*0.006*amount};}

/* ---------- 転換 ---------- */
/** at を中心に dur 秒で drawA → drawB に切り替える。type: wipe / circle / zoom / whip / shapes / slice / flash */
function transition(c,t,at,dur,type,drawA,drawB,o){
  o=o||{};var p=prog(t,at-dur/2,at+dur/2);if(p<=0){drawA(c);return;}if(p>=1){drawB(c);return;}
  var e=ease.inOutCubic(p),col=o.color||"#ffffff";
  if(type==="circle"){drawA(c);c.save();shape.circle(c,o.x||W/2,o.y||H/2,ease.inOutExpo(p)*H*1.2);c.clip();drawB(c);c.restore();return;}
  if(type==="zoom"){c.save();if(p<0.5){var z=1+ease.inExpo(p*2)*2.5;c.translate(W/2,H/2);c.scale(z,z);c.translate(-W/2,-H/2);drawA(c);}else{var z2=mix(0.75,1,ease.outExpo((p-0.5)*2));c.translate(W/2,H/2);c.scale(z2,z2);c.translate(-W/2,-H/2);drawB(c);}c.restore();fx.flash(c,p,0.5,0.25,col);return;}
  if(type==="whip"){var dir=o.dir||1;c.save();c.translate(-dir*W*e,0);drawA(c);c.restore();c.save();c.translate(dir*W*(1-e),0);drawB(c);c.restore();if(p>0.3&&p<0.7){c.save();c.globalAlpha=1-Math.abs(p-0.5)*5;c.fillStyle=alpha(col,0.6);for(var i=0;i<14;i++)c.fillRect(0,rand(i,7)*H,W,6+rand(i,8)*14);c.restore();}return;}
  if(type==="shapes"){var cols=o.colors||[col,"#000000",col];var mid=p<0.5;(mid?drawA:drawB)(c);c.save();c.translate(W/2,H/2);c.rotate(-0.35);for(var k=0;k<cols.length;k++){var q=prog(p,k*0.08,0.6+k*0.08),x=mix(-W*1.6,W*1.6,ease.inOutCubic(q));c.fillStyle=cols[k];c.fillRect(x-W*0.9,-H,W*1.8,H*2);}c.restore();return;}
  if(type==="slice"){var n=o.count||6,hh=H/n;drawA(c);for(var j=0;j<n;j++){var q2=ease.outExpo(prog(p,j*0.05,0.7+j*0.05));c.save();c.beginPath();c.rect(0,j*hh,W,hh+1);c.clip();c.translate((j%2?1:-1)*W*(1-q2),0);drawB(c);c.restore();}return;}
  if(type==="flash"){(p<0.5?drawA:drawB)(c);fx.flash(c,p,0.5,0.4,col);return;}
  /* wipe（斜めのワイプ＋色の帯） */
  drawA(c);var edge=mix(-W*0.6,W*1.6,e);c.save();c.beginPath();c.moveTo(edge-H*0.3,0);c.lineTo(-W,0);c.lineTo(-W,H);c.lineTo(edge+H*0.3,H);c.closePath();c.clip();drawB(c);c.restore();
  c.save();c.fillStyle=col;c.beginPath();c.moveTo(edge-H*0.3,0);c.lineTo(edge-H*0.3+40,0);c.lineTo(edge+H*0.3+40,H);c.lineTo(edge+H*0.3,H);c.closePath();c.fill();c.restore();
}

/* ---------- 文字 ---------- */
/** 文字を「見た目の1文字」ずつに分ける（絵文字や一部の漢字が2つに割れないように） */
var SEG=typeof Intl!=="undefined"&&Intl.Segmenter?new Intl.Segmenter("ja",{granularity:"grapheme"}):null;
function graphemes(str){str=String(str);if(SEG){var out=[];for(var it=SEG.segment(str)[Symbol.iterator](),r=it.next();!r.done;r=it.next())out.push(r.value.segment);return out;}return Array.from(str);}
/** 強調語にあたる文字の位置（見た目の1文字単位、改行は除く） */
function accentMap(str,words){var g=graphemes(String(str).replace(/\n/g,"")),map={};(words||[]).forEach(function(word){var wg=graphemes(word);if(!wg.length)return;for(var i=0;i+wg.length<=g.length;i++){var ok=true;for(var k=0;k<wg.length;k++)if(g[i+k]!==wg[k]){ok=false;break;}if(ok)for(var k2=0;k2<wg.length;k2++)map[i+k2]=1;}});return {map:map,count:g.length};}
var NO_HEAD="、。，．・：；？！」』）〕］｝〉》ゝゞーぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ!?),.";
function charWidth(c,ch){var k=c.font+"|"+ch;CACHE.cw=CACHE.cw||{};return CACHE.cw[k]||(CACHE.cw[k]=c.measureText(ch).width);}
function layout(c,str,maxWidth){var lines=[],cur=[],w=0;graphemes(str).forEach(function(ch){if(ch==="\n"){lines.push(cur);cur=[];w=0;return;}var cw=charWidth(c,ch);if(maxWidth&&w+cw>maxWidth&&cur.length&&NO_HEAD.indexOf(ch)<0){lines.push(cur);cur=[];w=0;}cur.push({ch:ch,w:cw});w+=cw;});if(cur.length)lines.push(cur);return lines;}
/**
 * 1文字ずつ動く文字。o = { size, family, weight, color, accentColor, accent:["強調する語"], stroke, strokeWidth, shadow,
 *   align:"center"|"left", maxWidth, lineHeight, start, stagger, dur, anim:"pop"|"slam"|"rise"|"drop"|"wave"|"type"|"none", end（退場の開始時刻） }
 */
function text(c,t,str,x,y,o){
  o=o||{};var size=o.size||96,lh=(o.lineHeight||1.25)*size,start=o.start||0,st=o.stagger===undefined?0.035:o.stagger,dur=o.dur||0.42,an=o.anim||"pop";
  c.save();c.font=(o.weight||900)+" "+size+"px "+(o.family?'"'+o.family+'",':"")+"sans-serif";c.textBaseline="middle";c.lineJoin="round";
  var lines=layout(c,str,o.maxWidth),accentAt=accentMap(str,o.accent).map;
  var idx=0,top=y-(lines.length-1)*lh/2;
  var outP=o.end===undefined?0:ease.inBack(prog(t,o.end,o.end+0.25));
  for(var li=0;li<lines.length;li++){
    var line=lines[li],lw=line.reduce(function(s,g){return s+g.w;},0),cx=o.align==="left"?x:x-lw/2,cy=top+li*lh;
    for(var gi=0;gi<line.length;gi++){
      var g=line[gi],i=idx++,p=prog(t,start+i*st,start+i*st+dur);if(p<=0&&an!=="none"){cx+=g.w;continue;}
      var sx=1,sy=1,dx=0,dy=0,a=1,rot=0;
      if(an==="pop"){var s=ease.outBackBig(p);sx=sy=s;a=Math.min(1,p*4);}
      else if(an==="slam"){var s2=mix(2.4,1,ease.outExpo(p));sx=sy=s2;a=Math.min(1,p*3);rot=(1-ease.outExpo(p))*(rand(i,3)-0.5)*0.6;}
      else if(an==="rise"){dy=(1-ease.outExpo(p))*size*0.9;a=ease.outCubic(p);}
      else if(an==="drop"){dy=-(1-ease.outBounce(p))*size*1.4;a=Math.min(1,p*3);}
      else if(an==="wave"){var s3=ease.outBack(p);sx=sy=s3;a=Math.min(1,p*4);dy=Math.sin(t*6-i*0.55)*size*0.07;}
      else if(an==="type"){a=p>0?1:0;}
      if(outP>0){a*=1-outP;dy-=outP*size*0.6;sx*=1-outP*0.3;sy*=1-outP*0.3;}
      var px=cx+g.w/2,py=cy+dy;
      c.save();c.translate(px+dx,py);if(rot)c.rotate(rot);c.scale(sx,sy);c.globalAlpha=a*(o.alpha===undefined?1:o.alpha);
      if(o.shadow){c.fillStyle=o.shadow;c.fillText(g.ch,-g.w/2+size*0.05,size*0.07);}
      if(o.stroke){c.strokeStyle=o.stroke;c.lineWidth=o.strokeWidth||size*0.16;c.strokeText(g.ch,-g.w/2,0);}
      c.fillStyle=accentAt[i]?(o.accentColor||"#ff3d7f"):(o.color||"#ffffff");c.fillText(g.ch,-g.w/2,0);c.restore();
      cx+=g.w;
    }
  }
  c.restore();
  var widest=Math.max.apply(null,lines.map(function(l){return l.reduce(function(s,g){return s+g.w;},0);}));
  return {width:widest,height:lines.length*lh,lines:lines.length};
}
/** 蛍光ペンで引いたような帯（文字の下に先に描く） */
function marker(c,t,x,y,w,h,start,color,dur){var p=ease.outExpo(prog(t,start,start+(dur||0.35)));if(p<=0)return;c.save();c.fillStyle=color||"#ffe14d";c.globalAlpha=0.9;c.beginPath();c.moveTo(x,y+h*0.1);c.lineTo(x+w*p,y);c.lineTo(x+w*p+h*0.15,y+h);c.lineTo(x+h*0.1,y+h*0.95);c.closePath();c.fill();c.restore();}
/** 吹き出し。tail はしっぽの先の座標。start でポンと出る */
function bubble(c,t,x,y,w,h,o){o=o||{};var p=ease.outBackBig(prog(t,o.start||0,(o.start||0)+0.35));if(p<=0)return 0;c.save();c.translate(x+w/2,y+h/2);c.scale(p,p);c.translate(-(x+w/2),-(y+h/2));c.fillStyle=o.color||"#ffffff";c.strokeStyle=o.stroke||"#222222";c.lineWidth=o.lineWidth||8;
  shape.roundRect(c,x,y,w,h,o.radius||48);c.fill();c.stroke();if(o.tailX!==undefined){c.beginPath();var bx=clamp(o.tailX,x+60,x+w-60);c.moveTo(bx-34,y+h-4);c.lineTo(o.tailX,o.tailY);c.lineTo(bx+34,y+h-4);c.closePath();c.fill();c.stroke();c.fillRect(bx-30,y+h-14,60,12);}c.restore();return p;}
/**
 * 字幕（ツールが用意する window.MG_CAPTIONS を、その時刻どおりに出す）。
 * style: "karaoke"（読まれた文字から色が変わる）/ "pop"（読まれる文字が順に弾んで出る）/ "plain"
 */
function caption(c,t,o){
  o=o||{};var caps=window.MG_CAPTIONS||[],cur=null;
  for(var i=0;i<caps.length;i++){if(t>=caps[i].start-0.04&&t<caps[i].end+0.06){cur=caps[i];break;}}
  if(!cur)return false;
  var size=o.size||66,y=o.y||1560,style=o.style||"karaoke",maxW=o.maxWidth||880,lh=size*1.3;
  c.save();c.font=(o.weight||900)+" "+size+"px "+(o.family?'"'+o.family+'",':"")+"sans-serif";c.textBaseline="middle";c.lineJoin="round";
  var lines=layout(c,cur.text,maxW),am=accentMap(cur.text,cur.emphasis),accentAt=am.map,total=am.count;
  var inP=ease.outBack(prog(t,cur.start-0.04,cur.start+0.1)),outP=prog(t,cur.end-0.02,cur.end+0.06);
  var span=Math.max(0.2,(cur.end-cur.start)*0.92),top=y-(lines.length-1)*lh/2;
  if(o.box!==false){var bw=Math.max.apply(null,lines.map(function(l){return l.reduce(function(s,g){return s+g.w;},0);}))+size*0.9,bh=lines.length*lh+size*0.45;c.save();c.globalAlpha=(1-outP)*Math.min(1,inP*1.5)*(o.boxAlpha===undefined?0.55:o.boxAlpha);c.fillStyle=o.boxColor||"#140a1e";shape.roundRect(c,W/2-bw/2,y-bh/2,bw,bh,size*0.5);c.fill();c.restore();}
  var idx=0;
  for(var li=0;li<lines.length;li++){
    var line=lines[li],lw=line.reduce(function(s,g){return s+g.w;},0),cx=W/2-lw/2,cy=top+li*lh;
    for(var gi=0;gi<line.length;gi++){
      var g=line[gi],k2=idx++,at=cur.start+span*k2/Math.max(1,total),said=t>=at,p=prog(t,at,at+0.14);
      var sc=1,a=(1-outP)*Math.min(1,inP*1.4),col=accentAt[k2]?(o.accentColor||"#ff5c8a"):(o.color||"#ffffff");
      if(style==="karaoke"){if(said)col=accentAt[k2]?(o.accentColor||"#ff5c8a"):(o.highlight||"#ffe14d");sc=1+0.18*(said?Math.sin(Math.PI*Math.min(1,p)):0);}
      else if(style==="pop"){if(!said){cx+=g.w;continue;}sc=ease.outBackBig(p);a*=Math.min(1,p*3);}
      c.save();c.translate(cx+g.w/2,cy);c.scale(sc,sc);c.globalAlpha=a;
      if(o.stroke!==false){c.strokeStyle=o.stroke||"#140a1e";c.lineWidth=o.strokeWidth||size*0.2;c.strokeText(g.ch,-g.w/2,0);}
      c.fillStyle=col;c.fillText(g.ch,-g.w/2,0);c.restore();cx+=g.w;
    }
  }
  c.restore();return true;
}
/* ---------- 画像（ツールが用意する window.MG_IMAGES）とLottieアニメ（window.MG_LOTTIES） ---------- */
var IMGS={},imgWaits=[];
Object.keys(window.MG_IMAGES||{}).forEach(function(name){var im=new Image();imgWaits.push(new Promise(function(r){im.onload=r;im.onerror=r;}));im.src=window.MG_IMAGES[name];IMGS[name]=im;});
if(imgWaits.length){var prevReady=window.MG_ASSETS_READY;window.MG_ASSETS_READY=Promise.all(imgWaits.concat(prevReady?[prevReady]:[]));}
function img(name){var im=IMGS[name];return im&&im.naturalWidth?im:null;}
/**
 * 画像を描く。o = {x, y, w, h（省略で全画面）, fit:"cover"|"contain", zoom, panX, panY（-1〜1）, alpha, radius（角丸）}
 * 画像が無ければ何もしない（false を返す）
 */
function image(c,name,o){
  o=o||{};var im=img(name);if(!im)return false;
  var x=o.x||0,y=o.y||0,w=o.w||W,h=o.h||H,z=o.zoom||1,iw=im.naturalWidth,ih=im.naturalHeight;
  var sc=(o.fit==="contain"?Math.min(w/iw,h/ih):Math.max(w/iw,h/ih))*z,dw=iw*sc,dh=ih*sc;
  var dx=x+(w-dw)/2+(o.panX||0)*Math.max(0,dw-w)/2,dy=y+(h-dh)/2+(o.panY||0)*Math.max(0,dh-h)/2;
  c.save();if(o.alpha!==undefined)c.globalAlpha*=o.alpha;
  if(o.radius){shape.roundRect(c,x,y,w,h,o.radius);c.clip();}else if(o.fit!=="contain"){c.beginPath();c.rect(x,y,w,h);c.clip();}
  c.imageSmoothingQuality="high";c.drawImage(im,dx,dy,dw,dh);c.restore();return true;
}
/** ゆっくり寄る・流れる（ケン・バーンズ）。from / to = {zoom, panX, panY}。背景画像を止めないために使う */
function kenBurns(c,t,name,start,dur,from,to,o){var p=ease.inOutCubic(prog(t,start,start+dur));from=from||{zoom:1.05};to=to||{zoom:1.18};
  return image(c,name,Object.assign({},o||{},{zoom:mix(from.zoom||1,to.zoom||1,p),panX:mix(from.panX||0,to.panX||0,p),panY:mix(from.panY||0,to.panY||0,p)}));}
var LOTS={};
/* Lottie は描く前に全部準備しておく（中の画像の読み込み待ちも MG_ASSETS_READY に含める。初回と2回目で絵が変わらないように） */
if(window.lottie){var lotWaits=[];Object.keys(window.MG_LOTTIES||{}).forEach(function(name){var data=window.MG_LOTTIES[name],cv=canvas(data.w||512,data.h||512);
  var anim=window.lottie.loadAnimation({renderer:"canvas",loop:false,autoplay:false,animationData:JSON.parse(JSON.stringify(data)),rendererSettings:{context:cv.getContext("2d"),clearCanvas:true,preserveAspectRatio:"xMidYMid meet"}});
  LOTS[name]={canvas:cv,anim:anim};
  lotWaits.push(new Promise(function(r){var done=false,fin=function(){if(!done){done=true;r();}};anim.addEventListener("loaded_images",fin);anim.addEventListener("DOMLoaded",function(){if(!(data.assets||[]).some(function(a){return a.p;}))fin();});setTimeout(fin,4000);}));});
  if(lotWaits.length){var prevL=window.MG_ASSETS_READY;window.MG_ASSETS_READY=Promise.all(lotWaits.concat(prevL?[prevL]:[]));}}
/** Lottieアニメを t に合わせて描く。o = {x, y, w, h（中心と大きさ）, start, speed, loop} */
function lottie(c,t,name,o){
  o=o||{};var data=(window.MG_LOTTIES||{})[name],L=LOTS[name];if(!data||!L)return false;
  var fr=data.fr||30,total=Math.max(1,(data.op||60)-(data.ip||0)),s=(t-(o.start||0))*(o.speed||1)*fr;
  if(s<0)return false;var f=o.loop?s%total:Math.min(s,total-1);
  L.anim.goToAndStop(f,true);
  var w=o.w||400,h=o.h||w*(L.canvas.height/L.canvas.width);c.save();if(o.alpha!==undefined)c.globalAlpha*=o.alpha;c.drawImage(L.canvas,(o.x===undefined?W/2:o.x)-w/2,(o.y===undefined?H/2:o.y)-h/2,w,h);c.restore();return true;
}

/* ---------- 立体っぽい演出（2.5D） ---------- */
/** 厚みのある立体文字。text と同じ引数に {depth, sideColor, dx, dy} を足す */
function text3d(c,t,str,x,y,o){o=o||{};var d=o.depth===undefined?18:o.depth,dx=o.dx===undefined?0.5:o.dx,dy=o.dy===undefined?1:o.dy,side=o.sideColor||"#140a1e";
  for(var k=d;k>0;k-=3){text(c,t,str,x+dx*k,y+dy*k,Object.assign({},o,{color:side,accentColor:side,stroke:o.stroke?side:undefined,shadow:undefined}));}
  return text(c,t,str,x,y,o);}
/**
 * 平面のカードを立体的に回す。drawFn(ctx2) で幅w×高さhのカードの中身を描く（左上が0,0）。
 * o = {x, y（中心）, w, h, rotY（左右に回す・ラジアン）, rotX（上下に倒す）, perspective, back: 裏面を描く関数}
 */
function card3d(c,drawFn,o){
  o=o||{};var w=Math.round(o.w||600),h=Math.round(o.h||800),P=o.perspective||1600,ry=o.rotY||0,rx=o.rotX||0,cx=o.x===undefined?W/2:o.x,cy=o.y===undefined?H/2:o.y;
  var key="card"+w+"x"+h,buf=CACHE[key]||(CACHE[key]=canvas(w,h)),b=buf.getContext("2d");
  var horizontal=Math.abs(rx)>Math.abs(ry),a=horizontal?rx:ry,back=Math.cos(a)<0;
  /* 前回の描画設定を持ち越さないよう、毎回まっさらにしてから描く */
  b.setTransform(1,0,0,1,0,0);b.globalAlpha=1;b.globalCompositeOperation="source-over";b.filter="none";b.shadowBlur=0;b.shadowColor="rgba(0,0,0,0)";b.clearRect(0,0,w,h);
  b.save();
  if(back&&o.back){o.back(b);}else{if(back){b.translate(horizontal?0:w,horizontal?h:0);b.scale(horizontal?1:-1,horizontal?-1:1);}drawFn(b);}
  b.restore();
  var n=48,len=horizontal?h:w,cs=Math.cos(a),sn=Math.sin(a);
  for(var i=0;i<n;i++){
    var u0=-len/2+len*i/n,u1=-len/2+len*(i+1)/n,z0=u0*sn,z1=u1*sn,s0=P/(P+z0),s1=P/(P+z1),p0=u0*cs*s0,p1=u1*cs*s1,sm=(s0+s1)/2;
    if(Math.abs(p1-p0)<0.01)continue;
    var lo=Math.min(p0,p1),span=Math.abs(p1-p0)+0.8,srcI=back?n-1-i:i;
    if(horizontal)c.drawImage(buf,0,(srcI*len)/n,w,len/n+0.5,cx-w*sm/2,cy+lo,w*sm,span);
    else c.drawImage(buf,(srcI*len)/n,0,len/n+0.5,h,cx+lo,cy-h*sm/2,span,h*sm);
  }
}

/* ---------- 漫画（コマ割り・吹き出し・描き文字・集中線・トーン） ---------- */
function polyPath(c,pts){c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(var i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);c.closePath();}
/* 自分で作った {x, y, w, h} だけのコマ枠でも使えるように、足りない値を補う（無ければ null） */
function normRect(r){if(!r||typeof r!=="object")return null;if(r.pts&&r.pts.length>2&&r.cx!==undefined)return r;var x=+r.x||0,y=+r.y||0,w=+(r.w||r.width)||W,h=+(r.h||r.height)||H;return rectOf(x,y,w,h,r.pts&&r.pts.length>2?r.pts:undefined);}
function rectOf(x,y,w,h,pts){return {x:x,y:y,w:w,h:h,cx:x+w/2,cy:y+h/2,pts:pts||[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]};}
var manga={
  /** コマ割り。kind: "1" / "2v"（上下2段）/ "2d"（斜めに2分割）/ "3"（上1・下2）/ "4"（縦に4段）。o = {x, y, w, h（ページの範囲）, gap} */
  layout:function(kind,o){o=o||{};var x=o.x===undefined?50:o.x,y=o.y===undefined?170:o.y,w=o.w||W-x*2,h=o.h||1250,g=o.gap===undefined?26:o.gap;kind=String(kind||"1");
    if(kind==="2v"){var h2=(h-g)/2;return [rectOf(x,y,w,h2),rectOf(x,y+h2+g,w,h2)];}
    if(kind==="2d"){var a=h*0.56,b=h*0.40,d=g*0.7;return [rectOf(x,y,w,a,[[x,y],[x+w,y],[x+w,y+b-d],[x,y+a-d]]),rectOf(x,y+b,w,h-b,[[x,y+a+d],[x+w,y+b+d],[x+w,y+h],[x,y+h]])];}
    if(kind==="3"){var t3=(h-g)*0.5,w3=(w-g)/2;return [rectOf(x,y,w,t3),rectOf(x,y+t3+g,w3,h-t3-g),rectOf(x+w3+g,y+t3+g,w3,h-t3-g)];}
    if(kind==="4"){var h4=(h-g*3)/4,out=[];for(var i=0;i<4;i++)out.push(rectOf(x,y+i*(h4+g),w,h4));return out;}
    return [rectOf(x,y,w,h)];},
  /**
   * コマを1つ描く。rect は layout の1要素。o = {image（素材名）, start, from:"left"|"right"|"top"|"bottom"|"zoom"|"none",
   *   zoomFrom, zoomTo, zoomDur, panX, panY, draw(ctx, rect, t)（絵が無いときや絵に重ねたいとき）, paper（地の色）, border, end（退場の開始時刻）}
   * 出た割合（0〜1）を返す
   */
  panel:function(c,t,rect,o){o=o||{};rect=normRect(rect);if(!rect)return 0;var start=o.start||0,p=ease.outExpo(prog(t,start,start+0.45));if(p<=0)return 0;
    var out=o.end===undefined?0:ease.inCubic(prog(t,o.end,o.end+0.3));if(out>=1)return 0;
    var from=o.from||"left",dx=0,dy=0,sc=1;
    if(from==="left")dx=-(1-p)*(rect.x+rect.w+40);else if(from==="right")dx=(1-p)*(W-rect.x+40);else if(from==="top")dy=-(1-p)*(rect.y+rect.h+40);else if(from==="bottom")dy=(1-p)*(H-rect.y+40);else if(from==="zoom")sc=mix(0.6,1,ease.outBackBig(prog(t,start,start+0.45)));
    c.save();c.globalAlpha*=(from==="none"||from==="zoom"?Math.min(1,p*2):1)*(1-out);c.translate(dx,dy);
    if(sc!==1){c.translate(rect.cx,rect.cy);c.scale(sc,sc);c.translate(-rect.cx,-rect.cy);}
    var bw=o.border===undefined?10:o.border;
    c.save();c.translate(14,16);c.fillStyle="rgba(20,10,30,0.28)";polyPath(c,rect.pts);c.fill();c.restore();
    c.save();polyPath(c,rect.pts);c.clip();c.fillStyle=o.paper||"#fdfbf6";c.fillRect(rect.x,rect.y,rect.w,rect.h);
    var zd=o.zoomDur||4,z=mix(o.zoomFrom===undefined?1:o.zoomFrom,o.zoomTo===undefined?1.12:o.zoomTo,ease.inOutCubic(prog(t,start,start+zd)));
    if(o.image)image(c,o.image,{x:rect.x,y:rect.y,w:rect.w,h:rect.h,zoom:z,panX:o.panX||0,panY:o.panY===undefined?-0.2:o.panY});
    if(o.draw)o.draw(c,rect,t);
    c.restore();
    c.strokeStyle=o.borderColor||"#141018";c.lineWidth=bw;c.lineJoin="miter";polyPath(c,rect.pts);c.stroke();
    c.restore();return p*(1-out);},
  /**
   * 吹き出し。x, y は吹き出しの中心。o = {start, end, kind:"speech"|"shout"|"thought", tailX, tailY（しっぽの先）,
   *   size（文字の大きさ）, maxWidth, color（文字色）, fill, stroke, vertical:false}
   */
  bubble:function(c,t,str,x,y,o){o=o||{};var start=o.start||0,p=ease.outBackBig(prog(t,start,start+0.32));if(p<=0)return 0;
    var out=o.end===undefined?0:prog(t,o.end,o.end+0.2);if(out>=1)return 0;
    var kind=o.kind||"speech",size=o.size||(kind==="shout"?62:54),fill=o.fill||"#ffffff",stroke=o.stroke||"#141018",lw=o.lineWidth||9;
    c.save();c.font=(o.weight||900)+" "+size+"px "+(o.family?'"'+o.family+'",':"")+"sans-serif";c.textBaseline="middle";
    var lines=layout(c,str,o.maxWidth||(kind==="shout"?520:440)),lh=size*1.22,tw=Math.max.apply(null,lines.map(function(l){return l.reduce(function(s,g){return s+g.w;},0);}).concat([size])),th=lines.length*lh;
    var rx=tw/2+size*(kind==="shout"?1.25:0.95),ry=th/2+size*(kind==="shout"?1.0:0.8);
    var jig=kind==="shout"?Math.sin(t*40)*3*(1-prog(t,start,start+0.6)):0,ex=rx*(kind==="shout"?1.4:1.05)+16,ey=ry*(kind==="shout"?1.4:1.05)+16;
    /* 画面からはみ出さないように中心を寄せる（しっぽの先はそのまま） */
    x=clamp(x,Math.min(ex,W/2),Math.max(W-ex,W/2));y=clamp(y,Math.min(ey,H/2),Math.max(H-ey,H/2));
    c.translate(x+jig,y);c.scale(p*(1-out*0.3),p*(1-out*0.3));c.globalAlpha*=1-out;c.lineJoin="round";
    var hasTail=o.tailX!==undefined&&o.tailY!==undefined,tx=hasTail?o.tailX-x:0,ty=hasTail?o.tailY-y:0,ang=Math.atan2(ty/ry,tx/rx);
    function body(){if(kind==="shout"){var n=22;c.beginPath();for(var i=0;i<n*2;i++){var a=i*Math.PI/n,r=i%2?1:1.22+rand(i,5)*0.18;c.lineTo(Math.cos(a)*rx*r,Math.sin(a)*ry*r);}c.closePath();}
      else if(kind==="thought"){c.beginPath();var m=11;for(var j=0;j<m;j++){var a2=j*TAU/m,br=Math.min(rx,ry)*0.42;c.moveTo(Math.cos(a2)*rx*0.92+br,Math.sin(a2)*ry*0.92);c.arc(Math.cos(a2)*rx*0.92,Math.sin(a2)*ry*0.92,br,0,TAU);}c.moveTo(rx*0.95,0);c.ellipse(0,0,rx*0.95,ry*0.95,0,0,TAU);}
      else{c.beginPath();c.ellipse(0,0,rx,ry,0,0,TAU);}}
    function tail(){if(!hasTail)return;c.beginPath();
      if(kind==="thought"){for(var k=0;k<3;k++){var q=0.55+k*0.22,r2=size*(0.42-k*0.11);c.moveTo(tx*q+r2,ty*q);c.arc(tx*q,ty*q,r2,0,TAU);}return;}
      var spread=kind==="shout"?0.16:0.22;c.moveTo(Math.cos(ang-spread)*rx*0.8,Math.sin(ang-spread)*ry*0.8);c.lineTo(tx,ty);c.lineTo(Math.cos(ang+spread)*rx*0.8,Math.sin(ang+spread)*ry*0.8);c.closePath();}
    c.strokeStyle=stroke;c.lineWidth=lw*2;c.fillStyle=fill;
    body();c.stroke();tail();c.stroke();body();c.fill();tail();c.fill();
    c.fillStyle=o.color||"#141018";var top=-(lines.length-1)*lh/2;
    for(var li=0;li<lines.length;li++){var line=lines[li],lwd=line.reduce(function(s,g){return s+g.w;},0),cx=-lwd/2;for(var gi=0;gi<line.length;gi++){c.fillText(line[gi].ch,cx,top+li*lh);cx+=line[gi].w;}}
    c.restore();return p;},
  /** 描き文字（ドキッ・ガーン など）。o = {start, end, size, color, rot（傾き・ラジアン）, stroke, step（1文字ずつずらす量）} */
  sfx:function(c,t,str,x,y,o){o=o||{};var start=o.start||0;if(t<start)return;var out=o.end===undefined?0:prog(t,o.end,o.end+0.25);if(out>=1)return;
    var size=o.size||150,g=graphemes(str),step=o.step===undefined?0.62:o.step,rot=o.rot===undefined?-0.14:o.rot;
    c.save();c.translate(x,y);c.rotate(rot);c.font="900 "+size+"px "+(o.family?'"'+o.family+'",':"")+"sans-serif";c.textBaseline="middle";c.textAlign="center";c.lineJoin="round";c.globalAlpha*=1-out;
    var n=g.length,x0=-(n-1)*size*0.78/2,y0=-(n-1)*size*step*0.35/2;
    for(var i=0;i<n;i++){var s=t-start-i*0.05,q=prog(s,0,0.3);if(q<=0)continue;var sc=mix(2.2,1,ease.outExpo(q))*(1+0.04*Math.sin(t*16+i*1.7)),j=shake(t,start+i*0.05,0.4,10,i+1);
      c.save();c.translate(x0+i*size*0.78+j.x,y0+i*size*step*0.35*(i%2?1.25:0.75)+j.y);c.rotate((rand(i,9)-0.5)*0.35);c.scale(sc,sc);
      c.strokeStyle="#141018";c.lineWidth=size*0.34;c.strokeText(g[i],0,0);c.strokeStyle=o.stroke||"#ffffff";c.lineWidth=size*0.18;c.strokeText(g[i],0,0);
      c.fillStyle=o.color||"#ff3d7f";c.fillText(g[i],0,0);c.restore();}
    c.restore();},
  /** 集中線（コマの中だけ）。o = {x, y（中心。省略でコマの中心）, count, color, alpha, inner（線が届かない真ん中の大きさ 0〜1）} */
  lines:function(c,t,rect,o){o=o||{};rect=normRect(rect);if(!rect)return;var cx=o.x===undefined?rect.cx:o.x,cy=o.y===undefined?rect.cy:o.y,n=o.count||80,f=Math.floor(t*12),R=Math.hypot(rect.w,rect.h),inner=Math.min(rect.w,rect.h)*(o.inner===undefined?0.36:o.inner);
    c.save();polyPath(c,rect.pts);c.clip();c.fillStyle=o.color||"#141018";c.globalAlpha*=o.alpha===undefined?0.8:o.alpha;
    for(var i=0;i<n;i++){var a=(i+rand(i+f*n,2)*0.8)*TAU/n,r0=inner*(0.85+rand(i+f*n,3)*0.5),wd=0.006+rand(i+f*n,4)*0.016;
      c.beginPath();c.moveTo(cx+Math.cos(a)*r0,cy+Math.sin(a)*r0);c.lineTo(cx+Math.cos(a-wd)*R,cy+Math.sin(a-wd)*R);c.lineTo(cx+Math.cos(a+wd)*R,cy+Math.sin(a+wd)*R);c.closePath();c.fill();}
    c.restore();},
  /** スクリーントーン（網点）。o = {color, alpha, size（点の間隔）, fade:"down"|"up"|"none"（下ほど濃く など）} */
  tone:function(c,rect,o){o=o||{};rect=normRect(rect);if(!rect)return;var gsz=o.size||16,fade=o.fade||"down";
    c.save();polyPath(c,rect.pts);c.clip();c.fillStyle=o.color||"#141018";c.globalAlpha*=o.alpha===undefined?0.28:o.alpha;
    for(var yy=rect.y,row=0;yy<rect.y+rect.h+gsz;yy+=gsz*0.87,row++){var k=fade==="none"?1:fade==="up"?1-(yy-rect.y)/rect.h:(yy-rect.y)/rect.h;k=clamp(k,0.05,1);var r=gsz*0.42*k;if(r<0.6)continue;
      c.beginPath();for(var xx=rect.x+(row%2?gsz/2:0);xx<rect.x+rect.w+gsz;xx+=gsz){c.moveTo(xx+r,yy);c.arc(xx,yy,r,0,TAU);}c.fill();}
    c.restore();}
};

/** 数字のカウントアップ */
function count(t,start,dur,from,to,decimals){var v=mix(from,to,ease.outExpo(prog(t,start,start+dur)));return v.toFixed(decimals||0);}

window.MGK={W:W,H:H,clamp:clamp,mix:mix,prog:prog,rand:rand,noise:noise,ease:ease,anim:anim,spring:spring,punch:punch,envelope:envelope,keys:keys,hop:hop,shake:shake,voice:voice,
  rgb:rgb,alpha:alpha,mixColor:mixColor,shape:shape,bg:bg,particles:particles,fx:fx,camera:camera,drift:drift,transition:transition,text:text,caption:caption,marker:marker,bubble:bubble,count:count,img:img,image:image,kenBurns:kenBurns,lottie:lottie,text3d:text3d,card3d:card3d,manga:manga};
})();`;
