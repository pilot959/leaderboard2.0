const STORAGE_KEY = "myMultiLeaderboard";

const defaultData = {
  activeLeaderboard: "speedruns",
  leaderboards: [
    {
      id: "speedruns",
      name: "Speedruns",
      description: "Best times and scores",
      players: [
        { id: "1", name: "Alex", score: 980 },
        { id: "2", name: "Jordan", score: 875 },
        { id: "3", name: "Sam", score: 760 }
      ]
    },
    {
      id: "arcade",
      name: "Arcade",
      description: "Highest arcade scores",
      players: [
        { id: "4", name: "Taylor", score: 1250 },
        { id: "5", name: "Morgan", score: 920 }
      ]
    }
  ]
};

let data = loadData();
let pageDialogMode = "new";

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return structuredClone(defaultData);
    }
  }

  return structuredClone(defaultData);
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function createID() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
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
  return data.leaderboards.find(
    leaderboard => leaderboard.id === data.activeLeaderboard
  );
}

function render() {
  renderPages();
  renderLeaderboard();

  const current = getCurrentLeaderboard();

  if (current) {
    document.title = `${current.name} - Leaderboards`;
    document.getElementById("title").textContent = current.name;
    document.getElementById("subtitle").textContent = current.description;
  }
}

function renderPages() {
  const pages = document.getElementById("pages");

  pages.innerHTML = data.leaderboards.map(leaderboard => `
    <div
      class="page ${leaderboard.id === data.activeLeaderboard ? "active" : ""}"
      data-id="${leaderboard.id}"
    >
      <span class="dot"></span>
      <span class="page-name">${escapeHTML(leaderboard.name)}</span>
      <button class="trash" title="Delete leaderboard">🗑</button>
    </div>
  `).join("");

  document.querySelectorAll(".page").forEach(page => {
    page.addEventListener("click", () => {
      data.activeLeaderboard = page.dataset.id;
      saveData();
      render();
    });

    page.querySelector(".trash").addEventListener("click", event => {
      event.stopPropagation();
      deleteLeaderboard(page.dataset.id);
    });
  });
}

function renderLeaderboard() {
  const current = getCurrentLeaderboard();
  const leaderboard = document.getElementById("leaderboard");
  const empty = document.getElementById("empty");

  if (!current) {
    leaderboard.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }

  const searchText = document
    .getElementById("search")
    .value
    .toLowerCase()
    .trim();

  const sortType = document.getElementById("sort").value;

  let players = [...current.players];

  if (searchText) {
    players = players.filter(player =>
      player.name.toLowerCase().includes(searchText)
    );
  }

  if (sortType === "scoreDesc") {
    players.sort((a, b) => Number(b.score) - Number(a.score));
  }

  if (sortType === "scoreAsc") {
    players.sort((a, b) => Number(a.score) - Number(b.score));
  }

  if (sortType === "name") {
    players.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (players.length === 0) {
    leaderboard.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");

  leaderboard.innerHTML = players.map((player, index) => `
    <div class="row">
      <span class="rank">${index + 1}</span>

      <span class="player">
        ${escapeHTML(player.name)}
      </span>

      <span class="score">
        ${escapeHTML(player.score)}
      </span>

      <span class="actions">
        <button class="secondary edit-player" data-id="${player.id}">
          ✏ Edit
        </button>

        <button class="danger delete-player" data-id="${player.id}">
          🗑
        </button>
      </span>
    </div>
  `).join("");

  document.querySelectorAll(".edit-player").forEach(button => {
    button.addEventListener("click", () => {
      editPlayer(button.dataset.id);
    });
  });

  document.querySelectorAll(".delete-player").forEach(button => {
    button.addEventListener("click", () => {
      deletePlayer(button.dataset.id);
    });
  });
}


// -------------------------
// PLAYER FUNCTIONS
// -------------------------

const playerDialog = document.getElementById("playerDialog");
const playerForm = document.getElementById("playerForm");

document.getElementById("addBtn").addEventListener("click", () => {
  document.getElementById("dialogTitle").textContent = "Add Player";
  document.getElementById("playerId").value = "";
  document.getElementById("playerName").value = "";
  document.getElementById("playerScore").value = "";

  playerDialog.showModal();
});

playerForm.addEventListener("submit", event => {
  event.preventDefault();

  const current = getCurrentLeaderboard();

  const id = document.getElementById("playerId").value;
  const name = document.getElementById("playerName").value.trim();
  const score = document.getElementById("playerScore").value;

  if (!name || !score || !current) return;

  if (id) {
    const player = current.players.find(player => player.id === id);

    if (player) {
      player.name = name;
      player.score = Number(score);
    }
  } else {
    current.players.push({
      id: createID(),
      name,
      score: Number(score)
    });
  }

  saveData();
  render();
  playerDialog.close();
});

function editPlayer(id) {
  const current = getCurrentLeaderboard();

  if (!current) return;

  const player = current.players.find(player => player.id === id);

  if (!player) return;

  document.getElementById("dialogTitle").textContent = "Edit Player";
  document.getElementById("playerId").value = player.id;
  document.getElementById("playerName").value = player.name;
  document.getElementById("playerScore").value = player.score;

  playerDialog.showModal();
}

function deletePlayer(id) {
  const current = getCurrentLeaderboard();

  if (!current) return;

  const player = current.players.find(player => player.id === id);

  if (!player) return;

  if (!confirm(`Delete ${player.name}?`)) return;

  current.players = current.players.filter(player => player.id !== id);

  saveData();
  render();
}


// -------------------------
// LEADERBOARD PAGE FUNCTIONS
// -------------------------

const pageDialog = document.getElementById("pageDialog");
const pageForm = document.getElementById("pageForm");

document.getElementById("addPageBtn").addEventListener("click", () => {
  pageDialogMode = "new";

  document.getElementById("pageDialogTitle").textContent =
    "New Leaderboard";

  document.getElementById("pageName").value = "";
  document.getElementById("pageSubtitle").value = "";

  pageDialog.showModal();
});

document.getElementById("renamePageBtn").addEventListener("click", () => {
  const current = getCurrentLeaderboard();

  if (!current) return;

  pageDialogMode = "rename";

  document.getElementById("pageDialogTitle").textContent =
    "Rename Leaderboard";

  document.getElementById("pageName").value = current.name;
  document.getElementById("pageSubtitle").value = current.description;

  pageDialog.showModal();
});

pageForm.addEventListener("submit", event => {
  event.preventDefault();

  const name = document.getElementById("pageName").value.trim();
  const description =
    document.getElementById("pageSubtitle").value.trim();

  if (!name) return;

  if (pageDialogMode === "rename") {
    const current = getCurrentLeaderboard();

    if (current) {
      current.name = name;
      current.description = description;
    }
  } else {
    const newLeaderboard = {
      id: createID(),
      name,
      description,
      players: []
    };

    data.leaderboards.push(newLeaderboard);
    data.activeLeaderboard = newLeaderboard.id;
  }

  saveData();
  render();
  pageDialog.close();
});

function deleteLeaderboard(id) {
  if (data.leaderboards.length <= 1) {
    alert("You need to keep at least one leaderboard.");
    return;
  }

  const leaderboard = data.leaderboards.find(
    leaderboard => leaderboard.id === id
  );

  if (!leaderboard) return;

  if (!confirm(`Delete "${leaderboard.name}"?`)) return;

  data.leaderboards = data.leaderboards.filter(
    leaderboard => leaderboard.id !== id
  );

  if (data.activeLeaderboard === id) {
    data.activeLeaderboard = data.leaderboards[0].id;
  }

  saveData();
  render();
}


// -------------------------
// SEARCH + SORT
// -------------------------

document.getElementById("search").addEventListener("input", () => {
  renderLeaderboard();
});

document.getElementById("sort").addEventListener("change", () => {
  renderLeaderboard();
});


// -------------------------
// START
// -------------------------

render();
