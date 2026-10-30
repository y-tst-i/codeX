# 録音済み効果音のカタログ(CC0・Kenney)— 検索語の早見
設計書を書く時は、下の一覧から実在する名前を選ぶ(推測しない。例: `tick_000` は無い)。読み込みは `sfx_lib.load(name)` / 種類から選ぶ `sfx_lib.pick(kind, seed)`。**無いもの**: 銃声・爆発・雨・風・車・動物・人の声(ボイス)。これらは合成/GM楽器/重ね技で作る(下の「無い音の作り方」)。

ライセンス: Kenney(https://kenney.nl)の Impact Sounds / RPG Audio / Interface Sounds、CC0(パブリックドメイン相当、帰属表示は任意、商用・改変・再配布可)。各パックの `License.txt` と `tools/assets/sfx-cc0/README.md` を参照。

## 一覧(実在するファイル)
<!-- BEGIN sfx-list: 自動生成(python3 tools/sfx_lib.py catalog --write references/sfx-catalog.md)。手で直さない -->
全 281 個。場所は `tools/assets/sfx-cc0/<パック>/<名前>.ogg`。`sfx_lib.load("名前")` には拡張子なしの名前を渡す。

### impact-sounds(130個、`tools/assets/sfx-cc0/impact-sounds/`)

| 種類 | 実在する名前(長さ 秒) |
|---|---|
| `footstep_carpet` | `footstep_carpet_000` 0.14, `footstep_carpet_001` 0.14, `footstep_carpet_002` 0.14, `footstep_carpet_003` 0.14, `footstep_carpet_004` 0.14 |
| `footstep_concrete` | `footstep_concrete_000` 0.11, `footstep_concrete_001` 0.11, `footstep_concrete_002` 0.11, `footstep_concrete_003` 0.11, `footstep_concrete_004` 0.11 |
| `footstep_grass` | `footstep_grass_000` 0.78, `footstep_grass_001` 0.67, `footstep_grass_002` 0.69, `footstep_grass_003` 0.67, `footstep_grass_004` 0.59 |
| `footstep_snow` | `footstep_snow_000` 0.37, `footstep_snow_001` 0.37, `footstep_snow_002` 0.37, `footstep_snow_003` 0.37, `footstep_snow_004` 0.37 |
| `footstep_wood` | `footstep_wood_000` 0.25, `footstep_wood_001` 0.25, `footstep_wood_002` 0.25, `footstep_wood_003` 0.25, `footstep_wood_004` 0.25 |
| `impactBell_heavy` | `impactBell_heavy_000` 1.48, `impactBell_heavy_001` 1.74, `impactBell_heavy_002` 0.70, `impactBell_heavy_003` 0.65, `impactBell_heavy_004` 0.30 |
| `impactGeneric_light` | `impactGeneric_light_000` 0.14, `impactGeneric_light_001` 0.12, `impactGeneric_light_002` 0.14, `impactGeneric_light_003` 0.14, `impactGeneric_light_004` 0.14 |
| `impactGlass_heavy` | `impactGlass_heavy_000` 0.24, `impactGlass_heavy_001` 0.43, `impactGlass_heavy_002` 0.25, `impactGlass_heavy_003` 0.17, `impactGlass_heavy_004` 0.40 |
| `impactGlass_light` | `impactGlass_light_000` 0.21, `impactGlass_light_001` 0.21, `impactGlass_light_002` 0.21, `impactGlass_light_003` 0.21, `impactGlass_light_004` 0.21 |
| `impactGlass_medium` | `impactGlass_medium_000` 0.54, `impactGlass_medium_001` 0.54, `impactGlass_medium_002` 0.54, `impactGlass_medium_003` 0.54, `impactGlass_medium_004` 0.54 |
| `impactMetal_heavy` | `impactMetal_heavy_000` 0.17, `impactMetal_heavy_001` 0.36, `impactMetal_heavy_002` 0.12, `impactMetal_heavy_003` 0.21, `impactMetal_heavy_004` 0.13 |
| `impactMetal_light` | `impactMetal_light_000` 0.35, `impactMetal_light_001` 0.25, `impactMetal_light_002` 0.24, `impactMetal_light_003` 0.48, `impactMetal_light_004` 0.21 |
| `impactMetal_medium` | `impactMetal_medium_000` 0.27, `impactMetal_medium_001` 0.14, `impactMetal_medium_002` 0.12, `impactMetal_medium_003` 0.25, `impactMetal_medium_004` 0.11 |
| `impactMining` | `impactMining_000` 0.94, `impactMining_001` 0.87, `impactMining_002` 0.81, `impactMining_003` 0.99, `impactMining_004` 0.83 |
| `impactPlank_medium` | `impactPlank_medium_000` 0.78, `impactPlank_medium_001` 0.78, `impactPlank_medium_002` 0.78, `impactPlank_medium_003` 0.78, `impactPlank_medium_004` 0.78 |
| `impactPlate_heavy` | `impactPlate_heavy_000` 0.49, `impactPlate_heavy_001` 0.35, `impactPlate_heavy_002` 0.49, `impactPlate_heavy_003` 0.35, `impactPlate_heavy_004` 0.56 |
| `impactPlate_light` | `impactPlate_light_000` 0.54, `impactPlate_light_001` 0.66, `impactPlate_light_002` 0.49, `impactPlate_light_003` 0.53, `impactPlate_light_004` 0.66 |
| `impactPlate_medium` | `impactPlate_medium_000` 0.61, `impactPlate_medium_001` 0.62, `impactPlate_medium_002` 0.52, `impactPlate_medium_003` 0.65, `impactPlate_medium_004` 0.53 |
| `impactPunch_heavy` | `impactPunch_heavy_000` 0.65, `impactPunch_heavy_001` 0.54, `impactPunch_heavy_002` 0.46, `impactPunch_heavy_003` 0.47, `impactPunch_heavy_004` 0.54 |
| `impactPunch_medium` | `impactPunch_medium_000` 0.43, `impactPunch_medium_001` 0.41, `impactPunch_medium_002` 0.54, `impactPunch_medium_003` 0.46, `impactPunch_medium_004` 0.54 |
| `impactSoft_heavy` | `impactSoft_heavy_000` 0.51, `impactSoft_heavy_001` 0.57, `impactSoft_heavy_002` 0.57, `impactSoft_heavy_003` 0.54, `impactSoft_heavy_004` 0.50 |
| `impactSoft_medium` | `impactSoft_medium_000` 0.12, `impactSoft_medium_001` 0.18, `impactSoft_medium_002` 0.14, `impactSoft_medium_003` 0.14, `impactSoft_medium_004` 0.15 |
| `impactTin_medium` | `impactTin_medium_000` 0.16, `impactTin_medium_001` 0.17, `impactTin_medium_002` 0.13, `impactTin_medium_003` 0.21, `impactTin_medium_004` 0.18 |
| `impactWood_heavy` | `impactWood_heavy_000` 0.31, `impactWood_heavy_001` 0.31, `impactWood_heavy_002` 0.31, `impactWood_heavy_003` 0.31, `impactWood_heavy_004` 0.31 |
| `impactWood_light` | `impactWood_light_000` 0.27, `impactWood_light_001` 0.27, `impactWood_light_002` 0.27, `impactWood_light_003` 0.27, `impactWood_light_004` 0.27 |
| `impactWood_medium` | `impactWood_medium_000` 0.33, `impactWood_medium_001` 0.33, `impactWood_medium_002` 0.33, `impactWood_medium_003` 0.33, `impactWood_medium_004` 0.33 |

### interface-sounds(100個、`tools/assets/sfx-cc0/interface-sounds/`)

| 種類 | 実在する名前(長さ 秒) |
|---|---|
| `back` | `back_001` 0.06, `back_002` 0.07, `back_003` 0.09, `back_004` 0.07 |
| `bong` | `bong_001` 0.12 |
| `click` | `click_001` 0.10, `click_002` 0.01, `click_003` 0.01, `click_004` 0.01, `click_005` 0.01 |
| `close` | `close_001` 0.15, `close_002` 0.31, `close_003` 0.31, `close_004` 0.32 |
| `confirmation` | `confirmation_001` 0.29, `confirmation_002` 0.54, `confirmation_003` 0.32, `confirmation_004` 0.49 |
| `drop` | `drop_001` 0.11, `drop_002` 0.19, `drop_003` 0.19, `drop_004` 0.29 |
| `error` | `error_001` 0.17, `error_002` 0.17, `error_003` 0.53, `error_004` 0.10, `error_005` 0.50, `error_006` 0.50, `error_007` 0.19, `error_008` 0.14 |
| `glass` | `glass_001` 0.28, `glass_002` 0.12, `glass_003` 0.12, `glass_004` 0.69, `glass_005` 0.11, `glass_006` 0.11 |
| `glitch` | `glitch_001` 0.02, `glitch_002` 0.03, `glitch_003` 0.01, `glitch_004` 0.02 |
| `maximize` | `maximize_001` 0.26, `maximize_002` 0.26, `maximize_003` 0.21, `maximize_004` 0.42, `maximize_005` 0.53, `maximize_006` 0.38, `maximize_007` 0.19, `maximize_008` 0.23, `maximize_009` 0.23 |
| `minimize` | `minimize_001` 0.26, `minimize_002` 0.26, `minimize_003` 0.21, `minimize_004` 0.42, `minimize_005` 0.53, `minimize_006` 0.38, `minimize_007` 0.19, `minimize_008` 0.23, `minimize_009` 0.23 |
| `open` | `open_001` 0.15, `open_002` 0.31, `open_003` 0.31, `open_004` 0.32 |
| `pluck` | `pluck_001` 0.10, `pluck_002` 0.17 |
| `question` | `question_001` 0.49, `question_002` 0.33, `question_003` 0.33, `question_004` 0.33 |
| `scratch` | `scratch_001` 0.14, `scratch_002` 0.14, `scratch_003` 0.12, `scratch_004` 0.33, `scratch_005` 0.33 |
| `scroll` | `scroll_001` 1.00, `scroll_002` 1.00, `scroll_003` 1.00, `scroll_004` 1.00, `scroll_005` 1.00 |
| `select` | `select_001` 0.04, `select_002` 0.04, `select_003` 0.38, `select_004` 0.38, `select_005` 0.38, `select_006` 1.94, `select_007` 0.05, `select_008` 0.05 |
| `switch` | `switch_001` 0.62, `switch_002` 0.61, `switch_003` 0.50, `switch_004` 0.50, `switch_005` 0.61, `switch_006` 0.61, `switch_007` 0.61 |
| `tick` | `tick_001` 0.02, `tick_002` 0.02, `tick_004` 0.06 |
| `toggle` | `toggle_001` 0.14, `toggle_002` 0.14, `toggle_003` 0.14, `toggle_004` 0.07 |

### rpg-audio(51個、`tools/assets/sfx-cc0/rpg-audio/`)

| 種類 | 実在する名前(長さ 秒) |
|---|---|
| `beltHandle` | `beltHandle1` 0.28, `beltHandle2` 0.48 |
| `bookClose` | `bookClose` 0.23 |
| `bookFlip` | `bookFlip1` 0.77, `bookFlip2` 0.43, `bookFlip3` 0.23 |
| `bookOpen` | `bookOpen` 0.15 |
| `bookPlace` | `bookPlace1` 0.28, `bookPlace2` 0.35, `bookPlace3` 0.26 |
| `chop` | `chop` 0.24 |
| `cloth` | `cloth1` 0.66, `cloth2` 0.41, `cloth3` 0.48, `cloth4` 0.38 |
| `clothBelt` | `clothBelt` 0.72, `clothBelt2` 0.75 |
| `creak` | `creak1` 0.66, `creak2` 0.83, `creak3` 0.34 |
| `doorClose` | `doorClose_1` 0.68, `doorClose_2` 0.61, `doorClose_3` 0.71, `doorClose_4` 0.60 |
| `doorOpen` | `doorOpen_1` 0.92, `doorOpen_2` 1.41 |
| `drawKnife` | `drawKnife1` 0.40, `drawKnife2` 0.45, `drawKnife3` 0.48 |
| `dropLeather` | `dropLeather` 0.41 |
| `footstep` | `footstep00` 0.25, `footstep01` 0.28, `footstep02` 0.24, `footstep03` 0.27, `footstep04` 0.32, `footstep05` 0.28, `footstep06` 0.24, `footstep07` 0.26, `footstep08` 0.26, `footstep09` 0.21 |
| `handleCoins` | `handleCoins` 0.85, `handleCoins2` 0.34 |
| `handleSmallLeather` | `handleSmallLeather` 0.34, `handleSmallLeather2` 0.31 |
| `knifeSlice` | `knifeSlice` 0.60, `knifeSlice2` 0.57 |
| `metalClick` | `metalClick` 0.45 |
| `metalLatch` | `metalLatch` 0.26 |
| `metalPot` | `metalPot1` 1.46, `metalPot2` 0.94, `metalPot3` 0.91 |

<!-- END sfx-list -->

## 無い音の作り方(重ね技)
- **銃声**: 録音の衝撃(`impactMetal_heavy`/`impactPunch_heavy`)+ 高域ノイズの短いクラック(5ms)+ 帯域ノイズの胴鳴り(80ms減衰)+ 低い唸り + 残響。GM の "Gunshot"(program 127)も重ねられる。
- **爆発・着弾**: 低域ノイズの減衰 + サブ(40Hz前後、減衰150〜400ms)+ `impactPlate_heavy`/`impactMining`。
- **風・砂嵐**: ピンクノイズを帯域(200〜3000Hz)で絞り、ゆっくりうねらせる(白色ノイズは使わない)。
- **息・機械音**: GM 121(ブレスノイズ)や 125(ヘリ)を低く下げて代用。
