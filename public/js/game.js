/*
 * Oyun: oda modeli, karakter hareketi, etkileşim, düzenleme modu ve çizim döngüsü.
 */
(() => {
  'use strict';

  const App = window.App;
  const Sh = window.Shared;
  const Art = App.Art;
  const { ROOM_W, ROOM_H, DOOR_X, CATALOG } = Sh;
  const { T, OX, OY, LW, LH, CW, CH } = Art;

  const SPEED = 3.4; // kare / saniye
  const HW = 0.28; // ayak kutusu yarı genişliği
  const HH = 0.22; // ayak kutusu yüksekliği
  const SPAWN = { x: DOOR_X + 0.5, y: 0.7 };
  const N4 = [[0, 1], [-1, 0], [1, 0], [0, -1]];
  const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

  const canvasEl = document.getElementById('game');
  const ctx = canvasEl.getContext('2d');
  const Game = (App.Game = {});

  // ---------- Mekanlar ----------
  // Her mekanın (oda, kafe, kütüphane, teras) düzeni ayrı saklanır
  // Önceki sürümlerin hiç değiştirilmemiş varsayılan düzenleri: bunlar yeni tasarımlarla değiştirilir,
  // kullanıcının düzenlediği mekanlara dokunulmaz
  const OLD_DEFAULTS = {
    room: [
      '0,1,0#beanbag@2,5:3|bed@9,5:2|bigPlant@11,0:2|board@1,0:0|bookshelf@3,0:1|cat@8,6:0|clock@7,0:0|desk@1,0:0|lamp@6,3:0|painting@11,0:3|plant@11,7:1|plant@5,0:0|recordPlayer@0,3:1|rug@3,4:1|sideTable@11,5:0|sofa@4,3:0|table@4,5:0|wardrobe@8,0:4|window@5,0:0',
      '0,7,10#armchair@5,4:1|beanbag@1,5:3|bed@9,4:2|bigPlant@4,0:2|board@0,0:0|bookPile@9,0:0|bookshelf@2,0:1|cat@8,6:0|chesterfield@3,3:0|desk@0,0:1|dresser@5,0:0|ficus@11,0:1|lamp@6,3:2|lamp@7,0:0|miniGlobe@3,0:1|mirror@11,0:0|painting@7,0:6|plant@0,7:1|recordPlayer@0,3:1|rug@3,4:3|sideTable@11,4:0|succulent@2,0:0|table@3,5:0|tableLamp@6,0:1|teddyBear@11,6:0|toyChest@6,7:1|vase@5,0:0|wardrobe@8,0:4|window@5,0:0',
      '0,7,10#armchair@1,4:9|armchair@4,4:9|beanbag@8,4:3|beanbag@9,4:6|bed@4,0:11|bigPlant@9,0:1|board@0,0:0|calendar@11,0:1|cat@3,5:0|clock@2,0:1|coatRack@11,0:0|desk@0,0:1|dresser@7,0:1|guitar@11,4:0|lamp@1,3:0|narrowShelf@2,0:1|photoFrame@8,0:1|plant@0,7:1|plant@11,7:1|poster@3,0:4|poster@6,0:0|recordPlayer@10,4:1|roundRug@2,4:9|shagRug@8,4:8|sideTable@3,0:1|sideTable@6,0:1|sofa@2,3:8|succulent@2,0:0|table@2,4:1|tapestry@7,0:0|teddyBear@6,1:0|vase@7,0:0|window@4,0:1',
      '0,7,10#armchair@1,4:9|armchair@4,4:9|beanbag@8,4:3|beanbag@9,4:6|bed@4,0:11|bigPlant@9,0:1|board@0,0:0|calendar@11,0:1|cat@3,5:0|clock@2,0:1|coatRack@11,0:0|desk@0,0:1|dresser@7,0:1|guitar@11,4:0|lamp@1,3:0|narrowShelf@2,0:1|photoFrame@8,0:1|plant@0,7:1|plant@11,7:1|poster@3,0:4|poster@6,0:0|recordPlayer@10,4:1|roundRug@2,4:9|shagRug@8,4:8|sideTable@3,0:1|sideTable@6,0:1|sofa@2,3:8|stickyNote@9,0:0|succulent@2,0:0|table@2,4:1|tapestry@7,0:0|teddyBear@6,1:0|vase@7,0:0|window@4,0:1',
      '0,7,10#armchair@1,4:9|armchair@4,4:9|beanbag@8,4:3|beanbag@9,4:6|bed@4,0:11|bigPlant@9,0:1|board@0,0:0|calendar@11,0:1|cat@3,5:0|clock@2,0:1|coatRack@11,0:0|desk@0,0:1|dresser@7,0:1|guitar@11,4:0|lamp@1,3:0|lamp@11,3:1|narrowShelf@2,0:1|photoFrame@8,0:1|plant@0,7:1|plant@11,7:1|poster@3,0:4|poster@6,0:0|recordPlayer@10,4:1|roundRug@2,4:9|shagRug@8,4:8|sideTable@3,0:1|sideTable@6,0:1|sofa@2,3:8|stickyNote@9,0:0|succulent@2,0:0|table@2,4:1|tapestry@7,0:0|teddyBear@6,1:0|vase@7,0:0|window@4,0:1',
    ],
    cafe: [
      '6,3,4#armchair@10,4:5|bench@2,7:1|bigPlant@5,0:3|cafeTable@1,3:0|cafeTable@3,3:0|cafeTable@5,3:0|cat@9,7:1|chalkboard@3,0:0|clock@11,0:2|counter@0,0:0|flowers@6,7:0|lamp@11,3:1|neon@6,0:0|pastryCase@3,0:0|plant@0,7:0|plant@11,7:3|plant@7,0:1|roundRug@8,4:3|sconce@5,0:1|sofa@8,3:6|stringLights@0,0:0|table@8,5:1|window@8,0:2',
      '6,3,4#armchair@10,4:5|bigPlant@8,0:3|breadBasket@4,0:0|cafeTable@1,3:0|cafeTable@3,3:0|cake@3,0:1|cat@9,7:1|chalkboard@3,0:0|clock@9,0:2|coffeeCart@9,0:1|counter@0,0:0|cubeShelf@6,0:1|diningTable@5,3:0|ficus@11,0:0|flowers@6,7:0|hangingPlant@11,0:0|jars@6,0:0|lamp@11,3:1|pastryCase@3,0:0|pendantLamp@5,0:1|pendantLamp@8,0:1|plant@0,7:0|plant@11,7:3|roundRug@8,4:3|sofa@8,3:6|stringLights@0,0:0|succulent@7,0:2|table@8,5:1|vase@5,4:0|window@6,0:2|windowBench@1,7:3',
      '6,3,4#armchair@10,4:1|armchair@7,4:1|bigPlant@9,0:3|breadBasket@4,0:0|cafeTable@1,3:0|cafeTable@3,3:0|cafeTable@5,3:0|cake@3,0:1|cat@6,6:1|chalkboard@0,0:0|clock@2,0:0|counter@0,0:0|cubeShelf@5,0:1|ficus@11,0:0|hangingPlant@11,0:0|lamp@10,3:1|neon@3,0:0|pastryCase@3,0:0|pendantLamp@7,0:1|pendantLamp@8,0:1|plant@0,7:0|plant@11,7:3|roundRug@8,4:6|sofa@8,3:9|table@8,4:1|window@5,0:2|windowBench@7,0:11',
      '6,3,4#armchair@10,4:1|armchair@7,4:1|bigPlant@9,0:3|breadBasket@4,0:0|cafeTable@1,3:0|cafeTable@3,3:0|cafeTable@5,3:0|cake@3,0:1|cat@6,6:1|chalkboard@0,0:0|clock@2,0:0|counter@0,0:0|cubeShelf@5,0:1|ficus@11,0:0|hangingPlant@11,0:0|lamp@10,3:1|neon@3,0:0|pastryCase@3,0:0|pendantLamp@7,0:1|pendantLamp@8,0:1|plant@0,7:0|plant@11,7:3|roundRug@8,4:6|sofa@8,3:9|stickyNote@9,0:1|table@8,4:1|window@5,0:2|windowBench@7,0:11',
      '6,3,4#armchair@10,4:1|armchair@7,4:1|bigPlant@9,0:3|breadBasket@4,0:0|cafeTable@1,3:0|cafeTable@3,3:0|cafeTable@5,3:0|cake@3,0:1|candle@1,4:2|candle@3,4:0|candle@5,4:2|cat@6,6:1|chalkboard@0,0:0|clock@2,0:0|counter@0,0:0|cubeShelf@5,0:1|ficus@11,0:0|hangingPlant@11,0:0|lamp@10,3:1|neon@3,0:0|pastryCase@3,0:0|pendantLamp@7,0:1|pendantLamp@8,0:1|plant@0,7:0|plant@11,7:3|roundRug@8,4:6|sofa@8,3:9|stickyNote@9,0:1|table@8,4:1|window@5,0:2|windowBench@7,0:11',
    ],
    library: [
      '7,4,5#archWindow@4,0:1|armchair@11,4:1|armchair@9,4:6|bigPlant@11,0:3|bookshelf@0,0:1|bookshelf@2,0:1|cat@8,7:2|clock@7,0:1|fireplace@6,0:0|globe@4,0:0|narrowShelf@8,0:1|narrowShelf@9,0:1|painting@6,0:0|plant@0,7:0|plant@11,7:2|plant@5,0:2|readingTable@1,3:1|readingTable@5,3:1|rug@8,5:6|sconce@11,0:1|sideTable@10,4:1',
      '7,4,5#armchair@10,4:10|armchair@8,4:10|bigPlant@11,0:3|bookPile@8,0:2|bookshelf@0,0:1|bookshelf@2,0:1|bookshelf@8,0:1|candelabra@5,7:1|candle@0,0:0|cat@8,7:2|clockTrio@5,0:0|deskClock@1,7:0|filingCabinet@0,7:1|fireplace@5,0:0|globe@3,7:0|hourglass@3,0:0|lamp@11,4:1|miniGlobe@1,0:0|narrowShelf@4,0:1|narrowShelf@7,0:1|painting@11,0:0|plant@11,7:2|readingTable@1,3:1|readingTable@5,3:1|rug@8,5:10|sconce@4,0:1|sconce@7,0:1|sideTable@9,4:1|succulent@9,0:1|typewriter@0,7:0',
      '7,4,5#armchair@4,3:10|armchair@5,3:10|bookPile@0,0:2|bookPile@9,0:2|bookshelf@0,0:1|bookshelf@2,0:1|bookshelf@6,0:1|bookshelf@8,0:1|candle@1,0:0|candle@8,0:0|cat@5,6:2|clockTrio@4,0:0|fireplace@4,0:0|lamp@11,4:1|loungeChair@10,4:9|miniGlobe@11,0:0|narrowShelf@11,0:1|plant@11,7:2|readingTable@0,3:1|readingTable@7,3:1|roundRug@4,3:10|succulent@3,0:1|succulent@6,0:1',
      '7,4,5#armchair@4,3:10|armchair@5,3:10|bookPile@0,0:2|bookPile@9,0:2|bookshelf@0,0:1|bookshelf@2,0:1|bookshelf@6,0:1|bookshelf@8,0:1|candle@1,0:0|candle@8,0:0|cat@5,6:2|clockTrio@4,0:0|fireplace@4,0:0|lamp@11,4:1|loungeChair@10,4:9|miniGlobe@11,0:0|narrowShelf@11,0:1|plant@11,7:2|readingTable@0,3:1|readingTable@7,3:1|roundRug@4,3:10|succulent@3,0:1|succulent@6,0:1|tableLamp@1,4:1|tableLamp@8,4:1',
    ],
    terrace: [
      '0,5,8#beanbag@7,5:0|beanbag@8,5:5|bench@1,7:0|bench@4,0:0|bigPlant@11,0:1|bigPlant@6,0:0|bigPlant@9,0:4|cactus@0,7:0|cafeTable@2,3:1|cafeTable@4,3:1|flowers@0,0:0|flowers@1,0:1|flowers@11,7:0|flowers@2,0:2|flowers@8,0:3|hangingPlant@11,0:0|lantern@10,4:0|lantern@7,0:0|roundRug@7,4:3|stringLights@0,0:0|stringLights@3,0:1|stringLights@6,0:0',
      '0,5,8#beanbag@5,4:0|beanbag@7,4:5|bench@5,5:0|bicycle@1,7:1|bigPlant@11,0:1|bigPlant@6,0:0|bunting@6,0:0|cactus@0,7:0|cafeTable@3,3:1|campfire@6,4:0|deckChair@10,5:3|deckChair@11,5:9|diningTable@1,3:1|flowers@8,7:0|flowers@9,0:3|fruitBowl@1,4:0|hammock@9,3:2|hangingPlant@11,0:0|lampPost@11,3:0|lantern@7,0:0|palm@8,0:0|planterBox@0,0:0|planterBox@2,0:1|snowman@4,7:0|stringLights@0,0:0|stringLights@3,0:1|swingBench@4,0:0|teapot@3,4:0',
    ],
    attic: [
      '9,4,1#bookPile@4,0:2|bookshelf@4,0:1|candelabra@9,7:1|candle@4,5:0|cat@7,6:1|clock@9,0:1|coatRack@11,0:0|crystals@11,5:0|daybed@8,3:9|desk@0,3:1|deskClock@3,0:0|filingCabinet@2,0:1|globe@6,0:1|hourglass@5,0:0|ladderShelf@8,0:1|lamp@6,4:2|painting@11,0:7|pampasVase@7,0:0|plant@11,7:1|potionShelf@10,5:1|potions@10,5:0|rockingChair@4,4:1|rug@3,4:10|sideTable@10,3:1|table@4,5:1|telescope@0,0:0|toyChest@0,6:1|typewriter@2,0:0|windowBench@2,7:9|worldMap@6,0:0',
      '9,4,1#armchair@4,4:9|armchair@6,4:9|bookPile@4,0:2|bookStack@2,4:0|bookshelf@3,0:1|bookshelf@7,0:1|cat@7,6:1|clock@9,0:1|coatRack@11,0:0|daybed@10,3:9|desk@1,0:1|filingCabinet@5,0:1|globe@9,0:1|hourglass@7,0:0|lamp@0,4:0|plant@0,7:1|rockingChair@1,4:1|rug@4,4:10|sideTable@5,4:1|succulent@3,0:0|succulent@8,0:0|telescope@0,0:0|toyChest@11,5:1|typewriter@5,0:0|worldMap@5,0:0',
    ],
    studio: [
      '0,0,0#artTable@1,0:1|beanbag@8,4:3|bigPlant@8,0:1|canvasStack@0,0:0|canvasStack@0,7:1|cat@10,6:3|clock@4,0:1|cubeShelf@3,0:4|easel@2,3:0|easel@5,3:0|easel@9,0:0|ficus@11,0:3|floorCanvas@0,5:0|floorCanvas@3,6:1|floorCanvas@7,5:3|floorCushion@9,5:5|gallery@0,0:0|jars@3,0:1|lavaLamp@11,4:0|paintJars@1,0:0|pendantLamp@7,0:1|pendantLamp@9,0:1|plant@11,7:0|plant@5,0:2|poster@3,0:6|shagRug@8,4:8|stool@2,4:0|stool@5,4:3|succulent@4,0:1|vase@2,0:1|windowBench@6,0:8',
      '0,0,0#artTable@0,0:1|bigPlant@8,0:1|canvasStack@4,0:0|clock@4,0:1|cubeShelf@2,0:4|easel@2,3:1|easel@4,3:2|ficus@11,0:3|floorCanvas@3,5:1|gallery@0,0:0|jars@2,0:1|lamp@10,4:2|loungeChair@8,4:11|loungeChair@9,4:11|paintJars@0,0:0|pendantLamp@6,0:1|pendantLamp@7,0:1|plant@11,7:0|plant@5,0:2|poster@3,0:6|shagRug@8,4:8|stool@2,4:0|stool@4,4:3|succulent@3,0:1|vase@1,0:1|windowBench@6,0:8',
      '0,0,10#artTable@0,0:1|beanbag@10,4:6|beanbag@9,4:3|bigPlant@8,0:1|canvasStack@4,0:0|cat@9,6:3|clock@4,0:1|cubeShelf@2,0:4|easel@1,3:1|easel@3,3:0|eggChair@11,3:2|ficus@11,0:3|floorCanvas@2,5:1|gallery@0,0:0|jars@1,0:1|ladderShelf@0,5:4|lamp@0,3:0|lavaLamp@11,5:1|paintJars@0,0:0|paintJars@5,4:1|pampasVase@7,0:0|pencilCup@7,4:0|pendantLamp@6,0:1|pendantLamp@7,0:1|plant@0,7:2|plant@11,7:0|poster@3,0:6|readingTable@5,3:2|rug@1,3:8|shagRug@9,4:8|stool@1,4:3|stool@3,4:3|succulent@3,0:1|vase@2,0:1|vase@6,4:0|windowBench@5,0:8',
    ],
    kitchen: [
      '9,6,9#breadBasket@0,0:0|cabinet@0,0:0|cabinet@1,3:0|cabinet@2,3:0|cabinet@5,0:0|cabinet@6,0:0|cabinet@8,0:0|cake@1,3:1|calendar@11,0:0|cat@10,5:1|clock@7,0:2|coffeeMaker@5,0:0|curtainWindow@1,0:3|diningTable@6,3:0|dogBed@8,7:0|flowers@0,7:0|fridge@7,0:0|fruitBowl@7,0:0|jars@6,0:1|mug@2,3:1|panRail@8,0:0|plant@11,0:0|plant@11,7:1|rangeHood@3,0:2|runner@4,3:0|sink@1,0:0|spiceRack@0,0:0|stool@1,4:3|stool@2,4:3|stove@3,0:0|teapot@8,0:1|trashBin@9,0:0|vase@6,4:0|wallCabinet@5,0:0|windowBench@9,4:1',
      '9,6,9#breadBasket@0,0:0|cabinet@0,0:0|cabinet@3,0:0|cabinet@4,3:0|cabinet@5,3:0|cabinet@6,0:0|cabinet@7,0:0|cake@4,3:1|cat@6,6:1|clock@3,0:2|coffeeMaker@3,0:0|curtainWindow@1,0:3|diningTable@9,3:0|dogBed@1,6:0|fridge@8,0:0|fruitBowl@5,3:0|hangingPlant@11,0:0|jars@6,0:1|mug@7,0:1|pendantLamp@9,0:1|plant@11,0:0|plant@11,7:1|rangeHood@4,0:2|runner@1,1:0|sink@1,0:0|spiceRack@0,0:0|stool@4,4:3|stool@5,4:3|stove@4,0:0|vase@9,4:0|wallCabinet@6,0:0',
      '9,6,9#bigPlant@11,0:1|breadBasket@0,0:0|breadBasket@7,5:1|cabinet@0,0:0|cabinet@2,3:2|cabinet@3,0:0|cabinet@3,3:2|cabinet@4,3:2|cabinet@5,3:2|cabinet@6,0:0|cabinet@7,0:0|cake@2,3:1|cat@11,4:0|clock@3,0:2|coffeeCart@9,0:0|coffeeMaker@3,0:0|curtainWindow@1,0:3|diningTable@7,4:1|diningTable@8,4:1|diningTable@9,4:1|dogBed@0,5:0|fridge@8,0:0|fruitBowl@4,3:0|fruitBowl@9,5:1|hangingPlant@11,0:0|jars@6,0:1|mug@3,3:2|mug@7,0:1|pendantLamp@9,0:1|plant@0,7:1|plant@11,7:1|rangeHood@4,0:2|runner@1,1:6|sink@1,0:0|spiceRack@0,0:0|stool@2,4:3|stool@3,4:3|stool@4,4:3|stool@5,4:3|stove@4,0:0|teapot@5,3:0|trashBin@0,3:1|vase@8,5:0|wallCabinet@6,0:0',
    ],
  };
  const fingerprint = (r) => `${[r.style.wall, r.style.pattern, r.style.floor].join(',')}#${r.items.map((i) => `${i.type}@${i.x},${i.y}:${i.c}`).sort().join('|')}`;

  function loadVenues() {
    const saved = App.storage.get(App.KEYS.venues, null) || {};
    if (!saved.room) {
      const legacy = App.storage.get(App.KEYS.room, null);
      if (legacy) saved.room = legacy;
    }
    const out = {};
    for (const id of Sh.VENUES) {
      out[id] = saved[id] && typeof saved[id] === 'object' ? Sh.sanitizeRoom({ ...saved[id], venue: id }) : Sh.defaultRoom(id);
      if (OLD_DEFAULTS[id] && OLD_DEFAULTS[id].includes(fingerprint(out[id]))) out[id] = Sh.defaultRoom(id);
    }
    return out;
  }

  const venues = loadVenues();
  let venueId = App.storage.get(App.KEYS.venue, 'room');
  if (!Sh.VENUES.includes(venueId)) venueId = 'room';

  let room = venues[venueId];
  let session = { role: 'solo', mine: true }; // role: solo | owner | guest
  let solid = [];
  const itemById = new Map();

  function rebuild() {
    itemById.clear();
    for (const it of room.items) itemById.set(it.id, it);
    solid = Array.from({ length: ROOM_H }, () => new Array(ROOM_W).fill(false));
    for (const it of room.items) {
      const cat = Sh.footprint(it);
      if (cat.layer !== 'obj') continue;
      const def = Art.view(it);
      for (let cy = 0; cy < cat.h; cy++) {
        for (let cx = 0; cx < cat.w; cx++) {
          if (!def.solid || def.solid(cx, cy)) solid[it.y + cy][it.x + cx] = true;
        }
      }
    }
  }

  const walkable = (x, y) => x >= 0 && y >= 0 && x < ROOM_W && y < ROOM_H && !solid[y][x];

  function setRoom(next, persist) {
    room = next;
    rebuild();
    fixCharacters();
    syncPets();
    if (persist) {
      venues[room.venue] = room;
      App.storage.set(App.KEYS.venues, venues);
    }
    App.emit('room:changed', room);
  }

  // Geri al / yinele: her düzenlemeden önce odanın hali saklanır
  const UNDO_MAX = 60;
  const undoStack = [];
  const redoStack = [];
  const snapshot = () => JSON.parse(JSON.stringify({ style: room.style, items: room.items }));

  function clearHistory() {
    undoStack.length = 0;
    redoStack.length = 0;
    App.emit('history:changed');
  }

  function applyRoom(next) {
    setRoom(Sh.sanitizeRoom({ venue: room.venue, ...next }), session.mine);
    App.emit('room:edited', room);
  }

  function commitRoom(next) {
    if (session.role === 'guest') return false;
    undoStack.push(snapshot());
    if (undoStack.length > UNDO_MAX) undoStack.shift();
    redoStack.length = 0;
    applyRoom(next);
    App.emit('history:changed');
    return true;
  }

  function stepHistory(from, to) {
    if (session.role === 'guest' || !from.length) return false;
    to.push(snapshot());
    applyRoom(from.pop());
    edit.placing = null;
    if (edit.selected && !itemById.has(edit.selected)) edit.selected = null;
    App.emit('sfx', 'nudge');
    App.emit('history:changed');
    App.emit('edit:changed');
    return true;
  }

  function respawn() {
    me.seat = null;
    me.pose = 'stand';
    me.path = [];
    me.pending = null;
    me.tween = null;
    me.x = SPAWN.x;
    me.y = SPAWN.y;
  }

  // Odaya girerken kapının yakınında rastgele boş bir kare (herkes üst üste doğmasın)
  function spawnNearDoor() {
    const spots = [];
    for (let ty = 0; ty <= 2; ty++) {
      for (let tx = DOOR_X - 2; tx <= DOOR_X + 1; tx++) if (walkable(tx, ty)) spots.push([tx, ty]);
    }
    if (!spots.length) return;
    const [tx, ty] = spots[Math.floor(Math.random() * spots.length)];
    [me.x, me.y] = tileCenter(tx, ty);
  }

  // Mekan değiştir: tek başınayken ya da oda sahibiyken
  function setVenue(id) {
    if (!Sh.VENUES.includes(id) || session.role === 'guest') return false;
    if (id === room.venue) return true;
    venueId = id;
    App.storage.set(App.KEYS.venue, id);
    if (edit.on) {
      edit.placing = null;
      edit.selected = null;
    }
    respawn();
    setRoom(venues[id], false);
    clearHistory();
    if (session.role === 'owner') App.emit('room:edited', room);
    App.emit('edit:changed');
    return true;
  }

  // ---------- Karakterler ----------
  function randomLook() {
    const look = {};
    for (const [key, count] of Object.entries(Sh.LOOK_COUNTS)) look[key] = Math.floor(Math.random() * count);
    return look;
  }

  function loadProfile() {
    const saved = App.storage.get(App.KEYS.player, null);
    if (!saved) {
      const fresh = { name: 'Guest', look: randomLook() };
      App.storage.set(App.KEYS.player, fresh);
      return fresh;
    }
    return { name: Sh.sanitizeName(saved.name), look: Sh.sanitizeLook(saved.look) };
  }

  function makeChar(id, name, look) {
    return {
      id,
      name,
      look,
      x: SPAWN.x,
      y: SPAWN.y,
      tx: SPAWN.x,
      ty: SPAWN.y,
      dir: 'down',
      pose: 'stand',
      seat: null,
      moving: false,
      frame: 0,
      walkT: 0,
      blinkT: 1 + Math.random() * 3,
      blink: false,
      bubble: null,
      path: [],
      pending: null,
      tween: null,
      standAt: null,
    };
  }

  const profile = loadProfile();
  const me = makeChar('me', profile.name, profile.look);
  me.local = true;
  const others = new Map();
  const allChars = () => [me, ...others.values()];

  function seatInfo(seat) {
    if (!seat) return null;
    const item = itemById.get(seat.id);
    if (!item) return null;
    const def = Art.view(item);
    const s = def.seats && def.seats[seat.i];
    if (!s) return null;
    return { item, def, s, x: item.x + s.x, y: item.y + s.y };
  }

  function seatTaken(id, i, exceptId) {
    for (const ch of allChars()) {
      if (ch.id === exceptId) continue;
      if (ch.seat && ch.seat.id === id && ch.seat.i === i) return true;
    }
    return false;
  }

  function isBlocked(x, y) {
    if (x - HW < 0 || x + HW > ROOM_W || y - HH < 0.12 || y > ROOM_H - 0.02) return true;
    const x0 = Math.floor(x - HW);
    const x1 = Math.floor(x + HW - 1e-6);
    const y0 = Math.floor(y - HH);
    const y1 = Math.floor(y - 1e-6);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) if (!walkable(tx, ty)) return true;
    }
    return false;
  }

  function nearestFreeTile(x, y) {
    let best = null;
    for (let ty = 0; ty < ROOM_H; ty++) {
      for (let tx = 0; tx < ROOM_W; tx++) {
        if (!walkable(tx, ty)) continue;
        const d = Math.hypot(tx + 0.5 - x, ty + 0.55 - y);
        if (!best || d < best.d) best = { tx, ty, d };
      }
    }
    return best ? [best.tx, best.ty] : null;
  }

  const tileCenter = (tx, ty) => [tx + 0.5, ty + 0.55];

  function fixCharacters() {
    for (const ch of allChars()) {
      if (ch.seat && !seatInfo(ch.seat)) {
        ch.seat = null;
        ch.pose = 'stand';
      }
    }
    const mine = seatInfo(me.seat);
    if (mine && !me.tween && (Math.abs(mine.x - me.x) > 0.01 || Math.abs(mine.y - me.y) > 0.01)) {
      me.seat = null;
      me.pose = 'stand';
      me.dir = 'down';
    }
    if (me.pending && !itemById.has(me.pending.id)) {
      me.pending = null;
      me.path = [];
    }
    if (me.path.some(([tx, ty]) => !walkable(tx, ty))) me.path = [];
    if (!me.seat && !me.tween && isBlocked(me.x, me.y)) {
      const t = nearestFreeTile(me.x, me.y);
      if (t) [me.x, me.y] = tileCenter(t[0], t[1]);
    }
  }

  // ---------- Yol bulma (8 yön, köşe kesmeden Dijkstra) ----------
  function distances(sx, sy) {
    const n = ROOM_W * ROOM_H;
    const dist = new Float64Array(n).fill(Infinity);
    const prev = new Int32Array(n).fill(-1);
    const done = new Uint8Array(n);
    const clampX = Math.max(0, Math.min(ROOM_W - 1, sx));
    const clampY = Math.max(0, Math.min(ROOM_H - 1, sy));
    dist[clampY * ROOM_W + clampX] = 0;
    for (;;) {
      let u = -1;
      let best = Infinity;
      for (let i = 0; i < n; i++) {
        if (!done[i] && dist[i] < best) {
          best = dist[i];
          u = i;
        }
      }
      if (u < 0) break;
      done[u] = 1;
      const ux = u % ROOM_W;
      const uy = (u / ROOM_W) | 0;
      for (const [dx, dy] of N8) {
        const vx = ux + dx;
        const vy = uy + dy;
        if (!walkable(vx, vy)) continue;
        if (dx && dy && (!walkable(ux + dx, uy) || !walkable(ux, uy + dy))) continue;
        const v = vy * ROOM_W + vx;
        const nd = best + (dx && dy ? Math.SQRT2 : 1);
        if (nd < dist[v]) {
          dist[v] = nd;
          prev[v] = u;
        }
      }
    }
    return { dist, prev };
  }

  function routeTo(graph, tx, ty) {
    let v = ty * ROOM_W + tx;
    if (graph.dist[v] === Infinity) return null;
    const list = [];
    while (graph.prev[v] !== -1) {
      list.push([v % ROOM_W, (v / ROOM_W) | 0]);
      v = graph.prev[v];
    }
    return list.reverse();
  }

  const myTile = () => [Math.floor(me.x), Math.floor(me.y)];

  // ---------- Hareket ve etkileşim ----------
  function walkTo(tx, ty) {
    const go = () => {
      const [sx, sy] = myTile();
      const path = routeTo(distances(sx, sy), tx, ty);
      if (!path) return;
      me.pending = null;
      me.path = path.length ? path : [[tx, ty]];
    };
    if (me.seat) standUp(go);
    else go();
  }

  function approachTiles(item, seat) {
    const out = [];
    const seen = new Set();
    const add = (x, y, penalty) => {
      const k = y * ROOM_W + x;
      if (seen.has(k) || !walkable(x, y)) return;
      seen.add(k);
      out.push({ x, y, penalty });
    };
    for (const [cx, cy] of seat.cells) {
      const x = item.x + cx;
      const y = item.y + cy;
      if (walkable(x, y)) add(x, y, 0);
      else for (const [dx, dy] of N4) add(x + dx, y + dy, dy < 0 ? 2.5 : 0);
    }
    return out;
  }

  // Kedi sevmek gibi oturma dışı etkileşimler: yanına yürü, sonra kullan
  function useItem(item) {
    const def = Art.view(item);
    // masa üstündeki eşyaya (fanus, kar küresi) üstünde durduğu mobilyanın yanından ulaşılır
    const base = CATALOG[item.type].layer === 'top' ? Sh.hostAt(room.items, item.x, item.y, item.id) || item : item;
    const cat = Sh.footprint(base);
    const go = () => {
      const [sx, sy] = myTile();
      const graph = distances(sx, sy);
      let choice = null;
      for (let cy = 0; cy < cat.h; cy++) {
        for (let cx = 0; cx < cat.w; cx++) {
          for (const [dx, dy] of N4) {
            const x = base.x + cx + dx;
            const y = base.y + cy + dy;
            if (!walkable(x, y)) continue;
            const d = graph.dist[y * ROOM_W + x];
            if (d !== Infinity && (!choice || d < choice.d)) choice = { x, y, d };
          }
        }
      }
      if (!choice) {
        App.toast(App.t("Can't get there."));
        return;
      }
      me.path = routeTo(graph, choice.x, choice.y) || [];
      me.pending = { id: item.id, use: def.use };
      if (!me.path.length) arrive();
    };
    if (me.seat) standUp(go);
    else go();
  }

  const particles = [];
  const notes = [];
  // Eşyanın en son kullanıldığı an (yemlenen balıklar, şakıyan kuş, sallanan kar küresi…)
  const usedAt = new Map();
  let pianoT = 0;

  // ---------- Evcil hayvanlar: uyur, uyanınca dolaşır, birinin yanına oturur, yatağına döner ----------
  // (Her oyuncunun ekranında kendi başına canlandırılır; sunucuya gönderilmez.)
  const pets = new Map(); // eşya id → hayvan
  const PET_SPEED = { cat: 1.5, dogBed: 2, rabbit: 2.3 };
  const rand = (a, b) => a + Math.random() * (b - a);

  function bedSpot(item) {
    const fp = Sh.footprint(item);
    return [item.x + fp.w / 2, item.y + 0.75];
  }

  function syncPets() {
    const seen = new Set();
    for (const it of room.items) {
      if (!Art.PET_KINDS || !Art.PET_KINDS.includes(it.type)) continue;
      seen.add(it.id);
      let pet = pets.get(it.id);
      if (!pet) {
        pet = { id: it.id, kind: it.type, state: 'sleep', timer: rand(12, 35), x: 0, y: 0, path: [], dir: 'down', frame: 0, walkT: 0, home: false, trips: 0 };
        pets.set(it.id, pet);
      }
      pet.item = it;
      // eşya taşındıysa ya da yolu kapandıysa uyuyup yatağına döner
      const tile = [Math.floor(pet.x), Math.floor(pet.y)];
      if (pet.state === 'sleep' || (pet.state !== 'sleep' && !walkable(tile[0], tile[1])) || pet.path.some(([x, y]) => !walkable(x, y))) sendToBed(pet);
    }
    for (const id of [...pets.keys()]) if (!seen.has(id)) pets.delete(id);
  }

  function sendToBed(pet) {
    pet.state = 'sleep';
    pet.path = [];
    pet.home = false;
    pet.trips = 0;
    [pet.x, pet.y] = bedSpot(pet.item);
    if (!(pet.timer > 0)) pet.timer = rand(25, 60);
  }

  // Yatağın yanındaki yürünebilir kare (hayvan yataktan buraya iner)
  function bedExit(item) {
    const fp = Sh.footprint(item);
    const out = [];
    for (let cy = 0; cy < fp.h; cy++) {
      for (let cx = 0; cx < fp.w; cx++) {
        for (const [dx, dy] of N4) {
          const x = item.x + cx + dx;
          const y = item.y + cy + dy;
          if (walkable(x, y)) out.push([x, y]);
        }
      }
    }
    return out.length ? out[Math.floor(Math.random() * out.length)] : null;
  }

  function petGoTo(pet, from, target) {
    const path = routeTo(distances(from[0], from[1]), target[0], target[1]);
    if (!path) return false;
    pet.path = path.length ? path : [target];
    pet.state = 'walk';
    return true;
  }

  function pickDestination(pet) {
    // yarı yarıya: bir karakterin yanına gider (çalışan birinin dibine kıvrılmak gibi)
    const chars = allChars().filter((ch) => !ch.moving);
    if (chars.length && Math.random() < 0.55) {
      const ch = chars[Math.floor(Math.random() * chars.length)];
      const cx = Math.floor(ch.x);
      const cy = Math.floor(ch.y);
      const near = N8.map(([dx, dy]) => [cx + dx, cy + dy]).filter(([x, y]) => walkable(x, y));
      if (near.length) return near[Math.floor(Math.random() * near.length)];
    }
    const free = [];
    for (let y = 1; y < ROOM_H; y++) for (let x = 0; x < ROOM_W; x++) if (walkable(x, y)) free.push([x, y]);
    return free.length ? free[Math.floor(Math.random() * free.length)] : null;
  }

  function wakePet(pet) {
    const exit = bedExit(pet.item);
    const dest = exit && pickDestination(pet);
    if (!exit || !dest) {
      pet.timer = rand(20, 40);
      return;
    }
    pet.path = [exit];
    const rest = routeTo(distances(exit[0], exit[1]), dest[0], dest[1]);
    if (rest) pet.path.push(...rest);
    pet.state = 'walk';
    pet.home = false;
  }

  function updatePets(dt) {
    for (const pet of pets.values()) {
      if (pet.state === 'sleep') {
        pet.timer -= dt;
        if (pet.timer <= 0 && !edit.on) wakePet(pet);
        continue;
      }
      if (pet.state === 'sit') {
        pet.timer -= dt;
        if (pet.timer > 0) continue;
        const tile = [Math.floor(pet.x), Math.floor(pet.y)];
        if (pet.trips < 1 && Math.random() < 0.4) {
          pet.trips++;
          const dest = pickDestination(pet);
          if (dest && petGoTo(pet, tile, dest)) continue;
        }
        // eve dönüş: yatağın yanındaki kareye yürü, sonra yatağa çık
        const exit = bedExit(pet.item);
        if (!exit || !petGoTo(pet, tile, exit)) {
          sendToBed(pet);
          continue;
        }
        pet.home = true;
        continue;
      }
      // yürüme
      if (!pet.path.length) {
        if (pet.home) {
          pet.timer = rand(30, 70);
          sendToBed(pet);
        } else {
          pet.state = 'sit';
          pet.dir = 'down';
          pet.timer = rand(7, 16);
        }
        continue;
      }
      const [tx, ty] = tileCenter(pet.path[0][0], pet.path[0][1]);
      const dx = tx - pet.x;
      const dy = ty - pet.y;
      const dist = Math.hypot(dx, dy);
      const step = (PET_SPEED[pet.kind] || 1.5) * dt;
      if (dist <= step) {
        pet.x = tx;
        pet.y = ty;
        pet.path.shift();
      } else {
        pet.x += (dx / dist) * step;
        pet.y += (dy / dist) * step;
        if (Math.abs(dx) > 0.02) pet.dir = dx < 0 ? 'left' : 'right';
      }
      pet.walkT += dt;
      pet.frame = pet.kind === 'rabbit' ? (Math.abs(Math.sin(pet.walkT * 7)) > 0.45 ? 1 : 0) : Math.floor(pet.walkT * 7) % 2;
    }
  }

  const awayPets = () => new Set([...pets.values()].filter((pt) => pt.state !== 'sleep').map((pt) => pt.id));

  function petImage(pet) {
    if (pet.state === 'walk') return Art.petSprite(pet.kind, pet.item.c, 'walk', pet.frame, pet.dir);
    // otururken tavşanın burnu arada bir oynar
    const twitch = pet.kind === 'rabbit' && performance.now() % 1600 < 260 ? 1 : 0;
    return Art.petSprite(pet.kind, pet.item.c, 'sit', twitch, pet.dir);
  }

  function drawPet(pet) {
    const img = petImage(pet);
    // tavşan yürürken zıplar
    const hop = pet.kind === 'rabbit' && pet.state === 'walk' ? Math.round(Math.abs(Math.sin(pet.walkT * 7)) * 3) : 0;
    const x = Math.round(OX + pet.x * T - (img.width - 2) / 2) - 1;
    const y = Math.round(OY + pet.y * T - (img.height - 2)) - 1;
    ctx.fillStyle = 'rgba(40, 28, 36, 0.2)';
    ctx.fillRect(x + 3 + (hop ? 1 : 0), y + img.height - 3, img.width - 6 - (hop ? 2 : 0), 2);
    ctx.drawImage(img, x, y - hop);
  }

  function petAt(pt) {
    for (const pet of pets.values()) {
      if (pet.state === 'sleep') continue;
      const img = petImage(pet);
      const x = OX + pet.x * T - img.width / 2;
      const y = OY + pet.y * T - img.height;
      if (pt.lx >= x - 2 && pt.lx <= x + img.width + 2 && pt.ly >= y - 2 && pt.ly <= y + img.height + 2) return pet;
    }
    return null;
  }

  // Dolaşan hayvanı sev: yanına yürü, kalpler çıksın; hayvan biraz daha oturur
  function goPet(pet) {
    pet.state = 'sit';
    pet.path = [];
    pet.timer = Math.max(pet.timer, 8);
    const go = () => {
      const [sx, sy] = myTile();
      const graph = distances(sx, sy);
      const px = Math.floor(pet.x);
      const py = Math.floor(pet.y);
      let choice = null;
      for (const [dx, dy] of N4) {
        const x = px + dx;
        const y = py + dy;
        if (!walkable(x, y)) continue;
        const d = graph.dist[y * ROOM_W + x];
        if (d !== Infinity && (!choice || d < choice.d)) choice = { x, y, d };
      }
      if (!choice) return;
      me.path = routeTo(graph, choice.x, choice.y) || [];
      me.pending = { id: pet.id, pet: true };
      if (!me.path.length) arrive();
    };
    if (me.seat) standUp(go);
    else go();
  }



  // Çok kişilik eşyalarda tıklanan noktaya en yakın boş koltuk (yoksa undefined: en yakın boş koltuk seçilir)
  function seatNearPoint(item, fx, fy) {
    const seats = Art.view(item).seats;
    if (!seats || seats.length < 2) return undefined;
    let best;
    let bestD = Infinity;
    seats.forEach((s, i) => {
      if (seatTaken(item.id, i, me.id)) return;
      const [cx, cy] = s.cells[0];
      const d = Math.hypot(item.x + cx + 0.5 - fx, item.y + cy + 0.5 - fy);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }

  function interact(item, seatIndex) {
    const def = Art.view(item);
    if (def.use) {
      useItem(item);
      return;
    }
    if (!def.seats) return;
    let best = null;
    def.seats.forEach((s, i) => {
      if (seatIndex !== undefined && i !== seatIndex) return;
      if (seatTaken(item.id, i, me.id)) return;
      const d = Math.hypot(item.x + s.x - me.x, item.y + s.y - me.y);
      if (!best || d < best.d) best = { i, d };
    });
    if (!best) {
      App.toast(App.t('That seat is taken.'));
      return;
    }
    if (me.seat && me.seat.id === item.id && me.seat.i === best.i) return;
    const go = () => {
      const [sx, sy] = myTile();
      const graph = distances(sx, sy);
      let choice = null;
      for (const t of approachTiles(item, def.seats[best.i])) {
        const d = graph.dist[t.y * ROOM_W + t.x] + t.penalty;
        if (d !== Infinity && (!choice || d < choice.d)) choice = { ...t, d };
      }
      if (!choice) {
        App.toast(App.t("Can't get there."));
        return;
      }
      me.path = routeTo(graph, choice.x, choice.y) || [];
      me.pending = { id: item.id, i: best.i };
      if (!me.path.length) arrive();
    };
    if (me.seat) standUp(go);
    else go();
  }

  function arrive() {
    const pend = me.pending;
    me.pending = null;
    if (!pend) return;
    if (pend.hi5) {
      const o = others.get(pend.hi5);
      if (!o) return;
      me.dir = o.x < me.x ? 'left' : 'right';
      if (standingStill(o) && sideBySide(me, o)) requestHighFive(o);
      else App.toast(App.t('{name} moved. Try again when they are standing still.', { name: o.name }), 2400);
      return;
    }
    if (pend.pet) {
      const pet = pets.get(pend.id);
      if (!pet || pet.state === 'sleep') return;
      me.dir = dirFrom(pet.x - me.x, pet.y - me.y);
      pet.dir = 'down';
      pet.timer = Math.max(pet.timer, 6);
      for (let i = 0; i < 3; i++) particles.push({ x: pet.x + (i - 1) * 0.25, y: pet.y - 0.9, t: -i * 0.25 });
      App.emit('sfx', Art.view(pet.item).petSfx || 'pet');
      App.emit('item:used', { type: pet.kind, use: 'pet' });
      return;
    }
    if (pend.use) {
      const item = itemById.get(pend.id);
      if (!item) return;
      const cat = Sh.footprint(item);
      const cx = item.x + cat.w / 2;
      const cy = item.y + cat.h / 2;
      me.dir = dirFrom(cx - me.x, cy - me.y);
      // sevme, oynama, otomattan içecek alma…: eşya kendi simgesini ve sesini seçer
      const v = Art.view(item);
      usedAt.set(item.id, performance.now());
      const topItem = CATALOG[item.type].layer === 'top';
      const py = topItem ? (Art.itemRect(item).y - OY) / T : item.y + 0.2;
      for (let i = 0; i < 3; i++) particles.push({ x: cx + (i - 1) * 0.25, y: py, t: -i * 0.25, g: v.useGlyph, c: v.useColor });
      App.emit('sfx', v.petSfx || 'pet');
      if (pend.use === 'feed') App.toast(item.type === 'fishBowl' ? App.t('You fed the fish.') : App.t('You fed the fish in the aquarium.'), 2200);
      if (pend.use === 'music' && App.Audio) {
        App.Audio.toggleMusic();
        App.toast(App.Audio.musicOn() ? App.t('Lo-fi music is on. Click the record player again to stop it.') : App.t('Music stopped.'), 2600);
      }
      App.emit('item:used', { type: item.type, use: pend.use });
      return;
    }
    if (seatTaken(pend.id, pend.i, me.id)) {
      App.toast(App.t('That seat is taken.'));
      return;
    }
    const info = seatInfo(pend);
    if (!info) return;
    me.standAt = [me.x, me.y];
    me.tween = {
      fx: me.x,
      fy: me.y,
      tx: info.x,
      ty: info.y,
      t: 0,
      dur: 0.22,
      done: () => {
        me.seat = pend;
        me.pose = info.s.pose;
        me.dir = info.s.dir;
        App.emit('sfx', info.s.pose === 'lie' ? 'lie' : 'sit');
        App.emit('player:seated', { type: info.item.type, pose: info.s.pose });
      },
    };
  }

  function standUp(then) {
    if (!me.seat) {
      if (then) then();
      return;
    }
    me.seat = null;
    me.pose = 'stand';
    me.dir = 'down';
    let target = me.standAt;
    if (!target || isBlocked(target[0], target[1])) {
      const t = nearestFreeTile(me.x, me.y);
      target = t ? tileCenter(t[0], t[1]) : [me.x, me.y];
    }
    me.tween = { fx: me.x, fy: me.y, tx: target[0], ty: target[1], t: 0, dur: 0.18, done: then };
    App.emit('player:stood');
    App.emit('sfx', 'stand');
  }

  function interactNearest() {
    if (me.seat) {
      standUp();
      return;
    }
    let best = null;
    for (const it of room.items) {
      const def = Art.view(it);
      if (!def.seats) continue;
      def.seats.forEach((s, i) => {
        if (seatTaken(it.id, i, me.id)) return;
        const d = Math.hypot(it.x + s.x - me.x, it.y + s.y - me.y);
        if (d < 2.3 && (!best || d < best.d)) best = { it, d };
      });
    }
    if (best) interact(best.it);
    else App.toast(App.t('Nowhere to sit nearby.'));
  }

  // Odak başlayınca en yakın boş çalışma yerine (masa, kafe masası, tezgah…) git
  function goToDesk() {
    // Zaten bir yerde oturuyorsa (yatak hariç) kalkmaz, orada çalışır
    const cur = seatInfo(me.seat);
    if (cur && cur.s.act !== 'lie') return;
    let best = null;
    let any = false;
    for (const it of room.items) {
      const def = Art.view(it);
      if (!def.seats) continue;
      def.seats.forEach((s, i) => {
        if (s.act !== 'work') return;
        any = true;
        if (seatTaken(it.id, i, me.id)) return;
        const d = Math.hypot(it.x + s.x - me.x, it.y + s.y - me.y);
        if (!best || d < best.d) best = { it, i, d };
      });
    }
    if (best) interact(best.it, best.i);
    else if (any) App.toast(App.t('All work spots are taken.'));
    else App.toast(App.t('No desk here yet. You can add one from Edit.'));
  }

  // ---------- Girdi ----------
  const MOVE_KEYS = {
    ArrowUp: [0, -1],
    KeyW: [0, -1],
    ArrowDown: [0, 1],
    KeyS: [0, 1],
    ArrowLeft: [-1, 0],
    KeyA: [-1, 0],
    ArrowRight: [1, 0],
    KeyD: [1, 0],
  };
  const held = new Set();

  function inputVector() {
    let x = 0;
    let y = 0;
    for (const code of held) {
      x += MOVE_KEYS[code][0];
      y += MOVE_KEYS[code][1];
    }
    if (!x && !y) return null;
    const len = Math.hypot(x, y);
    return { x: x / len, y: y / len };
  }

  window.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Z geri alır, Ctrl/Cmd + Shift + Z ya da Ctrl + Y yineler (düzenleme modunda)
    if (edit.on && (e.ctrlKey || e.metaKey) && !e.altKey && !App.modalOpen() && !App.isFormField(e.target)) {
      const k = e.key.toLowerCase();
      if (k === 'z' || k === 'y') {
        e.preventDefault();
        if (k === 'y' || e.shiftKey) Game.edit.redo();
        else Game.edit.undo();
      }
      return;
    }
    if (App.modalOpen() || App.isFormField(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (edit.on) {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (edit.placing) Game.edit.cancel();
        else if (edit.selected) Game.edit.select(null);
        else Game.edit.setOn(false);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && edit.selected) {
        e.preventDefault();
        Game.edit.removeSelected();
      } else if (e.code === 'KeyR' && !e.repeat && (edit.selected || edit.placing)) {
        e.preventDefault();
        Game.edit.rotate();
      } else if (MOVE_KEYS[e.code] && (edit.selected || edit.placing)) {
        e.preventDefault();
        Game.edit.nudge(MOVE_KEYS[e.code][0], MOVE_KEYS[e.code][1]);
      } else if (e.key === 'Enter' && edit.placing && e.target === document.body) {
        e.preventDefault();
        commitPlacing();
      }
      return;
    }
    if (MOVE_KEYS[e.code]) {
      held.add(e.code);
      e.preventDefault();
    } else if (e.code === 'KeyE' && !e.repeat) {
      e.preventDefault();
      interactNearest();
    } else if (e.key === 'Escape' && me.seat) {
      standUp();
    }
  });

  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => held.clear());

  function toLogical(e) {
    const rect = canvasEl.getBoundingClientRect();
    return {
      lx: ((e.clientX - rect.left) / rect.width) * LW,
      ly: ((e.clientY - rect.top) / rect.height) * LH,
      cx: e.clientX,
      cy: e.clientY,
    };
  }

  function depthOf(it) {
    const cat = Sh.footprint(it);
    const def = Art.view(it);
    return it.y + (def.sortY !== undefined ? def.sortY : cat.h);
  }

  function hitTest(pt, opts = {}) {
    const rank = (it) => {
      const layer = CATALOG[it.type].layer;
      if (layer === 'top') return 2000 + it.y;
      if (layer === 'obj') return 1000 + depthOf(it);
      if (layer === 'wall') return 500;
      return depthOf(it);
    };
    const list = room.items.filter((it) => {
      const layer = CATALOG[it.type].layer;
      if (layer === 'top' && !opts.wall) return Boolean(Art.view(it).use);
      return layer === 'obj' || (opts.wall && (layer === 'wall' || layer === 'top')) || (opts.rugs && layer === 'floor');
    });
    list.sort((a, b) => rank(b) - rank(a));
    return list.find((it) => Art.hitsItem(it, pt.lx, pt.ly)) || null;
  }

  let marker = null;

  // ---------- Not kâğıtları: tıklayınca yazısı okunur ----------
  let noteBubble = null; // { id, until }

  function noteAt(pt) {
    const notes = room.items.filter((it) => CATALOG[it.type].text);
    return notes.find((it) => Art.hitsItem(it, pt.lx, pt.ly)) || null;
  }

  function showNote(item) {
    noteBubble = noteBubble && noteBubble.id === item.id ? null : { id: item.id, until: performance.now() + 9000 };
    App.emit('sfx', 'pick');
  }

  function playPointerDown(pt) {
    const note = noteAt(pt);
    if (note) {
      showNote(note);
      return;
    }
    noteBubble = null;
    const friend = otherAt(pt);
    if (friend) {
      goHighFive(friend);
      return;
    }
    const pet = petAt(pt);
    if (pet) {
      goPet(pet);
      return;
    }
    const hit = hitTest(pt);
    // boş yatağa tıklanırsa dolaşan hayvanın yanına gidilir
    const owner = hit && pets.get(hit.id);
    if (owner && owner.state !== 'sleep') {
      goPet(owner);
      return;
    }
    if (hit && (Art.view(hit).seats || Art.view(hit).use)) {
      interact(hit, seatNearPoint(hit, (pt.lx - OX) / T, (pt.ly - OY) / T));
      return;
    }
    const tx = Math.floor((pt.lx - OX) / T);
    const ty = Math.floor((pt.ly - OY) / T);
    if (tx < 0 || ty < 0 || tx >= ROOM_W || ty >= ROOM_H) return;
    let target = [tx, ty];
    if (!walkable(tx, ty)) target = nearestFreeTile(tx + 0.5, ty + 0.5);
    if (!target) return;
    walkTo(target[0], target[1]);
    marker = { x: target[0], y: target[1], t: 0 };
  }

  canvasEl.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const pt = toLogical(e);
    if (edit.on) {
      editPointerDown(pt, e.pointerType);
      if (drag) {
        try {
          canvasEl.setPointerCapture(e.pointerId);
        } catch {
          /* yoksay */
        }
      }
    } else playPointerDown(pt);
  });

  canvasEl.addEventListener('pointerup', () => endDrag(true));
  canvasEl.addEventListener('pointercancel', () => endDrag(false));

  canvasEl.addEventListener('pointermove', (e) => {
    const pt = toLogical(e);
    if (edit.on) {
      if (drag && !drag.started && Math.hypot(pt.cx - drag.sx, pt.cy - drag.sy) > 6) startDrag(pt);
      if (drag && drag.started) {
        positionGhost(pt);
        canvasEl.style.cursor = 'grabbing';
        return;
      }
      if (edit.placing && e.pointerType === 'mouse') positionGhost(pt);
      canvasEl.style.cursor = edit.placing ? 'copy' : hitTest(pt, { wall: true, rugs: true }) ? 'pointer' : 'default';
      return;
    }
    const hit = hitTest(pt);
    canvasEl.style.cursor = noteAt(pt) || otherAt(pt) || petAt(pt) || (hit && (Art.view(hit).seats || Art.view(hit).use)) ? 'pointer' : 'default';
  });

  // ---------- Düzenleme modu ----------
  const edit = { on: false, placing: null, selected: null };

  const ghostItem = (pl) => ({ id: pl.id || '_ghost', type: pl.type, x: pl.x, y: pl.y, c: pl.c, r: pl.r || 0 });

  // ---------- Masa / raf üstü küçük eşyalar ----------
  const isTop = (it) => CATALOG[it.type].layer === 'top';

  // Küçük eşyanın alt kenarı: üstünde durduğu eşyanın yüzeyi (bir kare gerideyse biraz yukarıda)
  function topBottom(item) {
    const host = Sh.hostAt(room.items, item.x, item.y, item.id);
    if (!host) return OY + (item.y + 1) * T - 3;
    const v = Art.view(host);
    const r = Art.itemRect(host);
    const top = v.top || { y: 4 };
    const fp = Sh.footprint(host);
    const cx = item.x - host.x;
    let last = item.y - host.y;
    while (last + 1 < fp.h && (!v.solid || v.solid(cx, last + 1))) last++;
    return r.y + top.y - (last - (item.y - host.y)) * (top.step || 12);
  }
  Art.topBottom = topBottom;

  // Paylaşılan kurallara ek olarak: küçük eşya yalnızca eşyanın dolu (yüzeyi olan) karesine konur
  function placeOk(items, item, ignoreId) {
    if (!Sh.canPlace(items, item, ignoreId)) return false;
    if (!isTop(item)) return true;
    const host = Sh.hostAt(items, item.x, item.y, ignoreId);
    const v = Art.view(host);
    return !v.solid || v.solid(item.x - host.x, item.y - host.y);
  }

  function validateGhost() {
    const pl = edit.placing;
    pl.valid = placeOk(room.items, ghostItem(pl), pl.id || undefined);
  }

  function positionGhost(pt) {
    const pl = edit.placing;
    const cat = Sh.footprint(ghostItem(pl));
    const wall = cat.layer === 'wall';
    let x;
    let y;
    if (pl.grab) {
      x = Math.floor((pt.lx - OX) / T) + pl.grab.dx;
      y = Math.floor((pt.ly - OY) / T) + pl.grab.dy;
    } else {
      x = Math.round((pt.lx - OX) / T - cat.w / 2);
      y = Math.round((pt.ly - OY) / T - cat.h / 2);
    }
    pl.x = Math.max(0, Math.min(ROOM_W - cat.w, x));
    pl.y = wall ? 0 : Math.max(0, Math.min(ROOM_H - cat.h, y));
    validateGhost();
  }

  // Sürükle-bırak: eşyaya basılı tutup sürükleyince taşınır
  let drag = null;

  function startDrag(pt) {
    const it = itemById.get(drag.id);
    if (!it) return;
    const tx = Math.floor((pt.lx - OX) / T);
    const ty = Math.floor((pt.ly - OY) / T);
    edit.placing = {
      type: it.type,
      c: it.c,
      r: it.r || 0,
      id: it.id,
      x: it.x,
      y: it.y,
      valid: true,
      armed: true,
      grab: { dx: it.x - tx, dy: CATALOG[it.type].layer === 'wall' ? 0 : it.y - ty },
    };
    edit.selected = null;
    drag.started = true;
    App.emit('sfx', 'pick');
    App.emit('edit:changed');
  }

  function endDrag(commit) {
    const d = drag;
    drag = null;
    if (!d || !d.started || !edit.placing) return;
    if (commit && edit.placing.valid) {
      commitPlacing();
    } else {
      if (commit) App.toast(misfitMessage(edit.placing.type));
      Game.edit.cancel();
    }
  }

  function editPointerDown(pt, pointerType) {
    if (edit.placing) {
      const pl = edit.placing;
      const before = `${pl.x},${pl.y}`;
      positionGhost(pt);
      if (pointerType !== 'mouse' && (!pl.armed || before !== `${pl.x},${pl.y}`)) {
        pl.armed = true;
        return;
      }
      commitPlacing();
      return;
    }
    const hit = hitTest(pt, { wall: true, rugs: true });
    if (hit && hit.id !== edit.selected) App.emit('sfx', 'pick');
    Game.edit.select(hit ? hit.id : null);
    if (hit) drag = { id: hit.id, sx: pt.cx, sy: pt.cy, started: false };
  }

  const misfitMessage = (type) =>
    CATALOG[type].layer === 'top' ? App.t('Small items go on free spots of tables, shelves and counters.') : App.t("It doesn't fit there. Try another spot.");

  // Taşınan masanın / rafın üstündeki küçük eşyalar onunla birlikte gider
  function carryTops(items, from, to) {
    if (!CATALOG[from.type].host || (from.r || 0) !== (to.r || 0)) return items;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (!dx && !dy) return items;
    const fp = Sh.footprint(from);
    const on = (it) => isTop(it) && it.x >= fp.x && it.x < fp.x + fp.w && it.y >= fp.y && it.y < fp.y + fp.h;
    return items.map((it) => (on(it) ? { ...it, x: it.x + dx, y: it.y + dy } : it));
  }

  function commitPlacing() {
    const pl = edit.placing;
    if (!pl.valid) {
      App.toast(misfitMessage(pl.type));
      return;
    }
    if (!pl.id && room.items.length >= Sh.MAX_ITEMS) {
      App.toast(App.t('You can place up to {n} items.', { n: Sh.MAX_ITEMS }));
      return;
    }
    const id = pl.id || App.newId();
    const old = pl.id && itemById.get(pl.id);
    const next = { id, type: pl.type, x: pl.x, y: pl.y, c: pl.c, r: pl.r || 0 };
    if (old && old.t) next.t = old.t;
    const items = (old ? carryTops(room.items, old, next) : room.items).filter((it) => it.id !== pl.id);
    items.push(next);
    edit.placing = null;
    App.emit('sfx', 'place');
    commitRoom({ style: room.style, items });
    edit.selected = id;
    App.emit('edit:changed');
  }

  // ---------- Hazır paketler: mevsim eşyalarını boş yerlere tek seferde yerleştirir ----------
  function solidGrid(items) {
    const g = Array.from({ length: ROOM_H }, () => new Array(ROOM_W).fill(false));
    for (const it of items) {
      const fp = Sh.footprint(it);
      if (fp.layer !== 'obj') continue;
      const def = Art.view(it);
      for (let cy = 0; cy < fp.h; cy++) for (let cx = 0; cx < fp.w; cx++) if (!def.solid || def.solid(cx, cy)) g[it.y + cy][it.x + cx] = true;
    }
    return g;
  }

  // Kapıdan yürüyerek ulaşılabilen karelerin sayısı
  function reachableCount(g) {
    if (g[0][DOOR_X]) return 0;
    const seen = new Uint8Array(ROOM_W * ROOM_H);
    const queue = [[DOOR_X, 0]];
    seen[DOOR_X] = 1;
    let n = 0;
    while (queue.length) {
      const [x, y] = queue.pop();
      n++;
      for (const [dx, dy] of N4) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= ROOM_W || ny >= ROOM_H || g[ny][nx] || seen[ny * ROOM_W + nx]) continue;
        seen[ny * ROOM_W + nx] = 1;
        queue.push([nx, ny]);
      }
    }
    return n;
  }

  // Oturma yerlerine ve kullanılabilen eşyalara yaklaşılan kareler boş kalsın
  function reservedTiles(items) {
    const out = new Set();
    for (const it of items) {
      const def = Art.view(it);
      if (CATALOG[it.type].layer !== 'obj' || !(def.seats || def.use)) continue;
      const fp = Sh.footprint(it);
      for (let cy = 0; cy < fp.h; cy++) {
        for (let cx = 0; cx < fp.w; cx++) for (const [dx, dy] of N4) out.add(`${it.x + cx + dx},${it.y + cy + dy}`);
      }
    }
    return out;
  }

  function packSpot(items, type, c) {
    const def = CATALOG[type];
    const probe = { id: '_pack', type, c, r: 0, x: 0, y: 0 };
    const fp = Sh.footprint(probe);
    const grid = solidGrid(items);
    const cands = [];
    if (def.layer === 'wall') {
      for (let x = 0; x + fp.w <= ROOM_W; x++) cands.push({ x, y: 0, score: Math.abs(x + fp.w / 2 - ROOM_W / 2) + Math.random() * 3 });
    } else {
      for (let y = 0; y + fp.h <= ROOM_H; y++) {
        for (let x = 0; x + fp.w <= ROOM_W; x++) {
          const side = Math.min(x, ROOM_W - fp.w - x);
          const edge = Math.min(side, y);
          const front = y + fp.h === ROOM_H ? 1.5 : 0;
          const doorway = Math.abs(x + fp.w / 2 - (DOOR_X + 0.5)) < 2 && y < 3 ? 6 : 0;
          // kapıdan başlayan yürüme yolu (1. ve 2. sıra) açık kalsın
          const walkway = (y === 1 || y === 2) && side > 0 ? 4 : 0;
          // önündeki eşyanın arkasında kalıp görünmeyecek yerler
          let hidden = 0;
          let crowd = 0;
          for (let cx = x - 1; cx <= x + fp.w; cx++) {
            for (let cy = y - 1; cy <= y + fp.h; cy++) {
              if (cx < 0 || cy < 0 || cx >= ROOM_W || cy >= ROOM_H || (cx >= x && cx < x + fp.w && cy >= y && cy < y + fp.h)) continue;
              if (!grid[cy][cx]) continue;
              crowd++;
              if (cy === y + fp.h && cx >= x && cx < x + fp.w) hidden += 4 / fp.w;
            }
          }
          let score;
          if (def.layer === 'top') score = y + Math.random();
          else if (def.layer === 'floor') score = Math.abs(y - 4.5) * 0.6 + crowd * 1.2 + hidden + doorway + Math.random() * 1.5;
          else score = edge * 1.4 + front + doorway + walkway + hidden + Math.random() * 1.5;
          cands.push({ x, y, score });
        }
      }
    }
    cands.sort((a, b) => a.score - b.score);
    const before = reachableCount(grid);
    const reserved = def.layer === 'obj' ? reservedTiles(items) : null;
    for (const cand of cands) {
      const item = { ...probe, x: cand.x, y: cand.y };
      if (!placeOk(items, item)) continue;
      const cells = [];
      for (let cy = 0; cy < fp.h; cy++) for (let cx = 0; cx < fp.w; cx++) cells.push([cand.x + cx, cand.y + cy]);
      // yaprak yığını mobilyanın altına girmesin
      if (def.layer === 'floor' && cells.some(([x, y]) => grid[y][x])) continue;
      if (def.layer === 'obj') {
        if (cells.some(([x, y]) => reserved.has(`${x},${y}`))) continue;
        const next = solidGrid([...items, item]);
        const lost = cells.filter(([x, y]) => !grid[y][x]).length;
        if (reachableCount(next) !== before - lost) continue;
      }
      return item;
    }
    return null;
  }

  function addPack(id) {
    const pack = Art.PACKS && Art.PACKS[id];
    if (!pack || session.role === 'guest') return;
    const outdoor = room.venue === 'terrace' || room.style.pattern === 5;
    // açık havada duvar yerine gökyüzü olduğu için duvar eşyaları atlanır
    let items = room.items.slice();
    let added = 0;
    let wanted = 0;
    for (const [type, c, where] of pack.items) {
      if ((where === 'outdoor' && !outdoor) || (outdoor && CATALOG[type].layer === 'wall')) continue;
      wanted++;
      if (items.length >= Sh.MAX_ITEMS) break;
      const spot = packSpot(items, type, c);
      if (!spot) continue;
      items.push({ ...spot, id: App.newId() });
      added++;
    }
    edit.placing = null;
    edit.selected = null;
    if (!added) {
      App.toast(App.t('No free spots for this pack. Make some room first.'), 3200);
      return;
    }
    commitRoom({ style: room.style, items });
    App.emit('sfx', 'place');
    App.emit('edit:changed');
    const packName = App.t(pack.name).toLocaleLowerCase(App.i18n.lang || 'en');
    App.toast(
      added === wanted
        ? App.t('Added the {pack} ({n} items). Undo removes it.', { pack: packName, n: added })
        : App.t('Added {added} of {wanted} items; there was no room for the rest.', { added, wanted }),
      3400,
    );
  }

  Game.edit = {
    state: () => edit,
    addPack,
    setOn(on) {
      if (on && session.role === 'guest') return;
      edit.on = Boolean(on);
      edit.placing = null;
      edit.selected = null;
      held.clear();
      canvasEl.style.cursor = 'default';
      App.emit('edit:changed');
    },
    startPlacing(type) {
      const cat = CATALOG[type];
      edit.selected = null;
      edit.placing = {
        type,
        c: 0,
        id: null,
        r: 0,
        x: Math.floor((ROOM_W - cat.w) / 2),
        y: cat.layer === 'wall' ? 0 : Math.floor((ROOM_H - cat.h) / 2),
        armed: false,
      };
      validateGhost();
      App.emit('edit:changed');
    },
    startMove() {
      const it = itemById.get(edit.selected);
      if (!it) return;
      edit.placing = { type: it.type, c: it.c, r: it.r || 0, id: it.id, x: it.x, y: it.y, valid: true, armed: false };
      edit.selected = null;
      App.emit('edit:changed');
    },
    cancel() {
      const movingId = edit.placing && edit.placing.id;
      edit.placing = null;
      edit.selected = movingId || null;
      App.emit('edit:changed');
    },
    select(id) {
      edit.selected = id && itemById.has(id) ? id : null;
      App.emit('edit:changed');
    },
    selectedItem: () => itemById.get(edit.selected) || null,
    setColor(c) {
      if (edit.placing) {
        edit.placing.c = c;
        App.emit('edit:changed');
        return;
      }
      const it = itemById.get(edit.selected);
      if (!it) return;
      commitRoom({ style: room.style, items: room.items.map((x) => (x.id === it.id ? { ...x, c } : x)) });
      App.emit('edit:changed');
    },
    duplicate() {
      const it = itemById.get(edit.selected);
      if (!it) return;
      Game.edit.startPlacing(it.type);
      edit.placing.c = it.c;
      edit.placing.r = it.r || 0;
      validateGhost();
      App.emit('edit:changed');
    },
    // Sıradaki yöne çevir; seçili eşya yeni yönüne sığmıyorsa bir sonrakini dener
    rotate() {
      if (edit.placing) {
        const pl = edit.placing;
        pl.r = Sh.nextRotation(pl.type, pl.r || 0);
        App.emit('sfx', 'rotate');
        const fp = Sh.footprint(ghostItem(pl));
        pl.x = Math.max(0, Math.min(ROOM_W - fp.w, pl.x));
        if (fp.layer !== 'wall') pl.y = Math.max(0, Math.min(ROOM_H - fp.h, pl.y));
        validateGhost();
        App.emit('edit:changed');
        return;
      }
      const it = itemById.get(edit.selected);
      if (!it || Sh.rotsOf(it.type).length < 2) return;
      let r = it.r || 0;
      for (let k = 1; k < Sh.rotsOf(it.type).length; k++) {
        r = Sh.nextRotation(it.type, r);
        const cand = { ...it, r };
        if (placeOk(room.items, cand, it.id)) {
          commitRoom({ style: room.style, items: room.items.map((x) => (x.id === it.id ? cand : x)) });
          App.emit('sfx', 'rotate');
          App.emit('edit:changed');
          return;
        }
      }
      App.toast(App.t('No room to rotate it here. Move it somewhere roomier first.'));
    },
    // Seçili eşyayı bir kare kaydır (ok tuşları)
    nudge(dx, dy) {
      if (edit.placing) {
        const pl = edit.placing;
        const fp = Sh.footprint(ghostItem(pl));
        pl.x = Math.max(0, Math.min(ROOM_W - fp.w, pl.x + dx));
        if (fp.layer !== 'wall') pl.y = Math.max(0, Math.min(ROOM_H - fp.h, pl.y + dy));
        validateGhost();
        return;
      }
      const it = itemById.get(edit.selected);
      if (!it) return;
      const cand = { ...it, x: it.x + dx, y: CATALOG[it.type].layer === 'wall' ? 0 : it.y + dy };
      if (placeOk(room.items, cand, it.id)) {
        commitRoom({ style: room.style, items: carryTops(room.items, it, cand).map((x) => (x.id === it.id ? cand : x)) });
        App.emit('sfx', 'nudge');
        App.emit('edit:changed');
      }
    },
    removeSelected() {
      const id = edit.selected;
      if (!id) return;
      edit.selected = null;
      App.emit('sfx', 'remove');
      commitRoom({ style: room.style, items: room.items.filter((x) => x.id !== id) });
      App.emit('edit:changed');
    },
    setStyle(key, value) {
      commitRoom({ style: { ...room.style, [key]: value }, items: room.items });
      App.emit('edit:changed');
    },
    setText(text) {
      const it = itemById.get(edit.selected);
      if (!it || !CATALOG[it.type].text) return;
      const t = text.replace(/\s+/g, ' ').trim().slice(0, Sh.NOTE_MAX);
      if ((it.t || '') === t) return;
      commitRoom({ style: room.style, items: room.items.map((x) => (x.id === it.id ? { ...x, t } : x)) });
    },
    undo: () => stepHistory(undoStack, redoStack),
    redo: () => stepHistory(redoStack, undoStack),
    canUndo: () => undoStack.length > 0 && session.role !== 'guest',
    canRedo: () => redoStack.length > 0 && session.role !== 'guest',
    resetRoom() {
      edit.placing = null;
      edit.selected = null;
      commitRoom(Sh.defaultRoom(room.venue));
      App.emit('edit:changed');
    },
  };

  // ---------- Güncelleme ----------
  function updateBlink(ch, dt) {
    ch.blinkT -= dt;
    if (ch.blinkT <= 0) {
      ch.blink = true;
      if (ch.blinkT <= -0.13) {
        ch.blink = false;
        ch.blinkT = 2.5 + Math.random() * 3;
      }
    }
  }

  function dirFrom(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
    return dy < 0 ? 'up' : 'down';
  }

  function updateMe(dt) {
    if (me.tween) {
      const tw = me.tween;
      tw.t = Math.min(1, tw.t + dt / tw.dur);
      const e = tw.t * tw.t * (3 - 2 * tw.t);
      me.x = tw.fx + (tw.tx - tw.fx) * e;
      me.y = tw.fy + (tw.ty - tw.fy) * e;
      me.moving = false;
      if (tw.t >= 1) {
        me.tween = null;
        if (tw.done) tw.done();
      }
      return;
    }
    const v = !edit.on && inputVector();
    if (v) {
      if (me.seat) {
        standUp();
        return;
      }
      me.path = [];
      me.pending = null;
      const nx = me.x + v.x * SPEED * dt;
      const ny = me.y + v.y * SPEED * dt;
      const before = [me.x, me.y];
      if (!isBlocked(nx, me.y)) me.x = nx;
      if (!isBlocked(me.x, ny)) me.y = ny;
      me.dir = dirFrom(v.x, v.y);
      me.moving = me.x !== before[0] || me.y !== before[1];
    } else if (me.path.length) {
      const [tx, ty] = tileCenter(me.path[0][0], me.path[0][1]);
      const dx = tx - me.x;
      const dy = ty - me.y;
      const dist = Math.hypot(dx, dy);
      const step = SPEED * dt;
      if (dist <= step) {
        me.x = tx;
        me.y = ty;
        me.path.shift();
        if (!me.path.length) {
          me.moving = false;
          arrive();
        }
      } else {
        me.x += (dx / dist) * step;
        me.y += (dy / dist) * step;
        me.dir = dirFrom(dx, dy);
        me.moving = true;
      }
    } else {
      me.moving = false;
    }
  }

  function updateOther(o, dt) {
    const info = seatInfo(o.seat);
    if (info) {
      o.x = info.x;
      o.y = info.y;
      o.pose = info.s.pose;
      o.dir = info.s.dir;
    } else {
      if (o.pose !== 'stand') o.pose = 'stand';
      const k = 1 - Math.exp(-dt * 12);
      o.x += (o.tx - o.x) * k;
      o.y += (o.ty - o.y) * k;
      if (Math.hypot(o.tx - o.x, o.ty - o.y) < 0.01) {
        o.x = o.tx;
        o.y = o.ty;
      }
    }
  }

  function update(dt, now) {
    updateMe(dt);
    for (const o of others.values()) updateOther(o, dt);
    const focusing = App.Timer && App.Timer.isFocusRunning();
    for (const ch of allChars()) {
      updateBlink(ch, dt);
      // Odak süresi işlerken oturduğu yerde (kanepe, armut koltuk…) kucağında laptopla çalışır
      const seatAct = ch.seat && seatInfo(ch.seat) ? seatInfo(ch.seat).s.act : null;
      ch.drawPose = ch.pose === 'sit' && seatAct === 'sit' && focusing ? 'lap' : ch.pose;
      if (ch.drawPose === 'lap') {
        ch.frame = Math.floor(now / 170) % 2;
      } else if (ch.pose === 'work') {
        const anim = ch.seat && seatInfo(ch.seat) && seatInfo(ch.seat).s.anim;
        ch.frame = focusing || anim ? Math.floor(now / (anim ? 220 : 160)) % 2 : 0;
      } else if (ch.pose === 'study') {
        const anim = ch.seat && seatInfo(ch.seat) && seatInfo(ch.seat).s.anim;
        ch.frame = focusing || anim ? Math.floor(now / (anim ? 220 : 260)) % 2 : 0;
      } else if (ch.moving) {
        ch.walkT += dt * 8;
        const prev = ch.frame;
        ch.frame = Math.floor(ch.walkT) % 4;
        if (ch === me && ch.frame !== prev && (ch.frame === 1 || ch.frame === 3)) App.emit('sfx', onLeaves(ch) ? kickLeaves(ch) : 'step');
      } else {
        ch.walkT = 0;
        ch.frame = 0;
      }
      updateIdle(ch, dt, now, seatAct, focusing);
      if (ch.hi5) updateHighFive(ch, dt);
      if (ch.bubble && now > ch.bubble.until) ch.bubble = null;
    }
    checkHighFives(dt, focusing);
    updateTalks(dt, focusing);
    const mySeat = seatInfo(me.seat);
    if (mySeat && mySeat.s.act === 'play' && !me.tween) {
      pianoT -= dt;
      if (pianoT <= 0) {
        pianoT = 0.28 + Math.random() * 0.45;
        App.emit('sfx', mySeat.s.sfx || 'piano');
        notes.push({ x: mySeat.item.x + 0.4 + Math.random() * 1.2, y: mySeat.item.y + 0.1, t: 0 });
      }
    }
    for (const o of others.values()) {
      const info = seatInfo(o.seat);
      if (info && info.s.act === 'play' && Math.random() < dt * 2) notes.push({ x: info.item.x + 0.4 + Math.random() * 1.2, y: info.item.y + 0.1, t: 0 });
    }
    for (let i = notes.length - 1; i >= 0; i--) {
      notes[i].t += dt;
      if (notes[i].t > 1.6) notes.splice(i, 1);
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].t += dt;
      if (particles[i].t > 1.4) particles.splice(i, 1);
    }
    updateConfetti(dt);
    updatePets(dt);
    updateCeiling(dt);
    if (marker) {
      marker.t += dt;
      if (marker.t > 0.6 || !me.path.length) marker = null;
    }
  }

  // ---------- Çizim ----------
  let scale = 4;

  const column = canvasEl.closest('.stage-col') || canvasEl.parentElement;
  const EDITOR_RESERVE = 300;
  const layoutEl = document.querySelector('.layout');
  const threeCols = window.matchMedia('(min-width: 1500px)');
  const SIDE_MIN = 300; // çok geniş ekranda yan sütunların en az genişliği

  function resize() {
    if (!column.clientWidth) return;
    const dpr = window.devicePixelRatio || 1;
    // Geniş ekranda düzenlerken katalog paneli de ekrana sığsın diye sahneyi kısalt;
    // dar ekranda panel zaten aşağıda, odanın yarım ekrandan küçülmemesi yeterli
    const editor = document.getElementById('editor');
    const narrow = window.innerWidth < 960;
    let maxH;
    // Sayfa en üstteyken oda ve altındaki tepki çubuğu ekrana tam sığsın:
    // sahnenin sayfadaki yeri ölçülür, altında tepki çubuğu ve kenar boşluğu için yer bırakılır
    const stageEl = canvasEl.parentElement;
    const top = stageEl.getBoundingClientRect().top + window.scrollY;
    const reactBar = document.getElementById('react-bar');
    const below = (reactBar ? reactBar.offsetHeight + 10 : 0) + 16;
    const playH = Math.max(240, window.innerHeight - top - below);
    // Çok geniş ekranda oda sabit genişlikte ortada durur; yan sütunlar genişleyince oda küçülmez, kaymaz
    let avail = column.clientWidth;
    if (layoutEl && threeCols.matches) {
      const cs = getComputedStyle(layoutEl);
      const inner = layoutEl.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const stageW = Math.floor(Math.min(inner - 2 * (SIDE_MIN + 16), (playH * LW) / LH));
      layoutEl.style.setProperty('--stage-w', `${stageW}px`);
      avail = stageW;
    } else if (layoutEl) {
      layoutEl.style.removeProperty('--stage-w');
    }
    if (!edit.on) {
      maxH = playH;
    }
    else if (narrow) maxH = window.innerHeight * 0.5;
    // Panel için sabit pay: seçim çubuğu açılıp kapanınca sahne boyutu (ve imlecin altındaki eşya) değişmesin
    else maxH = window.innerHeight - 150 - (editor ? EDITOR_RESERVE : 0);
    maxH = Math.max(240, maxH);
    // Alanı tam doldur; tuval, ekrandaki boyuttan en az o kadar büyük tam sayı ölçekte çizilir
    const cssW = Math.floor(Math.min(avail, (maxH * LW) / LH));
    const s = Math.min(12, Math.max(2, Math.ceil((cssW * dpr) / LW)));
    if (s !== scale || canvasEl.width !== LW * s) {
      scale = s;
      canvasEl.width = LW * s;
      canvasEl.height = LH * s;
    }
    canvasEl.style.width = `${cssW}px`;
    canvasEl.style.height = `${(cssW * LH) / LW}px`;
  }

  function drawChar(ch) {
    const img = Art.charSprite(ch.look, ch.drawDir || ch.dir, ch.drawPose || ch.pose, ch.frame, ch.blink);
    // kutlamada ayaktakiler iki kez zıplar
    const hop = ch.hopT > 0 && !ch.seat ? Math.round(Math.abs(Math.sin((1 - ch.hopT / HOP_TIME) * Math.PI * 2)) * 5) : 0;
    // sprite'ın alt-ortası ayak noktasına gelir (yatay uzanırken boyutlar farklıdır)
    ctx.drawImage(img, Math.round(OX + ch.x * T - (img.width - 2) / 2) - 1, Math.round(OY + ch.y * T - (img.height - 2)) - 1 - hop);
  }

  // ---------- Kısa animasyonlar: boşta dururken gerinir, kahve içer, esner, telefona bakar;
  // kanepede otururken kitap okur ya da bir şey yudumlar. Her ekranda yerel olarak oynatılır. ----------
  const STAND_ACTS = ['stretch', 'drink', 'yawn', 'phone'];
  const SIT_ACTS = ['read', 'sip', 'read'];
  const ACT_TIME = { stretch: 2.6, drink: 3.4, yawn: 2.2, phone: 4.5, read: 7, sip: 3.4, wave: 2 };

  function startAct(ch, act) {
    ch.act = act;
    ch.actT = ACT_TIME[act] || 3;
  }

  function updateIdle(ch, dt, now, seatAct, focusing) {
    const info = ch.seat && seatInfo(ch.seat);
    const standing = !ch.seat && !ch.moving && !ch.tween && ch.pose === 'stand' && !(ch === me && me.path.length);
    const lounging = Boolean(info) && seatAct === 'sit' && !focusing && info.s.pose === 'sit' && info.s.dir === 'down';
    if (ch.act) {
      ch.actT -= dt;
      const ok = ch.act === 'wave' ? !ch.moving : (STAND_ACTS.includes(ch.act) ? standing : lounging);
      if (ch.actT <= 0 || !ok) {
        ch.act = null;
        ch.idleT = 10 + Math.random() * 14;
      }
    } else if (standing || lounging) {
      if (ch.idleT === undefined) ch.idleT = 6 + Math.random() * 8;
      ch.idleT -= dt;
      if (ch.idleT <= 0) {
        const list = standing ? STAND_ACTS : SIT_ACTS;
        startAct(ch, list[Math.floor(Math.random() * list.length)]);
      }
    } else {
      ch.idleT = Math.max(ch.idleT || 0, 6);
    }
    if (ch.act) {
      ch.drawPose = `${info ? 'sit' : 'stand'}:${ch.act}`;
      ch.drawDir = 'down';
      ch.frame = Math.floor(now / (ch.act === 'wave' ? 180 : ch.act === 'read' ? 900 : 420)) % 2;
    } else {
      ch.drawDir = null;
    }
  }

  // ---------- Karakterler arası etkileşim ----------
  // Yan yana duran iki kişi çak yapar (sunucu üzerinden herkese gider);
  // yan yana oturanların üstünde arada bir küçük konuşma balonları çıkar (her ekranda yerel).
  const HI5_TIME = 1.2;
  const HI5_COOLDOWN = 45000;
  const hi5Sent = new Map(); // diğer oyuncu id → son çak isteği (ms)
  const besideT = new Map(); // diğer oyuncu id → yan yana durulan süre (sn)
  const pops = []; // dünyada beliren emoji balonları: { x, y, glyph, at }

  const charById = (id) => (id === 'me' ? me : others.get(id));
  const standingStill = (ch) => !ch.seat && !ch.moving && !ch.tween && ch.pose === 'stand' && !(ch === me && (me.path.length || me.pending));

  function sideBySide(a, b) {
    const dx = Math.abs(a.x - b.x);
    return Math.abs(a.y - b.y) < 0.5 && dx > 0.4 && dx < 1.45;
  }

  function startHighFive(a, b) {
    if (!a || !b || a === b || a.seat || b.seat) return;
    const left = a.x <= b.x ? a : b;
    const right = left === a ? b : a;
    left.hi5 = { t: 0, act: 'hi5r', partner: right, clapped: false };
    right.hi5 = { t: 0, act: 'hi5l', partner: left, clapped: true };
    left.act = null;
    right.act = null;
  }

  function updateHighFive(ch, dt) {
    const h = ch.hi5;
    h.t += dt;
    if (h.t >= HI5_TIME || ch.seat || ch.moving) {
      ch.hi5 = null;
      return;
    }
    ch.drawPose = `stand:${h.act}`;
    ch.drawDir = 'down';
    ch.frame = h.t > 0.38 && h.t < 0.8 ? 1 : 0;
    if (!h.clapped && h.t > 0.38) {
      h.clapped = true;
      const mx = (ch.x + h.partner.x) / 2;
      const my = Math.min(ch.y, h.partner.y);
      for (let i = 0; i < 4; i++) particles.push({ x: mx + (i - 1.5) * 0.18, y: my - 1.15, t: -i * 0.06, g: '\u2726', c: i % 2 ? '#f2c14e' : '#ffffff' });
      pops.push({ x: mx, y: my, glyph: '\u{1F64C}', at: performance.now() });
      App.emit('sfx', 'clap');
    }
  }

  function requestHighFive(o) {
    const now = performance.now();
    if (!App.Net || !App.Net.inRoom() || now - (hi5Sent.get(o.id) || -1e9) < 1500) return;
    hi5Sent.set(o.id, now);
    App.Net.send({ t: 'hi5', id: o.id });
  }

  // Odak süresi dışında, yan yana bir an durunca kendiliğinden çak (aynı kişiyle 45 saniyede bir)
  function checkHighFives(dt, focusing) {
    if (session.role === 'solo') return;
    const now = performance.now();
    for (const o of others.values()) {
      const ok = !focusing && !edit.on && !me.hi5 && !o.hi5 && standingStill(me) && standingStill(o) && sideBySide(me, o);
      const t = ok ? (besideT.get(o.id) || 0) + dt : 0;
      besideT.set(o.id, t);
      if (t > 0.7 && now - (hi5Sent.get(o.id) || -1e9) > HI5_COOLDOWN) requestHighFive(o);
    }
    for (const id of besideT.keys()) if (!others.has(id)) besideT.delete(id);
  }

  function otherAt(pt) {
    for (const o of others.values()) {
      if (o.seat) continue;
      const x = OX + o.x * T - CW / 2;
      const y = OY + o.y * T - CH;
      if (pt.lx >= x - 1 && pt.lx <= x + CW + 1 && pt.ly >= y && pt.ly <= y + CH + 1) return o;
    }
    return null;
  }

  // Ayaktaki bir arkadaşa tıklayınca yanına yürüyüp çak yapar
  function goHighFive(o) {
    const go = () => {
      const [sx, sy] = myTile();
      const graph = distances(sx, sy);
      const ox = Math.floor(o.x);
      const oy = Math.floor(o.y);
      let choice = null;
      for (const dx of [-1, 1]) {
        const x = ox + dx;
        if (!walkable(x, oy)) continue;
        const d = graph.dist[oy * ROOM_W + x];
        if (d !== Infinity && (!choice || d < choice.d)) choice = { x, y: oy, d };
      }
      if (!choice) {
        App.toast(App.t('No room to stand next to {name}.', { name: o.name }));
        return;
      }
      me.path = routeTo(graph, choice.x, choice.y) || [];
      me.pending = { hi5: o.id };
      if (!me.path.length) arrive();
    };
    if (me.seat) standUp(go);
    else go();
  }

  // ----- Yan yana oturanların sohbeti -----
  const TALK = ['\u2026', '\u2026', '\u{1F604}', '\u2615', '\u{1F4DA}', '\u{1F3B5}', '\u{1F4A1}', '\u{1F36A}', '\u{1F44D}', '\u2753', '\u{1F431}', '\u{1F602}', '\u{1F4DD}'];
  const talks = new Map(); // çift anahtarı → { a, b, speaker, glyph, t, n }

  function chatting(ch) {
    const info = ch.seat && seatInfo(ch.seat);
    if (!info || ch.tween) return null;
    const act = info.s.act;
    return act === 'lie' || act === 'play' || act === 'run' ? null : info;
  }

  function seatedTogether(a, b) {
    const ia = chatting(a);
    const ib = chatting(b);
    if (!ia || !ib) return false;
    if (ia.item.id === ib.item.id) return true;
    const dx = Math.abs(a.x - b.x);
    return Math.abs(a.y - b.y) < 0.6 && dx > 0.3 && dx < 1.6;
  }

  function updateTalks(dt, focusing) {
    const chars = allChars();
    const seen = new Set();
    if (!focusing && chars.length > 1) {
      for (let i = 0; i < chars.length; i++) {
        for (let j = i + 1; j < chars.length; j++) {
          const a = chars[i];
          const b = chars[j];
          if (!seatedTogether(a, b)) continue;
          const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
          seen.add(key);
          let c = talks.get(key);
          if (!c) {
            c = { a, b, speaker: Math.random() < 0.5 ? a : b, glyph: null, t: 1 + Math.random() * 2, n: 0 };
            talks.set(key, c);
          }
          c.t -= dt;
          if (c.t > 0) continue;
          if (c.glyph) {
            c.glyph = null;
            // birkaç laftan sonra biraz sessizlik
            c.t = c.n % 5 === 4 ? 7 + Math.random() * 6 : 0.5 + Math.random() * 1.2;
          } else {
            if (c.n === 0 || Math.random() < 0.8) c.speaker = c.speaker === a ? b : a;
            c.glyph = TALK[Math.floor(Math.random() * TALK.length)];
            c.at = performance.now();
            c.t = 1.7 + Math.random() * 1.3;
            c.n++;
          }
        }
      }
    }
    for (const key of [...talks.keys()]) if (!seen.has(key)) talks.delete(key);
  }

  function talkGlyph(ch) {
    for (const c of talks.values()) if (c.glyph && c.speaker === ch) return c;
    return null;
  }

  // Konuşma balonu: küçük, kuyruklu; "…" yazıyor gibi kıpırdar
  function drawTalk(c, hx, top, now, u) {
    const age = (now - c.at) / 1000;
    const pop = Math.min(1, age / 0.15);
    const w = 26 * u * (0.7 + 0.3 * pop);
    const h = 19 * u * (0.7 + 0.3 * pop);
    const x = hx + 4 * u;
    const y = top - h - 4 * u;
    ctx.save();
    roundRect(x, y, w, h, 7 * u);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = u;
    ctx.strokeStyle = 'rgba(58, 44, 53, 0.35)';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 3 * u, y + h - 1);
    ctx.lineTo(x + 9 * u, y + h - 1);
    ctx.lineTo(x + 1 * u, y + h + 5 * u);
    ctx.closePath();
    ctx.fill();
    if (c.glyph === '\u2026') {
      for (let i = 0; i < 3; i++) {
        const lift = Math.max(0, Math.sin(now / 160 - i * 0.9)) * 2 * u;
        ctx.fillStyle = '#5a5060';
        ctx.beginPath();
        ctx.arc(x + w / 2 + (i - 1) * 6 * u, y + h / 2 - lift, 1.7 * u, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.font = `${12 * u * (0.7 + 0.3 * pop)}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#1f2328';
      ctx.fillText(c.glyph, x + w / 2, y + h / 2 + u);
      ctx.textBaseline = 'alphabetic';
    }
    ctx.restore();
  }

  function drawPops(now, u, S) {
    for (let i = pops.length - 1; i >= 0; i--) {
      const pp = pops[i];
      const age = (now - pp.at) / 1000;
      if (age > 1.6) {
        pops.splice(i, 1);
        continue;
      }
      const pop = Math.min(1, age / 0.15);
      const px = (OX + pp.x * T) * S;
      // başların (ve odadayken isim etiketlerinin) üstünde
      const py = (OY + pp.y * T - CH) * S - (session.role !== 'solo' ? 50 : 16) * u - age * 10 * u;
      ctx.globalAlpha = age > 1.1 ? 1 - (age - 1.1) / 0.5 : 1;
      ctx.beginPath();
      ctx.arc(px, py, 13 * u * (0.6 + 0.4 * pop), 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = u;
      ctx.strokeStyle = 'rgba(58, 44, 53, 0.3)';
      ctx.stroke();
      ctx.font = `${15 * u * (0.6 + 0.4 * pop)}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#1f2328';
      ctx.fillText(pp.glyph, px, py + u);
      ctx.textBaseline = 'alphabetic';
      ctx.globalAlpha = 1;
    }
  }

  // ---------- Kutlama: odak oturumu bitince konfeti ----------
  const HOP_TIME = 0.9;
  const confetti = [];
  const CONFETTI_COLORS = ['#e05d6f', '#f2c14e', '#6fa268', '#5b9bd8', '#9b7bb5', '#f08a3c', '#ffffff'];

  const GOLD_COLORS = ['#f2c14e', '#ffe08a', '#f08a3c', '#ffffff', '#e05d6f'];

  // big: günlük hedefe ulaşınca daha bol, altın rengi konfeti ve yalnızca kendi karakterinin üstünde yıldızlar
  function celebrate(big) {
    const n = big ? 170 : 90;
    const colors = big ? GOLD_COLORS : CONFETTI_COLORS;
    for (let i = 0; i < n; i++) {
      confetti.push({
        x: OX + Math.random() * ROOM_W * T,
        y: Art.MT + Math.random() * (big ? 60 : 30) - 40,
        vx: (Math.random() - 0.5) * 24,
        vy: 20 + Math.random() * 30,
        c: colors[i % colors.length],
        ph: Math.random() * Math.PI * 2,
        life: (big ? 3.4 : 2.6) + Math.random() * 1.2,
      });
    }
    if (big) {
      me.hopT = HOP_TIME;
      for (let i = 0; i < 5; i++) particles.push({ x: me.x + (i - 2) * 0.3, y: me.y - 1.3, t: -i * 0.18, g: '\u2605', c: '#f2c14e' });
      return;
    }
    for (const ch of allChars()) {
      ch.hopT = HOP_TIME;
      if (ch.seat) for (let i = 0; i < 3; i++) particles.push({ x: ch.x + (i - 1) * 0.3, y: ch.y - 1.2, t: -i * 0.2, g: '\u2726', c: '#f2c14e' });
    }
  }

  App.on('timer:finished', ({ finished }) => {
    if (finished === 'work') celebrate();
  });

  // Günlük hedef: büyük kutlama ve odanın üstünde kısa bir pankart
  let banner = null;
  App.on('goal:reached', (goal) => {
    celebrate(true);
    banner = { text: App.t('Daily goal reached · {count}!', { count: App.tn(goal, '{n} pomodoro', '{n} pomodoros') }), at: performance.now() };
  });

  function drawBanner(now, u) {
    if (!banner) return;
    const age = (now - banner.at) / 1000;
    if (age > 4.5) {
      banner = null;
      return;
    }
    const pop = Math.min(1, age / 0.25);
    const scaleK = 0.7 + 0.3 * (1 - (1 - pop) * (1 - pop));
    ctx.save();
    ctx.globalAlpha = age > 3.8 ? Math.max(0, 1 - (age - 3.8) / 0.7) : 1;
    ctx.font = `700 ${15 * u * scaleK}px system-ui, sans-serif`;
    const tw = ctx.measureText(banner.text).width;
    const w = tw + 44 * u * scaleK;
    const h = 34 * u * scaleK;
    const cx = canvasEl.width / 2;
    const y = (Art.MT + 22) * scale;
    ctx.shadowColor = 'rgba(20, 12, 24, 0.35)';
    ctx.shadowBlur = 12 * u;
    ctx.shadowOffsetY = 4 * u;
    roundRect(cx - w / 2, y, w, h, h / 2);
    ctx.fillStyle = '#f2c14e';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 2 * u;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.fillStyle = '#3a2c35';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(banner.text, cx, y + h / 2 + u);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  function updateConfetti(dt) {
    for (let i = confetti.length - 1; i >= 0; i--) {
      const c = confetti[i];
      c.life -= dt;
      c.ph += dt * 6;
      c.vy = Math.min(c.vy + 30 * dt, 46);
      c.x += (c.vx + Math.sin(c.ph) * 14) * dt;
      c.y += c.vy * dt;
      if (c.life <= 0 || c.y > (c.floor || OY + ROOM_H * T)) confetti.splice(i, 1);
    }
    for (const ch of allChars()) if (ch.hopT > 0) ch.hopT = Math.max(0, ch.hopT - dt);
  }

  function drawConfetti() {
    for (const c of confetti) {
      ctx.globalAlpha = Math.min(1, c.life);
      ctx.fillStyle = c.c;
      const flat = Math.cos(c.ph) > 0;
      ctx.fillRect(Math.round(c.x), Math.round(c.y), flat ? 3 : 2, flat ? 2 : 3);
    }
    ctx.globalAlpha = 1;
  }

  // Yaprak yığınının içinden yürürken yapraklar havalanır
  function onLeaves(ch) {
    const tx = Math.floor(ch.x);
    const ty = Math.floor(ch.y - 0.05);
    return room.items.some((it) => {
      if (it.type !== 'leafPile') return false;
      const fp = Sh.footprint(it);
      return tx >= fp.x && tx < fp.x + fp.w && ty >= fp.y && ty < fp.y + fp.h;
    });
  }

  const LEAF_COLORS = ['#c4553f', '#e8853a', '#e3b766', '#a8673a'];
  function kickLeaves(ch) {
    for (let i = 0; i < 4; i++) {
      confetti.push({
        x: OX + ch.x * T + (Math.random() - 0.5) * 8,
        y: OY + ch.y * T - 2,
        vx: (Math.random() - 0.5) * 30,
        vy: -18 - Math.random() * 14,
        c: LEAF_COLORS[i % LEAF_COLORS.length],
        ph: Math.random() * Math.PI * 2,
        life: 0.8 + Math.random() * 0.4,
        floor: OY + ch.y * T + 1,
      });
    }
    return 'rustle';
  }

  function drawShadow(ch) {
    const x = Math.round(OX + ch.x * T);
    const y = Math.round(OY + ch.y * T);
    ctx.fillStyle = 'rgba(40, 28, 36, 0.22)';
    ctx.fillRect(x - 4, y - 1, 8, 2);
    ctx.fillRect(x - 3, y - 2, 6, 4);
  }

  // Gündüz pencerelerden süzülen ışık ve zemine düşen güneş lekeleri
  const WINDOW_TYPES = new Set(['window', 'curtainWindow', 'archWindow', 'portholeWindow']);

  function drawLightShafts(env) {
    const { night, warm, hour } = env.light;
    const k = (1 - night) * 0.16;
    if (k < 0.01) return;
    const col = warm > 0.25 ? '255, 196, 140' : '255, 244, 214';
    // sabah ışık sağa, öğleden sonra sola düşer
    const lean = Math.round(Math.max(-1, Math.min(1, (13 - hour) / 5)) * 14);
    const shaft = (x0, x1, y0, len, patchY) => {
      const g = ctx.createLinearGradient(0, y0, 0, y0 + len);
      g.addColorStop(0, `rgba(${col}, ${k})`);
      g.addColorStop(1, `rgba(${col}, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y0);
      ctx.lineTo(x1 + lean, y0 + len);
      ctx.lineTo(x0 + lean, y0 + len);
      ctx.closePath();
      ctx.fill();
      // zemindeki parlak leke (pencere bölmeleri gibi iki parça)
      const w = x1 - x0 - 4;
      const px = Math.round(x0 + 2 + lean * 0.6);
      ctx.fillStyle = `rgba(${col}, ${k * 0.75})`;
      const half = Math.floor(w / 2) - 1;
      ctx.fillRect(px, patchY, half, 9);
      ctx.fillRect(px + half + 2, patchY, w - half - 2, 9);
      // huzmede süzülen toz zerreleri
      const motes = Math.round((x1 - x0) / 5);
      for (let i = 0; i < motes; i++) {
        const seed = x0 * 0.37 + i * 12.9898;
        const fy = ((env.t / 9000 + (Math.sin(seed) * 0.5 + 0.5)) % 1 + 1) % 1;
        const fx = (Math.sin(seed * 7.1) * 0.5 + 0.5) + Math.sin(env.t / 2200 + i) * 0.04;
        const my = y0 + fy * len;
        const mx = x0 + fx * (x1 - x0) + lean * fy;
        const a = k * 3.2 * Math.sin(fy * Math.PI) * (0.6 + 0.4 * Math.sin(env.t / 500 + i * 2));
        if (a <= 0.02) continue;
        ctx.fillStyle = `rgba(255, 250, 230, ${Math.min(0.7, a)})`;
        ctx.fillRect(Math.round(mx), Math.round(my), 1, 1);
      }
    };
    for (const it of room.items) {
      if (!WINDOW_TYPES.has(it.type)) continue;
      const r = Art.itemRect(it);
      shaft(r.x + 2, r.x + r.w - 2, OY, 50, OY + 20);
    }
    const arch = Art.skyHoles(room.style, room.venue);
    for (const hole of arch) {
      if (hole.plain) continue;
      const xs = hole.map((q) => q[0]);
      const x0 = Math.min(...xs);
      const x1 = Math.max(...xs);
      if (room.style.pattern === 5 && x1 - x0 > 100) continue;
      if (x1 - x0 > 60) shaft(x0 + 4, x1 - 4, OY, 60, OY + 24);
      else shaft(x0, x1, OY, 70, OY + 30);
    }
  }

  // Gece açık havada (terasta) yanıp sönen ateş böcekleri
  function drawFireflies(env) {
    const night = env.light.night;
    if (night < 0.45 || !(room.venue === 'terrace' || room.style.pattern === 5)) return;
    const t = env.t / 1000;
    for (let i = 0; i < 18; i++) {
      const bx = OX + 8 + ((i * 53.7) % (ROOM_W * T - 16));
      const by = OY - 22 + ((i * 37.3) % (ROOM_H * T * 0.75));
      const x = bx + Math.sin(t * (0.3 + (i % 5) * 0.07) + i) * 14;
      const y = by + Math.sin(t * (0.23 + (i % 3) * 0.05) + i * 1.7) * 8;
      const blink = Math.max(0, Math.sin(t * (1.1 + (i % 4) * 0.25) + i * 2.3));
      const a = blink * night;
      if (a < 0.05) continue;
      ctx.fillStyle = `rgba(214, 255, 120, ${0.35 * a})`;
      ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
      ctx.fillStyle = `rgba(240, 255, 170, ${a})`;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  }

  function hexRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // Tavan ışığı yumuşakça yanıp söner (0 → 1)
  let ceilK = 0;
  function updateCeiling(dt) {
    const L = App.Lighting;
    const target = L && L.ceilingOn(Art.lighting(new Date()).night) ? 1 : 0;
    ceilK += (target - ceilK) * Math.min(1, dt * 5);
  }

  function drawLighting(env) {
    const { night, warm } = env.light;
    const L = App.Lighting;
    const lampK = L ? L.lamps() : 1;
    const tone = L ? L.color() : [255, 196, 120];
    // tavan ışığı yalnızca karanlıkta fark edilir
    const ceil = ceilK * night;
    if (warm > 0.02) {
      ctx.fillStyle = `rgba(255, 150, 90, ${0.07 * warm})`;
      ctx.fillRect(0, 0, LW, LH);
    }
    if (night > 0.02) {
      // gece karartması; tavan ışığı açıkken çok daha hafif
      ctx.fillStyle = `rgba(16, 20, 46, ${0.42 * night * (1 - 0.6 * ceilK)})`;
      ctx.fillRect(0, 0, LW, LH);
    }
    // kenarlara doğru hafif kararma: diorama hissi, lambalar daha sıcak görünür
    const vg = ctx.createRadialGradient(LW / 2, LH * 0.5, LH * 0.35, LW / 2, LH * 0.5, LW * 0.72);
    vg.addColorStop(0, 'rgba(20, 12, 24, 0)');
    vg.addColorStop(1, `rgba(20, 12, 24, ${0.16 + 0.18 * night * (1 - 0.5 * ceilK)})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, LW, LH);
    ctx.globalCompositeOperation = 'lighter';
    if (ceil > 0.01) {
      // tavandan odaya yayılan ışık ve zeminin ortasında yumuşak bir havuz
      const [tr, tg, tb] = tone;
      const cx = OX + (ROOM_W * T) / 2;
      const top = OY - Art.WH * 0.6;
      const cg = ctx.createRadialGradient(cx, top, 0, cx, top + 40, LW * 0.75);
      cg.addColorStop(0, `rgba(${tr}, ${tg}, ${tb}, ${0.2 * ceil})`);
      cg.addColorStop(0.55, `rgba(${tr}, ${tg}, ${tb}, ${0.08 * ceil})`);
      cg.addColorStop(1, `rgba(${tr}, ${tg}, ${tb}, 0)`);
      ctx.fillStyle = cg;
      ctx.fillRect(0, 0, LW, LH);
      ctx.save();
      const py = OY + ROOM_H * T * 0.45;
      const rx = ROOM_W * T * 0.42;
      ctx.translate(cx, py);
      ctx.scale(1, 0.45);
      const pg = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      pg.addColorStop(0, `rgba(${tr}, ${tg}, ${tb}, ${0.12 * ceil})`);
      pg.addColorStop(1, `rgba(${tr}, ${tg}, ${tb}, 0)`);
      ctx.fillStyle = pg;
      ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
      ctx.restore();
    }
    const flicker = 0.92 + 0.08 * Math.sin(env.t / 110);
    for (const it of room.items) {
      const def = Art.view(it);
      if (!def.glows || it.id === (edit.placing && edit.placing.id)) continue;
      const r = Art.itemRect(it);
      for (const gl of def.glows) {
        let k;
        if (gl.when === 'always') k = (0.45 + 0.55 * night) * flicker;
        else if (gl.when === 'occupied') k = env.activeItems.has(it.id) ? night : 0;
        else k = night;
        const a = Math.min(0.9, (gl.strength || 0.34) * k * lampK);
        if (a < 0.01) continue;
        // renkli ışıklar (neon, lav lambası…) kendi renginde kalır; sıradan lambalar seçilen ışık rengini alır
        const [cr, cg, cb] = gl.color || (gl.tint ? hexRgb(def.colors[it.c]) : tone);
        const cx = r.x + gl.x;
        const cy = r.y + gl.y;
        const gr = gl.r * (0.85 + 0.15 * lampK);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, gr);
        g.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${a})`);
        g.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(cx - gr, cy - gr, gr * 2, gr * 2);
        // sıcak ışık havuzu: lambanın altında zemine, duvar lambasında duvara yayılan elips
        const warmLight = !gl.color && !gl.tint;
        if (gl.pool !== false && (gl.pool || warmLight)) {
          const wall = CATALOG[it.type].layer === 'wall';
          const px = cx;
          const py = wall ? cy + gl.r * 0.45 : r.y + r.h - 2;
          const rx = wall ? gl.r * 0.45 : gl.r * 0.75;
          const ry = wall ? gl.r * 0.8 : gl.r * 0.26;
          ctx.save();
          ctx.translate(px, py);
          ctx.scale(1, ry / rx);
          const pg = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
          pg.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${a * 0.85})`);
          pg.addColorStop(0.6, `rgba(${cr}, ${cg}, ${cb}, ${a * 0.35})`);
          pg.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`);
          ctx.fillStyle = pg;
          ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
          ctx.restore();
        }
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawGhost(env) {
    const pl = edit.placing;
    if (!pl) return;
    const item = ghostItem(pl);
    const cat = Sh.footprint(item);
    ctx.fillStyle = pl.valid ? 'rgba(80, 190, 120, 0.35)' : 'rgba(220, 80, 70, 0.4)';
    if (cat.layer === 'wall') {
      const r = Art.itemRect(item);
      ctx.fillRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
    } else {
      ctx.fillRect(OX + pl.x * T, OY + pl.y * T, cat.w * T, cat.h * T);
    }
    Art.drawItem(ctx, item, env, 0.8);
  }

  // Oturağın hangi yöne baktığını gösteren küçük ok
  function drawSeatArrows(item, S, u) {
    const seats = Art.view(item).seats;
    if (!seats) return;
    const V = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
    for (const st of seats) {
      const [dx, dy] = V[st.dir] || V.down;
      const cx = (OX + (item.x + st.x) * T) * S;
      const cy = (OY + (item.y + st.y - 0.45) * T) * S;
      const L = 7 * u;
      const tipX = cx + dx * L;
      const tipY = cy + dy * L;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(cx - dx * L * 0.3 - dy * L * 0.75, cy - dy * L * 0.3 + dx * L * 0.75);
      ctx.lineTo(cx - dx * L * 0.3 + dy * L * 0.75, cy - dy * L * 0.3 - dx * L * 0.75);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgba(31, 35, 40, 0.85)';
      ctx.lineWidth = 2 * u;
      ctx.stroke();
      ctx.fill();
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Not kâğıdının altında açılan okuma kartı
  function drawNoteBubble(now, u, S) {
    if (!noteBubble || edit.on) return;
    const it = itemById.get(noteBubble.id);
    if (!it || now > noteBubble.until) {
      noteBubble = null;
      return;
    }
    const r = Art.itemRect(it);
    const cx = (r.x + r.w / 2) * S;
    const top = (r.y + r.h + 3) * S;
    const empty = !it.t;
    ctx.font = `${empty ? 'italic ' : ''}${13 * u}px system-ui, sans-serif`;
    const lines = wrapText(empty ? App.t('Empty note. Write on it in Edit mode.') : it.t, 170 * u);
    const lh = 17 * u;
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 20 * u;
    const h = lines.length * lh + 14 * u;
    const left = Math.max(4 * u, Math.min(canvasEl.width - w - 4 * u, cx - w / 2));
    const paper = Art.ITEMS.stickyNote.colors[it.c] || '#f7e27a';
    ctx.save();
    ctx.shadowColor = 'rgba(20, 12, 24, 0.35)';
    ctx.shadowBlur = 10 * u;
    ctx.shadowOffsetY = 3 * u;
    roundRect(left, top + 6 * u, w, h, 6 * u);
    ctx.fillStyle = paper;
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(cx - 6 * u, top + 6.5 * u);
    ctx.lineTo(cx + 6 * u, top + 6.5 * u);
    ctx.lineTo(cx, top);
    ctx.closePath();
    ctx.fillStyle = paper;
    ctx.fill();
    ctx.fillStyle = empty ? 'rgba(31, 35, 40, 0.6)' : '#2b2230';
    ctx.textAlign = 'left';
    lines.forEach((l, i) => ctx.fillText(l, left + 10 * u, top + 6 * u + 7 * u + (i + 0.78) * lh));
  }

  function wrapText(text, maxW) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width <= maxW || !line) line = test;
      else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    for (let i = 0; i < lines.length; i++) {
      while (ctx.measureText(lines[i]).width > maxW && lines[i].length > 1) lines[i] = lines[i].slice(0, -2) + '…';
    }
    if (lines.length > 3) {
      lines.length = 3;
      lines[2] = `${lines[2].replace(/…$/, '').slice(0, -1)}…`;
    }
    return lines;
  }

  function drawUI(env, now) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const rect = canvasEl.getBoundingClientRect();
    const u = rect.width ? canvasEl.width / rect.width : 1;
    const S = scale;
    drawNoteBubble(now, u, S);

    if (edit.on) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = Math.max(1, u);
      ctx.beginPath();
      for (let x = 0; x <= ROOM_W; x++) {
        ctx.moveTo((OX + x * T) * S, OY * S);
        ctx.lineTo((OX + x * T) * S, (OY + ROOM_H * T) * S);
      }
      for (let y = 0; y <= ROOM_H; y++) {
        ctx.moveTo(OX * S, (OY + y * T) * S);
        ctx.lineTo((OX + ROOM_W * T) * S, (OY + y * T) * S);
      }
      ctx.stroke();
      for (const it of [itemById.get(edit.selected), edit.placing && ghostItem(edit.placing)]) {
        if (it) drawSeatArrows(it, S, u);
      }
      const sel = itemById.get(edit.selected);
      if (sel) {
        const r = Art.itemRect(sel);
        ctx.lineWidth = 2 * u;
        ctx.strokeStyle = '#ffffff';
        ctx.setLineDash([5 * u, 4 * u]);
        ctx.strokeRect((r.x - 2) * S, (r.y - 2) * S, (r.w + 4) * S, (r.h + 4) * S);
        ctx.setLineDash([]);
      }
    }

    const multi = session.role !== 'solo';
    const labels = []; // çizilen isim etiketleri: yan yana duranlarınki üst üste binmesin
    for (const ch of allChars()) {
      const hx = (OX + ch.x * T) * S;
      let top = (OY + ch.y * T - CH + (ch.look.style === 2 ? 0 : 2)) * S - 4 * u;

      if (ch.pose === 'lie') {
        ctx.textAlign = 'center';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 3 * u;
        ctx.strokeStyle = '#ffffff';
        ctx.fillStyle = '#3f5f8a';
        for (let i = 0; i < 3; i++) {
          const phase = ((now / 1000 + i * 0.6) % 1.8) / 1.8;
          ctx.globalAlpha = Math.min(1, (1 - phase) * 1.6);
          ctx.font = `italic 800 ${(11 + phase * 6) * u}px system-ui, sans-serif`;
          const zx = hx + (10 + phase * 12) * u;
          const zy = top + 6 * u - phase * 26 * u;
          ctx.strokeText('z', zx, zy);
          ctx.fillText('z', zx, zy);
        }
        ctx.globalAlpha = 1;
      }

      if (multi) {
        const label = ch.local ? App.t('{name} (you)', { name: ch.name }) : ch.name;
        ctx.font = `600 ${11 * u}px system-ui, sans-serif`;
        const tw = ctx.measureText(label).width;
        const h = 17 * u;
        const w = tw + 12 * u;
        const hits = (y) => labels.some((r) => hx - w / 2 < r.x + r.w && r.x < hx + w / 2 && y - h < r.y && r.y - r.h < y);
        for (let k = 0; k < 4 && hits(top); k++) top -= h + 3 * u;
        labels.push({ x: hx - w / 2, y: top, w, h });
        roundRect(hx - w / 2, top - h, w, h, 6 * u);
        ctx.fillStyle = ch.local ? 'rgba(31, 35, 40, 0.82)' : 'rgba(31, 35, 40, 0.62)';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, hx, top - h / 2 + 0.5 * u);
        ctx.textBaseline = 'alphabetic';
        top -= h + 4 * u;
      }

      if (ch.bubble) {
        ctx.font = `${12 * u}px system-ui, sans-serif`;
        const lines = wrapText(ch.bubble.text, 150 * u);
        const lh = 15 * u;
        const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16 * u;
        const h = lines.length * lh + 10 * u;
        const left = Math.max(2 * u, Math.min(canvasEl.width - w - 2 * u, hx - w / 2));
        const y = top - h - 6 * u;
        roundRect(left, y, w, h, 8 * u);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = u;
        ctx.strokeStyle = 'rgba(58, 44, 53, 0.35)';
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(hx - 5 * u, y + h - 0.5 * u);
        ctx.lineTo(hx + 5 * u, y + h - 0.5 * u);
        ctx.lineTo(hx, y + h + 6 * u);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.fillStyle = '#1f2328';
        ctx.textAlign = 'left';
        lines.forEach((l, i) => ctx.fillText(l, left + 8 * u, y + 5 * u + (i + 0.78) * lh));
      }

      // yan yana oturanların sohbeti (sohbet ya da tepki balonu yoksa)
      const talk = !ch.bubble && !ch.reaction && talkGlyph(ch);
      if (talk) drawTalk(talk, hx, top, now, u);

      // tepki balonu: başın sağ üstünde belirir, hafifçe yükselip söner
      if (ch.reaction) {
        const age = (now - ch.reaction.at) / 1000;
        if (age > 3) ch.reaction = null;
        else {
          const pop = Math.min(1, age / 0.15);
          const fade = age > 2.5 ? 1 - (age - 2.5) / 0.5 : 1;
          // isim etiketinin üstünde ortalı; sohbet balonu varsa onun sağında
          const rx = ch.bubble ? hx + 70 * u : hx;
          const ry = top - 16 * u - age * 6 * u;
          const rad = 13 * u * (0.6 + 0.4 * pop);
          ctx.globalAlpha = fade;
          ctx.beginPath();
          ctx.arc(rx, ry, rad, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.lineWidth = u;
          ctx.strokeStyle = 'rgba(58, 44, 53, 0.3)';
          ctx.stroke();
          ctx.font = `${15 * u * (0.6 + 0.4 * pop)}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#1f2328';
          ctx.fillText(Sh.REACTIONS[ch.reaction.r], rx, ry + u);
          ctx.textBaseline = 'alphabetic';
          ctx.globalAlpha = 1;
        }
      }
    }
    ctx.font = `700 ${12 * u}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 3 * u;
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#e05d6f';
    for (const n of notes) {
      ctx.globalAlpha = Math.max(0, 1 - n.t / 1.6);
      ctx.fillStyle = '#5b7fa8';
      const nx = (OX + n.x * T) * S + Math.sin(n.t * 4) * 4 * u;
      const ny = (OY + n.y * T) * S - n.t * 30 * u;
      ctx.strokeText('\u266A', nx, ny);
      ctx.fillText('\u266A', nx, ny);
    }
    for (const pt of particles) {
      if (pt.t < 0) continue;
      ctx.globalAlpha = Math.max(0, 1 - pt.t / 1.4);
      ctx.fillStyle = pt.c || '#e05d6f';
      const hx = (OX + pt.x * T) * S + Math.sin(pt.t * 5) * 3 * u;
      const hy = (OY + pt.y * T) * S - pt.t * 26 * u;
      ctx.strokeText(pt.g || '\u2665', hx, hy);
      ctx.fillText(pt.g || '\u2665', hx, hy);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    drawPops(now, u, S);
    drawBanner(now, u);
  }

  // Oturanları eşyanın katmanları arasına çiz (ör. masanın arkasındaki sandalye, önündeki sandalye arkalığı)
  function drawItemWithOccupants(e, env) {
    const it = e.item;
    const def = Art.view(it);
    const cuts = def.cuts;
    const drawTops = () => e.tops.forEach((t) => Art.drawItem(ctx, t, env));
    if (!e.seated.length || !cuts) {
      Art.drawItem(ctx, it, env);
      drawTops();
      e.seated.forEach(drawChar);
      if (e.seated.length) Art.drawItemCover(ctx, it);
      return;
    }
    const overBand = def.overBand !== undefined ? def.overBand : cuts.length;
    // küçük eşyalar yüzeyin bulunduğu katmandan hemen sonra (önde oturanın arkasında) çizilir
    const topBand = cuts.filter((c) => c <= (def.top ? def.top.y : 0) - 1).length;
    for (let b = 0; b <= cuts.length; b++) {
      Art.drawItemSlice(ctx, it, b === 0 ? null : cuts[b - 1], b < cuts.length ? cuts[b] : null);
      if (b === overBand) Art.drawItemOver(ctx, it, env);
      if (b === topBand) drawTops();
      for (const ch of e.seated) {
        const info = seatInfo(ch.seat);
        if (info && (info.s.band || 0) === b) drawChar(ch);
      }
    }
  }

  function render(now) {
    const date = new Date();
    const activeItems = new Set();
    const activeRun = new Set();
    for (const ch of allChars()) {
      const info = seatInfo(ch.seat);
      if (info && info.s.act === 'work') activeItems.add(ch.seat.id);
      if (info && info.s.act === 'run') activeRun.add(ch.seat.id);
    }
    const env = {
      t: now,
      date,
      light: Art.lighting(date),
      activeItems,
      activeRun,
      focusing: App.Timer ? App.Timer.isFocusRunning() : false,
      todosLeft: App.Todos ? App.Todos.leftCount() : 0,
      weather: App.Audio ? App.Audio.weather() : {},
      music: App.Audio ? App.Audio.musicOn() : false,
      awayPets: awayPets(),
      used: usedAt,
      season: Art.season && App.Timer && App.Timer.setting('seasonal') ? Art.season(date) : null,
    };
    const movingId = edit.placing && edit.placing.id;

    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, LW, LH);
    // camlardan ve açık havadan görünen gökyüzü, arka planın altına çizilir
    for (const hole of Art.skyHoles(room.style, room.venue)) {
      const xs = hole.map((q) => q[0]);
      const ys = hole.map((q) => q[1]);
      const bx = Math.floor(Math.min(...xs));
      const by = Math.floor(Math.min(...ys));
      ctx.save();
      ctx.beginPath();
      hole.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.clip();
      Art.drawSky(ctx, bx, by, Math.ceil(Math.max(...xs)) - bx, Math.ceil(Math.max(...ys)) - by, env, hole.plain);
      ctx.restore();
    }
    ctx.drawImage(Art.background(room.style, room.venue), 0, 0);
    drawLightShafts(env);

    const floorItems = [];
    const wallItems = [];
    const list = [];
    const tops = [];
    for (const it of room.items) {
      if (it.id === movingId) continue;
      const layer = CATALOG[it.type].layer;
      if (layer === 'floor') floorItems.push(it);
      else if (layer === 'wall') wallItems.push(it);
      else if (layer === 'top') tops.push(it);
      else list.push({ depth: depthOf(it), item: it, seated: [], tops: [] });
    }
    const hostEntry = new Map(list.map((e) => [e.item.id, e]));
    for (const it of tops) {
      const host = Sh.hostAt(room.items, it.x, it.y, it.id);
      const e = host && hostEntry.get(host.id);
      if (e) e.tops.push(it);
    }
    for (const e of list) e.tops.sort((a, b) => a.y - b.y || a.x - b.x);
    floorItems.sort((a, b) => a.y - b.y).forEach((it) => Art.drawItem(ctx, it, env));
    wallItems.forEach((it) => Art.drawItem(ctx, it, env));

    if (marker) {
      const a = 1 - marker.t / 0.6;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.55 * a})`;
      const cx = OX + marker.x * T + 8;
      const cy = OY + marker.y * T + 9;
      ctx.fillRect(cx - 3, cy, 7, 1);
      ctx.fillRect(cx, cy - 2, 1, 5);
    }

    const byItem = hostEntry;
    for (const ch of allChars()) {
      const entry = ch.seat && byItem.get(ch.seat.id);
      if (entry && seatInfo(ch.seat)) entry.seated.push(ch);
      else list.push({ depth: ch.y, ch });
    }
    for (const pet of pets.values()) if (pet.state !== 'sleep' && pet.id !== movingId) list.push({ depth: pet.y - 0.01, pet });
    list.sort((a, b) => a.depth - b.depth);
    for (const e of list) {
      if (e.item) {
        drawItemWithOccupants(e, env);
      } else if (e.pet) {
        drawPet(e.pet);
      } else {
        drawShadow(e.ch);
        drawChar(e.ch);
      }
    }

    // karartma, ışıklar ve hava durumu yalnızca dioramanın içinde
    ctx.save();
    Art.dioramaPath(ctx, room.venue);
    ctx.clip();
    drawLighting(env);
    drawFireflies(env);
    if (room.venue === 'terrace' || room.style.pattern === 5) {
      Art.drawWeather(ctx, 0, 0, LW, LH, env, 0.85);
      if (Art.drawSeason) Art.drawSeason(ctx, 0, 0, LW, LH, env, 0.85);
    }
    drawConfetti();
    ctx.restore();
    if (edit.on) drawGhost(env);
    drawUI(env, now);
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    update(dt, now);
    render(now);
    App.emit('frame', now);
    requestAnimationFrame(loop);
  }

  // ---------- Dışa açık API ----------
  Game.room = () => room;
  Game.pets = () => pets;
  Game.localRoom = () => venues[venueId];
  Game.venue = () => room.venue;
  Game.setVenue = setVenue;
  Game.session = () => session;
  Game.canEdit = () => session.role !== 'guest';
  Game.me = () => me;
  Game.others = () => others;
  Game.interactNearest = interactNearest;
  Game.goToDesk = goToDesk;
  Game.standUp = () => standUp();

  Game.profile = () => ({ name: me.name, look: { ...me.look } });
  Game.setProfile = (name, look) => {
    me.name = Sh.sanitizeName(name);
    me.look = Sh.sanitizeLook(look);
    App.storage.set(App.KEYS.player, { name: me.name, look: me.look });
    App.emit('profile:changed', Game.profile());
  };

  Game.localState = () => {
    const s = {
      x: Math.round(me.x * 100) / 100,
      y: Math.round(me.y * 100) / 100,
      dir: me.dir,
      pose: me.pose,
      moving: me.moving,
      seat: me.seat ? { id: me.seat.id, i: me.seat.i } : null,
    };
    return s;
  };

  Game.activity = (ch) => {
    const info = seatInfo(ch.seat);
    if (info && info.s.act === 'work') return 'Working';
    if (info && info.s.act === 'play') return info.s.sfx === 'drum' ? 'Playing drums' : 'Playing piano';
    if (info && info.s.act === 'sit' && App.Timer && App.Timer.isFocusRunning()) return 'Working';
    if (info && info.s.act === 'lie') return 'Resting';
    if (info && info.s.act === 'run') return 'Working out';
    if (info) return 'Sitting';
    if (ch.moving) return 'Walking';
    return 'Standing';
  };

  Game.enterSession = ({ role, mine, room: remoteRoom, players }) => {
    session = { role, mine };
    if (edit.on && role === 'guest') Game.edit.setOn(false);
    others.clear();
    respawn();
    setRoom(Sh.sanitizeRoom(remoteRoom), false);
    spawnNearDoor();
    for (const p of players || []) Game.upsertOther(p);
    App.emit('session:changed', session);
  };

  Game.setRole = (role) => {
    session = { ...session, role };
    if (edit.on && role === 'guest') Game.edit.setOn(false);
    App.emit('session:changed', session);
  };

  Game.leaveSession = () => {
    session = { role: 'solo', mine: true };
    others.clear();
    respawn();
    setRoom(venues[venueId], false);
    App.emit('session:changed', session);
  };

  Game.setRemoteRoom = (remoteRoom) => {
    setRoom(Sh.sanitizeRoom(remoteRoom), false);
    if (session.role === 'guest') clearHistory();
    if (edit.selected && !itemById.has(edit.selected)) edit.selected = null;
    App.emit('edit:changed');
  };

  Game.upsertOther = (p) => {
    let o = others.get(p.id);
    if (!o) {
      o = makeChar(p.id, Sh.sanitizeName(p.name), Sh.sanitizeLook(p.look));
      others.set(p.id, o);
    }
    if (p.name !== undefined) o.name = Sh.sanitizeName(p.name);
    if (p.look !== undefined) o.look = Sh.sanitizeLook(p.look);
    if (p.state) Game.updateOther(p.id, p.state, true);
    return o;
  };

  Game.updateOther = (id, state, snap) => {
    const o = others.get(id);
    if (!o) return;
    const s = Sh.sanitizeState(state);
    o.tx = s.x;
    o.ty = s.y;
    if (snap) {
      o.x = s.x;
      o.y = s.y;
    }
    o.dir = s.dir;
    o.moving = s.moving;
    o.seat = s.seat;
    o.pose = s.seat ? s.pose : 'stand';
  };

  Game.removeOther = (id) => others.delete(id);

  // Mola önerisi gibi durumlarda kendi karakterine kısa bir hareket yaptır
  Game.playAct = (act) => {
    const info = me.seat && seatInfo(me.seat);
    if (me.moving || me.tween) return false;
    if (info) {
      if (info.s.act !== 'sit' || info.s.pose !== 'sit' || info.s.dir !== 'down') return false;
      startAct(me, act === 'drink' ? 'sip' : 'read');
      return true;
    }
    startAct(me, act);
    return true;
  };

  // Hızlı tepki: karakterin üstünde emoji balonu, bazılarında eşlik eden hareket
  Game.react = (id, r) => {
    const ch = id === 'me' ? me : others.get(id);
    if (!ch) return;
    ch.reaction = { r, at: performance.now() };
    const busy = ch.seat || ch.moving;
    if (r === 0) startAct(ch, 'wave');
    else if (r === 2 && !busy) startAct(ch, 'drink');
    else if (r === 5 && !busy) startAct(ch, 'stretch');
    else if (r === 4) ch.hopT = HOP_TIME;
    else if (r === 3) for (let i = 0; i < 3; i++) particles.push({ x: ch.x + (i - 1) * 0.25, y: ch.y - 1.3, t: -i * 0.2 });
    App.emit('sfx', 'pick');
  };

  Game.highFive = (a, b) => startHighFive(charById(a), charById(b));
  Game.talking = () => [...talks.values()].map((c) => ({ a: c.a.id, b: c.b.id, glyph: c.glyph }));

  Game.say = (id, text) => {
    const ch = id === 'me' ? me : others.get(id);
    if (!ch) return;
    ch.bubble = { text, until: performance.now() + 6000 };
  };

  // ---------- Başlat ----------
  const params = new URLSearchParams(location.search);
  if (params.has('saat')) Art.forcedHour = Number(params.get('saat'));

  rebuild();
  syncPets();
  resize();
  if (typeof ResizeObserver === 'function') new ResizeObserver(resize).observe(column);
  window.addEventListener('resize', resize);
  App.on('edit:changed', () => requestAnimationFrame(resize));
  App.on('session:changed', () => requestAnimationFrame(resize));
  requestAnimationFrame(loop);
})();
