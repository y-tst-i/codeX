#!/bin/bash
# three.js 0.181.2 を npm pack で取り、必要なファイルだけを <dir>/three/ に置く(CDN は証明書エラーで使えないため)
# usage: fetch_three.sh <assetsのdir> [追加の addon(examples/jsm からの相対パス) ...]
#   置かれる物: three.module.min.js + three.core.min.js(約0.75MB)、LICENSE、addons/(下の一覧と、それが import する物を自動で辿る)
#   importmap: "three": "./assets/three/three.module.min.js", "three/addons/": "./assets/three/addons/"
set -e
dest=$1; shift || true
[ -z "$dest" ] && { sed -n 2,5p "$0"; exit 1; }
VER=0.181.2
ADDONS="postprocessing/EffectComposer.js postprocessing/RenderPass.js postprocessing/ShaderPass.js
postprocessing/OutputPass.js postprocessing/UnrealBloomPass.js postprocessing/GTAOPass.js
postprocessing/FilmPass.js postprocessing/LUTPass.js shaders/FXAAShader.js
loaders/HDRLoader.js environments/RoomEnvironment.js $*"
out="$dest/three"
if [ -f "$out/three.module.min.js" ] && grep -q "$VER" "$out/VERSION" 2>/dev/null && [ -z "$*" ]; then
  echo "three $VER は配置済み: $out"; exit 0
fi
tmp=$(mktemp -d "${dest%/}/.three-pack.XXXX")
trap 'rm -rf "$tmp"' EXIT
( cd "$tmp" && npm pack "three@$VER" --silent >/dev/null && tar xzf "three-$VER.tgz" )
pkg="$tmp/package"
mkdir -p "$out/addons"
cp "$pkg/build/three.module.min.js" "$pkg/build/three.core.min.js" "$pkg/LICENSE" "$out/"
echo "$VER" > "$out/VERSION"
# addon と、それが相対 import する物を再帰的にコピー(three 本体の import は importmap で解決)
node - "$pkg/examples/jsm" "$out/addons" $ADDONS <<'JS'
const fs = require('fs'), path = require('path');
const [src, dst, ...list] = process.argv.slice(2);
const seen = new Set(), q = list.map(p => path.normalize(p));
while (q.length) {
  const rel = q.pop(); if (seen.has(rel)) continue; seen.add(rel);
  const from = path.join(src, rel);
  if (!fs.existsSync(from)) { console.error('見つからない addon: ' + rel); process.exit(1); }
  const code = fs.readFileSync(from, 'utf8');
  fs.mkdirSync(path.dirname(path.join(dst, rel)), { recursive: true });
  fs.writeFileSync(path.join(dst, rel), code);
  for (const m of code.matchAll(/(?:from|import)\s*['"](\.{1,2}\/[^'"]+)['"]/g))
    q.push(path.normalize(path.join(path.dirname(rel), m[1])));
}
console.log('addons: ' + seen.size + ' 個');
JS
du -sh "$out" | awk '{print "three '"$VER"' を配置: '"$out"' (" $1 ")"}'
