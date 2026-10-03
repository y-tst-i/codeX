#!/bin/bash
# 仕上げの「ルック」を動画全体にかける(ベタ塗りののっぺり感を和らげる)。トークンはほぼ不要。
# usage: look_pass.sh <in.mp4> <out.mp4> [soft|cinematic|heavy]   映像だけを加工し、音は元のまま
#  効果: ① 明部のにじみ(ブルーム)② 暖色のハレーション(光が赤く滲む)③ フィルムの粒(グレイン)④ 周辺減光 ⑤ 軽い色調整
#  注意: 場面の BIBLE で「ビネットは s5 専用」などと決めた場合は preset を soft にするか、vignette を外す。
#        深度の霞(遠いものが薄くなる)や、本当の被写界深度は後処理では作れない → 場面の描画側で(§19)
set -e
in=$1; out=$2; p=${3:-cinematic}; SS=${SS:-0}; T=${T:-}   # 試し: SS=5.5 T=1 look_pass.sh ... で一部だけ
case $p in
  soft)      B=0.35; S=18; G=4;  V="PI/7"; H=0.0 ;;
  cinematic) B=0.55; S=28; G=8;  V="PI/5"; H=0.25 ;;
  heavy)     B=0.75; S=40; G=12; V="PI/4"; H=0.4 ;;
esac
fc="[0:v]format=gbrp,split=3[a][b][c];
[b]eq=brightness=-0.22:contrast=1.7:saturation=1.1,gblur=sigma=$S[bl];
[c]eq=brightness=-0.3:contrast=1.9,gblur=sigma=$(echo "$S*2" | bc),colorchannelmixer=rr=1.0:gg=0.45:bb=0.2[ha];
[a][bl]blend=all_mode=screen:all_opacity=$B[x1];
[x1][ha]blend=all_mode=screen:all_opacity=$H[x2];
[x2]eq=contrast=1.05:saturation=1.08,noise=alls=$G:allf=t,vignette=$V:mode=forward,format=yuv420p[v]"
ffmpeg -y -v error ${SS:+-ss $SS} ${T:+-t $T} -i "$in" -filter_complex "$fc" -map "[v]" -map 0:a? -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -c:a copy -movflags +faststart "$out"
ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames,width,height -of csv=p=0 "$out"
