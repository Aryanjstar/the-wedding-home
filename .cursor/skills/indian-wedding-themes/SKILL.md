---
name: indian-wedding-themes
description: >-
  Design and implement per-wedding and per-function visual themes for the
  Indian wedding OS guest website — palettes, backgrounds, type, motion,
  music, and looping video. Use when adding a theme pack, styling Haldi,
  Mehendi, Sangeet, pheras, or reception pages, choosing colours/music/video
  for an Indian wedding site, or when the user mentions classical, art,
  choreography, traditional, or event-specific looks.
---

# Indian wedding themes

The guest site is one domain with a **wedding pack** plus optional **function overrides**. Do not build a separate website per event. Do not invent a new data shape per pack.

## When this applies

- New theme pack (traditional, classical, art, choreography, or a later pack)
- Per-function page (Haldi, Mehendi, Sangeet, wedding, reception, custom)
- Background video, ambient music, or colour world for the invite/RSVP site

## Token model (stable)

Every pack and every override is the same object:

```ts
type ThemeTokens = {
  id: string; // "traditional" | "classical" | "art" | "choreography" | custom
  palette: {
    bg: string;
    surface: string;
    text: string;
    muted: string;
    accent: string;
    accentText: string;
  };
  type: { display: string; body: string };
  motion: "still" | "slow" | "playful" | "dance";
  background: {
    kind: "color" | "pattern" | "image" | "video";
    src?: string; // family upload or rights-cleared asset only
  };
  audio?: { src: string; title: string; autoplayMuted: true };
  video?: { src: string; poster?: string; loop: true; mutedAutoplay: true };
};
```

Wedding-level tokens are the default. A function copies them, then overrides any field. A guest invited only to Sangeet must never receive Haldi tokens.

## Packs we ship toward

| Pack | Soul | Default functions |
|---|---|---|
| `traditional` | Maroon, ivory, gold, mandap, marigold | Wedding, reception |
| `classical` | Ivory, deep green, shehnai, paper-quiet | Temple / quieter weddings |
| `art` | Painterly, illustrated, gallery, film-poster | Couples who want art direction |
| `choreography` | Jewel night, bold type, dance-floor | Sangeet (and cocktail if they add one) |

Function colour worlds (override `palette` + `motion` even inside another pack):

| Function | Colour world | Motion | Sound / video |
|---|---|---|---|
| Haldi | Turmeric, marigold, wet yellow | playful | Folk / dholak. Optional haldi-play loop |
| Mehendi | Henna green, terracotta, dusk rose | slow | Soft folk or ghazal. Henna stills or loop |
| Sangeet | Jewel tones, night gold | dance | Family track. Rehearsal or performance loop |
| Wedding | Ivory, sindoor red, sacred gold | slow | Shehnai. Mandap film optional + Live URL separately |
| Reception | Midnight, champagne | still | Uploaded playlist. Couple-entry clip optional |

## Media rules

- Family-uploaded or rights-cleared assets only. No scraping random wedding films or commercial tracks.
- Background video is ambient: muted autoplay, loop, poster image required, tap-to-unmute.
- Music always has an obvious mute control. Never trap audio on RSVP.
- Compress. Cap loop length (aim ≤ 20s, looping). Guest-gallery video is a different feature — do not mix it into theme tokens.
- Livestream is a YouTube (or similar) URL on the Live tab, not a theme background.

## How to add a pack

1. Name the pack (`id`, one-line soul).
2. Fill `ThemeTokens` — real colour values, font pairs, motion.
3. Map which functions use it by default.
4. Add one sample background (colour or pattern first; video later).
5. Wire it through the existing theme picker. Do not fork page components per pack.
6. Check: RSVP still readable, contrast safe, mute works, Haldi override does not leak to Sangeet.

If the user asks for a new look (Rajasthani miniature, South silk, phulkari, purely art v2), add another pack with the same token object. That is the whole extension path.

## Product fit

This skill styles the **guest website and invite pages**. Family dashboard stays calm and readable — do not dump dance-floor themes onto Admin screens.

For the locked product plan, read `docs/PRODUCT.md` and `docs/PRD.md`.
