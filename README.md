# pomodoro-swain

A pomodoro timer and to-do list inside a cozy virtual study place. Study in your room, a café, a library, on a terrace, in an attic, an art studio or a kitchen: walk your character around, decorate the place, work at a desk, take breaks on the sofa and study together with friends in the same room.

## Features

**Study places**
- Seven places, each with its own architecture, door and a ready-made layout planned like a real interior: clear zones, a symmetric focal wall, a free walkway from the door and an uncluttered front row.
  - **My room:** the bed sits under the window between matching nightstands; a study corner on the left, a sitting group in front and a music corner on the right.
  - **Café:** a service wall with the counter, pastry case and shelves, a row of café tables, a window seat under pendant lamps and a sofa corner.
  - **Library:** symmetric bookcases around a fireplace with world clocks, armchairs facing the fire and a reading table on each side.
  - **Terrace:** a pergola over a symmetric row of planters and a porch swing, a dining spot, a fire pit with seating and sun loungers; the sky follows the real time of day.
  - **Attic:** a gable roof with a skylight over the writing desk, a symmetric book wall with a map, a reading pair on a rug and a daybed under the slope.
  - **Art studio:** a steel-framed glass wall that wraps around the corner, a gallery and supplies on the solid wall, easels and a sunny lounge spot.
  - **Kitchen:** a continuous counter run (sink under the window, stove under the hood, fridge at the end), an island lined up with the stove and a dining table under a pendant lamp.
- The room is shown as a **diorama**: a box cut open at the front, standing on its own base, with a ceiling slab, crown molding, wainscoting, skirting boards, soft corner shadows and a drop shadow.
- **Warm lighting:** lamps, candles, fires, pendant lamps and under-cabinet lights cast light pools on the floor and walls in the evening, and sunbeams from windows, skylights and glass walls leave bright patches on the floor during the day.
- If you never changed a place, it gets the new design automatically; places you decorated stay as they are (the Reset button brings the new default).
- Every place is edited and saved separately; changing the café does not touch your room.
- When studying together, the host picks the place and everyone moves there.

**Room and character**
- Pixel-art room. All graphics are drawn in code; there are no image files.
- Walk with <kbd>WASD</kbd> / arrow keys, or click (tap on phones). The character finds its way around furniture.
- Furniture interactions: **sit** on sofas, armchairs, office and lounge chairs, poufs, beanbags, benches, stools and the porch swing; **lie down** in a bed, daybed, sun lounger or hammock; **work** at desks, café tables, reading tables and the bar counter. Someone sitting behind a table faces the camera, someone in front has their back turned; they type while a focus session runs.
- Pet the cat, the dog and the teddy bear, play the arcade machine, get a drink from the vending machine, sit down at the piano or the drum kit to play, run on the treadmill or hit the punching bag. The fireplace and campfire burn, records spin, coffee and kettles steam, the fountain splashes, the cauldron bubbles, the fan spins, and neon signs, lava lamps, string lights and the holiday tree glow.
- **Study where you sit:** start a focus session while sitting on a sofa, armchair, beanbag or bench and your character opens a laptop right there. If you are standing, "Walk to a desk when focus starts" sends the character to the nearest free work spot.
- **Character customization** in four tabs (body, hair, outfit, extras):
  - Boy or girl, 8 skin tones, 8 eye colors and 9 face details (freckles, mustache, beard, rosy cheeks, goatee, stubble, beauty mark, bandage, star sticker).
  - 22 hairstyles in 16 colors: short, long, bun, ponytail, curly, pigtails, bob, afro, spiky, side part, braid, space buns, wavy, buzz cut, mohawk, pixie, locs, twin braids, messy bun, hime cut, undercut and curtain bangs.
  - 13 tops in 16 colors: T-shirt, hoodie, sweater, shirt, dress, jacket, overalls, tank top, kimono, striped tee, graphic tee, cardigan and varsity jacket.
  - 6 bottoms in 10 colors (pants, shorts, skirt, long skirt, jeans, track pants) and 6 pairs of shoes (including sneakers and boots).
  - 15 head accessories (glasses, sunglasses, beanie, headphones, cap, bow, scarf, cat ears, headband, flower, bandana, crown, earrings, witch hat, party hat), plus a second slot for the neck and back (backpack, necklace, bow tie, tie, scarf) that can be worn together with them.
- **Little animations:** characters standing idle stretch, sip coffee, yawn or check their phone; on a sofa or beanbag they read a book or sip a drink (unless a focus session is running). Friends' characters do the same.
- **Living pets:** the cat, the dog and the rabbit nap in their beds, then wake up, wander around (often to curl up next to someone), sit for a while and go back to sleep; the rabbit hops and twitches its nose. Click a wandering pet to walk over and pet it.
- **More pets:** a bird in a cage hops between its perches and the swing and sings when you click it. A fish bowl goes on a desk, shelf or counter; click it (or the aquarium) to sprinkle food and the fish swim up to eat.
- **Sticky notes:** put a note on the wall, write on it in edit mode (up to 80 characters) and click it in the room to read it. Friends in a shared room can read it too.
- Dust drifts in the sunbeams during the day, and fireflies blink over the terrace at night.
- **Seasons by date:** in winter light snow falls in the windows and the ground outside turns white; in autumn leaves drift past the windows and over the terrace. The season comes from your device's date (flipped for southern hemisphere time zones) and can be turned off in Settings. Add `?mevsim=winter` or `?mevsim=autumn` to the address to preview a season.
- Real-time day and night: the sky in the window changes, lamps turn on in the evening, the wall clock shows the real time.
- The cork board shows one note for each open task in your to-do list.

**Focus stats**
- **Daily goal ring:** set a goal such as 6 pomodoros a day (Settings or the − / + buttons in the stats window). The ring at the top fills with every pomodoro; when you reach the goal it turns gold with a check mark, gold confetti falls, your character hops and a short fanfare plays.
- Click the ring at the top to see your daily goal, today, the last 7 days (with focus time), your day streak and best streak, a weekly bar chart and the tasks you focused on most.
- **Session log:** when a pomodoro ends, a one-line "What did you get done?" note appears under the timer (Enter saves, Skip or Esc dismisses). Notes are listed day by day under "This week's log" in the stats window, with the task you focused on; delete a note with ×, or copy the whole week as text to send to a teacher, a team or yourself.
- Pick the task you are working on with the target button in the to-do list. It shows under the timer, and every pomodoro you finish is counted for it.
- **Focus mode** (on by default, can be turned off in Settings): while the focus timer runs, the rest of the page fades out (hover brings it back) and sound effects go quiet; music and ambience keep playing.
- **Break ideas:** when a break starts, a card under the timer suggests something healthy (stretch, drink water, the 20-20-20 eye exercise, deep breaths, a short walk…). "Do it" makes your character act it out and starts a countdown for timed ideas; "Another idea" shows a different one.
- When a focus session ends, confetti falls over the room, standing characters hop and sparkles rise above seated ones (everyone in a shared room sees it).

**Sounds**
- **Lo-fi music** made live in the browser: jazzy chords, warm bass, soft boom-bap drums, a sparse melody and vinyl crackle at 72 BPM, moving to a new chord progression every 8 bars. Turn it on in Sounds or click the record player in the room (the record spins while it plays).
- Ambience you can mix: rain, wind, snowfall, crickets, fireplace and birds, each with its own on/off switch and volume.
- Sound effects for footsteps, sitting down and getting up, placing, rotating and removing furniture, petting animals, the piano, drums, arcade and vending machine, chat messages and buttons, with their own switch and volume, plus a master volume.
- Rain and snow also appear in the windows and fall on the terrace.
- Everything is generated in the browser with the Web Audio API; there are no audio files. Settings are saved in the browser.

**Editing**
- 170 items in fifteen tabs, most in several colors (12 fabric colors, 7 wood finishes):
  - **Seating:** sofa, chesterfield, armchair, lounge chair, office chair, pouf, beanbag, floor cushion, bench, cushion bench, stool, rocking chair, egg chair, porch swing, bed, daybed, sun lounger, hammock
  - **Tables:** desk, gaming desk, café table, dining table with a checkered cloth, reading table, bar counter, coffee table, nightstand, art table, piano (sit down to play), easel
  - **Tabletop:** mug, teapot, coffee maker, desk lamp, candle, laptop, typewriter, retro radio, gramophone, book pile, pencil cup, desk clock, hourglass, photo frame, mini globe, succulent, flower vase, cake, fruit bowl, bread basket, jars, paint jars, crystals, potion bottles. These go on top of tables, desks, shelves, counters and cabinets and move or disappear together with them.
  - **Kitchen:** kitchen counter, stove, kitchen sink, fridge, wall cabinet, range hood, hanging pans, spice rack, coffee cart, vending machine, pastry case, pedal bin
  - **Storage:** bookshelf, narrow bookshelf, cube shelf, ladder shelf, display cabinet, drawer cabinet, apothecary shelf, wardrobe, dresser, TV stand, toy chest, coat rack
  - **Plants:** plant, large plant, ficus tree, palm, cactus, flower pot, bonsai, pampas vase
  - **Decor:** floor lamp, lantern, candelabra, lava lamp, candles, fireplace, bubbling cauldron, record player, globe, telescope, floor mirror, floor fan, book stack, canvas stack, canvas on the floor
  - **Fun:** arcade machine, drum kit (sit down to play), guitar, teddy bear
  - **Pets:** cat, dog, rabbit, bird cage, fish bowl (tabletop), aquarium
  - **Sport:** treadmill (run on it), exercise bike, dumbbell rack, punching bag (punch it), exercise ball
  - **Outdoor:** campfire, lamp post, planter box, fountain, bicycle
  - **Seasonal:** a winter pack (holiday tree, gift pile, wreath, stockings, snow globe you can shake, sled, snowman) and an autumn pack (maple tree, pumpkin, hay bale you can sit on, apple crate, autumn wreath, leaf pile that rustles when you walk through it). The pack card at the start of each group places the whole pack in free spots in one click, keeping the walkway from the door and the way to every seat open; Undo takes it away in one step.
  - **Rugs:** rug, round rug, runner rug, shag rug, checkered rug, yoga mat
  - **Wall:** sticky note (write on it), window, curtained window, arched window, round window, cork board, menu board, whiteboard, pegboard, wall shelf, painting (9 designs), poster (8 designs), gallery wall, tapestry, world map, photo garland, bunting, ivy garland, mirror, calendar, wall clock, world clocks (three time zones), digital clock, dartboard, wall TV, sconce, pendant lamp, string lights, neon sign, neon art, hanging planter
- Add items (pick the color and direction first), **drag to move**, nudge with the arrow keys, duplicate, recolor and remove them.
- **Undo and redo** up to 60 steps with the buttons next to Done or <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Y</kbd> (<kbd>Cmd</kbd> on Mac).
- **Rotate** with the Rotate button or <kbd>R</kbd>: sofas, chesterfields, armchairs, lounge and office chairs, rocking and egg chairs, arcade and vending machines, bicycles, desks, the gaming desk, piano and TV stand turn to face any side, and beds and sun loungers turn sideways, daybeds flip, the porch swing and drum kit can face away (with matching side and back views, and characters sit, work and lie accordingly). Poufs, beanbags, stools, floor cushions and benches turn the way the sitter faces, so people can sit facing each other; an arrow shows the direction while editing. Coffee tables, café and reading tables, hammocks, aquariums, planter boxes, rugs and yoga mats turn between horizontal and vertical; floor fans turn sideways; plants, lamps, shelves and other decor flip.
- Look: 11 wall colors; plain, stripes, polka dots, brick, wood paneling, tiles, floral wallpaper or fence-and-sky walls; oak, walnut, tiles, carpet, checkerboard, basketweave parquet, herringbone, terracotta tiles, stone, grass and wooden deck floors.
- Places are saved in the browser and survive a page refresh.

**Study together (multiplayer)**
- Open a room and share the 5-character code or the invite link; up to 8 people can join.
- Everyone sees each other's characters, where they sit and what they are doing.
- **Shared pomodoro timer:** when anyone starts it, it starts for everyone, and everyone is notified when time is up.
- Chat, with messages also shown as speech bubbles above characters.
- **Quick reactions** (👋 👍 ☕ ❤️ 🎉 💪) with the buttons under the room or the <kbd>1</kbd>–<kbd>6</kbd> keys: an emoji pops up above your character for everyone, and some come with a move (wave, coffee, stretch, hop, hearts). Handy for cheering each other on without breaking focus.
- **High-fives:** stand still next to a friend for a moment and your characters high-five (once every 45 seconds per friend, and not during a focus session). Or click a standing friend to walk over and high-five them. Everyone sees the clap.
- **Chatting:** when two people sit side by side (on the same sofa, at neighboring seats) outside a focus session, little speech bubbles take turns above them: typing dots, a laugh, a coffee, a book…
- Only the host edits the room. If the host leaves, the next person in the room becomes the host.

**Pomodoro and to-do**
- Pomodoro, short break and long break; start / pause, reset, skip.
- A long break after every 4 pomodoros (configurable), with a sound and a notification when time is up.
- Add, complete and delete tasks; see how many pomodoros you finished today.
- **Steps:** break a task into smaller steps with the list button next to it. The task shows how many steps are done (for example 2/5), and the timer shows the next open step of the task you are focusing on.
- **Drag to reorder:** drag a task or a step by its handle (⋮⋮) to put it in order. With the keyboard, focus the handle and use the up and down arrow keys.

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
| Quick reaction | <kbd>1</kbd>–<kbd>6</kbd> | Reaction buttons under the room |
| High-five a friend | Stand next to them for a moment | Click a standing friend |
| Reorder tasks and steps | Focus the handle, then <kbd>↑</kbd> / <kbd>↓</kbd> | Drag the ⋮⋮ handle |
| Undo / redo while editing | <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Y</kbd> | Undo / redo buttons |

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

On the free plan the server goes to sleep after 15 minutes without traffic; the first visit after that can take about a minute, and open rooms are closed when it sleeps. While someone is in a room, the page sends a small "still here" message every minute (also from a background tab) to keep the server awake. For a guarantee, set up a free uptime monitor (for example UptimeRobot) that requests `https://<your-app>.onrender.com/healthz` every 5 minutes. Every push to `main` redeploys the site automatically.

**Other Node.js hosts (Railway, Fly.io, …):** build command `npm install`, start command `npm start`. The server reads the `PORT` environment variable and exposes `/healthz` for health checks.

**GitHub Pages (static site only):** Settings → Pages → Branch: `main` / `(root)`. The root `index.html` redirects to `public/`. To use multiplayer, run the server elsewhere and put its address in the `server` field of `public/js/config.js`.

## Tests

```bash
npm test
```

The tests cover the place and room validation rules (including which items can carry tabletop items) and the server (static files, creating and joining rooms, position and chat relay, room ownership, the shared timer, room capacity, high-fives only between people standing side by side).

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
  js/audio.js        Ambience, lo-fi music and sound effects (Web Audio)
  js/timer.js        Pomodoro (solo and shared room mode)
  js/stats.js        Focus history, streaks and the stats window
  js/seasonal.js     Seasons, winter and autumn items and packs, snow and leaves in the windows
  js/pets.js         Rabbit, bird cage, fish bowl and fish feeding
  js/breaks.js       Break ideas shown during breaks
  js/goal.js         Daily goal ring and celebration
  js/journal.js      "What did you get done?" notes and the weekly log
  js/todos.js        To-do list with steps and drag-to-reorder
  js/net.js          Multiplayer connection, room card, chat
  js/main.js         Character dialog
  js/config.js       Separate server address (optional)
tests/               node:test tests
```
