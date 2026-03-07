(() => {
  const symbolSets = [
    "ለሉሊላሌልሎሏ",
    "ሐሑሒሓሔሕሖሗ",
    "መሙሚማሜምሞሟ",
    "ሠሡሢሣሤሥሦሧ",
    "ረሩሪራሬርሮሯ",
    "ሰሱሲሳሴስሶሷ",
    "ሸሹሺሻሼሽሾሿ",
    "ቀቁቂቃቄቅቆቋ",
    "በቡቢባቤብቦቧ",
    "ቨቩቪቫቬቭቮቯ",
    "ተቱቲታቴትቶቷ",
    "ቸቹቺቻቼችቾቿ",
    "ኀኁኂኃኄኅኆኋ",
    "ነኑኒናኔንኖኗ",
    "ኘኙኚኛኜኝኞኟ",
    "ከኩኪካኬክኮኳ",
    "ኸኹኺኻኼኽኾዃ",
    "ዘዙዚዛዜዝዞዟ",
    "ዠዡዢዣዤዥዦዧ",
    "ደዱዲዳዴድዶዷ",
    "ጀጁጂጃጄጅጆጇ",
    "ገጉጊጋጌግጎጓ",
    "ጠጡጢጣጤጥጦጧ",
    "ጨጩጪጫጬጭጮጯ",
    "ጰጱጲጳጴጵጶጷ",
    "ጸጹጺጻጼጽጾጿ",
    "ፈፉፊፋፌፍፎፏ",
    "ፐፑፒፓፔፕፖፗ",
    "፩፪፫፬፭፮፯፰",
    "፲፳፴፵፶፷፸፹"
  ];

  const MAX_LEVEL = 40;
  const MAX_MOVES = 30;

  let level = 1;
  let movesLeft = MAX_MOVES;
  let parentSize = 0;
  let tileMap = {};
  let tiles = [];
  let lastShuffled = null;
  const shuffleTimeouts = [];

  document.addEventListener("DOMContentLoaded", initGame);

  function initGame() {
    tiles = Array.from(document.querySelectorAll(".tile"));
    game();
  }

  function game() {
    const randomSet = symbolSets[Math.floor(Math.random() * symbolSets.length)];

    for (let tileId = 1; tileId <= 8; tileId += 1) {
      document.getElementById(String(tileId)).innerHTML = randomSet.charAt(tileId - 1);
    }

    document.getElementById("currentLevel").innerHTML = String(level);
    document.getElementById("movesLeft").innerHTML = String(movesLeft);

    parentSize = document.querySelector(".sliding-puzzle").clientHeight;
    tileMap = buildInitialTileMap();

    for (const tile of tiles) {
      tile.addEventListener("click", tileClicked, true);
      setupTile(tile);
    }

    shuffle();
  }

  function buildInitialTileMap() {
    const step = 34.5;
    return {
      "1": { tileNumber: 1, position: 1, top: 0, left: 0 },
      "2": { tileNumber: 2, position: 2, top: 0, left: step },
      "3": { tileNumber: 3, position: 3, top: 0, left: step * 2 },
      "4": { tileNumber: 4, position: 4, top: step, left: 0 },
      "5": { tileNumber: 5, position: 5, top: step, left: step },
      "6": { tileNumber: 6, position: 6, top: step, left: step * 2 },
      "7": { tileNumber: 7, position: 7, top: step * 2, left: 0 },
      "8": { tileNumber: 8, position: 8, top: step * 2, left: step },
      empty: { position: 9, top: step * 2, left: step * 2 }
    };
  }

  function setupTile(tileElement) {
    const id = tileElement.id;
    const leftPx = parentSize * (tileMap[id].left / 100);
    const topPx = parentSize * (tileMap[id].top / 100);
    requestAnimationFrame(() => {
      tileElement.style.transform = `translate(${leftPx}px, ${topPx}px)`;
    });
    recolorTile(tileElement, id);
  }

  function movementMap(position) {
    if (position === 9) return [6, 8];
    if (position === 8) return [5, 7, 9];
    if (position === 7) return [4, 8];
    if (position === 6) return [3, 5, 9];
    if (position === 5) return [2, 4, 6, 8];
    if (position === 4) return [1, 5, 7];
    if (position === 3) return [2, 6];
    if (position === 2) return [1, 3, 5];
    return [2, 4];
  }

  function tileClicked(event) {
    moveTile(event.target);

    if (movesLeft - 1 === -1) {
      level = 1;
      const complete = document.getElementById("levelComplete");
      complete.innerHTML = "GAME OVER! 😞";
      complete.style.fontSize = "large";
      complete.style.textAlign = "center";

      movesLeft = MAX_MOVES;
      clearTimers(shuffleTimeouts);
      game();
      return;
    }

    movesLeft -= 1;
    document.getElementById("movesLeft").innerHTML = String(movesLeft);

    if (checkSolution()) {
      const complete = document.getElementById("levelComplete");

      if (level === MAX_LEVEL) {
        level = 1;
        complete.innerHTML = "⭐ Congratulations Game Complete! ⭐";
        complete.style.fontSize = "large";
        complete.style.textAlign = "center";
      } else {
        complete.innerHTML = "⭐".repeat(level).replace(/(.{5})/g, "$1\n");
        complete.style.fontSize = "";
        complete.style.textAlign = "";
        level += 1;
      }

      movesLeft = MAX_MOVES;
      clearTimers(shuffleTimeouts);
      game();
    }
  }

  function moveTile(tileElement) {
    const tileId = tileElement.id;

    if (!tileMovable(tileId)) {
      return;
    }

    const emptyTop = tileMap.empty.top;
    const emptyLeft = tileMap.empty.left;
    const emptyPosition = tileMap.empty.position;

    tileMap.empty.top = tileMap[tileId].top;
    tileMap.empty.left = tileMap[tileId].left;
    tileMap.empty.position = tileMap[tileId].position;

    const topPx = parentSize * (emptyTop / 100);
    const leftPx = parentSize * (emptyLeft / 100);

    requestAnimationFrame(() => {
      tileElement.style.transform = `translate(${leftPx}px, ${topPx}px)`;
    });

    tileMap[tileId].top = emptyTop;
    tileMap[tileId].left = emptyLeft;
    tileMap[tileId].position = emptyPosition;

    recolorTile(tileElement, tileId);
  }

  function tileMovable(tileId) {
    const tile = tileMap[tileId];
    const movablePositions = movementMap(tileMap.empty.position);
    return movablePositions.includes(tile.position);
  }

  function recolorTile(tileElement, tileId) {
    if (Number(tileId) === tileMap[tileId].position) {
      tileElement.classList.remove("error");
      return;
    }

    if (level < 21) {
      tileElement.classList.add("error");
    }
  }

  function checkSolution() {
    if (tileMap.empty.position !== 9) {
      return false;
    }

    for (let tileId = 2; tileId <= 8; tileId += 1) {
      if (tileMap[String(tileId)].position < tileMap[String(tileId - 1)].position) {
        return false;
      }
    }

    return true;
  }

  function shuffle() {
    let delay = 200;
    shuffleLoop();

    const loops = level < 21 ? level : level - 20;
    for (let i = 0; i < loops; i += 1) {
      delay += 200;
      shuffleTimeouts.push(setTimeout(shuffleLoop, delay));
    }
  }

  function shuffleLoop() {
    const movablePositions = movementMap(tileMap.empty.position);
    const randomPos = movablePositions[Math.floor(Math.random() * movablePositions.length)];

    let selectedTile = null;
    let selectedTileNumber = null;

    for (let tileId = 1; tileId <= 8; tileId += 1) {
      if (tileMap[String(tileId)].position === randomPos) {
        selectedTileNumber = tileMap[String(tileId)].tileNumber;
        selectedTile = tiles[selectedTileNumber - 1];
        break;
      }
    }

    if (!selectedTile || selectedTileNumber === null) {
      return;
    }

    if (selectedTileNumber !== lastShuffled) {
      moveTile(selectedTile);
      lastShuffled = selectedTileNumber;
      return;
    }

    shuffleLoop();
  }

  function clearTimers(timerList) {
    for (let i = 0; i < timerList.length; i += 1) {
      clearTimeout(timerList[i]);
    }
    timerList.length = 0;
  }
})();
