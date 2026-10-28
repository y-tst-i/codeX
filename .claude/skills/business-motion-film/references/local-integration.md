# Cloud integration and provenance

This is the portable repository handoff, not the original Windows installation. Read the repository-root CLAUDE_CODE_CLOUD_HANDOFF.md for deployment and current verification limits. No original-PC service, executable path, model or credential is available by assumption.

## Provenance and roles

- Upstream: https://github.com/echris6/motion-video-kit
- Pinned source: e4b1c0004080fe6a0deb883631bad5eba1e5f339; MIT license retained as UPSTREAM_LICENSE.
- SKILL.md is the completed local integration, copied for cloud use. This environment note replaces the original local-machine note; upstream case-study references and helpers remain reference material.
- business-motion-film leads motion ads; sibling motion-prompt supplies gallery-first choreography; sibling direct-cinematic-video leads footage-heavy work. Keep one production plan and ledger. Preserve user choices and existing repository instructions.

## Inspect the actual cloud environment

Check the OS, working repository, available Python/Node, FFmpeg/FFprobe, editor/renderer and resource limits before executing. Do not reference C: paths, the original user's home, local Blender, or an existing local Python virtual environment. Use project-local output paths and distinct version names.

Motion Prompt's CLI requires Node 18+ and access to its public gallery API or a suitable local API copy/cache. Follow its source-availability checks; do not claim gallery-derived implementation when the actual reference cannot be retrieved. Existing project tools remain primary; do not install a renderer because an example mentions one.

Audio Studio MCP is NOT bundled or registered here. First inspect the target session's available audio tools or supplied assets. Deploying Stable Audio locally in this cloud requires separate OS/GPU/RAM/storage/dependency checks and authorized access to gated model weights. Never copy the Windows user's Hugging Face token into Git or assume authentication exists. Available authorized instrumental generators may be used; speech requires another suitable source. Exact cue timing should be implemented and verified in editing, not assumed from a generation prompt.

## Helper limitations

- Python helpers/media verification in direct-cinematic-video use Python and FFmpeg/FFprobe. Inspect their --help and actual project targets before use.
- sfx-candidates.py requires NumPy and FFmpeg. Its threshold labels are screening hints, not subjective quality judgments; a longer logo ring is not automatically a bad repeated whoosh.
- backtime-music.py, solve-sfx-gains.py and offline-mix.py additionally require SciPy. Dependency availability is unverified in this cloud. Install only for an authorized need, preferably in the project's isolated environment.
- offline-mix.py contains example-specific paths, drop times around 14-17.1s and a 37.2s ring-out. Adapt a project-local copy to the real brief; never run those timings unchanged on another film or overwrite an existing master.
- Shell helpers need an available compatible shell and the tools they invoke. Three.js templates need their own runtime/dependencies. They are not all exercised merely by reading this handoff.

## Scope and quality

Use sustained visual activity and purposeful micro-action sounds as defaults for fast tech ads; keep reading targets clear and allow intentional emotional pauses. Apply the canonical gallery coverage policy in the sibling motion-prompt skill. Client-specific loudness, genre and composition figures in upstream examples are not universal requirements.

Do not upload assets, run paid generation or acquire credentials from this document alone. Follow the actual user's scope, budget and cloud network policy. Separate measured, visually reviewed, listened and independently reviewed evidence. Unavailable listening or rendering remains NOT_VERIFIED. This package grants no new media capability.
