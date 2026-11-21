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
- Furniture interactions: **sit** on sofas, armchairs, poufs, beanbags, benches and stools; **lie down** in bed; **work** at desks, café tables, reading tables and the bar counter. Someone sitting behind a table faces the camera, someone in front has their back turned; they type while a focus session runs.
- Pet the cat. The fireplace burns, records spin, coffee steams, neon signs and string lights glow.
- "Walk to a desk when focus starts": pressing Start sends the character to the nearest free work spot.
- Character customization: name, skin tone, hairstyle and hair color, outfit colors.
- Real-time day and night: the sky in the window changes, lamps turn on in the evening, the wall clock shows the real time.
- The cork board shows one note for each open task in your to-do list.

**Editing**
- 41 items, most in several colors (8 fabric colors, 5 wood finishes):
  - **Furniture:** sofa, armchair, pouf, beanbag, bench, stool, desk, café table, reading table, bar counter, coffee table, nightstand, bed, bookshelf, narrow bookshelf, wardrobe, pastry case
  - **Decor:** plant, large plant, cactus, flower pot, floor lamp, lantern, fireplace, record player, globe, cat, rug, round rug
  - **Wall:** window, arched window, cork board, menu board, wall shelf, painting, poster, wall clock, sconce, string lights, neon sign, hanging planter
- Add items (pick the color and direction first), **drag to move**, nudge with the arrow keys, duplicate, recolor and remove them.
- **Rotate** with the Rotate button or <kbd>R</kbd>: sofas, armchairs, desks and beds turn to face any side (with matching side and back views, and characters sit, work and lie accordingly); benches, coffee tables, café and reading tables and rugs turn between horizontal and vertical; plants, lamps, shelves and other decor flip.
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
  js/timer.js        Pomodoro (solo and shared room mode)
  js/todos.js        To-do list
  js/net.js          Multiplayer connection, room card, chat
  js/main.js         Character dialog
  js/config.js       Separate server address (optional)
tests/               node:test tests
```
