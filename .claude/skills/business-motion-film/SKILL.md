---
name: business-motion-film
description: Plan, direct, build and independently review motion-led short commercials, product launches, SaaS explainers and promotional reels, even from a brief request. Use Motion Prompt as the primary source of motion and integrate purposeful sound design. Use for creating or improving these films; footage-led event/recruitment films use direct-cinematic-video. Excludes installation/research, simple trims and caption-only fixes.
---

# Business motion film

Turn the offer or idea into a visible cause-and-effect story, then make a rendered film that survives independent review. Use this as the lead workflow for motion-led ads; for footage-led films use [direct-cinematic-video](../direct-cinematic-video/SKILL.md). Keep one edit plan, timeline and review ledger when a mixed-media project uses both.

## Environment and roles

Read [local integration](references/local-integration.md) before choosing tools. Preserve the requested editor, existing project engine, originals and approved direction. Installing this skill does not authorize production, asset uploads, paid calls or dependency changes.

- [Motion Prompt](../motion-prompt/SKILL.md) is the first source for motion selection. Follow its gallery-first coverage target and fetch actual IDs/specs/kits. Apply this kit's composition and continuity principles to arrange those moves, not to replace the gallery with independently invented choreography.
- Audio Studio MCP can generate instrumental BGM and SFX; plan sound alongside the storyboard. Use existing licensed tracks if they better fit the brief or the user chooses them. Generation is one production step, not proof of musical quality.
- Existing rendering and delivery tools remain in charge of execution. Do not adopt HyperFrames, Three.js, cloud generation or a new renderer merely because an example uses it.

## Direction and motion

1. Infer a useful brief from the conversation: viewer, single message, intended feeling/action, length, available assets and fixed copy. Resolve routine choices autonomously. Keep claims and generated imagery truthful; a fictional concept stays labelled.
2. Read [motion grammar](references/motion-grammar.md); consult [launch-film notes](references/launch-film-notes.md) only for the moments needed. Write a compact storyboard: time → subject/action → what changes or becomes clear → transition/surviving object → sound cue → Motion Prompt ID or custom reason. Make the opening an intentional composition. Give the hero transformation enough scale and reading time.
3. For tech/product motion films, use sustained visual activity as the default. Treat roughly 0.6 seconds of unmotivated complete stillness as a review flag. Keep a headline readable while supporting movement continues; this is not a requirement to cut or replace text every 0.6 seconds. Deliberate pauses for emphasis, reading, emotion or an approved style remain valid. Record the reason instead of adding meaningless drift to beat a metric.
4. Carry an identifiable actor across scenes where it serves the story: request → result, selected card → detail, product → component. Vary scale and speed. One main action should remain legible amid supporting details. Treat upstream counts, frame occupancy and timing numbers as useful starting points for launch-style work, not universal rules for footage, dialogue or every duration.
5. Use deterministic timeline-driven motion. Retain gallery timing/easing through the documented porting rules. Isolate a complex 3D/UI component and inspect a short motion proof before integrating it; do not create labs for routine unchanged pieces. Read [Three.js patterns](references/three-js-patterns.md) or [product realism](references/product-hero-realism.md) only when needed.

## Sound with picture

Read [audio](references/audio.md) for techniques and [local integration](references/local-integration.md) for execution constraints. Its client-specific sound levels and genre preferences are examples, not delivery standards.

- Plan the music arc, transition cues and ending before the picture is locked. Generate or select a small comparison set (normally 2–3 when resources allow), under the same picture and at comparable loudness. Keep the chosen prompt, seed, source and edits. A requested BPM or timed climax is not a measured beat grid.
- In motion-led tech ads, sound the meaningful small actions as well as hero moments: a coherent, very quiet UI/mechanical family for typing, clicks, docking and state changes; clearer accents for the main reveal and logo. Do not force a sound onto every character/frame or stack equally prominent effects. For footage/dialogue/quiet emotional moments prioritize their own sound and intent.
- Listen for harshness and balance; use band-limited measurements and candidate analysis to help locate problems. An automatic reject label is a screening aid. Pitch/tonal accents should fit the score. Replace a disliked sound with a cleaner or subtler one unless the user asks to remove it or the revised direction calls for silence.
- Measure the track's actual ending and onsets. Back-time an appropriate ending onto the end card, or edit/generate a coherent ending; move picture cuts when permitted rather than chopping music arbitrarily. Keep fades and edit points clean. A separate logo sting is optional when the score already resolves there.
- Use project-specific loudness/peak targets, then remeasure the encoded file. Keep music and effects separable and retain a music-only fallback for comparison. Unavailable listening remains NOT_VERIFIED; meters, waveform plots and a critic's unplayed frames do not substitute for hearing the mix.

## Independent review and finish

Read [Gauntlet](references/gauntlet.md), [critic prompts](references/critic-prompts.md) and [quality bar](references/quality-bar.md) at the review stage. Use a fresh critic for a substantive storyboard/complex component and the full rendered cut; for a small change review the affected part plus surrounding boundaries. Give the critic the raw output, brief and references, not the builder's self-assessment. It must inspect the actual artifact using its available modalities and mark unseen/unheard checks explicitly.

Fix the largest meaningful weakness first. A fresh verification pass checks prior findings item by item and checks regressions. Keep a compact ledger of artifact/version → finding/time → change → observed verification. Continue while material weaknesses remain and progress is meaningful; avoid an automatic number of rounds or treating SHIP as proof of subjective perfection. If delegation is unavailable, disclose that the review was not independent.

Render the final file and separate technical, visual and auditory review. Reuse [direct-cinematic-video's delivery checks](../direct-cinematic-video/SKILL.md) when appropriate rather than duplicating them. Verify media properties, complete decoding, actual playback, key motions/transitions/text, final audio metrics, and any listening that can actually be performed. Preserve prior outputs and use distinct version names. Deliver the MP4, editable sources, source/license/generation notes, gallery beat map and honest review ledger. No new video is authorized by an installation or advice-only request.

## Reference scope and provenance

[Local integration and provenance](references/local-integration.md) records the pinned upstream version, license and helper limitations. [Business offers](references/business-offers.md) is optional when sales/pricing is explicitly in scope; refresh dated market claims before using them. Case studies are examples for matching problems, not default global prescriptions.
