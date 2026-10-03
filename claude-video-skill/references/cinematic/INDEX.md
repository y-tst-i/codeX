# 映像技法 索引(自動生成)

全424技法。`ファイル` の該当エントリに、物語での役割・使う/使わない・失敗・HyperFramesでの作り方がある。
出典: melies.co/cinematic-techniques(要約・再構成)。

## atmosphere (13)

| 技法 | slug | ファイル | 一言 | 適性 |
|---|---|---|---|---|
| ほこり / Dust Motes | `dust-motes` | color-atmosphere.md | 光の筋の中を漂う、数えられる微細な粒。ゆっくり動いて、止まった空気の中の時間を見せる。 | ★(canvas+clip-path)。 |
| 砂塵 / Dust and Sand | `dust-storm` | color-atmosphere.md | 風に運ばれる鉱物の粒が近景の空気を満たし、太陽を鈍い円盤にして人影をシルエットにする。 | ★★(多層だが全て純関数)。 |
| 霧 / Fog | `fog` | color-atmosphere.md | 近距離の濃い水滴の層が奥行きを潰し、街灯を光の球に変え、人物の登場を遅らせる。 | ★★(多層のノイズ+深度設計)。 |
| 大気遠近(ヘイズ) / Atmospheric Haze | `haze` | color-atmosphere.md | 距離による散乱で遠景ほど淡く青く(明るく)なり、数キロの空気を奥行きの手がかりにする。 | ★★(面の設計は静的で、動きは視差だけ)。 |
| もや / Mist | `mist` | color-atmosphere.md | 霧より薄い水滴の層で、次の面がまだ読める、叙情的な空気。 | ★★。 |
| 海 / Ocean | `ocean` | color-atmosphere.md | 海を「もう一人の俳優」として扱い、うねり・水平線・塩の逆光・小さな人間を見せる水面の世界。 | ★★★(正しい波の関数が要る。不向きな場合は、` |
| 雨 / Rain | `rain` | color-atmosphere.md | 降る水が空気を筋として見せ、地面を鏡に変える。逆光で初めて見え、濡れた地面とセットで成立する。 | ★★(多層canvas。粒数を守れば軽い)。 |
| 煙 / Smoke | `smoke` | color-atmosphere.md | 発生源と方向を持つ燃焼の粒が体積となり、光に当たって筋や渦になる。 | ★★(スプライト+歪み。写実は難しいが様式的には |
| 雪 / Snow | `snow` | color-atmosphere.md | 降って積もる氷の粒。逆光で大きな片が見え、世界が吸音されたように静かになり、足跡が残る。 | ★(canvas)。 |
| 火花と残り火 / Sparks and Embers | `sparks` | color-atmosphere.md | 溶接・火・研削・煙草が飛ばす白熱の粒。短い軌道を描いて燃え尽きる、橙色の天気。 | ★★(弾道とカラーランプ)。 |
| 蒸気 / Steam | `steam` | color-atmosphere.md | 熱が冷たい空気と出会う場所に生じる、白く上昇して薄れる水蒸気。 | ★★。 |
| 水中 / Underwater | `underwater` | color-atmosphere.md | レンズが水の中に入り、コースティクス(光の網目)・浮力・水平線のない空間が全ての縁を書き換える。 | ★★(層は多いが全てフィルタと純関数)。 |
| 濡れ路面 / Wet-Down | `wet-down` | color-atmosphere.md | 舗装や車に水を撒いて、夜の灯が地面に二重に映るようにする。空気中の水(雨)はなくてよい。 | ★★(反射の複製とフィルタ)。 |

## camera-angles (19)

| 技法 | slug | ファイル | 一言 | 適性 |
|---|---|---|---|---|
| バードアイ(鳥瞰) / Bird's-Eye View | `birds-eye` | framing-angles.md | 非常に高い所から急角度(おおよそ70〜90°)で見下ろし、人や家具が地図のように見える。 | ★★(平面図用の素材を描き起こす必要がある)。 |
| ダッチアングル(傾いたカメラ) / Dutch Angle | `dutch-angle` | framing-angles.md | カメラを光軸まわりにロールさせ、水平線と垂直線を斜めにする(多くは固定)。 | ★。 |
| アイレベル / Eye Level | `eye-level` | framing-angles.md | カメラを被写体の目の高さに置き、視線を水平にして、地平線も水平にする基準のアングル。 | ★(基準なので簡単。ここから外す判断が主題)。 |
| 一人称 / First-Person | `first-person` | framing-angles.md | レンズを人物の「体」にする。手・息・道具・歩きが画面に入り、持ち主の存在を感じさせる主観カメラ。 | ★★。 |
| 第四の壁を破る視線 / Fourth Wall | `fourth-wall` | framing-angles.md | 人物が目をレンズに向け、場面が観客の存在を認める。 | ★★(正面素材が必要。シルエットだけなら「目の2 |
| グラウンドレベル / Ground Level | `ground-level` | framing-angles.md | レンズをほぼ地面に置き、靴・裾・車輪・土を主役にする低位置のアングル。 | ★★(手前の素材の描き込みが要る)。 |
| ハイアングル / High Angle | `high-angle` | framing-angles.md | 目より高いところから斜めに見下ろし、床が多く入り、人物が小さく見える。 | ★★。 |
| ヒップレベル / Hip Level | `hip-level` | framing-angles.md | カメラをベルト・ホルスターの高さ(約90〜110cm)に置き、手・歩き・武器を焦点面に入れる。 | ★。 |
| インクライン / Incline | `incline` | framing-angles.md | カメラをわずかにロールさせ、床が傾いたように感じさせる、ダッチよりずっと弱い傾き。 | ★。 |
| ローアングル / Low Angle | `low-angle` | framing-angles.md | 目より低い位置から見上げ、垂直線が上へ収束して天井や空が入る。 | ★★。 |
| オブジェクトPOV / Object POV | `object-pov` | framing-angles.md | 道具・ボール・弾丸・スマホ・乗り物など、物の視点。カメラが物に固定され、世界のほうが動く。 | ★★。 |
| オーバーヘッド(真俯瞰) / Overhead Top-Down | `overhead` | framing-angles.md | ほぼ真上(90°)から見下ろし、体や空間を平面図のような図形にする。 | ★(平面で描くので簡単。素材の統一が要る)。 |
| ポイントオブビュー(主観ショット) / Point of View | `pov` | framing-angles.md | 人物の目に映るものを、その目の高さで見せる。持ち主の頭や肩は画面に出ない。 | ★。 |
| プロフィール(横顔) / Profile | `profile` | framing-angles.md | カメラを顔の側面(90°)に置き、耳・あご・鼻が建築のように見え、視線は画面の外。 | ★(heroがそのまま横顔なので最も簡単)。 |
| リバースアングル / Reverse Angle | `reverse-angle` | framing-angles.md | 同じ空間関係を反対側から見て、視線・会話・対決の軸を完成させる。180度ラインは守る。 | ★。 |
| ショルダーレベル / Shoulder Level | `shoulder-level` | framing-angles.md | カメラを目より少し低い肩の高さ(5〜20cm下)に置く、歩く同行者の目線。 | ★。 |
| スリークォーターアングル(斜め45°) / Three-Quarter Angle | `three-quarter` | framing-angles.md | 顔をカメラに対して約45°に向け、両目が見え、奥の頬が引いていく標準の肖像角度。 | ★★(ヨーの素材が要る。素材が横顔のみなら不向き |
| トランクショット / Trunk Shot | `trunk-shot` | framing-angles.md | 車のトランクなどの狭い箱の内側から、蓋を開けて覗き込む人々を見上げる。 | ★★。 |
| ワームズアイビュー(虫の目) / Worm's-Eye View | `worms-eye` | framing-angles.md | 地面か地下から真上近くを見上げる極端なロー。垂直線が内側へ潰れ、被写体は塔になる。 | ★★。 |

## camera-movement (86)

| 技法 | slug | ファイル | 一言 | 適性 |
|---|---|---|---|---|
| 3Dローテーション / 3D Rotation | `3d-rotation` | camera-movement-1.md | 被写体を「空間のターンテーブル」に載せ、仮想カメラが球面・円周上を回って全方向を見せる。 | ★★(2D絵は厚み・背面の用意が要る。3Dモデル |
| エアリアルプルバック / Aerial Pullback | `aerial-pullback` | camera-movement-1.md | 高空で上昇しながら後退し、人物や建物が風景の中の小さな点になるまで引く。 | ★★(素材の解像度とLODの用意)。 |
| エアリアルプッシュイン / Aerial Push In | `aerial-push` | camera-movement-1.md | 高空から降下・接近し、地図の中から1人の人物を拾い上げる。 | ★★。 |
| エアリアル / Aerial | `aerial` | camera-movement-1.md | 高空を飛ぶカメラで、地理を地図のように読ませ、人や車を小さく見せる。 | ★★。 |
| アーク左 / Arc Left | `arc-left` | camera-movement-1.md | 被写体を向いたまま、半径を保って左へ約4分の1周する曲線移動。 | ★★(層の奥行設計)。 |
| アーク右 / Arc Right | `arc-right` | camera-movement-1.md | 被写体を向いたまま、右へ約4分の1周する曲線移動。 | ★★。 |
| アーク / Arc | `arc` | camera-movement-1.md | カメラが円弧の一部を描いて被写体のまわりを移動し、視線は被写体に向け続ける。 | ★★。 |
| ボルトカム / Bolt Cam | `bolt-cam` | camera-movement-1.md | 超高速カメラをレールや射出機構で衝突点へ投げ込み、当たった瞬間に止める。 | ★★(層の配置と停止の演出)。実写の「打撃を食ら |
| バックルアップ / Buckle Up | `buckle-up` | camera-movement-1.md | レンズを車内に固定して人物と一緒に乗り、窓の外を高速で流す。 | ★★(窓の中の高速背景と、車内の人物シルエットの |
| カメラロール / Camera Roll | `camera-roll` | camera-movement-1.md | フレームをレンズ軸まわりに回し続け(または部屋ごと回し)、「上」が失われた世界を見せる。 | ★★(質量感を作るにはBの構築が要る。Aだけなら |
| カーチェイシング / Car Chasing | `car-chasing` | camera-movement-1.md | 別の車両から速度を合わせて追跡し、道路を舞台にした「狩る側の目」で撮る。 | ★★(消失点を軸にした放射移動の設計)。 |
| カーグリップ / Car Grip | `car-grip` | camera-movement-1.md | ボンネットやドア、バンパーにカメラを固定し、車体を近景に置いて路面を滑らせる。 | ★★(車体シルエットの描画)。 |
| コレオ / Choreo | `choreo` | camera-movement-1.md | 身体とカメラを同じ拍で動かし、1つのフレーズとして完結させる。 | 不向き(実身体の振付)。代替の拍設計カメラは★★ |
| コンベア / Conveyor | `conveyor` | camera-movement-1.md | 世界をベルトのように一定速度で横に流し続ける、工場的・無限ライン的な移動。 | ★(単純な周期移動)。 |
| クレーンダウン / Crane Down | `crane-down` | camera-movement-1.md | アームでカメラを高い引きから人の高さまで降ろし、地図から顔へ世界を縮める。 | ★★(3D配置と視差層の用意)。 |
| クレーンオーバーザヘッド / Crane Over The Head | `crane-over-the-head` | camera-movement-1.md | アームを上げ続け、カメラがほぼ真下を向く(ナディア)終点まで上昇し、人物を地図にする。 | ★★。 |
| クレーンオーバー / Crane Over | `crane-over` | camera-movement-1.md | ジブやクレーンで上昇しつつ弧を描き、見下ろす角度に至るまで高さと角度を同時に変える。 | ★★。 |
| クレーンアップ / Crane Up | `crane-up` | camera-movement-1.md | ジブやテクノクレーンでカメラを持ち上げ(少し後退も加え)、人の高さから場所全体の眺めへ移る。 | ★★。 |
| クラッシュズームイン / Crash Zoom In | `crash-zoom-in` | camera-movement-1.md | カメラ位置を動かさず、焦点距離を1秒未満で一気に詰めてディテールに寄る光学的な一撃。 | ★(2Dではもっとも簡単な部類)。 |
| クラッシュズームアウト / Crash Zoom Out | `crash-zoom-out` | camera-movement-1.md | 寄った画から一気に広い画へ、焦点距離を1秒未満でスナップさせて環境を放り出す。 | ★。 |
| ドリーイン / Dolly In | `dolly-in` | camera-movement-1.md | カメラ全体を車輪付きの台やレールで被写体へ進め、視差を伴って周囲を排除していく。 | ★★(層の奥行設計)。 |
| ドリー左 / Dolly Left | `dolly-left` | camera-movement-1.md | カメラ本体を左へ平行移動し、首を振らずに空間を滑らせ、背景が視差で剥がれる。 | ★(層の配置のみ)。 |
| ドリーアウト / Dolly Out | `dolly-out` | camera-movement-1.md | カメラ全体を後退させ、視差を伴って世界を広げ、被写体が建築の中で小さくなる。 | ★★。 |
| ドリー右 / Dolly Right | `dolly-right` | camera-movement-1.md | カメラ本体を右へ平行移動し、パンせずに右側の情報を開示する。 | ★。 |
| ドリーズームイン / Dolly Zoom In | `dolly-zoom-in` | camera-movement-1.md | 前進しながらレンズを広角側へ引き、被写体の大きさを保つ(または増す)まま背景を内側へゆがめる。 | ★★(層の奥行設計)。平らな1枚絵には効かない。 |
| ドリーズームアウト / Dolly Zoom Out | `dolly-zoom-out` | camera-movement-1.md | 後退しながらレンズを望遠へ寄せ、被写体の大きさを保ちながら背景の空間が変形する。 | ★★。 |
| ドリーズーム / Dolly Zoom | `dolly-zoom` | camera-movement-1.md | カメラの移動と逆向きのズームで被写体の大きさを保ちつつ、遠近感だけをゆがめる。 | ★★。 |
| ドリー / Dolly | `dolly` | camera-movement-1.md | 車輪付きの台でカメラ本体を空間に動かし、近・中・遠が視差でずれる(ズームでは出せない)。 | ★★。 |
| ダブルドリー / Double Dolly | `double-dolly` | camera-movement-1.md | 俳優とカメラを同じ移動台に載せ、相対位置を固定したまま進み、人物が足を使わず滑るように見せる。 | ★★(固定する人物とスクロールする3D廊下の分離 |
| ダッチロール / Dutch Roll | `dutch-roll` | camera-movement-1.md | レンズ軸まわりにカメラを時間をかけて回し、水平だった世界が傾いていく。 | ★。 |
| アースズーム / Earth Zoom | `earth-zoom` | camera-movement-1.md | 衛星の高さから国・街・人の顔まで、入れ子のスケールを1本の軸で一気に落ちていく。 | ★★★(LOD素材5段の整列が手間。素材が揃えば |
| イーティングズーム / Eating Zoom | `eating-zoom` | camera-movement-1.md | 食べる瞬間(箸やスプーン)へ向けた短い光学のスナップで、食欲を一撃にする。 | ★(2Dの料理イラスト/写真が必要)。 |
| アイズイン / Eyes In | `eyes-in` | camera-movement-1.md | 顔から目へ、虹彩が画面を占めるまで進み続け、ポートレートが内部空間になる。 | ★★(虹彩テクスチャの描画)。写真は不向き(解像 |
| フォーリング / Falling | `falling` | camera-movement-1.md | カメラが重力に任せて落下し、地面が迫り、風が荒れる。落ちる体や視点の自由落下。 | ★★。 |
| 固定カメラ / Fixed Cam | `fixed-cam` | camera-movement-1.md | 位置もチルトも固定し、動きはすべて世界の側に任せる。 | ★(動かさないのが仕様)。 |
| フライングカムトランジション / Flying Cam Transition | `flying-cam-transition` | camera-movement-1.md | 壁や窓を突き抜ける1本の連続飛行で、別の部屋に着地する。 | ★★(Three.jsなら★★、CSS 3Dの穴 |
| フォローショット / Follow Shot | `follow` | camera-movement-1.md | 動く被写体の背後を一定の距離で追い、後頭部を前景に、世界が前方に開く。 | ★★。 |
| FPVドローン / FPV Drone | `fpv-drone` | camera-movement-1.md | 一人称視点の高速飛行で、カメラが傾き・急降下・建築の隙間を縫う。 | ★★★(Three.js+経路設計)。 |
| ジンバルショット / Gimbal Shot | `gimbal` | camera-movement-1.md | 電動の安定化装置で、手持ちや車載の動きを滑らかにし、ロールと高周波の揺れを消す。 | ★(スムージングの設計のみ。ただし機材の違いは再 |
| ハンドヘルド / Handheld | `handheld` | camera-movement-1.md | 安定装置なしで身体から操作し、呼吸と微振動と質量がフレームに残る。 | ★(既製品がある)。 |
| ヘッドトラッキング / Head Tracking | `head-tracking` | camera-movement-1.md | レンズを頭蓋に固定して顔を画面に釘付けにし、背景が回る。 | ★★(パノラマ/円筒背景の用意)。 |
| ヒーローカム / Hero Cam | `hero-cam` | camera-movement-1.md | 低い3/4の位置で歩きに合わせて移動し、リムライトを当てる、漫画的な登場の歩き。 | ★★(歩行サイクルのシルエット描画)。実写の人物 |
| ハイパーラプス / Hyperlapse | `hyperlapse` | camera-movement-1.md | タイムラプスにカメラの大きな移動を組み合わせ、間欠的な撮影が滑走に見える。 | ★★(量子化+視差層+時間経過演出)。 |
| ジブダウン / Jib Down | `jib-down` | camera-movement-2.md | 短いアームの先でカメラを数フィートだけ下ろし、近くの前景を滑らせながら人や机の高さに「腰を下ろす」ように着地する。 | ★(共通リグだけ。前景素材が要る)。 |
| ジブアップ / Jib Up | `jib-up` | camera-movement-2.md | 短いアームでカメラを数フィート持ち上げ、顔や机から部屋の全体を「返す」。 | ★(遮蔽用の近景を1つ作る)。 |
| ジブショット / Jib Shot | `jib` | camera-movement-2.md | 短い旋回アームでカメラを数フィート上下・左右に振り、コンパクトなクレーンの動きを作る。 | ★★(弧のパラメータ設計)。 |
| レイジースーザン / Lazy Susan | `lazy-susan` | camera-movement-2.md | 被写体を電動ターンテーブルで回し(またはカメラが一定半径で周り)、全方位から見せる。距離は変えない。 | ★★(3Dモデルや厚みのある素材が必要)。 |
| ロックオン / Locked-On | `locked-on` | camera-movement-2.md | カメラを1つの物や顔に固定し、世界がその周りを流れ過ぎていくようにする(乗り物や落下体に縛り付けた視点)。 | ★★(背景の大きなラッパーと速度設計)。実写の車 |
| マウスイン / Mouth In | `mouth-in` | camera-movement-2.md | 口元へカメラが入り込み、唇と歯が舞台(景色)になるまで進む。 | ★★★(不向き: 実写の人物の口)。代替: 図案 |
| 全方位撮影 / Omnidirectional | `omnidirectional` | camera-movement-2.md | 球面空間をまるごと撮影し、観客がどの方向も見られて、カメラの「背後」が存在しない状態を作る。 | ★★★(不向き: 通常の矩形MP4でVR体験は完 |
| 360度オービット / 360-Degree Orbit | `orbit-360` | camera-movement-2.md | カメラが被写体の周りを一定半径で一周し、常に被写体を向いたまま背景を光の帯のように流す。 | ★★(被写体の3D化、またはビルボード+リングの |
| パン左 / Pan Left | `pan-left` | camera-movement-2.md | 三脚の位置は動かさず、カメラを垂直軸のまわりに左へ回して、画面を左方向へ掃く。 | ★(2D平行移動で十分)。 |
| パン右 / Pan Right | `pan-right` | camera-movement-2.md | 固定したカメラを水平に右へ回し、同じ場所の2つの部分を一続きの回転でつなぐ。 | ★。 |
| パン / Pan | `pan` | camera-movement-2.md | 立ち位置を固定したまま、カメラを垂直軸まわりに回して世界を横に掃く。 | ★。 |
| パララックス / Parallax | `parallax` | camera-movement-2.md | カメラが平行移動したとき、近いものが速く・遠いものが遅く見える相対運動。世界に層があることを画面が証明する。 | ★★(切り抜き層の準備が必要)。 |
| パススルー / Pass Through | `pass-through` | camera-movement-2.md | カメラが壁・体・窓を突き抜けて隣の空間へ進み、物質が「あってないようなもの」であるかのように見せる。 | ★★★(壁の厚みと遮蔽)。実写の人体を通る表現は |
| ペデスタルダウン / Pedestal Down | `pedestal-down` | camera-movement-2.md | チルト(角度)を変えず、カメラ全体を垂直にまっすぐ下ろす。 | ★(共通リグ)。 |
| ペデスタルアップ / Pedestal Up | `pedestal-up` | camera-movement-2.md | カメラ全体を、チルトを変えずに垂直へ持ち上げる。目線の高さが上がり、建築は画面下へ滑る。 | ★(共通リグ)。 |
| プルアウト / Pull Out | `pull-out` | camera-movement-2.md | カメラが物理的(または仮想的)に被写体から離れ、より多くの環境が人物の周りに入ってくる。 | ★★(広い背景を用意する必要がある)。 |
| プッシュイン / Push In | `push-in` | camera-movement-2.md | カメラが物理的(または仮想的)に被写体へ寄り、大きさの増加が「歩み寄り」で起きる。気づかないうちに壁が狭まるような短い圧力の前進。 | ★(共通リグ。前景を1つ置く)。 |
| ラピッドズームイン / Rapid Zoom In | `rapid-zoom-in` | camera-movement-2.md | 焦点距離を数フレームで一気に締め、カット寸前の速さで寄ってから保持する。カメラ本体は動かない。 | ★。 |
| ラピッドズームアウト / Rapid Zoom Out | `rapid-zoom-out` | camera-movement-2.md | 被写体から一気に広角へ弾け、環境が突然画面に現れてから保持する。 | ★。 |
| ロードラッシュ / Road Rush | `road-rush` | camera-movement-2.md | 路面すれすれの低いカメラで、速度を「にじみ」にして、ヘッドライトと車線を武器のように走らせる。 | ★★(射影の計算が要る)。実車・実景の撮影は不向 |
| ロボアーム / Robo Arm | `robo-arm` | camera-movement-2.md | ロボットアームがプログラムされた軌道を人間離れした精度で、毎テイク寸分違わず再現する。操作者の揺れは無く、スプラインそのものが演技になる。 | ★★(軌道設計と3D化)。 |
| スライダーショット / Slider Shot | `slider` | camera-movement-2.md | 60〜120cmほどの小さなレール上を精密に直線で動き、インタビューや商品に控えめな視差を足す。 | ★(共通リグ、前景素材が要る)。 |
| スローズームイン / Slow Zoom In | `slow-zoom-in` | camera-movement-2.md | カメラ本体を固定し、焦点距離を少しずつ伸ばしてフレームを締める。世界は動かず、光学的に大きくなる。 | ★。 |
| スローズームアウト / Slow Zoom Out | `slow-zoom-out` | camera-movement-2.md | カメラを固定したまま焦点距離を縮めて画角を広げ、より多くの建築や余白を見せる。 | ★。 |
| スニッリカム / SnorriCam | `snorricam` | camera-movement-2.md | カメラを演者の体に固定し、顔を画面に釘付けにして、世界がその周りを揺れ動くようにする。 | ★★(不向き: 実写の撮影装備)。代替: 顔のシ |
| スタティック(固定) / Static Locked-Off | `static` | camera-movement-2.md | 重い三脚にカメラを据えて一切動かさず、構図・ブロッキング・持続時間だけで見せる。 | ★(コードは簡単。時間設計が難しい)。 |
| ステディカム / Steadicam | `steadicam` | camera-movement-2.md | ベスト・アーム・ソリで操作者が歩きながらカメラを浮かせ、手持ちの震えもドリーの牽引感もない滑らかさで部屋をつなぐ。 | ★★★(経路設計と部屋の連続性)。 |
| スーパードリーイン / Super Dolly In | `super-dolly-in` | camera-movement-2.md | 長く激しい前進で部屋を食い尽くし、顔が速すぎるほどの勢いで到着する。ドリーインを、地理が崩れるまで引き延ばしたもの。 | ★★(通過層の処理と数値設計)。 |
| スーパードリーアウト / Super Dolly Out | `super-dolly-out` | camera-movement-2.md | 長い後退で人物を地理の中へ投げ出し、部屋が爆発的に開く。環境が画面を占め、人物は自分では満たせない仕組みの中に取り残される。 | ★★(広い背景の用意)。 |
| スルーオブジェクトイン / Through Object In | `through-object-in` | camera-movement-2.md | カップ・鍵穴・スピーカー・口といった名指しの物の中へカメラが入り、物質を扉にして、向こう側の被写体に到着する。 | ★★★(厚みの設計と二重スケールの同期)。 |
| スルーオブジェクトアウト / Through Object Out | `through-object-out` | camera-movement-2.md | 被写体から物を通って外の広い世界へ抜け、内部が外部になる。視点が人物を見捨てて、決定的な出来事を直接の注意の外で起こす。 | ★★★。 |
| チルトダウン / Tilt Down | `tilt-down` | camera-movement-2.md | 固定位置のままカメラを垂直に回して、高い位置から低い位置へ。空や建築から人や物へ降りる。 | ★(2Dは縦パン、3Dは rotationX)。 |
| チルトアップ / Tilt Up | `tilt-up` | camera-movement-2.md | 固定位置のままカメラを垂直に回して、下の構図から上の構図へ上がる。三脚は上がらず、変わるのは傾きだけで、視点の高さは同じ。 | ★。 |
| チルト / Tilt | `tilt` | camera-movement-2.md | 固定位置のカメラを水平軸まわりに回し(俯仰)、持ち上げずに、角度だけで高さを見せたり隠したりする。 | ★。 |
| トラッキングショット / Tracking Shot | `tracking` | camera-movement-2.md | 動く被写体と並んで、先に立って、または後ろから、同じ速さで平行移動し、距離・高さ・大きさを保ちながら前景・中景・遠景を剥がしていく。 | ★★(歩行サイクルと周期配置)。 |
| トラック(横移動) / Trucking | `trucking` | camera-movement-2.md | 横方向のドリーで、歩く人と並んで滑り、歩道や廊下が流れていく。被写体の大きさは変わらず、世界が通りの軸に沿って流れる。 | ★★。 |
| ウォーク&トーク / Walk and Talk | `walk-and-talk` | camera-movement-2.md | 話しながら歩く人たちにカメラが先導または並走し、情報と地理が一緒に動く。建築が流れる中、動く2ショットが会話を運ぶ。 | ★★★(人物の歩行と廊下の連続性)。 |
| ワンダリング / Wandering | `wandering` | camera-movement-2.md | カメラが被写体の近くをふらふらと漂い、まだ標的を決めていない好奇心の探索として動く。既知の事実へ向かう動機づけされた再構図ではない。 | ★★(注視の設計)。 |
| ウィップパン / Whip Pan | `whip-pan` | camera-movement-2.md | 画像が横縞のブラーに溶けるほど速くパンしてから、新しい構図にぱっと止まる。ブラーの中で2つのショットをつなぐこともできる。 | ★(既製品)、★★(自作)。 |
| ウィップチルト / Whip Tilt | `whip-tilt` | camera-movement-2.md | カメラを垂直方向に激しく振ってモーションブラーにし、ぴたりと止める。ウィップパンの縦版で、移動ではなく速度で衝撃を作る。 | ★★。 |
| ウィグル / Wiggle | `wiggle` | camera-movement-2.md | カメラが2つの近い視点の間をわずかに揺れ、固定カットを「生きた絵葉書」のように見せる。移動は数センチ。 | ★★(深度マップまたは切り抜き層の準備)。 |
| ヨーヨーズーム / YoYo Zoom | `yoyo-zoom` | camera-movement-2.md | 光学軸の上で息を吸って吐くように、ズームインしてすぐ戻る(あるいは逆)。カメラ本体は動かず、1回の呼吸で2方向。 | ★。 |
| ズーム / Zoom | `zoom` | camera-movement-2.md | カメラを動かさず焦点距離だけを変える。空間は視差なしで平らになる(または開く)。近景も遠景も一緒に拡大・縮小する。 | ★。 |

## color (19)

| 技法 | slug | ファイル | 一言 | 適性 |
|---|---|---|---|---|
| ブリーチバイパス / Bleach Bypass | `bleach-bypass` | color-atmosphere.md | 銀を残したまま現像した画のように、彩度を落としつつコントラストと粒状感を上げ、黒を詰めて金属質の中間調にする。 | ★(混合とフィルタだけで再現できる)。 |
| カラーシフト / Color Shift | `color-shift` | color-atmosphere.md | 色の状態(白黒からカラー、冷から暖など)が観客の見ている前で変わる、色そのものを出来事にする技法。 | ★(2層+マスクの補間)。 |
| クールブルー / Cool Blue | `cool-blue` | color-atmosphere.md | 影と中間調を鋼色・シアン・月光の青へ寄せ、暖かさは1つの実用光や顔だけに残す。 | ★(色行列1つ+実用光1点)。 |
| クロスプロセス / Cross Process | `cross-process` | color-atmosphere.md | 現像液を取り違えたように原色の関係をずらし、シアンの影・黄やマゼンタの肌・強いコントラストを「化学の事故」として残す。 | ★(カーブ3本)。 |
| 昼を夜に / Day for Night | `day-for-night` | color-atmosphere.md | 昼の光を夜に見えるよう露出・空・ハイライトを操作して撮り、夜でも地形が見える画を作る。青く塗るだけでは成立しない。 | ★★(昼の手がかりを消す設計が要る)。 |
| 脱彩度 / Desaturation | `desaturation` | color-atmosphere.md | 色相は残したまま彩度を下げ、世界を冬の埃のような静かな色にして、残った色にだけ意味を持たせる。 | ★(`saturate`1つ+残す色のマスク)。 |
| フィルミックフェード / Filmic Faded | `filmic-faded` | color-atmosphere.md | 黒を真っ黒より少し浮かせ、ハイライトをクリップさせず滑らかに圧縮し、プリントのような階調にする。 | ★(カーブ1本)。 |
| ハイパー彩度 / Hyper-Saturation | `hyper-saturation` | color-atmosphere.md | 記録された以上に色の強度を上げ、赤が漆のように、緑が毒々しく見える、事実より感情が大きい色にする。 | ★(`saturate`だが、元の美術の色設計が |
| モノクローム / Monochrome | `monochrome` | color-atmosphere.md | 色相をなくし、明暗・質感・輪郭だけで画を成立させる。 | ★。 |
| 月光ジェル / Moonlight Gel | `moonlight-gel` | color-atmosphere.md | シアンや鋼緑のジェルをかけた大型の冷たい光を月の代わりに上から当て、夜を方向のある彫刻的な画にする。 | ★★(光方向の統一が要る)。 |
| ナチュラルグレード / Natural Grade | `natural-grade` | color-atmosphere.md | 肌を忠実に保ち彩度を抑え、場所が本来持つ色をそのまま信じさせるため、色で語ることを控えるグレード。 | ★(手を加えないための規律。失敗は検証で見つかる |
| 露出オーバー / Overexposed | `overexposed` | color-atmosphere.md | 白を意図して飛ばし、ハイライトの情報を焼き切る(明るいが情報が残るハイキーとは別物)。 | ★(係数とブルーム)。 |
| パレット / Palette | `palette` | color-atmosphere.md | 美術・衣装・照明・グレードにわたって、限られた数色だけを掟として使い、場所や物語の状態を色で区別する。 | ★(CSS変数の規律。再現は容易で、設計が価値) |
| セピア / Sepia | `sepia` | color-atmosphere.md | 灰色の階調を銀色ではなく茶金色に写像し、白は古い紙へ、黒は焦げ茶へ寄せる。過去を化学の色として扱う。 | ★。 |
| スプリットトーン / Split Toning | `split-tone` | color-atmosphere.md | ハイライトに1つの色相、シャドウに別の色相を割り当て、階調全体を2色の世界にする。 | ★。 |
| ティール&オレンジ / Teal and Orange | `teal-orange` | color-atmosphere.md | 影や空・背景を青緑に、肌と暖色の光源を橙側に置く、肌を保護した補色の分割グレード。 | ★★(肌の保護の層設計が要る)。 |
| タングステンバランス / Tungsten Balance | `tungsten-balance` | color-atmosphere.md | ホワイトバランスを約3200Kに合わせ、電球色の光は中立〜暖色に、昼光や冷たい光は青に写し、光源ごとの色差を残す。 | ★★(光源を画面内で整合させる設計)。 |
| ヴィンテージ / Vintage | `vintage` | color-atmosphere.md | 退色した染料、柔らかいコントラスト、ハレーション(光のにじみ)など、フィルムの経年変化の化学そのものを再現する。 | ★★(複数要素のバランス)。 |
| ウォームアンバー / Warm Amber | `warm-amber` | color-atmosphere.md | 中間調とハイライトをタングステンの蜜色・ろうそくの色へ寄せ、家庭的で安心できる温かい世界にする。 | ★。 |

## composition (32)

| 技法 | slug | ファイル | 一言 | 適性 |
|---|---|---|---|---|
| アーキテクスチャ / Architexture | `architexture` | composition.md | 建物の面・格子・素材で画面を埋め、人物をその一部(スケール人形)にまで小さくする。 | ★(素材と比率の設計だけ)。 |
| アシンメトリー / Asymmetry | `asymmetry` | composition.md | 主役を中心線から外し、色・光・小さな顔・暗い虚空など別種の重さで釣り合わせる。 | ★。 |
| 中央構図 / Centered Composition | `centered-composition` | composition.md | 主役を中央軸に置き、周囲(壁・家具・付き人)も軸に合わせて正面の祭壇のように整える。 | ★。 |
| 中央フレーミング / Central Framing | `central-framing` | composition.md | 人物を光軸の十字線(画面中心)に置く。左右の余白が等しくなり、主役が軸を所有する。 | ★。 |
| クリーンフレーム / Clean Frame | `clean-frame` | composition.md | 画面の四辺に不用意な物を入れず、ぼかしではなく整頓によって孤立を作る。 | ★。 |
| トーン対比 / Tonal Contrast | `contrast-composition` | composition.md | 最も明るい塊と最も暗い塊をぶつけ、中間グレーを捨てて、主役を明暗の極に置く。 | ★。 |
| 対角構図 / Diagonal Composition | `diagonal-composition` | composition.md | 階段・銃・雨・斜めの街路など、セット側の斜線を使って、カメラを水平のまま不安定さとエネルギーを作る。 | ★。 |
| ダーティフレーム / Dirty Frame | `dirty-frame` | composition.md | ピンぼけの肩・ガラス・葉・群衆で画面の縁を食わせ、窓を「占拠された」状態にする。 | ★。 |
| 図と地 / Figure-Ground | `figure-ground` | composition.md | 被写体を背景から1秒以内に読めるよう、明暗・色・ピントのいずれかで切り離す。 | ★。 |
| 前景の物 / Foreground Interest | `foreground-interest` | composition.md | レンズと被写体の間に、花・柵・ガラス・机・体など目立つ近接物を置き、奥行きと入口、または部分的な遮蔽を作る。 | ★★(視差の比率設計)。 |
| フレーム内フレーム / Frame within Frame | `frame-in-frame` | composition.md | 戸口・窓・アーチ・鏡など、画面の中にもう一つの長方形を作って被写体を囲む。 | ★。 |
| 黄金比 / Golden Ratio | `golden-ratio` | composition.md | 約8:5(φ)の分割線や対数螺旋に沿って塊を置き、視線が曲線をたどるようにする。 | ★(位置計算のみ)。 |
| ヘッドルーム / Headroom | `headroom` | composition.md | 頭頂からフレーム上端までの余白を、圧迫(狭い)か空気(広い)かを意図して決める。 | ★。 |
| レイヤード・デプス / Layered Depth | `layered-depth` | composition.md | 前景・中景・背景など少なくとも2つの距離に、意味のある動作を配置する。 | ★★(層ごとの動作設計)。 |
| リードルーム / Lead Room | `lead-room` | composition.md | 視線や進行方向の側に、背後より多くの余白を取る。 | ★。 |
| 導線 / Leading Lines | `leading-lines` | composition.md | 縁・レール・道・廊下・影・身ぶりを、視線を誘導する矢印として使う。 | ★。 |
| ルックスペース / Look Space | `look-space` | composition.md | 視線の前に空気を残し、画面外にある見られる対象を観客に待たせる。 | ★。 |
| ネガティブスペース / Negative Space | `negative-space` | composition.md | 被写体の周囲に広い空白を残し、空白自体を質量として見せる。 | ★。 |
| 一点透視 / One-Point Perspective | `one-point-perspective` | composition.md | カメラを面に正対させ、奥行きの平行線をただ1つの消失点(多くは中央軸上)に収束させる。 | ★★(3D廊下の組み立て)。 |
| 反射 / Reflections | `reflections` | composition.md | ガラス・水・クローム・鏡を使い、見る者と見られる者を1つの面に同居させる。 | ★★(物理的整合を取る必要)。 |
| 反復とパターン / Repetition and Pattern | `repetition-pattern` | composition.md | 形・色・線・位置・動作を繰り返し、列や窓や兵士の「系」として読ませ、その破れを物語にする。 | ★。 |
| 三分割 / Rule of Thirds | `rule-of-thirds` | composition.md | 画面を3x3に分け、重要な塊を線上か4つの交点に置き、地平線を上か下の三分割線に置く。 | ★。 |
| スクリーン・イン・スクリーン / Screen in Screen | `screen-in-screen` | composition.md | モニター・スマホ・テレビ・映画館を画面の中に入れ、「絵を見ている人の絵」にする。 | ★。 |
| ショートサイディング / Short Siding | `short-siding` | composition.md | 顔を視線の向かう縁に寄せ、ルックスペースを潰して背後に余白を余らせる。 | ★。 |
| シンメトリー / Symmetry | `symmetry` | composition.md | 垂直の中心線を軸に、左右の視覚的な質量を鏡のように揃える。 | ★。 |
| タブロー / Tableau | `tableau` | composition.md | 配置された人や物で絵を作り、ほぼ固定のカメラで時間をかけて意味を展開させる。 | ★★(人物アニメの用意が要る)。 |
| 三角構図 / Triangular Composition | `triangular-composition` | composition.md | 3つの人物や塊を三角形に配置し、頂点を権力・目撃者・欲望の対象とする。 | ★。 |
| 消失点 / Vanishing Point | `vanishing-point` | composition.md | 平行線が出会う見かけの一点(線路・道・列柱の終点)を構図の目的地にし、人物をその手前の門か、点そのものに置く。 | ★。 |
| 視覚的な重み / Visual Weight | `visual-weight` | composition.md | 大きさ・明暗・色・位置・ピント・顔・動きが引きつける注意の量で配置を決める。小さく明るいものが大きく暗い塊と釣り合える。 | ★。 |
| ヴォイド / Void | `void` | composition.md | 闇・白・空白で世界(セット)を消し、人物を何もない場に立たせる。 | ★。 |
| ボヤー(覗き見) / Voyeur | `voyeur` | composition.md | 隠れた位置から、葉・ガラス・格子・遠い窓越しに覗く視点。縁は汚れ、のぞき穴のような構図になる。 | ★。 |
| 窓 / Windows | `windows` | composition.md | 窓(枠)の集合そのものを主題にする。積み重なる開口、四角に収まった生活、枠の建物。 | ★★(各セルの小さな物語が要る)。 |

## editing (23)

| 技法 | slug | ファイル | 一言 | 適性 |
|---|---|---|---|---|
| 軸上カット / Axial Cut | `axial-cut` | editing.md | 同じカメラ軸の上で、被写体への距離(ショットサイズ)だけを段階的にカットで跳ばす。角度は変えない。 | ★(スケールの離散切替だけ。注視点の設計が肝)。 |
| クラッシュカット / Crash Cut | `crash-cut` | editing.md | 前置きも混ぜもなく、2つの絵をぶつける。つなぎ目そのものが打撃になり、しばしば出来事の最中から始まる。 | ★(設計が全て)。 |
| クロスカッティング / Cross-Cutting | `cross-cut` | editing.md | 2つ以上の場所・行動線を交互に見せ、同時進行(meanwhile)や偽の地理を作る。 | ★(並べるだけ。尺カーブの設計が肝)。 |
| ディゾルブ / Dissolve | `dissolve` | editing.md | 前の絵と次の絵を一定時間重ね、Aの不透明度が下がりBが上がる混ぜで、場面を受け渡す。 | ★(opacityだけ)。 |
| フェードイン/フェードアウト / Fade In / Fade Out | `fade` | editing.md | 画面を黒や色の均一な面へ落とす/そこから立ち上げ、世界と「不在」の間に句読点を打つ。 | ★。 |
| フラッシュカット / Flash Cut | `flash-cut` | editing.md | 進行中の絵に、別の絵を数フレームだけ割り込ませて戻る(または畳み掛ける)。 | ★(`tl.set` だけ。フレーム数の設計が肝 |
| フラグメント(断片編集) / Fragments | `fragments` | editing.md | 出来事を部分的な断片だけで構成し、全体像は観客の頭の中に組み立てさせる。 | ★★(断片設計と因果の整理が要る)。 |
| グラフィックマッチ / Graphic Match | `graphic-match` | editing.md | 時間も場所も違う2つの絵を、形・線・色・位置・動きの共有でつなぐハードカット。 | ★(定数共有と差分チェックで精度が出る)。 |
| 見えないカット / Invisible Cut | `invisible-cut` | editing.md | 動き・暗闇・遮蔽・ブラー・幾何の一致で編集点を隠し、ワンテイクに見せる。 | ★★(遮蔽中の差し替えと、前後のブラー・速度一致 |
| アイリス / Iris | `iris` | editing.md | 円や図形のマスクが動いて、絵を現し/隠す。中心が「ここを見ろ」の指差しになる。 | ★(clip-pathだけ)。 |
| ジャンプカット / Jump Cut | `jump-cut` | editing.md | ほぼ同じ構図の中で時間を抜き、不連続をあえて見せる。 | ★(世界時間の関数化がポイント)。 |
| Jカット/Lカット(絵の設計) / J-Cut / L-Cut (Visual Setup) | `l-cut-visual` | editing.md | 絵と音をずらしてつなぐ。Jカットは次の場の音が先に来る、Lカットは前の場の音が次の絵にはみ出す。 | ★(絵の設計と音の時刻差だけ)。 |
| アクションつなぎ / Match on Action | `match-action` | editing.md | 1つの連続動作の途中で切り、動きそのものが2つのカメラ位置をつなぐ。 | ★★(動作関数の共有設計)。 |
| マッチカット / Match Cut | `match-cut` | editing.md | 視覚・空間・音・概念の対応で2つのショットをハードカットでつなぎ、つなぎ目そのものが「同じ考え」という文になる。 | ★★(一致表と差分チェックの運用が要る)。 |
| マッチモーション / Match Motion | `match-motion` | editing.md | 方向と速度をカットをまたいで継続させ、場所・時間・現実が変わっても動きのベクトルでつなぐ。 | ★★(速度の数値一致が必須)。 |
| マッチスプリット / Match Split | `match-split` | editing.md | 画面を分割し、その境界をまたいで同じ線や動きを連続させ、2つの世界を1つの有機体のように見せる。 | ★★(共有する線の座標設計)。 |
| モンタージュ / Montage | `montage` | editing.md | 完結した絵を順番に並べ、衝突や連なりから意味(論証)や時間の圧縮を生む。 | ★★(素材量とデータ駆動の設計。ベクター/タイポ |
| クイックカット / Quick Cuts | `quick-cuts` | editing.md | 息より短いショットを連ねて、持続時間そのものをリズム・圧力・音楽にする。 | ★(データ駆動、素材の作り分けが仕事)。 |
| セットトランジション / Set Transition | `set-transition` | editing.md | カット無しで、カメラの前で場所そのもの(壁・建築)が書き換わり、1つの空間が別の空間になる。 | ★★(層構成とパースペクティブ)。主役が実写の場 |
| スマッシュカット / Smash Cut | `smash-cut` | editing.md | 画・音・調子・スケール・時間のいずれかを急激に反転させ、築いた状態を柔らかい混ぜなしに壊す。 | ★(`data-start` の接続と明度設計) |
| スプリットスクリーン / Split Screen | `split-screen` | editing.md | 2つ以上の別々の空間を同じ画面に同時に見せる。 | ★(レイアウトのみ。2場面分の作画が要る)。 |
| トランジション(設計された遷移) / Transitions | `transitions` | editing.md | つなぎ目を「隠す接着剤」ではなく、見せる身振りとして設計する。ワイプ・マッチ・ディゾルブ・ウィップ・光などの種を選ぶ。 | ★〜★★(種による。既製のシェーダーは★)。 |
| ワイプ / Wipe | `wipe` | editing.md | 画面を横切る境界が、前の絵を次の絵に置き換える。境界が見えることが前提の編集。 | ★(clip-pathだけ)。 |

## effects (57)

| 技法 | slug | ファイル | 一言 | 適性 |
|---|---|---|---|---|
| アルタードステート / Altered State | `altered-state` | effects-1.md | 縁の尾引き・残像・狂った色・粘る時間など、知覚そのものが壊れていく様子を数個の「癖」の束で見せる。 | ★★(癖の取捨選択がすべて。技術自体は他の技法の |
| アナモルフィックフレア / Anamorphic Flare | `anamorphic-flare` | effects-1.md | 強い点光源がアナモルフィックレンズの円柱要素に当たって生む、水平方向の青〜マゼンタの光の筋。 | ★(既製部品がある。光点の位置と筋の整合が肝)。 |
| アントロポ / Anthropo | `anthropo` | effects-1.md | 物や動物を「演者」として撮る。人間スケールの画、視線、リアクションの切り返しで、意思があるように見せる。 | ★★(動きの演出力が必要。技術は単純)。 |
| アーガス / Argus | `argus` | effects-1.md | 画面に「見ること」が溢れる。体や壁や街に無数の目(瞳・カメラ・視点)が並ぶ。 | ★★(量が出るので配置の設計が肝。技術は単純)。 |
| ボケ / Bokeh | `bokeh` | effects-1.md | ピントの外れた点光源が作る円盤(円・楕円・猫目・渦)の質感。単に背景をぼかすことではない。 | ★★(円盤の描画と奥行設計。既製のrack-fo |
| バブル / Bubbles | `bubbles` | effects-1.md | 空気中に浮かぶシャボン玉を「小さなレンズ」として撮る。虹色の膜、濡れたハイライト、被写体の屈折像。 | ★★(薄膜色と屈折像で説得力が決まる)。 |
| 色収差 / Chromatic Aberration | `chromatic-aberration` | effects-1.md | 波長ごとにピントや倍率が違うために、コントラストの高い縁に赤・シアンの色ずれが出る現象。画面端ほど強い。 | ★(3層+scale差。WebGLなら数行)。 |
| シネマグラフ / Cinemagraph | `cinemagraph` | effects-1.md | ほぼ静止画の中で、たった一つの要素(湯気、雨、髪、まばたき)だけが継ぎ目なくループする。 | ★★(継ぎ目の消し方が肝)。 |
| コラージュ / Collage | `collage` | effects-1.md | 破る・切る・貼ることで、異なる素材(紙、印刷物、実写)を同じ面に「継ぎ目が見える」まま構成する。 | ★★(素材の用意と縁のディテール)。 |
| サイクロプス / Cyclope | `cyclope` | effects-1.md | 巨大な単眼として見る。魚眼が怪物の目になり、レンズそのものが生き物になる。 | ★★(シェーダー数行。画像の用意)。 |
| データモッシュ / Datamosh | `datamosh` | effects-1.md | キーフレームを壊す/外すことで、フレーム間予測だけが走り続け、前の絵が次のカットへ動きベクトルで引きずられる意図的なコーデック崩壊。 | ★★★(本物は外部ツール前提で近似も重い)。代替 |
| ディープフォーカス / Deep Focus | `deep-focus` | effects-1.md | 近景から遠景まで複数の平面にピントが合ったままの画。演出(配置)が観客の視線を決め、レンズは選ばない。 | ★(ぼかさなければ成立。奥行の設計だけ)。 |
| ジオラマ / Diorama | `diorama` | effects-1.md | 実際の縮尺模型を撮り、大きな物体や環境の代役にする。縮尺は質感・撮影速度・被写界深度・動きで売る。 | ★★★(模型の説得力は作り込み量に比例)。実写模 |
| ディストーション / Distortions | `distortions` | effects-1.md | レンズや媒質で空間をゆがめ、直線が曲がる/伸びる/溶ける。広角の樽型、糸巻き型、陣笠型、ガラス越しの屈折など。 | ★★(数式は短い。画像のテクスチャ化が要る)。 |
| 二重露光 / Double Exposure | `double-exposure` | effects-1.md | 2つ以上の像を1つの画に加算的に重ね、同じ密度の中に共存させる。ソース: 多重露光、オプティカルプリンタ、デジタル加算。 | ★(2層とブレンドモード。マスクの作り込みが仕上 |
| デュプリケーション / Duplication | `duplication` | effects-1.md | 同じ人物を固体の身体として同一フレーム内に複数置く。双子、自分との対面。通常はスプリットマット、モーションコントロール、固定カメラの合成。 | ★★(ベクターなら容易。実写は不向きで、プレート |
| エコープリント / Echo Print | `echo-print` | effects-1.md | 直前の姿勢が、時間または位置をずらした薄いコピーとして現在のフレームに残る。 | ★(既製部品あり)。 |
| フィードバック / Feedback | `feedback` | effects-1.md | カメラを自分の出力に向け、像が入れ子になって縮む再帰の廊下を作る。各世代はモニターの再撮影で、ブルームと遅れが付く。 | ★★(複製数と変換の設計。再帰は使わない)。 |
| フィルムグレイン / Film Grain | `film-grain` | effects-1.md | 銀塩/色素雲の乳剤が作る、フレームごとに変わる粒状の質感。透明なPNGを貼る「オーバーレイ」ではなく、画像の密度に従う質感。 | ★(既製部品あり。時間変化と密度重みが品質を決め |
| フローティングフォール / Floating Fall | `floating-fall` | effects-1.md | 体が「ゆっくり落ちる」。髪やコートの重力が遅れ、地面への降下は続いている。 | ★★(遅れの層分けと視差の設計)。 |
| フローティングUI / Floating UI | `floating-ui` | effects-1.md | 読めるインターフェース、吹き出し、データ面を、画面ではなく空間の中に浮かべる。コックピットが部屋になる。 | ★★(CSS 3Dで高い再現度)。 |
| フォーカルシフト / Focal Shift | `focal-shift` | effects-1.md | ショット中に合焦面を別の被写体・距離へ移動させ、注意を「引く」動きとして見せる。 | ★(2層のぼかし量。ボケ円盤の本格版は既製品)。 |
| フォーカスチェンジ / Focus Change | `focus-change` | effects-1.md | 合焦面を新しい被写体へ「跳ばす/素早くすべらせる」。途中のぼけは短く、新しい面がすぐに主役になる。 | ★(時間の短縮とイージング)。 |
| 強制遠近法 / Forced Perspective | `forced-perspective` | effects-1.md | カメラ位置・被写体距離・セットの寸法で見かけの大きさや距離をだます。嘘は撮影位置からしか成立しない。 | ★★(式はシンプル。接地と整合が要る)。 |
| ジェネレーティブ / Generative | `generative` | effects-1.md | 規則・粒子・反復で「育つ」形を見せる。画が写真ではなく、システムが作るものとして見える。 | ★★(規則の設計。既製部品が多い)。 |
| ハレーション / Halation | `halation` | effects-1.md | フィルムの乳剤とベースで反射・散乱した光が、明部の周りに赤〜暖色のにじみを作る。 | ★(しきい値+ぼかし+着色の3手)。 |
| インフラレッド / Infrared | `infrared` | effects-1.md | 近赤外(約700〜900nm)の反射光で撮った写真。植物が白く、空が黒く、肌が蝋のようになる。熱ではない。 | ★(色行列で近似。ただし本物のIRとは別物)。 |
| カレイドスコープ / Kaleidoscope | `kaleidoscope` | effects-1.md | 鏡や放射状の反復で画面を破片化し、1つの被写体を対称な模様に増殖させる。 | ★★(シェーダー数行。入力素材の選び方で見栄えが |
| レンズフレア / Lens Flare | `lens-flare` | effects-2.md | 強い光源の近くでレンズ内の反射・散乱が起き、ゴースト・筋・コントラストの白濁として画面に現れる現象を、光源に紐づけて見せる。 | ★★(光源・遮蔽・ゴーストの連動設計が要る)。 |
| レビテーション / Levitation | `levitation` | effects-2.md | 人や物がワイヤー等の支えを見せずに静かに宙に浮き続ける。足元の隙間が証拠になる。 | ★★(ベクター代替)。実写のワイヤー除去は不向き |
| ライトフラッシュ / Light Flash | `light-flash` | effects-2.md | 数フレームだけ画面を白(またはほぼ白)に飛ばして元に戻す、時間的な露光イベント。ピークでカットを隠せる。 | ★(最も簡単で効果が高い)。 |
| ライトリーク / Light Leak | `light-leak` | effects-2.md | レンズを通らない光がフィルムやセンサーに直接入り、画面の縁からオレンジや赤の霧として画像を侵す。 | ★(既製部品で足りる)。 |
| マスキング / Masking | `masking` | effects-2.md | 双眼鏡・鍵穴・図形窓のような硬い輪郭で画面を切り、「見ること」自体を形として見せる。 | ★(SVG maskだけ)。 |
| モーフ(編集としての変形) / Morph | `match-morph` | effects-2.md | 対応する形や顔の頂点を補間して、ある像を別の像へ連続的に「なる」ように変える。不透明度のクロスフェードではない。 | ★★〜★★★(写真の顔は難しい。ベクター/UI/ |
| ミックストメディア / Mixed Media | `mixed-media` | effects-2.md | 実写、イラスト、文字、ストック素材など撮り方の違う素材を、1つの平面で衝突させる。 | ★★(設計と素材集めが肝)。 |
| モーフィング(幾何学的変形) / Morphing | `morphing` | effects-2.md | ランドマークの対応づけによる幾何補間で、ある形・顔を別の形へ連続変形させる。フェードではない。 | ★★★(ランドマーク作成が必要)。実写の顔写真の |
| ナイトビジョン / Night Vision | `night-vision` | effects-2.md | 微光増幅装置の見え方、つまり緑の蛍光体色・粗い粒子・光源のブルーム・ゴーグルの枠として暗闇を映す。 | ★★(フィルタ重ねで再現可)。 |
| オブジェクトポータル / Object Portal | `object-portal` | effects-2.md | バッグ・画面・扉など「そこに通じるはずのない小道具」が、別の空間への入口になる。小道具自体がカットになる。 | ★★(2コピーの切り分けが肝)。 |
| パーティクル / Particles | `particles` | effects-2.md | 塵・火花・花粉・灰などの数えられる粒子で空気を満たし、光を受けて一粒ずつ輝かせる。 | ★(canvasで容易)。 |
| フォトグラメトリ調 / Photogrammetry | `photogrammetry` | effects-2.md | 多数の写真から3Dを再構成した「スキャンされた現実」の見た目。引き伸ばされたテクスチャ・欠け・継ぎ目が証拠になる。 | ★★★。実写スキャンの再現は不向き。代替: 深度 |
| プロジェクション(映像の投影) / Projections | `projection-mapping` | effects-2.md | 映像を面に投影し、それを撮影する。フロント/リアプロジェクション、建築へのマッピングなど、セット自体がスクリーンになる。 | ★★(CSS 3Dの面合わせ)。実写の前景を同一 |
| ラックフォーカス / Rack Focus | `rack-focus` | effects-2.md | 構図を変えず、ピントの合う面を近い被写体から遠い被写体へ(またはその逆に)連続の1ショット内で移す。 | ★★(既製部品あり、層分けの設計が要る)。 |
| アスペクト比切替 / Ratio Switch | `ratio-switch` | effects-2.md | 画面の枠そのもの(アスペクト比)が広がったり閉じたりして、物語の位相が変わったことを示す。画像は引き伸ばさず、見えていなかった部分を現す/切 | ★(clip-pathの帯だけ)。 |
| スケールシフト / Scale Shift | `scale-shift` | effects-2.md | 同じ部屋の中で人の大きさが急に巨大/極小になる光学的イベント。家具・影・接地を新しい比率に合わせる。 | ★★(ベクター代替)。実写・AI人物の等身変更は |
| セルフィーツイン / Selfie Twin | `selfie-twin` | effects-2.md | スマホを持った腕の長さの広角で、同じ顔が2つ写る。自分自身とポーズを取る二重像。 | ★★(ベクター代替)。実写・AIの同一人物生成は |
| シャドウボックス / Shadow Box | `shadow-box` | effects-2.md | 切り絵の黒いシルエットを奥行きに積み重ね、硬い逆光の前で見せる、闇のジオラマ。 | ★★(層の設計次第)。 |
| シャローフォーカス / Shallow Focus | `shallow-focus` | effects-2.md | 狭い被写界深度で一面だけを鮮明にし、前景・背景を光学的に落とす。絞り・焦点距離・距離の組み合わせで決まる。 | ★(ベクター/層構成なら容易。実写のマット作りは |
| スリットスキャン / Slit-Scan | `slit-scan` | effects-2.md | 狭いスリットを通して動く絵やカメラを長時間露光し、空間を時間軸方向の筋・廊下へ引き伸ばす。ランダムな粒子ではなく秩序ある幾何になる。 | ★★〜★★★(シェーダー)。既製部品だと★。 |
| スマッシュアンドグラブ / Smash and Grab | `smash-and-grab` | effects-2.md | ガラスが割れ、手が掴み、逃げる。衝撃をそのまま撮ったような手持ちのカバレッジ。カメラは事件の最中にいる。 | ★★〜★★★(破片の物理は近似)。実写の手持ち感 |
| ステッカーピール / Sticker Peel | `sticker-peel` | effects-2.md | 画像がシールのように台紙から剥がれ、粘着の光沢、厚み、カールの物理で、下の層を現す。 | ★★(幾何計算が必要)。 |
| サーマル / Thermal | `thermal` | effects-2.md | 反射光ではなく放射された熱(長波赤外)を、ホワイトホット・ブラックホット・アイアンボウなどのパレットで色にした映像。 | ★★(温度層の作画が要る)。 |
| トランスフォーメーション / Transformation | `transformation` | effects-2.md | 体・部屋・物が連続した視界のなかで別のものへ変わる。変化を読み取れる「固定されたアンカー」を残す。 | ★★(設計が要る)。実写・人物の変身は不向き。代 |
| タイポグラフィ(世界の中の文字) / Typography | `typography` | effects-2.md | 文字を画面に貼るキャプションではなく、空間の中の物体として扱う。スケール・視差・表面を持つ文字がブロッキングに参加する。 | ★〜★★(既製が豊富)。 |
| ビネット / Vignette | `vignette` | effects-2.md | レンズやフィルターの影響、または後処理で、画面の四隅が暗く・低彩度・低コントラストに落ちる。 | ★(1行で足りる)。 |
| ウィグルグラム / Wigglegram | `wigglegram` | effects-2.md | 数センチ離れた2〜3視点の画像を素早く往復させ、奥行きを「ぴくぴく」させる立体の揺れ。 | ★★(層分け、または深度マップが必要)。 |
| X線 / X-Ray | `x-ray` | effects-2.md | 表面を透過して、骨・配線・内部構造を図のように見せる。反射ではなく透過の物理。 | ★★(内部構造の作画が必要)。実写の人体の透視は |
| ゾートロープ / Zoetrope | `zoetrope` | effects-2.md | 回転する動きをストロボで切り出し、動きが「ポーズの輪」でできていることを見せる。滑らかなブレではなく、サンプリングの隙間が主役。 | ★★(ドラムは★★★)。 |

## framing (25)

| 技法 | slug | ファイル | 一言 | 適性 |
|---|---|---|---|---|
| チョーカー(ビッグクローズアップ) / Choker Shot (BCU) | `choker` | framing-angles.md | 額の生え際からあごまでだけを画面いっぱいに切り取る、顔全体のぎりぎりのアップ。肩と背景はほぼ消える。 | ★(寄り専用の顔パーツを描けば簡単。シルエットの |
| クローズアップ / Close-Up (CU) | `close-up` | framing-angles.md | 頭と肩の上までを収める、表情を読ませる標準のアップ。 | ★。 |
| カウボーイショット / Cowboy Shot | `cowboy-shot` | framing-angles.md | 太ももの中ほどから上を収め、ガンベルト高さの手と立ち姿を入れる中間のロング寄りサイズ。 | ★(クロップの数値を合わせるだけ)。 |
| カットイン / Cut-ins | `cut-ins` | framing-angles.md | 広い画の中にすでに写っている細部へ、同じ向きのまま寄る。 | ★。 |
| カットアウェイ / Cutaway | `cutaway` | framing-angles.md | 主な動きをいったん離れ、同じ世界にある別の物・人・景色を見せてから戻る。 | ★。 |
| エスタブリッシングショット / Establishing Shot | `establishing-shot` | framing-angles.md | 場所・時間帯・天気・社会的な背景を最初に宣言するショット。サイズではなく「役目」。 | ★。 |
| 極端なクローズアップ / Extreme Close-Up (ECU) | `extreme-close-up` | framing-angles.md | 目・口・指先・引き金など、ごく小さな一部だけで画面を埋める。 | ★★(寄り専用パーツの描き込みが必要)。 |
| 極端なロングショット / Extreme Long Shot (ELS) | `extreme-long-shot` | framing-angles.md | 人物が点になるほど引き、環境・規模・孤独を主役にする。 | ★。 |
| 全身ショット / Full Body (WS) | `full-body` | framing-angles.md | 頭から足元までを収め、人物が画面高の大部分を占める。 | ★。 |
| ジェスチャー / Gesture | `gesture` | framing-angles.md | 手・視線・重心移動など、表現的な体の小さな動きを主題にしてサイズと長さを決める。 | ★★(動きの設計が肝)。 |
| グループショット / Group Shot | `group-shot` | framing-angles.md | 家族・乗組員・陪審など、少人数の集団を「関係の単位」として収める。 | ★★(人物素材の数が要る)。 |
| インサートショット / Insert Shot | `insert` | framing-angles.md | 筋に関わる物・手の動作・画面・文字を、実寸の感覚で近くから見せる。 | ★。 |
| インタビュー / Interview | `interview` | framing-angles.md | 画面の少し横にいる聞き手に答える、安定したトーキングヘッドの構図。 | ★。 |
| ロングショット / Long Shot (WS) | `long-shot` | framing-angles.md | 全身と、それを取り巻く広い環境を一緒に見せ、人が世界の中で小さく見えるサイズ。 | ★。 |
| マスターショット / Master Shot | `master-shot` | framing-angles.md | 場面の動きと空間配置をひとつの画で最後まで押さえる、骨組みのショット。 | ★★(全員の動線を1つのタイムラインで設計する必 |
| ミディアムクローズアップ / Medium Close-Up (MCU) | `medium-close-up` | framing-angles.md | 胸から上を収め、顔と肩、胸の高さの手が読める会話の距離。 | ★。 |
| ミディアムショット / Medium Shot (MS) | `medium-shot` | framing-angles.md | 腰から上を収め、顔と手の動きのバランスをとる、カバレッジの主力サイズ。 | ★。 |
| オーバー・ザ・ショルダー / Over-the-Shoulder Coverage (OTS) | `over-the-shoulder-frame` | framing-angles.md | 手前に相手の肩や頭の一部を置き、奥の顔にピントを合わせる会話の切り返し構図。 | ★★(切り返しの向きと scale を揃える設計 |
| プロダクトショット / Product | `product` | framing-angles.md | 物を、ポートレートのように照明し、ヒーローの角度で撮る商品映像。 | ★★(質感の作り込みに時間がかかる。3Dモデルが |
| リアクションショット / Reaction Shot | `reaction-shot` | framing-angles.md | 出来事・台詞・見えない刺激を受けた人物の反応を見せる。サイズではなく役目。 | ★。 |
| シングル / Single | `single` | framing-angles.md | 主要人物1人だけを収めるカバレッジ。他の人物は画面外か、端にかすかに入る程度。 | ★。 |
| スリーショット / Three-Shot | `three-shot` | framing-angles.md | 3人の主要人物を1つの画に収め、同盟と「はみ出した1人」を配置で読ませる。 | ★★(人物素材が3つ必要)。 |
| ツーショット / Two-Shot | `two-shot` | framing-angles.md | 2人の主要人物を1つの画に収め、距離や姿勢を比べられるようにする。 | ★。 |
| ビデオポートレート / Video Portraits | `video-portraits` | framing-angles.md | 動かさず、長く、1人の顔を「ほとんど静止しているが生きている」状態で見せる。 | ★(動かさない勇気が要る)。 |
| ワイドショット / Wide Shot (WS) | `wide-shot` | framing-angles.md | 人物が小さく、場所が語り続ける、環境を前面に出すカバレッジ。 | ★。 |

## genre-looks (27)

| 技法 | slug | ファイル | 一言 | 適性 |
|---|---|---|---|---|
| アニメーション(設計された光と動き) / Animation | `animation` | genre-viral.md | 光と動きを「撮る」のではなく「設計して描く」見た目。グラフィックな立体感、設計された光、描画としての動き(スミア、止め、コマ落とし)で世界を | ★★(絵柄の設計次第。素材絵がある前提)。 |
| アートハウス / Arthouse | `arthouse` | genre-viral.md | 三脚で固定し、窓の自然光だけ、少しずれた headroom と空白のある画面で「考える余白」をつくる見た目。 | ★(足し算をしない設計が難所)。 |
| ブロックバスター・グロス / Blockbuster Gloss | `blockbuster-gloss` | genre-viral.md | 高コントラスト、輪郭を縁取るリムライト、クリーンな空、光芒、ティール(青緑)とオレンジの色分離で、ポスターのサイズでも読める「金のかかった」 | ★★(リム分離は素材のマスクがあると楽)。 |
| メイキング映像 / BTS (Behind the Scenes) | `bts` | genre-viral.md | スタンド、旗、セットの端、スタッフを同じ画面に入れ、作り物の世界の舞台裏を見せる見た目。 | ★★(SVGの小道具作りが手間)。 |
| シネマ・ヴェリテ / Cinéma Vérité | `cinema-verite` | genre-viral.md | 手持ち、現場の光だけ、ズームで瞬間を探し、撮影者の存在が出来事を動かす記録の見た目。 | ★★(素材の撮り方に左右される)。 |
| コズミックホラー / Cosmic Horror | `cosmic-horror-look` | genre-viral.md | 人間が無意味に見える超ロングショット、少し「ありえない」幾何、下からの光、見せすぎる明るさで恐怖を作る見た目。 | ★★(幾何のズラしは調整が要る)。 |
| ドキュメンタリー / Documentary | `documentary-look` | genre-viral.md | 観察、インタビュー、資料映像の語りで「証拠を見せている」ふりをする、飾らない見た目(フィクションが借りるとモキュメンタリー)。 | ★(整えすぎないのが難所)。 |
| ドリームコア / Dreamcore | `dreamcore` | genre-viral.md | 空っぽの部屋、プール、郊外の廊下を、少し狂った子供時代の照明で包む、やわらかく低コントラストの「記憶の部屋」。 | ★★。 |
| ディストピア / Dystopian | `dystopian` | genre-viral.md | 体制そのものが敵になる、使い込まれた建築、霞、階級、看板で構成された「汚れた未来」の見た目。 | ★★。 |
| フィルムノワール / Film Noir | `film-noir` | genre-viral.md | 硬い光を1灯だけ当て、ブラインドや街灯の影で顔の半分を真っ黒に落とし、濡れた路面が銀に光る白黒の低照度の画。 | ★★(素材の光の向きに依存。素材が無ければベクタ |
| ファウンドフッテージ / Found Footage | `found-footage-look` | genre-viral.md | 劇中の誰かが撮った録画として見せる、日時表示、オートフォーカスの迷い、素人の構図、バッテリー表示のカメラ映像。 | ★★。 |
| ヌーヴェルヴァーグ / French New Wave | `french-new-wave` | genre-viral.md | ロケ撮影、街の光、手持ち、そして「退屈なところを飛ばす」ジャンプカットでフィクションを街の速度で語る見た目。 | ★★。 |
| ドイツ表現主義 / German Expressionism | `german-expressionism` | genre-viral.md | 傾いた壁、絵の具の影、ぎざぎざの硬い光で、セットそのものを「心の状態」にする白黒の見た目。 | ★★(SVGで歪んだセットを作る手間)。 |
| ジャッロ / Giallo | `giallo-look` | genre-viral.md | ガラス窓や照明の原色(赤・青・緑)、ファッション的な室内、脅威へ向かうズーム、黒い手袋で「様式化された殺意」を見せるイタリア・スリラーの見た | ★★。 |
| マジカルリアリズム / Magical Realism | `magical-realism` | genre-viral.md | 認識できる世界の中で、一つの「ありえない事実」を天気のように淡々と撮る見た目。光もレンズも変えない。 | ★(制作の難しさは「足さない」判断)。 |
| マキシマリズム / Maximalism | `maximalism` | genre-viral.md | 色・柄・装飾を画面の全域に詰め込み、照明は「ごちゃごちゃが読める」ために使う、過剰さが目的の見た目。 | ★★(素材を用意する量が多い)。 |
| ネオノワール / Neo-Noir | `neo-noir` | genre-viral.md | ノワールの硬いキーと孤立した構図を残し、銀の夜をネオンやナトリウム灯の「色」に置き換えた現代の見た目。 | ★★。 |
| フォトグラフィー / Photography | `photography` | genre-viral.md | 映画を1枚の「プリント」として扱い、決定的な瞬間、ポーズ、中央構図や群像(タブロー)で、どの1コマも壁に掛けられる画にする見た目。 | ★。 |
| ピクセルアート / Pixel Art | `pixel-art` | genre-viral.md | 世界を目に見える低解像度の格子と限定パレットで作り、連続した粒子ではなく離散的な四角でできた画にする。 | ★(canvasの低解像度→拡大は定番)。 |
| サザンゴシック / Southern Gothic | `southern-gothic` | genre-viral.md | 湿った南部の空気、病んだ金色の夕日、スペイン苔の木漏れ日、ポーチのタングステンで「腐っていく美しさ」を見せる見た目。 | ★★。 |
| スパゲッティウェスタン / Spaghetti Western | `spaghetti-western` | genre-viral.md | テクニスコープ2.35:1、土埃のオーカー、真昼の硬い光、広い景色から目のアップへの切り替えで、決闘前の「間」を見せる西部劇の見た目。 | ★★。 |
| スタイリスティック・サック / Stylistic Suck | `stylistic-suck` | genre-viral.md | 迷うズーム、安いビデオ、間違ったホワイトバランスを映画自身の選択として使う、意図的な素人っぽさ。 | ★★。 |
| テックノワール / Tech Noir | `tech-noir` | genre-viral.md | ノワールの硬いキー・雨・孤立した構図に、画面・LED・企業の塔という未来の光源を重ねる、未来の犯罪都市の見た目。 | ★★。 |
| ヴェイパーウェイブ / Vaporwave | `vaporwave-look` | genre-viral.md | ピンクとシアンのグラデ、大理石、ヤシの木、モール蛍光灯、VHSの色にじみで「届かなかった80年代の未来」を見せる見た目。 | ★(CSSだけで成立)。 |
| ビデオゲーム / Video Game | `video-game` | genre-viral.md | 追従カメラ、アイソメ、FPS視点などゲームエンジンのカメラ論理で、空間を「遊べるレベル」として見せる見た目。 | ★★(カメラのシミュレーションはやや手間)。 |
| ウィアードコア / Weirdcore | `weirdcore` | genre-viral.md | 見慣れたものを間違って符号化する見た目。初期ウェブの圧縮、低解像度、ずれた切り抜き、冗談であり脅威でもある画。 | ★★。 |
| 武侠 / Wuxia | `wuxia-look` | genre-viral.md | 霧の竹林や砂漠の絹の中、ワイヤーで体が空を滑る、風景の中に武の理想を詠う見た目。 | ★★(SVGの人物の動きに手間。素材映像があるな |

## lenses (17)

| 技法 | slug | ファイル | 一言 | 適性 |
|---|---|---|---|---|
| 14mm超広角 / 14mm Ultra-Wide | `ultra-wide-14mm` | lenses-time.md | 被写体に近い位置から極端に広い範囲を写し、手前を巨大に・奥を遠く小さく見せて空間そのものを迫らせる。 | ★★(層の奥行設計が要る)。 |
| 24mm広角 / 24mm Wide | `24mm-wide` | lenses-time.md | 人物と周囲の場所をほぼ対等に収める、極端な誇張のない広角。 | ★(層分けのみ)。 |
| 35mm標準広角 / 35mm Moderate Wide | `35mm-moderate` | lenses-time.md | 50mmより少しだけ世界を足す、物語の標準的な広角。 | ★。 |
| 50mm標準 / 50mm Normal | `50mm-normal` | lenses-time.md | 引き伸ばしも圧縮もしない、人の目に近い遠近のレンズ。 | ★(足さない勇気)。 |
| 85mmポートレート / 85mm Portrait | `85mm-portrait` | lenses-time.md | 離れて立ち、中望遠で顔を大きく切り取り、背景を拡大して後ろへ追いやる。 | ★(層分けとブラー)。 |
| 135mm望遠 / 135mm Telephoto | `135mm-telephoto` | lenses-time.md | 遠くから長い玉で捉え、手前の人物と背景の群れを積み重ねて「覗き見」の距離感を出す。 | ★★。 |
| 200mm超望遠 / 200mm Long Telephoto | `200mm-long` | lenses-time.md | 非常に遠くに立って超望遠で捉え、遠近差をほぼ消し、陽炎や空気の層を画に残す。 | ★★(陽炎フィルタの調整)。 |
| 望遠圧縮 / Telephoto Compression | `compression` | lenses-time.md | 遠い視点によって奥行き方向の大きさの差が縮み、群衆や都市が人物に貼りつく遠近効果。 | ★★(多層素材が必要)。 |
| 魚眼 / Fisheye | `fisheye` | lenses-time.md | 超広角の曲線投影で直線を中心から外へ向かって曲げ、世界が顔の周りを包む。 | ★★(弱い歪み)〜★★★(強い魚眼はシェーダー) |
| アナモルフィック / Anamorphic | `anamorphic` | lenses-time.md | 水平方向に圧縮して撮り、横長に戻す光学系。楕円ボケ・横に流れるフレア・独特の端の描写を生む。 | ★★(ボケとフレアの密度調整)。 |
| スフェリカル / Spherical | `spherical` | lenses-time.md | 圧縮のない通常の球面レンズ。ボケは丸く、画面端はまっすぐ。 | ★(デフォルト)。 |
| ヴィンテージシネグラス / Vintage Cine Glass | `vintage-cine` | lenses-time.md | 古い映画用レンズ特有の低コントラスト、ハイライトのにじみ、端の渦や揺らぎ。 | ★★(ハレーションの色と量の調整)。 |
| マクロ / Macro | `macro` | lenses-time.md | 近接撮影で小さな物体や質感を画面いっぱいに写し、被写界深度が数ミリに縮む光学表現。 | ★★(質感を作る時間)。 |
| 倍率 / Magnification | `magnification` | lenses-time.md | 被写体の実寸に対する像の大きさ(スケール値)。1センチが画面を満たすほど、スケール感を意図的に失わせる。 | ★★(層の絵作り)。 |
| プローブレンズ / Probe Lens | `probe-lens` | lenses-time.md | 細長いマクロ光学系で、グラスの中、機械の隙間、料理の上を「内側から」動くように写す。 | ★★★(多数の3D層と距離連動ブラー)。簡易版: |
| スプリットディオプター / Split Diopter | `split-diopter` | lenses-time.md | 半分だけの近接補助レンズで、近景と遠景の両方にピントを合わせ、境界に狭いボケ帯が出る。 | ★★(継ぎ目を隠す構図づくり)。 |
| ティルトシフト / Tilt-Shift | `tilt-shift` | lenses-time.md | レンズを傾けてピント面を斜めに回し、細い帯状の鮮明さで実景を模型のように見せる。 | ★★(俯瞰の素材が前提。ない場合は俯瞰図をSVG |

## lighting (41)

| 技法 | slug | ファイル | 一言 | 適性 |
|---|---|---|---|---|
| 自然光 / Available Light | `available-light` | lighting.md | ライトを足さず、その場にもともとある太陽・空・既存の照明だけで撮る。 | ★(コードは最小。足さない判断が難しいだけ)。 |
| バックライト / Backlight | `backlight` | lighting.md | 被写体の背後からカメラ方向へ光を当て、輪郭を縁取って暗い背景から浮かせる(煙があれば光芒にもなる)。 | ★★(フィルタ連鎖の理解が要る)。 |
| ブルーアワー / Blue Hour | `blue-hour` | lighting.md | 日没後(日の出前)、太陽は沈んだが空がまだ青く光っている時間帯の、冷たい環境光と暖色の灯りが同居する光。 | ★(グラデーションと点光源だけ)。 |
| バウンスライト / Bounce Light | `bounce-light` | lighting.md | 光を壁・天井・白いボードなどに一度反射させてから当て、見かけの光源を大きな面にして影の縁を柔らかく回り込ませる。 | ★(ぼかした楕円とグラデ)。 |
| ブロードライティング / Broad Lighting | `broad-lighting` | lighting.md | カメラに向いている側の頬にキーを当て、手前の頬を明るく、影を奥側に置く。 | ★(グラデーションの中心を動かすだけ)。 |
| バタフライライティング / Butterfly Lighting | `butterfly-lighting` | lighting.md | キーを顔の正面かつ高い位置に置き、鼻の下に小さな蝶形の影を落とす(パラマウントライティング)。 | ★(対称構図でパーツ数が少ない)。 |
| カメオライティング / Cameo Lighting | `cameo-lighting` | lighting.md | 人物だけを光の中に残し、背景を完全な黒に落として「虚空から切り出された」ように見せる。 | ★(黒背景に光の当たった人物)。 |
| キャンドルライト / Candlelight | `candlelight` | lighting.md | 約1800Kの小さな炎が顔の近くだけを照らし、距離とともに急速に闇へ落ちるちらつく光。 | ★★(減衰の設計とちらつきの決定性)。 |
| キアロスクーロ / Chiaroscuro | `chiaroscuro` | lighting.md | 強い明暗の対比で量感を彫り出し、闇に「隠す・裁く」意味を持たせる光(カラヴァッジョ的)。 | ★★(光源1つの減衰設計とライティングフィルタ) |
| クロスライティング / Cross Lighting | `cross-lighting` | lighting.md | 反対方向から2つのキーを当て、それぞれの人物(または体の両側)に顔と縁を与える。ステージや対話の定番。 | ★★(左右別の縁と色)。 |
| 木漏れ日 / Dappled Light | `dappled-light` | lighting.md | 葉、水面、ブラインドなど不規則な遮蔽物が硬い光を割り、明暗のまだらを顔や服の上に落とす。 | ★★(feTurbulenceのコントラスト設計 |
| エピファニー(気づきの光) / Epiphany | `epiphany` | lighting.md | 悟りの瞬間に合わせて光が変化し、人物の顔が部屋で一番明るい事実になる。 | ★(時間変化の設計がすべて)。 |
| アイライト / Eye Light | `eye-light` | lighting.md | 顔が暗いままでも、瞳に小さなキャッチライト(反射)を入れて目を生かす小さな正面光。 | ★(小さな白円1個)。 |
| フィルライト / Fill Light | `fill-light` | lighting.md | キーの反対側から弱く当て、影の中をどこまで読ませるか(比)を決める補助光。 | ★(不透明度の調整)。 |
| グラム / Glam | `glam` | lighting.md | 大きなビューティーキー、瞳へのキャッチライト、肌への軽い拡散を組み合わせた「顔を売る」ライティング一式。 | ★★(3層+スペキュラ)。 |
| ゴボライティング / Gobo Lighting | `gobo-lighting` | lighting.md | 光の経路にブラインド、格子、枝などの型(ゴボ/ククロリス)を置き、顔・体・壁に図形的な影を落とす。 | ★(repeating-linear-gradi |
| ゴールデンアワー / Golden Hour | `golden-hour` | lighting.md | 日の出直後・日没前の、低い角度の暖かい直射光。影が長く、方向がはっきりし、短時間しか続かない。 | ★(影の変形とグラデーション)。 |
| ヘアライト / Hair Light | `hair-light` | lighting.md | 被写体の頭上後方からの小さな光で、髪の上面だけに縁を作り背景から分離する。 | ★(マスク1枚)。 |
| ハードライト / Hard Light | `hard-light` | lighting.md | 見かけの小さな光源から、影の縁が鋭く、肌・金属・壁の質感が強調される光。 | ★(blur=0の影、スペキュラ)。 |
| ハイキーライティング / High-Key Lighting | `high-key` | lighting.md | コントラストが低く全体が明るく、深い影が少ない、開放的で読みやすい照明(露出オーバーとは別物)。 | ★(コードは簡単、白飛びの管理が要る)。 |
| キーライト / Key Light | `key-light` | lighting.md | 被写体の主な方向・形・露出を決める主光源。ほかのライトはすべてこれとの比で測られる。 | ★(設計の話。変数1セットを共有するだけ)。 |
| キッカー / Kicker | `kicker` | lighting.md | 被写体の斜め後ろから、頬・顎・肩の縁に硬い細いアクセントを入れる光。 | ★★(マスクで範囲を限定する)。 |
| ループライティング / Loop Lighting | `loop-lighting` | lighting.md | キーを少し斜め上にずらし、鼻の影が口角へ向かう小さな輪(ループ)を作る。頬の影とは繋がらない。 | ★(バタフライの顔の応用)。 |
| ローキーライティング / Low-Key Lighting | `low-key` | lighting.md | 高コントラストで光を選び、画面の大半を黒に近い影に残す。暗さは事故ではなく設計。 | ★(光の池1つ)。 |
| モチベーテッドライティング / Motivated Lighting | `motivated-lighting` | lighting.md | 窓、ランプ、看板など、物語世界に存在し得る光源と整合するように設計する(実際には隠れた機材が同じ方向・硬さ・色で働く)。 | ★(光源を画面に描き、同じ変数を共有する)。 |
| ナチュラリスティック・アンビエント / Naturalistic Ambient | `naturalistic-ambient` | lighting.md | 柔らかく方向が自然な環境光で被写体を包み、足したライトを感じさせない「ライティングしていない風」の見た目。 | ★(引き算の設計)。 |
| ネオン・プラクティカル / Neon Practicals | `neon-practical` | lighting.md | 画面内に見えるネオン管・看板を実際のキーや強いアクセントとして使い、顔にマゼンタやシアンの色を乗せる。 | ★★(発光+顔への色の乗せ込み+床反射)。 |
| プラクティカルライティング / Practical Lighting | `practical-lighting` | lighting.md | ランプ、ネオン、ろうそく、画面など、セットに実在して見える光源を、実際に顔を照らす光として使う。 | ★(光源と照り返しを同じ変数で駆動)。 |
| レンブラントライティング / Rembrandt Lighting | `rembrandt` | lighting.md | キーを高く、約45度横に置き、鼻の影を頬の影へ繋げ、影側の目の下に小さな光の三角形を残す肖像パターン。 | ★★(三角形の形状と鼻影の繋がり)。 |
| リムライト / Rim Light | `rim-light` | lighting.md | 絞った逆光で、帽子のつば・髪・コートの縁だけに細い光の線を入れ、顔を開かずに背景から分離する。 | ★★(SVGフィルタ)。 |
| ショートライティング / Short Lighting | `short-lighting` | lighting.md | カメラから見て奥側(顔が向こうを向いている側)の頬にキーを当て、手前の頬が影になる。 | ★(影の向きを逆にするだけ)。 |
| サイドライティング / Side Lighting | `side-lighting` | lighting.md | 被写体に対してほぼ90度の横からキーを当て、形とテクスチャを強調する。半分は光、半分は影。 | ★★(ライティングフィルタの調整)。 |
| シルエット / Silhouette | `silhouette` | lighting.md | 明るい背景の前に被写体を暗い形として置き、顔の詳細を捨てて輪郭と仕草だけで語る。 | ★(ベクターでは最も簡単で効果が大きい)。 |
| ソフトライト / Soft Light | `soft-light` | lighting.md | 見かけの大きな光源から来る、影の移行がなだらかで肌に回り込む光。 | ★(blur量の設計)。 |
| スプリットライティング / Split Lighting | `split-lighting` | lighting.md | キーを鼻に対して90度に置き、顔を中心線で明暗に二分する(三角形もループもない)。 | ★(硬い境界のグラデーション)。 |
| スポットライト / Spotlight | `spotlight` | lighting.md | 劇場用の集光器具が作る、縁が硬く見える光の円。周囲は暗く、人物はその円の中の「演者」になる。 | ★(mask/clip-path の円)。 |
| スリーポイントライティング / Three-Point Lighting | `three-point-lighting` | lighting.md | キー・フィル・バックの3つで、顔を一方向から立体にし、影を開き、背景から分離する基本の型。 | ★(層は3つで基本の構成)。 |
| トップライト / Top Light | `top-light` | lighting.md | 真上からの光で額・鼻筋・肩を照らし、眼窩とあごの下が影に沈む。 | ★(上からのグラデと眼窩の影)。 |
| アンダーライティング / Underlighting | `under-light` | lighting.md | 顔の下から上へ光を当て、影が頬骨や眼窩の上へ這い上がる、通常の昼光と逆の陰影。 | ★(グラデの向きを反転するだけ)。 |
| ボリュメトリックライト(光芒) / Volumetric Light | `volumetric-light` | lighting.md | 霧・埃・煙・雨などの粒子で光の通り道を可視化し、空気そのものを撮る(ゴッドレイ、薄明光線)。 | ★★(conic-gradient+埃のPRNG |
| ウィンドウライト(窓光) / Window Light | `window-light` | lighting.md | 窓から入ってくるように見える、大きく方向のある光。部屋に向かって減衰していく。 | ★(窓の矩形からの減衰グラデ)。 |

## time-and-motion (21)

| 技法 | slug | ファイル | 一言 | 適性 |
|---|---|---|---|---|
| スローモーション / Slow Motion | `slow-motion` | lenses-time.md | 実際の出来事を、より長い画面時間で再生し、通常のフレームでは潰れる布の遅れや粒子の滞空を見せる。 | ★(関数駆動なら容易。素材が動画なら ★★★)。 |
| ファストモーション / Fast Motion | `fast-motion` | lenses-time.md | 連続した動作を通常より短い時間に圧縮して再生し(アンダークランクまたはリタイム)、群衆や雲を駆け抜けさせる。 | ★。 |
| スピードランプ / Speed Ramp | `speed-ramp` | lenses-time.md | 1つのショットの中で再生速度を変え、1つの瞬間だけを引き伸ばしてから現実の時間に戻す。 | ★★(率カーブの調整)。 |
| フリーズフレーム / Freeze Frame | `freeze-frame` | lenses-time.md | 1枚の画を保持し、カメラも被写体も世界も新しいサンプルを生まなくする。 | ★。 |
| フローズン・イン・モーション / Frozen in Motion | `frozen-in-motion` | lenses-time.md | 環境と周囲の人々を止めたまま、選ばれた人物かカメラだけが動き続ける。 | ★★(2つの時計の設計。素材が実写なら不向き:  |
| バレットタイム / Bullet Time | `bullet-time` | lenses-time.md | 出来事をほぼ止めたまま、視点だけがその周りを軌道で移動し、一瞬を「彫刻」のように歩き回れるようにする。 | ★★★(3D構成が必要)。簡易版: 被写体を1枚 |
| タイムラプス / Time-Lapse | `time-lapse` | lenses-time.md | 長い間隔で1コマずつ撮り、ゆっくりした変化(影の移動、群衆の流れ)を連続した動きとして見せる。 | ★★(光・影・雲の同期設計)。 |
| タイムラプス・ランドスケープ / Timelapse Landscape | `timelapse-landscape` | lenses-time.md | 場所の光と天気を間隔撮影し、数時間を数秒にして雲と影が地形を掃く。 | ★★。 |
| タイムラプス・ヒューマン / Timelapse Human | `timelapse-human` | lenses-time.md | 1人を現実の時間に保ったまま、周囲の群衆だけを間隔撮影で煙のように流す。 | ★★(2つの時計の分離。実写合成は不向き: シル |
| タイムラプス・グラム / Timelapse Glam | `timelapse-glam` | lenses-time.md | スタイリングの過程(衣装・髪・メイク)を間隔撮影で高速に変え、顔だけを保持する。 | ★★(衣装素材が必要。実写顔は不向き: イラスト |
| ステッププリンティング / Step Printing | `step-printing` | lenses-time.md | コマを繰り返す(または間引く)ことで、動きが階段状に進み、各コマの内部は長い露光で滲んだ質感になる。 | ★★。 |
| スタッター(コマ飛び)/ Stutter / Stop-Stutter | `stutter` | lenses-time.md | コマを落としたり繰り返したりして再生が引っかかり、世界の時計が詰まる。 | ★。 |
| ストップモーション / Stop Motion | `stop-motion` | lenses-time.md | 物体を少しずつ動かしては1コマ撮り、ポーズからポーズへ移る手作りの動き。 | ★★(ポーズ設計)。実写の再現は不向き: 紙やベ |
| モーションブラー / Motion Blur | `motion-blur` | lenses-time.md | 露光中に被写体やカメラが動いて起こる流れ。長いシャッターで輪郭をあえて崩す。 | ★★(方向と量の調整)。 |
| ローシャッター / Low Shutter | `low-shutter` | lenses-time.md | 短いシャッター角(短い露光)でブラーを減らし、動きの縁を鋭く保つ。通常速度が断片的でカクカクに見える。 | ★。 |
| リバースモーション / Reverse Motion | `reverse-motion` | lenses-time.md | 記録した動作を逆再生し、結果が原因より先に来るようにする。雨が上り、煙が戻り、壊れた物が元に戻る。 | ★(純関数で書けている場合)。 |
| ブーメラン / Boomerang | `boomerang` | lenses-time.md | 短い動作を順再生した後、同じコマを逆再生して往復させ、ループにする。 | ★。 |
| 無限ループ / Infinite Loop | `infinite-loop` | lenses-time.md | 最後のフレームを最初につなぎ、動きが終わりに到達しないようにする。物語では同じ一日を繰り返す構造にも使う。 | ★。 |
| ムーンウォーク / Moonwalk | `moonwalk` | lenses-time.md | 上体を保ち、片足が床を滑り、もう一方が押す「後ろへ進むのに前へ歩いて見える」歩き。逆再生ではない。 | ★★★(足の接地ロジック)。難しければ背景スクロ |
| ロングテイク / Long Take | `long-take` | lenses-time.md | 目に見えるカットなしに、持続する演技・空間・動きを保つ長い1ショット。ブロッキングとカメラが1つの文になる。 | ★★(長い時間軸の設計)。実写の長回しそのものは |
| ワンカー / Oner | `one-er` | lenses-time.md | 1カットで撮ったように見える設計のシーン。真の長回しでも、暗転・ウィップ・横切る物体で継ぎ目を隠した合成でもよい。 | ★★(継ぎ目の速度整合)。 |

## viral-looks (44)

| 技法 | slug | ファイル | 一言 | 適性 |
|---|---|---|---|---|
| 2000年代パパラッチ / 2000s Paparazzi | `2000s-paparazzi` | genre-viral.md | コンパクトデジカメの正面フラッシュで、壁に硬い影、緑がかった白、準備のできていない顔を撮る「盗まれた光」の見た目。 |  |
| 3Dレンダー / 3D Render | `3d-render` | genre-viral.md | 人物を製品ビジュアルのように、きれいなGI、少し均一すぎる肌、無限の背景(シクロラマ)で「計算された」見た目にする。 |  |
| アシッド(焼けたプリント) / Acid | `acid` | genre-viral.md | 日に焼けたプリントのように、溶ける縁、焼けた色、ずれた銀を持つ「壊れた写真」の見た目。軌跡(LSD)は付けない。 |  |
| アクションフィギュア / Action Figure | `action-figure` | genre-viral.md | 人物を商品化する。プラスチックの関節、塗装された衣装、ブリスターパック風の照明で「ヒーローの玩具」にする。 |  |
| アガメムノン(青銅の黄昏) / Agamemnon | `agamemnon` | genre-viral.md | 硬い太陽、青銅の照り返し、痣色の夕空で、生身の人間を古代の金属のように見せる、悲劇的な叙事詩のグレード。 |  |
| アクリル絵具 / Akrill | `akrill` | genre-viral.md | 厚く盛られた樹脂のような絵具、ポスター的な縁、高彩度、まだ濡れて光る絵肌。 |  |
| ブルーデプス(青の奥行き) / Blue Depth | `blue-depth` | genre-viral.md | 遠いほど深いシアンになる平面の積み重ねで、距離を「青の勾配」として見せる(水中や夜のガラス)。 |  |
| 割れた鏡 / Broken Mirror | `broken-mirror` | genre-viral.md | ひび割れた銀の破片に顔が散らばり、破片ごとに少しずつ違う角度・時間の同じ人物が映る(同意しない顔)。 |  |
| キャンバス(油絵) / Canvas | `canvas` | genre-viral.md | 写真の被写体が油彩をまとう。筆の毛先、キャンバスの目、光の部分に厚い絵具、目はまだ生きている。 |  |
| 気だるいモンスター退治 / Casual Monster Slayer | `casual-monster-slayer` | genre-viral.md | 普段着の人物が、巨大な怪物と戦うのを日常の用事のようにこなす。服と光は日常、怪物だけが豪華。 |  |
| コールドビジョン / Cold Vision | `cold-vision` | genre-viral.md | 世界を「温度」として見る。北極の写真的なグレード(息・氷)か、サーモ偽色(熱の縁)か、どちらか1つのセンサーに決める。 |  |
| コミック / Comic | `comic` | genre-viral.md | 実写のフレームに墨の輪郭、影のハーフトーン、限定した差し色をのせる。写真の身体は残り、「出版された1ページ」に見える。 |  |
| イルカライド / Dolphin Ride | `dolphin-ride` | genre-viral.md | 「イルカに乗る」観光の不可能さを真顔で見せる。明るい海、正直な水平線、水しぶき、乗り物としての動物が笑いの核。 |  |
| おとぎ話の城 / Fairytale Castle | `fairytale-castle` | genre-viral.md | 絵本のような石、ありえない尖塔、挿絵として扱った夕暮れの中に、小さな人物を置く「場所が主役」の見た目。 |  |
| 堕天使 / Fallen Angel | `fallen-angel` | genre-viral.md | 墜ちた後の聖なる光。汚れた教会の窓からの光の筋、ローキーな肌、布や影で示される壊れた翼。 |  |
| フラッシュコミック / Flash Comic | `flash-comic` | genre-viral.md | コミックの墨線とハーフトーンに、ストロボの白い爆発を足す。出版物とパパラッチが一撃になる。 |  |
| ハンドペイント / Hand Paint | `hand-paint` | genre-viral.md | 動いている絵の上に、濡れた筆跡がたった今置かれた。完成した油彩(キャンバス)ではなく、塗るという「動詞」を見せる。 |  |
| インクライオット / Ink Riot | `ink-riot` | genre-viral.md | 黒と色の液体書道が、写真のままの被写体の周りの空気を占拠し、滴り、爆ぜる。インクは「質感」ではなく「天気」。 |  |
| 騎士の日記 / Knight's Diary | `knights-diary` | genre-viral.md | 画面を「泥のついた彩飾写本のページ」として扱う。ハイライトは金箔、質感は鉄、布は汚れ、顔は疲れた聖人。 |  |
| ラバ(溶岩) / Lava | `lava` | genre-viral.md | 溶けた光。黒い地殻、橙の割れ目、下からの熱がキーライトになり、空気が揺らぐ。 |  |
| 本の中へ / Lost in a Book | `lost-in-a-book` | genre-viral.md | 開いた本を扉にする。手前に紙、綴じ目が敷居、頁から絵や天気があふれ、読者が覗き込む/落ちる。 |  |
| LSD(サイケデリックな知覚) / LSD | `lsd` | genre-viral.md | 光の尾、わずかな二重の縁、過飽和の光源、ゆっくり呼吸する壁。知覚そのものを舞台にした見た目。 |  |
| マガジン(雑誌の表紙) / Magazine | `magazine` | genre-viral.md | 誌名(マストヘッド)を載せる余白を前提にデザインされたポートレート。ファッション照明、サムネで読める衣装、売られるページとしての構図。 |  |
| マーブル(大理石) / Marble | `marble` | genre-viral.md | 石が肌になる。白い大理石の脈、冷たい磨き、なお息をしている彫像。 |  |
| マイティファイター / Mighty Fighter | `mighty-fighter` | genre-viral.md | 格闘ゲームの選択画面のように、大きなスタンスで決めた勝者のポーズ。硬いリム、おもちゃ箱の色、背景は舞台。 |  |
| モダン建築 / Modern | `modern` | genre-viral.md | 部屋が主題。ガラスの面、設計された空虚、ミース/安藤のような幾何の中の小さな人物。 |  |
| モネ・ミューズ / Monet Muse | `monet-muse` | genre-viral.md | 写真の景色を「分割された色の点」に溶かす。庭の筆触、水は線、混色は見る人の目の中。ぼかしではない。 |  |
| マルチバース / Multiverse | `multiverse` | genre-viral.md | 同じ人物を、平行する別々の部屋・グレード・衣装に同時に置く。複数の世界が分離して見える。 |  |
| ノワール(プリセット) / Noir | `noir` | genre-viral.md | 濡れた路面、ブラインドの影、動機のある硬いキー、顔の半分が消える。映画のフィルムノワールを1つのプリセットとして圧縮した見た目。 |  |
| オービタル・プレゼンス(軌道上の存在) / Orbital Presence | `orbital-presence` | genre-viral.md | 惑星の上の真空に人間が浮かぶ。硬い無フィルの太陽光、鋭い惑星の縁、衛星としての人物。 |  |
| 折り紙 / Origami | `origami` | genre-viral.md | 紙が「折り目という法則」を持つ彫刻になる。折り目、平面の色、人物や街が折りたたまれて形になる。 |  |
| ペーパー(ちぎり紙) / Paper | `paper` | genre-viral.md | 世界が紙の繊維でできている。ちぎった縁、見える繊維、紙から切り抜かれた人物。 |  |
| 真珠の耳飾り(フェルメール風) / Pearl Earring | `pearl-earring` | genre-viral.md | 北向きの窓1つ、暗い土色の背景、光で描いたような肌、宝石の小さな反射。オランダの室内をグレードとして使う。 |  |
| ペンギンライド / Penguin Ride | `penguin-ride` | genre-viral.md | ペンギンにまたがって氷や、場違いな街を進む不条理を真顔で見せる。乗り物がオチで、横に立たせるだけでは成立しない。 |  |
| ハト(群れの飛び立ち) / Pigeons | `pigeons` | genre-viral.md | 街中で人物は静止、周りでハトの群れが紙吹雪のように爆発的に飛び立ち、羽が空を満たしてまた落ち着く。 |  |
| パフィンライド / Puffin Ride | `puffin-ride` | genre-viral.md | 断崖と波しぶきの中、人物がパフィン(海鳥)にまたがって「通勤」する不条理を真顔で見せる。 |  |
| レーストラック / Race Track | `race-track` | genre-viral.md | 人や機械をサーキットの幾何(楕円、縁石の塗装、フェンス、観客席)に縫い付け、速度を「閉じた周回」として見せる。 |  |
| ランダムグロー / Random Glow | `random-glow` | genre-viral.md | 理由のない光の玉とアナログな光漏れで、ランプに取りつかれたような画。拡散が均一なのは失敗。 |  |
| スケートドッグ / Skatedog | `skatedog` | genre-viral.md | 地面すれすれ、広角、手前にアスファルト。動物や乗り手がストリートのスポーツをこなす、低くてバカバカしい舗装の文法。 |  |
| スケッチ / Sketch | `sketch` | genre-viral.md | 絵具の前の段階。探るような輪郭、影のハッチング、光の部分は紙の白のまま。未完成であることが見た目。 |  |
| スーパースター / Superstar | `superstar` | genre-viral.md | 表紙のための顔。ビューティーキー、キャッチライト、フラッシュの壁(観客)が暗示された、見られることが前提の画。 |  |
| トキシック / Toxic | `toxic` | genre-viral.md | 空気が汚染として見える。病的な緑、黄色い霞、逆光で見える煙。空気が危険物。 |  |
| ツートーン(2色) / Two Color | `two-color` | genre-viral.md | 2つの色相だけで画を描く(デュオトーン)。2色以外は消す。または白黒+1色のスポットカラー。 |  |
| ウルトラバイオレット(ブラックライト) / Ultraviolet | `ultraviolet` | genre-viral.md | ブラックライトの映画。白が叫び、UV下でしか存在しない色が出る。周囲は虚無に沈む。 |  |
