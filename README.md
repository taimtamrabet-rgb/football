# Gridiron Legend

A browser-based football career sim. Create a player, pick a position, and take
them from Friday night high school football all the way to an NFL MVP trophy.

## How to play

Open `index.html` in any modern browser — no build step or server required.

1. **Create your player** — name, position (QB / RB / WR), hometown high school,
   and your recruit star rating (1–5 stars, which shifts your starting attributes).
2. **High School (4 years)** — train your attributes each preseason, then play out
   the season game by game (or fast-forward with "Sim Rest of Season").
3. **Recruiting** — your performance and awards determine what tier of college
   recruits you.
4. **College (4 years)** — keep training and competing for All-American and
   Heisman honors.
5. **NFL Draft** — your draft stock sets your round and starting team.
6. **NFL career** — chase Pro Bowls, All-Pro nods, and ultimately the **NFL MVP**
   award to win the game. Watch your energy — fatigue and injuries are real risks
   over a long career.

## Star rating

On the start screen, pick a 1–5 star recruit rating. It shifts your starting
attribute totals up or down (5-star phenoms start noticeably more talented
than 1-star longshots) — a difficulty/talent knob, independent of the
recruiting stars you earn later based on your actual high school performance.

## Custom rosters

The game ships with original, made-up teams (no real NFL/NCAA branding). If you
want your own teams, logos, colors, and rival player names, import them from
the start screen using the three separate buttons — **Import High School
Teams**, **Import College Teams**, **Import Pro Teams** — each accepting a
JSON file for just that level. There's also a "Paste full roster JSON instead"
option if you'd rather load all three (plus rivals) at once.

`sample-roster.json` in this repo shows the full format — copy it and fill in
your own values. The per-level import buttons accept either a bare JSON array
of teams, or an object like `{"teams": [...]}`:

- `highSchoolTeams`, `collegeTeams`, `nflTeams` — each entry needs a `name`.
  `logo` can be an emoji/text badge or an image URL (`http(s)://` or a `data:`
  URI). `colors` is `[accent, background]`. `quality` (0–1, optional) fixes
  team strength instead of randomizing it. College entries can add a `tier`
  of `elite` / `power` / `g5` / `fcs` / `small` so recruiting matches the
  right level of program to your star rating.
- `rivals` — optional list of `{ "name": ..., "position": ... }` used for
  flavor text about the opposing player during games. Only importable via
  the full-roster paste option.

Imported rosters are saved in your browser's local storage, so they persist
across sessions until you click "Use default rosters." All logo/name/color
data is supplied entirely by you — the game itself contains no real team or
player data.

## Files

- `index.html` — page structure / screens
- `style.css` — styling
- `game.js` — game state, simulation, and rendering logic
- `sample-roster.json` — example custom roster JSON format (placeholder data)
