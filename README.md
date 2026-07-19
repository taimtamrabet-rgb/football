# Gridiron Legend

A browser-based football career sim. Create a player, pick a position, and take
them from Friday night high school football all the way to an NFL MVP trophy.

## How to play

Open `index.html` in any modern browser — no build step or server required.

1. **Create your player** — name, position (QB / RB / WR), and hometown high school.
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

## Custom rosters

The game ships with original, made-up teams (no real NFL/NCAA branding). If you
want your own teams, logos, colors, and rival player names, import a roster
JSON file from the start screen ("Upload roster.json" or "Paste JSON instead").

`sample-roster.json` in this repo shows the format — copy it and fill in your
own values:

- `highSchoolTeams`, `collegeTeams`, `nflTeams` — each entry needs a `name`.
  `logo` can be an emoji/text badge or an image URL (`http(s)://` or a `data:`
  URI). `colors` is `[accent, background]`. `quality` (0–1, optional) fixes
  team strength instead of randomizing it. College entries can add a `tier`
  of `elite` / `power` / `g5` / `fcs` / `small` so recruiting matches the
  right level of program to your star rating.
- `rivals` — optional list of `{ "name": ..., "position": ... }` used for
  flavor text about the opposing player during games.

Imported rosters are saved in your browser's local storage, so they persist
across sessions until you click "Use default rosters." All logo/name/color
data is supplied entirely by you — the game itself contains no real team or
player data.

## Files

- `index.html` — page structure / screens
- `style.css` — styling
- `game.js` — game state, simulation, and rendering logic
- `sample-roster.json` — example custom roster JSON format (placeholder data)
