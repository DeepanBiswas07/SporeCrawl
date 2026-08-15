<div align="center">

<img src="logo.svg" width="112" alt="Sporecrawl">

# Sporecrawl

**You do not command monsters. You are the food chain.**

<br>

[![play on itch.io](https://img.shields.io/badge/▶_play-itch.io-5ce89a?style=flat-square&labelColor=06070a)](https://deepan07.itch.io/sporecrawl)
![vanilla js](https://img.shields.io/badge/vanilla-JS_%2B_WebGL2-5ce89a?style=flat-square&labelColor=06070a)
![no dependencies](https://img.shields.io/badge/dependencies-none-5ce89a?style=flat-square&labelColor=06070a)
![no build step](https://img.shields.io/badge/build_step-none-5ce89a?style=flat-square&labelColor=06070a)
![94 KB](https://img.shields.io/badge/download-94_KB-5ce89a?style=flat-square&labelColor=06070a)
![~20 hours](https://img.shields.io/badge/playtime-~20_hours-5ce89a?style=flat-square&labelColor=06070a)

</div>

<br>

Heroes come down the stairs to rob you. You eat what is left of them.

What you build out of the leftovers is not an army — it's a **food web**. Producers feed
consumers, consumers feed predators, and decomposers turn every corpse back into biomass.
Get the pyramid right and everything multiplies. Get it wrong and your apex predators
starve in the dark.

<br>

## Play

**[Play Sporecrawl on itch.io →](https://deepan07.itch.io/sporecrawl)**

It runs entirely in the browser. No account, no install, and nothing is loaded from the
network once the page has opened. Progress saves locally and the game works offline.

To run it from source instead:

```bash
git clone https://github.com/DeepanBiswas07/SporeCrawl.git
cd SporeCrawl
python -m http.server 8123
```

Then open `http://localhost:8123`.

<br>

## The ecosystem is the mechanic

Every species has a **trophic role** — Producer, Decomposer, Consumer, Construct, Predator,
Apex — and your population is scored against the shape of a real trophic pyramid. Many
producers at the bottom, very few apex predators at the top.

That score is **stability**, and stability multiplies every stat you own. A balanced
ecosystem beats a tower of dragons, because the dragons have nothing to eat: predators and
apex species consume food that producers have to actually generate. Overreach and the whole
dungeon starves.

So the interesting question is never *what is strongest*. It is *what does this pyramid
still need*.

<br>

## The heroes learn

Every point of damage is tracked by type. Lean on poison and heroes start arriving with
poison wards — up to a 72% reduction.

But they learn from **concentration**, not volume. Spread your damage and they can barely
adapt to any of it:

| your damage spread | after 15 raids | after 100 raids |
|---|:--:|:--:|
| all one type | **−72%** | −72% |
| three types | −13% | −72% |
| all six types | −4% | **−26%** |

There is no button that clears this. The only answer is composition.

And it goes further: once a damage type passes a threshold, a **doctrine** forms and the
villages start recruiting specialists who already resist it. Spam poison long enough and
poison-resistant heroes climb from 29% to 58% of every party. The enemy roster visibly
changes shape in response to how you play.

<br>

## Legends remember

Every tenth raid brings a named hero with far more health and twelve times the loot. Kill
one and it comes back later — stronger, titled, and warded specifically against whatever
killed it last time.

The grudge is permanent, and it compounds. *Sir Aldric the Unbroken* becomes *Sir Aldric
the Twice-Slain* becomes *Sir Aldric Who Will Not Stay Dead*, and every time he is a little
harder to kill the same way twice.

<br>

## Content

| | |
|---|---|
| **80 monster forms** | 16 families × 5 evolution stages, each with its own passive |
| **32 hero classes** | across 8 tiers, plus 16 named Legends |
| **10 biomes** | 720 raids of authored depth, then endless |
| **21 dungeon rooms** | slots, capacity, traps, cost reductions, offline accumulation |
| **48 mutations** | across 6 permanent branches |
| **6 abilities · 55 achievements** | over a live six-type damage and adaptation model |

Slime → Poison Slime → Corrosive Ooze → King Slime → **Acid Ocean**

Sporeling → Spore Cap → Myconid → Mycelium Hive → **World Mycelium**

<br>

## It opens as a black room with one button

The game does not show you its interface. It earns it.

A lone villager walks in, reaches your core, and takes something — because nothing lives
here yet. *Then* biomass appears. Found a colony and the breed button appears. Kill enough
and essence appears, then plunder, then abilities, then the ecosystem pyramid, then
adaptation, then depth, then the genome.

Sixteen reveals, each gated on the moment that mechanic first matters, each one a card that
waits for you instead of timing out. Running alongside them, a permanent objective bar walks
you through twenty-eight goals — from *Open the gates* to *Go deeper than anything has gone* —
each with live progress and a plain-language reason it matters.

The pace is rationed to match. Raids start three times slower and tighten as you stop needing
to think about each one, teaching cards pause the simulation while you read, notifications
queue one at a time, and pause and half-speed are never locked behind progress.

<br>

## Everything is generated at runtime

There is not a single image or audio file in this repository.

**Creatures are drawn as code.** Every monster and hero is canvas primitives — blobs, limbs,
wings, crystal shards, eye stalks — parameterised by family, evolution stage and a
deterministic hash, so a given species always looks the same. Population visibly scales the
creature on the battlefield.

**The room is a shader.** A raw WebGL2 layer runs a twice domain-warped fBm field behind the
whole interface, which reads as tissue rather than noise. It takes its colour from the depth
you are standing in and turns arterial red when your core is exposed. The battle canvas runs a
real post-process pass — bright-pass, separable gaussian, additive composite — with chromatic
aberration and a shock ripple on heavy impacts.

**Audio is synthesised as you play.** An ambient bed of detuned drones, filtered air and
occasional water drips, with every pitched sound locked to one F-minor pentatonic scale so
overlapping effects stay consonant instead of turning into beeps.

The interface uses a set of hand-drawn SVG icons on a shared grid. There is no emoji anywhere
in it.

<br>

## Balanced by simulation, not by guessing

A twenty-hour curve cannot be tuned by intuition, so the repository ships a headless
simulator that loads the **real game modules** — the same combat, economy and ecosystem code
the browser runs — with the DOM and audio stubbed out, and plays them with a greedy AI.

```bash
node tools/sim.js 20 --verbose
```

It prints a milestone timeline and an end state: when each depth falls, how many prestige
cycles it took, where the wall sits. Played optimally, all ten biomes clear in about seven
hours and the curve is still climbing at twenty.

Every tuning constant lives in one block at the top of `js/data.js`. Change one number,
re-run, and watch the entire twenty-hour curve move.

<br>

## Built to survive being deployed

- **Storage that fails loudly.** Sandboxed iframes and private browsing block `localStorage`.
  It is probed at startup; if blocked or full the game falls back to memory and tells the
  player their progress will not persist, rather than losing saves silently. A corrupt save is
  quarantined instead of bricking the game.
- **A loop that cannot die.** Render and simulation are separately wrapped, so one exception
  surfaces a dismissible notice and the game keeps running.
- **Touch and desktop.** Tooltips carry most of the game's explanation, so on touch devices
  they are long-press rather than hover-only.
- **Installable and offline**, via a web app manifest and a service worker that is
  network-first for the document and cache-first for versioned assets.
- **Bounded memory** under sustained play — measured flat at 863 DOM nodes and 4 MB heap.

<br>

## Source layout

```
index.html            markup and script order
css/style.css         the entire visual theme
js/boot.js            storage fallback, error boundary, fullscreen
js/util.js            number formatting, seeded RNG, geometric-series maths
js/icons.js           the hand-drawn SVG icon set
js/audio.js           procedural WebAudio: ambience and effects
js/gl.js              WebGL2 backdrop shader and bloom post-processing
js/data.js            all content and tuning constants
js/state.js           game state, derived multipliers, save/load/migration
js/sprites.js         procedural creature rendering
js/ecosystem.js       trophic pyramid, food, stability, passive income
js/combat.js          raid generation, real-time battle, rewards, adaptation
js/render.js          battle stage, particles, damage numbers, biomes
js/reveal.js          progressive disclosure
js/objectives.js      the objective spine
js/ui.js              panels, shops, evolution chains, genome tree, codex
js/game.js            boot, main loop, offline progress, prestige
tools/sim.js          headless balance simulator
tools/build.js        preflight checks and packaging
```

Classic scripts in dependency order. No modules, no bundler, no transpiler — nothing sits
between the source and the thing that runs.

<br>

## Controls

<kbd>1</kbd>–<kbd>6</kbd> abilities · <kbd>Space</kbd> auto-raid · <kbd>F</kbd> fullscreen ·
<kbd>S</kbd> save · <kbd>?</kbd> help · <kbd>Esc</kbd> close

Saves are written locally every twenty seconds, and can be exported or imported as text.

<br>

---

<div align="center">

Made by **[Deepan](https://github.com/DeepanBiswas07)**

</div>
