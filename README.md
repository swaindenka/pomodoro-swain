# pomodoro-swain

A pomodoro timer and to-do list inside a cozy virtual study place. Study in your room, a café, a library or on a terrace: walk your character around, decorate the place, work at a desk, take breaks on the sofa and study together with friends in the same room.

## Features

**Study places**
- **My room**, **Café**, **Library** and **Terrace**, each with its own walls, floor, door and a ready-made layout.
- Every place is edited and saved separately; changing the café does not touch your room.
- When studying together, the host picks the place and everyone moves there.

**Room and character**
- Pixel-art room. All graphics are drawn in code; there are no image files.
- Walk with <kbd>WASD</kbd> / arrow keys, or click (tap on phones). The character finds its way around furniture.
- Furniture interactions: **sit** on sofas, armchairs, office and lounge chairs, poufs, beanbags, benches, stools and the porch swing; **lie down** in a bed, daybed, sun lounger or hammock; **work** at desks, café tables, reading tables and the bar counter. Someone sitting behind a table faces the camera, someone in front has their back turned; they type while a focus session runs.
- Pet the cat, the dog and the teddy bear, play the arcade machine, get a drink from the vending machine, and sit down at the piano or the drum kit to play. The fireplace and campfire burn, records spin, coffee and kettles steam, the fountain splashes, the fan spins, and neon signs, lava lamps, string lights and the holiday tree glow.
- **Study where you sit:** start a focus session while sitting on a sofa, armchair, beanbag or bench and your character opens a laptop right there. If you are standing, "Walk to a desk when focus starts" sends the character to the nearest free work spot.
- **Character customization** in four tabs (body, hair, outfit, extras):
  - Boy or girl, 8 skin tones, 8 eye colors and 9 face details (freckles, mustache, beard, rosy cheeks, goatee, stubble, beauty mark, bandage, star sticker).
  - 22 hairstyles in 16 colors: short, long, bun, ponytail, curly, pigtails, bob, afro, spiky, side part, braid, space buns, wavy, buzz cut, mohawk, pixie, locs, twin braids, messy bun, hime cut, undercut and curtain bangs.
  - 13 tops in 16 colors: T-shirt, hoodie, sweater, shirt, dress, jacket, overalls, tank top, kimono, striped tee, graphic tee, cardigan and varsity jacket.
  - 6 bottoms in 10 colors (pants, shorts, skirt, long skirt, jeans, track pants) and 6 pairs of shoes (including sneakers and boots).
  - 15 head accessories (glasses, sunglasses, beanie, headphones, cap, bow, scarf, cat ears, headband, flower, bandana, crown, earrings, witch hat, party hat), plus a second slot for the neck and back (backpack, necklace, bow tie, tie, scarf) that can be worn together with them.
- Real-time day and night: the sky in the window changes, lamps turn on in the evening, the wall clock shows the real time.
- The cork board shows one note for each open task in your to-do list.

**Sounds**
- Ambience you can mix: rain, wind, snowfall, crickets, fireplace and birds, each with its own on/off switch and volume.
- Sound effects for footsteps, sitting down and getting up, placing, rotating and removing furniture, petting animals, the piano, drums, arcade and vending machine, chat messages and buttons, with their own switch and volume, plus a master volume.
- Rain and snow also appear in the windows and fall on the terrace.
- Everything is generated in the browser with the Web Audio API; there are no audio files. Settings are saved in the browser.

**Editing**
- 108 items in ten tabs, most in several colors (12 fabric colors, 7 wood finishes):
  - **Seating:** sofa, chesterfield, armchair, lounge chair, office chair, pouf, beanbag, floor cushion, bench, stool, rocking chair, egg chair, porch swing, bed, daybed, sun lounger, hammock
  - **Tables:** desk, gaming desk, café table, reading table, bar counter, coffee table, nightstand, piano (sit down to play), easel
  - **Kitchen:** stove, kitchen sink, fridge, coffee cart, vending machine, pastry case
  - **Storage:** bookshelf, narrow bookshelf, cube shelf, ladder shelf, display cabinet, wardrobe, dresser, TV stand, aquarium, toy chest, coat rack
  - **Plants:** plant, large plant, ficus tree, palm, cactus, flower pot, bonsai, pampas vase
  - **Decor:** floor lamp, lantern, lava lamp, candles, fireplace, record player, globe, telescope, floor mirror, floor fan, book stack, holiday tree, pumpkin
  - **Fun:** arcade machine, drum kit (sit down to play), guitar, teddy bear, cat, dog
  - **Outdoor:** campfire, lamp post, planter box, fountain, snowman, bicycle
  - **Rugs:** rug, round rug, runner rug, shag rug, checkered rug, yoga mat
  - **Wall:** window, curtained window, arched window, round window, cork board, menu board, whiteboard, pegboard, wall shelf, painting (9 designs), poster (8 designs), gallery wall, tapestry, world map, photo garland, bunting, mirror, calendar, wall clock, dartboard, wall TV, sconce, string lights, neon sign, neon art, hanging planter
- Add items (pick the color and direction first), **drag to move**, nudge with the arrow keys, duplicate, recolor and remove them.
- **Rotate** with the Rotate button or <kbd>R</kbd>: sofas, chesterfields, armchairs, lounge and office chairs, rocking and egg chairs, desks, the gaming desk, piano and TV stand turn to face any side, and beds turn sideways and daybeds flip (with matching side and back views, and characters sit, work and lie accordingly). Poufs, beanbags, stools, floor cushions and benches turn the way the sitter faces, so people can sit facing each other; an arrow shows the direction while editing. Coffee tables, café and reading tables, hammocks, aquariums, rugs and yoga mats turn between horizontal and vertical; plants, lamps, shelves and other decor flip.
- Look: 9 wall colors; plain, stripes, polka dots, brick, wood paneling or fence-and-sky walls; oak, walnut, tiles, carpet, checkerboard, basketweave parquet, stone, grass and wooden deck floors.
- Places are saved in the browser and survive a page refresh.

**Study together (multiplayer)**
- Open a room and share the 5-character code or the invite link; up to 8 people can join.
- Everyone sees each other's characters, where they sit and what they are doing.
- **Shared pomodoro timer:** when anyone starts it, it starts for everyone, and everyone is notified when time is up.
- Chat, with messages also shown as speech bubbles above characters.
- Only the host edits the room. If the host leaves, the next person in the room becomes the host.

**Pomodoro and to-do**
- Pomodoro, short break and long break; start / pause, reset, skip.
- A long break after every 4 pomodoros (configurable), with a sound and a notification when time is up.
- Add, complete and delete tasks; see how many pomodoros you finished today.

## Controls

| Action | Keyboard | Mouse / touch |
| --- | --- | --- |
| Walk | <kbd>WASD</kbd> / arrow keys | Click / tap a spot in the room |
| Sit, lie down, work | <kbd>E</kbd> next to an item | Click the item / the chair you want |
| Stand up | A movement key or <kbd>Esc</kbd> | Click somewhere else |
| Start / pause the timer | <kbd>Space</kbd> | Start button |
| Move an item while editing | Drag it, or select it and use the arrow keys | Drag it |
| Rotate the selected item while editing | <kbd>R</kbd> | Rotate button |
| Remove the selected item while editing | <kbd>Delete</kbd> | Remove button |

## Running locally

Requires Node.js 18 or newer.

```bash
npm install
```

```bash
npm start
```

Then open http://localhost:3000. Friends on the same network can join at `http://<your-computer-ip>:3000`.

You don't need the server to use it alone: open `public/index.html` directly in a browser. Only multiplayer won't work that way.

## Deployment

**Render (recommended):** The repo includes a `render.yaml`, which runs both the site and the multiplayer server at one address.
1. In https://dashboard.render.com choose **New → Blueprint**.
2. Connect the `pomodoro-swain` repository and click **Apply**.
3. When it finishes, open the `https://pomodoro-swain-xxxx.onrender.com` address and share it with your friends.

On the free plan the server goes to sleep after 15 minutes without traffic; the first visit after that can take about a minute, and open rooms are closed when it sleeps. Every push to `main` redeploys the site automatically.

**Other Node.js hosts (Railway, Fly.io, …):** build command `npm install`, start command `npm start`. The server reads the `PORT` environment variable and exposes `/healthz` for health checks.

**GitHub Pages (static site only):** Settings → Pages → Branch: `main` / `(root)`. The root `index.html` redirects to `public/`. To use multiplayer, run the server elsewhere and put its address in the `server` field of `public/js/config.js`.

## Tests

```bash
npm test
```

The tests cover the place and room validation rules and the server (static files, creating and joining rooms, position and chat relay, room ownership, the shared timer, room capacity).

## Project structure

```
server.js            Static file + WebSocket server (rooms, shared timer, chat)
render.yaml          Render Blueprint
public/
  index.html         Page structure
  style.css          Design (light/dark theme, mobile friendly)
  js/shared.js       Rules and validation shared by the browser and the server
  js/art.js          Pixel-art core: walls, floors, doors, character
  js/items.js        Item catalog: artwork, colors, seats, lights
  js/game.js         Movement, pathfinding, interaction, edit mode, rendering
  js/editor.js       Edit panel and place picker
  js/audio.js        Ambience and sound effects (Web Audio)
  js/timer.js        Pomodoro (solo and shared room mode)
  js/todos.js        To-do list
  js/net.js          Multiplayer connection, room card, chat
  js/main.js         Character dialog
  js/config.js       Separate server address (optional)
tests/               node:test tests
```
