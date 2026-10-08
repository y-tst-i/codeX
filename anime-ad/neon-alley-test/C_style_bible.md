# Style bible — reference screen recording (12.3 s, 60 fps; video area cropped to 1170x680)
## Numbers (analyze_media.py on the crop)
- Cuts: 19 in 12.3 s (median shot 0.37 s, longest 2.4 s = calm audience pan). Very fast tease, one held beat mid-way.
- Flash: full-white frames at 10.13–10.23 s (lightning → white burst transition). Lightning bolts precede it.
- Motion on 1s (60 fps, no holds) — real-time 3D, smooth camera.
- Palette: ~45% near-black; accents swing per shot: acid green, cobalt #2330bb + yellow, hot red, amber/gold #884e16/#ae9279, white-hot. Each shot commits to ONE hue family on black.
- Music: tempo candidates 86.6 / 173.5 BPM (half/double), bass center B, key ≈ B minor. Loud and dense: -10…-15 dBFS RMS throughout, no silent gaps; the only dip (-20) is right before the white flash at 9.5 s, then the loudest section.
## Style axes
- form: glossy chrome/glass characters, rounded toy proportions; graffiti/type fills the background.
- light: emissive neon rings and tubes, hot specular, strong bloom, stage spotlight cones, rim light.
- surface: mirror-wet floor with reflections, sparkles/particles, slight compression grain.
- color: monochrome hue push per scene on black.
- lens/camera: medium-wide, slow orbits/push-ins, low angle on the hero; shallow background blur.
- edit: hard cuts + lightning/white-flash transitions; held payoff before flash.
- sound: dense electronic/trap-like beat, hits on cuts, dip before the flash, big impact after.
## Rendering approach
3D realistic-stylized (Three.js r169): MeshStandardMaterial chrome (metalness 1, low roughness) with per-scene generated PMREM env maps, emissive neon, Reflector wet floor, UnrealBloom, post: vignette 0.35, grain 0.02, ca 0.8 px, flash frames. 30 fps, 90 BPM (20 frames/beat).
## Narrative DNA
1. Hero introduced in one saturated hue, then re-colored shot to shot. 2. Lightning → white flash as the big transition. 3. Loudest section after the flash. 4. Type as environment.
## Surface (do not copy)
The mascot, FUNTECH lettering, statues, audience, stickers, Japanese signs of the reference.
