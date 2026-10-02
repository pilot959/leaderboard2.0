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

let folders = [];
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
// LOAD DATA
// ==============================

async function loadData() {

  // LOAD FOLDERS
  const { data: folderData, error: folderError } =
    await db
      .from("folders")
      .select("*")
      .order("name");

  if (folderError) {
    console.error(folderError);
    alert("Could not load folders.");
    return;
  }

  folders = folderData || [];

  // CREATE DEFAULT FOLDER IF NEEDED
  if (folders.length === 0) {

    const { data, error } =
      await db
        .from("folders")
        .insert({
          id: createID(),
          name: "My Tracks"
        })
        .select()
        .single();

    if (error) {
      console.error(error);
      alert("Could not create the first folder.");
      return;
    }

    folders = [data];
  }

  // LOAD LEADERBOARDS
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

  // PUT ANY OLD LEADERBOARDS INTO THE FIRST FOLDER
  const firstFolder = folders[0];

  for (const leaderboard of leaderboards) {

    if (!leaderboard.folder_id) {

      const { error } =
        await db
          .from("leaderboards")
          .update({
            folder_id: firstFolder.id
          })
          .eq("id", leaderboard.id);

      if (error) {
        console.error(error);
      } else {
        leaderboard.folder_id = firstFolder.id;
      }
    }
  }

  // CREATE FIRST LEADERBOARD IF NONE EXIST
  if (leaderboards.length === 0) {

    const id = createID();

    const { data, error } =
      await db
        .from("leaderboards")
        .insert({
          id: id,
          folder_id: firstFolder.id,
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

  // PICK CURRENT LEADERBOARD
  if (
    !currentLeaderboardId ||
    !leaderboards.some(
      leaderboard => leaderboard.id === currentLeaderboardId
    )
  ) {
    currentLeaderboardId = leaderboards[0].id;
  }

  // LOAD PLAYERS
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

    document.title =
      `${current.name} - Leaderboards`;

    titleEl.textContent =
      current.name;

    subtitleEl.textContent =
      current.description || "";
  }
}

// ==============================
// RENDER FOLDERS
// ==============================

function renderPages() {

  pagesEl.innerHTML = "";

  folders.forEach(folder => {

    const folderBox =
      document.createElement("div");

    folderBox.className =
      "folder";

    const folderHeader =
      document.createElement("div");

    folderHeader.className =
      "folder-header";

    folderHeader.innerHTML = `
      <span class="folder-arrow">▼</span>
      <span class="folder-icon">📁</span>
      <span class="folder-name">
        ${escapeHTML(folder.name)}
      </span>
      <button
        class="folder-delete"
        title="Delete empty folder"
      >
        🗑
      </button>
    `;

    folderBox.appendChild(folderHeader);

    const folderPages =
      document.createElement("div");

    folderPages.className =
      "folder-pages";

    const folderLeaderboards =
      leaderboards.filter(
        leaderboard =>
          leaderboard.folder_id === folder.id
      );

    folderLeaderboards.forEach(leaderboard => {

      const page =
        document.createElement("div");

      page.className =
        "page" +
        (
          leaderboard.id === currentLeaderboardId
            ? " active"
            : ""
        );

      page.dataset.id =
        leaderboard.id;

      page.innerHTML = `
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
      `;

      page.addEventListener("click", async event => {

        if (
          event.target.classList.contains("trash")
        ) {

          event.stopPropagation();

          await deleteLeaderboard(
            leaderboard.id
          );

          return;
        }

        currentLeaderboardId =
          leaderboard.id;

        await loadData();
      });

      folderPages.appendChild(page);
    });

    folderBox.appendChild(folderPages);

    // COLLAPSE / EXPAND FOLDER
    folderHeader.addEventListener(
      "click",
      event => {

        if (
          event.target.classList.contains(
            "folder-delete"
          )
        ) {
          return;
        }

        folderPages.classList.toggle(
          "collapsed"
        );

        const arrow =
          folderHeader.querySelector(
            ".folder-arrow"
          );

        arrow.textContent =
          folderPages.classList.contains(
            "collapsed"
          )
            ? "▶"
            : "▼";
      }
    );

    // DELETE FOLDER
    folderHeader
      .querySelector(".folder-delete")
      .addEventListener(
        "click",
        async event => {

          event.stopPropagation();

          await deleteFolder(
            folder.id
          );
        }
      );

    pagesEl.appendChild(folderBox);
  });

  // NEW FOLDER BUTTON
  const newFolderButton =
    document.createElement("button");

  newFolderButton.className =
    "add-page";

  newFolderButton.textContent =
    "＋ New Folder";

  newFolderButton.addEventListener(
    "click",
    createFolder
  );

  pagesEl.appendChild(
    newFolderButton
  );
}

// ==============================
// PLAYERS
// ==============================

function renderLeaderboard() {

  const searchText =
    searchEl.value
      .toLowerCase()
      .trim();

  let filteredPlayers =
    [...players];

  if (searchText) {

    filteredPlayers =
      filteredPlayers.filter(
        player =>
          player.name
            .toLowerCase()
            .includes(searchText)
      );
  }

  // FASTEST TIME = #1
  filteredPlayers.sort(
    (a, b) =>
      Number(a.score) -
      Number(b.score)
  );

  leaderboardEl.innerHTML = "";

  if (
    filteredPlayers.length === 0
  ) {

    emptyEl.classList.remove(
      "hidden"
    );

    return;
  }

  emptyEl.classList.add(
    "hidden"
  );

  leaderboardEl.innerHTML =
    filteredPlayers
      .map((player, index) => `

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

      `)
      .join("");

  document
    .querySelectorAll(".edit-player")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {
          editPlayer(
            button.dataset.id
          );
        }
      );
    });

  document
    .querySelectorAll(".delete-player")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {
          deletePlayer(
            button.dataset.id
          );
        }
      );
    });
}

// ==============================
// ADD PLAYER
// ==============================

addBtn.addEventListener(
  "click",
  () => {

    document.getElementById(
      "dialogTitle"
    ).textContent =
      "Add Player";

    document.getElementById(
      "playerId"
    ).value = "";

    document.getElementById(
      "playerName"
    ).value = "";

    document.getElementById(
      "playerScore"
    ).value = "";

    playerDialog.showModal();
  }
);

// ==============================
// SAVE PLAYER
// ==============================

playerForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    const id =
      document.getElementById(
        "playerId"
      ).value;

    const name =
      document.getElementById(
        "playerName"
      ).value.trim();

    const score =
      Number(
        document.getElementById(
          "playerScore"
        ).value
      );

    if (
      !name ||
      !Number.isFinite(score)
    ) {
      return;
    }

    // EDIT PLAYER
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

        alert(
          "Could not update player."
        );

        return;
      }

    }

    // NEW PLAYER
    else {

      const { error } =
        await db
          .from("players")
          .insert({
            id: createID(),
            leaderboard_id:
              currentLeaderboardId,
            name: name,
            score: score
          });

      if (error) {

        console.error(error);

        alert(
          "Could not add player."
        );

        return;
      }
    }

    playerDialog.close();

    await loadData();
  }
);

// ==============================
// EDIT PLAYER
// ==============================

function editPlayer(id) {

  const player =
    players.find(
      player => player.id === id
    );

  if (!player) return;

  document.getElementById(
    "dialogTitle"
  ).textContent =
    "Edit Player";

  document.getElementById(
    "playerId"
  ).value =
    player.id;

  document.getElementById(
    "playerName"
  ).value =
    player.name;

  document.getElementById(
    "playerScore"
  ).value =
    player.score;

  playerDialog.showModal();
}

// ==============================
// DELETE PLAYER
// ==============================

async function deletePlayer(id) {

  const player =
    players.find(
      player => player.id === id
    );

  if (!player) return;

  if (
    !confirm(
      `Delete ${player.name}?`
    )
  ) {
    return;
  }

  const { error } =
    await db
      .from("players")
      .delete()
      .eq("id", id);

  if (error) {

    console.error(error);

    alert(
      "Could not delete player."
    );

    return;
  }

  await loadData();
}

// ==============================
// CREATE FOLDER
// ==============================

async function createFolder() {

  const name =
    prompt("Folder name:");

  if (
    !name ||
    !name.trim()
  ) {
    return;
  }

  const { error } =
    await db
      .from("folders")
      .insert({
        id: createID(),
        name: name.trim()
      });

  if (error) {

    console.error(error);

    alert(
      "Could not create folder."
    );

    return;
  }

  await loadData();
}

// ==============================
// DELETE FOLDER
// ==============================

async function deleteFolder(id) {

  const folder =
    folders.find(
      folder => folder.id === id
    );

  if (!folder) return;

  const folderLeaderboards =
    leaderboards.filter(
      leaderboard =>
        leaderboard.folder_id === id
    );

  if (
    folderLeaderboards.length > 0
  ) {

    alert(
      "This folder still contains leaderboards. Move or delete them first."
    );

    return;
  }

  if (
    !confirm(
      `Delete folder "${folder.name}"?`
    )
  ) {
    return;
  }

  const { error } =
    await db
      .from("folders")
      .delete()
      .eq("id", id);

  if (error) {

    console.error(error);

    alert(
      "Could not delete folder."
    );

    return;
  }

  await loadData();
}

// ==============================
// FOLDER SELECTOR
// ==============================

function setupFolderSelector() {

  if (
    document.getElementById(
      "leaderboardFolder"
    )
  ) {
    return;
  }

  const nameInput =
    document.getElementById(
      "pageName"
    );

  const label =
    document.createElement(
      "label"
    );

  label.id =
    "folderSelectorLabel";

  label.innerHTML = `
    Folder

    <select
      id="leaderboardFolder"
      required
    ></select>
  `;

  nameInput.parentElement.after(
    label
  );
}

function updateFolderSelector(
  selectedFolderId = null
) {

  setupFolderSelector();

  const select =
    document.getElementById(
      "leaderboardFolder"
    );

  select.innerHTML =
    folders
      .map(folder => `

        <option
          value="${folder.id}"
          ${
            folder.id ===
            selectedFolderId
              ? "selected"
              : ""
          }
        >
          ${escapeHTML(folder.name)}
        </option>

      `)
      .join("");
}

// ==============================
// NEW LEADERBOARD
// ==============================

addPageBtn.addEventListener(
  "click",
  () => {

    pageDialogMode =
      "new";

    document.getElementById(
      "pageDialogTitle"
    ).textContent =
      "New Leaderboard";

    document.getElementById(
      "pageName"
    ).value = "";

    document.getElementById(
      "pageSubtitle"
    ).value = "";

    updateFolderSelector(
      folders[0]?.id
    );

    pageDialog.showModal();
  }
);

// ==============================
// RENAME / MOVE LEADERBOARD
// ==============================

renamePageBtn.addEventListener(
  "click",
  () => {

    const current =
      getCurrentLeaderboard();

    if (!current) return;

    pageDialogMode =
      "rename";

    document.getElementById(
      "pageDialogTitle"
    ).textContent =
      "Rename / Move Leaderboard";

    document.getElementById(
      "pageName"
    ).value =
      current.name;

    document.getElementById(
      "pageSubtitle"
    ).value =
      current.description || "";

    updateFolderSelector(
      current.folder_id
    );

    pageDialog.showModal();
  }
);

// ==============================
// SAVE LEADERBOARD
// ==============================

pageForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    const name =
      document.getElementById(
        "pageName"
      ).value.trim();

    const description =
      document.getElementById(
        "pageSubtitle"
      ).value.trim();

    const folderSelect =
      document.getElementById(
        "leaderboardFolder"
      );

    if (!folderSelect) {

      alert(
        "Folder selector is missing. Please refresh the page."
      );

      return;
    }

    const folderId =
      folderSelect.value;

    if (
      !name ||
      !folderId
    ) {
      return;
    }

    // RENAME / MOVE
    if (
      pageDialogMode ===
      "rename"
    ) {

      const { error } =
        await db
          .from("leaderboards")
          .update({
            name: name,
            description: description,
            folder_id: folderId
          })
          .eq(
            "id",
            currentLeaderboardId
          );

      if (error) {

        console.error(error);

        alert(
          "Could not update leaderboard."
        );

        return;
      }
    }

    // NEW LEADERBOARD
    else {

      const newID =
        createID();

      const { error } =
        await db
          .from("leaderboards")
          .insert({
            id: newID,
            folder_id: folderId,
            name: name,
            description: description
          });

      if (error) {

        console.error(error);

        alert(
          "Could not create leaderboard."
        );

        return;
      }

      currentLeaderboardId =
        newID;
    }

    pageDialog.close();

    await loadData();
  }
);

// ==============================
// DELETE LEADERBOARD
// ==============================

async function deleteLeaderboard(id) {

  if (
    leaderboards.length <= 1
  ) {

    alert(
      "You need to keep at least one leaderboard."
    );

    return;
  }

  const leaderboard =
    leaderboards.find(
      leaderboard =>
        leaderboard.id === id
    );

  if (!leaderboard) return;

  if (
    !confirm(
      `Delete "${leaderboard.name}"?`
    )
  ) {
    return;
  }

  const { error } =
    await db
      .from("leaderboards")
      .delete()
      .eq("id", id);

  if (error) {

    console.error(error);

    alert(
      "Could not delete leaderboard."
    );

    return;
  }

  currentLeaderboardId =
    null;

  await loadData();
}

// ==============================
// SEARCH
// ==============================

searchEl.addEventListener(
  "input",
  () => {
    renderLeaderboard();
  }
);

// ==============================
// REMOVE OLD SORT DROPDOWN
// ==============================

const oldSort =
  document.getElementById(
    "sort"
  );

if (oldSort) {
  oldSort.parentElement.remove();
}

// ==============================
// START
// ==============================

loadData();

// Refresh every 5 seconds
setInterval(
  loadData,
  5000
);
