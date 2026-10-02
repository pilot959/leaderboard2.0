// ==============================
// SUPABASE
// ==============================

const SUPABASE_URL = "https://ysxevlxjldgbarfkrqyc.supabase.co";

// PASTE YOUR EXISTING SUPABASE PUBLISHABLE KEY BETWEEN THE QUOTES
const SUPABASE_KEY = "sb_publishable_3arSMBbybjG7IP5mYEn8Mg_Txjp2CeE";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


// ==============================
// STATE
// ==============================

let leaderboards = [];
let players = [];
let currentLeaderboardId = null;

let pageDialogMode = "new";


// ==============================
// ELEMENTS
// ==============================

const pagesEl = document.getElementById("pages");
const titleEl = document.getElementById("title");
const subtitleEl = document.getElementById("subtitle");
const leaderboardEl = document.getElementById("leaderboard");
const emptyEl = document.getElementById("empty");
const searchEl = document.getElementById("search");

const addBtn = document.getElementById("addBtn");
const addPageBtn = document.getElementById("addPageBtn");
const renamePageBtn = document.getElementById("renamePageBtn");

const playerDialog = document.getElementById("playerDialog");
const playerForm = document.getElementById("playerForm");

const pageDialog = document.getElementById("pageDialog");
const pageForm = document.getElementById("pageForm");


// ==============================
// HELPERS
// ==============================

function createID() {
  return crypto.randomUUID();
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getCurrentLeaderboard() {
  return leaderboards.find(
    leaderboard => leaderboard.id === currentLeaderboardId
  );
}


// ==============================
// LOAD EVERYTHING
// ==============================

async function loadData() {

  const { data: leaderboardData, error: leaderboardError } =
    await db
      .from("leaderboards")
      .select("*")
      .order("name");

  if (leaderboardError) {
    console.error(leaderboardError);
    alert("Could not load leaderboards.");
    return;
  }

  leaderboards = leaderboardData || [];


  // Create first leaderboard if none exist
  if (leaderboards.length === 0) {

    const id = createID();

    const { data, error } =
      await db
        .from("leaderboards")
        .insert({
          id: id,
          name: "Speedruns",
          description: "Best times"
        })
        .select()
        .single();

    if (error) {
      console.error(error);
      alert("Could not create the first leaderboard.");
      return;
    }

    leaderboards = [data];
  }


  // Pick a leaderboard
  if (
    !currentLeaderboardId ||
    !leaderboards.some(
      leaderboard => leaderboard.id === currentLeaderboardId
    )
  ) {
    currentLeaderboardId = leaderboards[0].id;
  }


  // Load players
  const { data: playerData, error: playerError } =
    await db
      .from("players")
      .select("*")
      .eq("leaderboard_id", currentLeaderboardId);

  if (playerError) {
    console.error(playerError);
    alert("Could not load players.");
    return;
  }

  players = playerData || [];


  render();
}


// ==============================
// RENDER
// ==============================

function render() {
  renderPages();
  renderLeaderboard();

  const current = getCurrentLeaderboard();

  if (current) {
    document.title = `${current.name} - Leaderboards`;
    titleEl.textContent = current.name;
    subtitleEl.textContent = current.description || "";
  }
}


// ==============================
// LEADERBOARD PAGES
// ==============================

function renderPages() {

  pagesEl.innerHTML = leaderboards.map(leaderboard => `
    <div
      class="page ${
        leaderboard.id === currentLeaderboardId ? "active" : ""
      }"
      data-id="${leaderboard.id}"
    >

      <span class="dot"></span>

      <span class="page-name">
        ${escapeHTML(leaderboard.name)}
      </span>

      <button
        class="trash"
        title="Delete leaderboard"
      >
        🗑
      </button>

    </div>
  `).join("");


  document.querySelectorAll(".page").forEach(page => {

    page.addEventListener("click", async event => {

      if (event.target.classList.contains("trash")) {
        event.stopPropagation();
        await deleteLeaderboard(page.dataset.id);
        return;
      }

      currentLeaderboardId = page.dataset.id;

      await loadData();
    });

  });
}


// ==============================
// PLAYERS
// ==============================

function renderLeaderboard() {

  const searchText =
    searchEl.value.toLowerCase().trim();


  let filteredPlayers = [...players];


  if (searchText) {
    filteredPlayers = filteredPlayers.filter(player =>
      player.name.toLowerCase().includes(searchText)
    );
  }


  // FASTEST TIME = #1
  filteredPlayers.sort(
    (a, b) =>
      Number(a.score) - Number(b.score)
  );


  leaderboardEl.innerHTML = "";


  if (filteredPlayers.length === 0) {
    emptyEl.classList.remove("hidden");
    return;
  }


  emptyEl.classList.add("hidden");


  leaderboardEl.innerHTML =
    filteredPlayers.map((player, index) => `

      <div class="row">

        <span class="rank">
          ${index + 1}
        </span>

        <span class="player">
          ${escapeHTML(player.name)}
        </span>

        <span class="score">
          ${Number(player.score).toFixed(3)}
        </span>

        <span class="actions">

          <button
            class="secondary edit-player"
            data-id="${player.id}"
          >
            ✏ Edit
          </button>

          <button
            class="danger delete-player"
            data-id="${player.id}"
          >
            🗑
          </button>

        </span>

      </div>

    `).join("");


  document.querySelectorAll(".edit-player")
    .forEach(button => {

      button.addEventListener("click", () => {
        editPlayer(button.dataset.id);
      });

    });


  document.querySelectorAll(".delete-player")
    .forEach(button => {

      button.addEventListener("click", () => {
        deletePlayer(button.dataset.id);
      });

    });
}


// ==============================
// ADD PLAYER
// ==============================

addBtn.addEventListener("click", () => {

  document.getElementById("dialogTitle").textContent =
    "Add Player";

  document.getElementById("playerId").value = "";
  document.getElementById("playerName").value = "";
  document.getElementById("playerScore").value = "";

  playerDialog.showModal();
});


// ==============================
// SAVE PLAYER
// ==============================

playerForm.addEventListener("submit", async event => {

  event.preventDefault();


  const id =
    document.getElementById("playerId").value;

  const name =
    document.getElementById("playerName").value.trim();

  const score =
    Number(document.getElementById("playerScore").value);


  if (!name || !Number.isFinite(score)) {
    return;
  }


  if (id) {

    const { error } =
      await db
        .from("players")
        .update({
          name: name,
          score: score
        })
        .eq("id", id);


    if (error) {
      console.error(error);
      alert("Could not update player.");
      return;
    }

  } else {

    const { error } =
      await db
        .from("players")
        .insert({
          id: createID(),
          leaderboard_id: currentLeaderboardId,
          name: name,
          score: score
        });


    if (error) {
      console.error(error);
      alert("Could not add player.");
      return;
    }
  }


  playerDialog.close();

  await loadData();
});


// ==============================
// EDIT PLAYER
// ==============================

function editPlayer(id) {

  const player =
    players.find(player => player.id === id);

  if (!player) return;


  document.getElementById("dialogTitle").textContent =
    "Edit Player";

  document.getElementById("playerId").value =
    player.id;

  document.getElementById("playerName").value =
    player.name;

  document.getElementById("playerScore").value =
    player.score;


  playerDialog.showModal();
}


// ==============================
// DELETE PLAYER
// ==============================

async function deletePlayer(id) {

  const player =
    players.find(player => player.id === id);

  if (!player) return;


  if (!confirm(`Delete ${player.name}?`)) {
    return;
  }


  const { error } =
    await db
      .from("players")
      .delete()
      .eq("id", id);


  if (error) {
    console.error(error);
    alert("Could not delete player.");
    return;
  }


  await loadData();
}


// ==============================
// NEW LEADERBOARD
// ==============================

addPageBtn.addEventListener("click", () => {

  pageDialogMode = "new";

  document.getElementById("pageDialogTitle").textContent =
    "New Leaderboard";

  document.getElementById("pageName").value = "";
  document.getElementById("pageSubtitle").value = "";

  pageDialog.showModal();
});


// ==============================
// RENAME LEADERBOARD
// ==============================

renamePageBtn.addEventListener("click", () => {

  const current =
    getCurrentLeaderboard();

  if (!current) return;


  pageDialogMode = "rename";

  document.getElementById("pageDialogTitle").textContent =
    "Rename Leaderboard";

  document.getElementById("pageName").value =
    current.name;

  document.getElementById("pageSubtitle").value =
    current.description || "";


  pageDialog.showModal();
});


// ==============================
// SAVE LEADERBOARD
// ==============================

pageForm.addEventListener("submit", async event => {

  event.preventDefault();


  const name =
    document.getElementById("pageName").value.trim();

  const description =
    document.getElementById("pageSubtitle").value.trim();


  if (!name) return;


  // RENAME
  if (pageDialogMode === "rename") {

    const { error } =
      await db
        .from("leaderboards")
        .update({
          name: name,
          description: description
        })
        .eq("id", currentLeaderboardId);


    if (error) {
      console.error(error);
      alert("Could not rename leaderboard.");
      return;
    }

  }

  // NEW LEADERBOARD
  else {

    const newID = createID();


    const { error } =
      await db
        .from("leaderboards")
        .insert({
          id: newID,
          name: name,
          description: description
        });


    if (error) {
      console.error(error);
      alert("Could not create leaderboard.");
      return;
    }


    currentLeaderboardId = newID;
  }


  // CLOSE THE POPUP
  pageDialog.close();


  // REFRESH THE SITE
  await loadData();
});


// ==============================
// DELETE LEADERBOARD
// ==============================

async function deleteLeaderboard(id) {

  if (leaderboards.length <= 1) {
    alert("You need to keep at least one leaderboard.");
    return;
  }


  const leaderboard =
    leaderboards.find(
      leaderboard => leaderboard.id === id
    );

  if (!leaderboard) return;


  if (!confirm(`Delete "${leaderboard.name}"?`)) {
    return;
  }


  const { error } =
    await db
      .from("leaderboards")
      .delete()
      .eq("id", id);


  if (error) {
    console.error(error);
    alert("Could not delete leaderboard.");
    return;
  }


  currentLeaderboardId = null;

  await loadData();
}


// ==============================
// SEARCH
// ==============================

searchEl.addEventListener("input", () => {
  renderLeaderboard();
});


// ==============================
// REMOVE OLD SORT DROPDOWN
// ==============================

const oldSort = document.getElementById("sort");

if (oldSort) {
  oldSort.parentElement.remove();
}


// ==============================
// START
// ==============================

loadData();


// Refresh every 5 seconds so friends'
// changes appear automatically.

setInterval(loadData, 5000);
