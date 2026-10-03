# 録音済み効果音のカタログ(CC0・Kenney)— 検索語の早見
設計書を書く時は、ここから実在する名前を選ぶ(推測しない)。読み込みは `sfx_lib.load(name)` / 種類から選ぶ `sfx_lib.pick(kind, seed)`。**無いもの**: 銃声・爆発・雨・風・車・動物・人の声(ボイス)。これらは合成/GM楽器/重ね技で作る(下の「無い音の作り方」)。

## impact-sounds
`footstep_carpet`×5, `footstep_concrete`×5, `footstep_grass`×5, `footstep_snow`×5, `footstep_wood`×5, `impactBell_heavy`×5, `impactGeneric_light`×5, `impactGlass_heavy`×5, `impactGlass_light`×5, `impactGlass_medium`×5, `impactMetal_heavy`×5, `impactMetal_light`×5, `impactMetal_medium`×5, `impactMining`×5, `impactPlank_medium`×5, `impactPlate_heavy`×5, `impactPlate_light`×5, `impactPlate_medium`×5, `impactPunch_heavy`×5, `impactPunch_medium`×5, `impactSoft_heavy`×5, `impactSoft_medium`×5, `impactTin_medium`×5, `impactWood_heavy`×5, `impactWood_light`×5, `impactWood_medium`×5

## interface-sounds
`back`×4, `bong`×1, `click`×5, `close`×4, `confirmation`×4, `drop`×4, `error`×8, `glass`×6, `glitch`×4, `maximize`×9, `minimize`×9, `open`×4, `pluck`×2, `question`×4, `scratch`×5, `scroll`×5, `select`×8, `switch`×7, `tick`×3, `toggle`×4

## rpg-audio
`beltHandle`×2, `bookClose`×1, `bookFlip`×3, `bookOpen`×1, `bookPlace`×3, `chop`×1, `cloth`×4, `clothBelt`×2, `creak`×3, `doorClose`×4, `doorOpen`×2, `drawKnife`×3, `dropLeather`×1, `footstep`×10, `handleCoins`×2, `handleSmallLeather`×2, `knifeSlice`×2, `metalClick`×1, `metalLatch`×1, `metalPot`×3

## 無い音の作り方(重ね技)
- **銃声**: 録音の衝撃(`impactMetal_heavy`/`impactPunch_heavy`)+ 高域ノイズの短いクラック(5ms)+ 帯域ノイズの胴鳴り(80ms減衰)+ 低い唸り + 残響。GM の "Gunshot"(program 127)も重ねられる。
- **爆発・着弾**: 低域ノイズの減衰 + サブ(40Hz前後、減衰150〜400ms)+ `impactPlate_heavy`/`impactMining`。
- **風・砂嵐**: ピンクノイズを帯域(200〜3000Hz)で絞り、ゆっくりうねらせる(白色ノイズは使わない)。
- **息・機械音**: GM 121(ブレスノイズ)や 125(ヘリ)を低く下げて代用。
