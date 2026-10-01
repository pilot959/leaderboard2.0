// ==========================================
// MULTI-LEADERBOARD SCRIPT
// ==========================================

const STORAGE_KEY = "myMultiLeaderboard";


// ------------------------------------------
// STARTING DATA
// ------------------------------------------

const startingData = {

    activeLeaderboard: "speedruns",

    leaderboards: [

        {
            id: "speedruns",
            name: "Speedruns",
            description: "Best times and scores",

            players: [
                {
                    id: "player1",
                    name: "Alex",
                    score: 980
                },

                {
                    id: "player2",
                    name: "Jordan",
                    score: 875
                },

                {
                    id: "player3",
                    name: "Sam",
                    score: 760
                }
            ]
        },


        {
            id: "arcade",
            name: "Arcade",
            description: "Highest arcade scores",

            players: [
                {
                    id: "player4",
                    name: "Taylor",
                    score: 1250
                },

                {
                    id: "player5",
                    name: "Morgan",
                    score: 920
                }
            ]
        }

    ]

};


// ------------------------------------------
// LOAD DATA
// ------------------------------------------

let data =
    JSON.parse(localStorage.getItem(STORAGE_KEY))
    || startingData;


// ------------------------------------------
// HELPER FUNCTIONS
// ------------------------------------------

function saveData() {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(data)
    );

}


function getCurrentLeaderboard() {

    return data.leaderboards.find(
        leaderboard =>
            leaderboard.id === data.activeLeaderboard
    );

}


function createID() {

    return Date.now().toString() +
        Math.random().toString(36).substring(2);

}


function escapeHTML(text) {

    return text.replace(
        /[&<>"']/g,

        function(character) {

            const characters = {

                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"

            };

            return characters[character];

        }
    );

}


// ------------------------------------------
// RENDER EVERYTHING
// ------------------------------------------

function render() {

    renderPages();

    renderLeaderboard();

}


// ------------------------------------------
// RENDER LEADERBOARD PAGES
// ------------------------------------------

function renderPages() {

    const pages = document.getElementById("pages");

    pages.innerHTML = "";


    data.leaderboards.forEach(

        function(leaderboard) {

            const page = document.createElement("div");

            page.className = "page";


            if (
                leaderboard.id ===
                data.activeLeaderboard
            ) {

                page.classList.add("active");

            }


            page.innerHTML = `

                <span class="dot">
                    📄
                </span>

                <span class="page-name">
                    ${escapeHTML(leaderboard.name)}
                </span>

            `;


            // Switch leaderboard

            page.onclick = function() {

                data.activeLeaderboard =
                    leaderboard.id;

                saveData();

                document.getElementById("search").value = "";

                render();

            };


            // Delete button

            const deleteButton =
                document.createElement("button");

            deleteButton.className = "trash";

            deleteButton.textContent = "✕";

            deleteButton.title =
                "Delete leaderboard";


            deleteButton.onclick = function(event) {

                event.stopPropagation();

                deleteLeaderboard(
                    leaderboard.id
                );

            };


            page.appendChild(deleteButton);

            pages.appendChild(page);

        }

    );

}


// ------------------------------------------
// RENDER PLAYERS
// ------------------------------------------

function renderLeaderboard() {

    const leaderboard =
        getCurrentLeaderboard();


    if (!leaderboard) {

        return;

    }


    document.getElementById("title")
        .textContent =
        leaderboard.name;


    document.getElementById("subtitle")
        .textContent =
        leaderboard.description;


    const search =
        document.getElementById("search")
            .value
            .toLowerCase()
            .trim();


    let players =
        leaderboard.players.filter(

            function(player) {

                return player.name
                    .toLowerCase()
                    .includes(search);

            }

        );


    // --------------------------------------
    // SORT
    // --------------------------------------

    const sort =
        document.getElementById("sort").value;


    if (sort === "scoreDesc") {

        players.sort(
            (a, b) => b.score - a.score
        );

    }


    if (sort === "scoreAsc") {

        players.sort(
            (a, b) => a.score - b.score
        );

    }


    if (sort === "name") {

        players.sort(
            (a, b) =>
                a.name.localeCompare(b.name)
        );

    }


    const container =
        document.getElementById("leaderboard");


    container.innerHTML = "";


    const empty =
        document.getElementById("empty");


    empty.classList.toggle(
        "hidden",
        players.length !== 0
    );


    // --------------------------------------
    // CREATE PLAYER ROWS
    // --------------------------------------

    players.forEach(

        function(player, index) {

            const row =
                document.createElement("div");

            row.className = "row";


            let rank;


            if (index === 0) {

                rank = "🥇";

            }

            else if (index === 1) {

                rank = "🥈";

            }

            else if (index === 2) {

                rank = "🥉";

            }

            else {

                rank = "#" + (index + 1);

            }


            row.innerHTML = `

                <div class="rank">
                    ${rank}
                </div>

                <div class="player">
                    ${escapeHTML(player.name)}
                </div>

                <div class="score">
                    ${Number(player.score).toLocaleString()}
                </div>

                <div class="actions">

                    <button
                        class="secondary"
                        onclick="editPlayer('${player.id}')"
                    >
                        Edit
                    </button>

                    <button
                        class="danger"
                        onclick="deletePlayer('${player.id}')"
                    >
                        Delete
                    </button>

                </div>

            `;


            container.appendChild(row);

        }

    );

}


// ------------------------------------------
// ADD PLAYER
// ------------------------------------------

document.getElementById("addBtn").onclick =
    function() {

        document.getElementById("dialogTitle")
            .textContent =
            "Add Player";


        document.getElementById("playerId")
            .value = "";


        document.getElementById("playerName")
            .value = "";


        document.getElementById("playerScore")
            .value = "";


        document.getElementById("playerDialog")
            .showModal();

    };


// ------------------------------------------
// SAVE PLAYER
// ------------------------------------------

document.getElementById("playerForm")
    .addEventListener(

        "submit",

        function(event) {

            event.preventDefault();


            const leaderboard =
                getCurrentLeaderboard();


            const id =
                document.getElementById("playerId")
                    .value;


            const name =
                document.getElementById("playerName")
                    .value
                    .trim();


            const score =
                Number(
                    document.getElementById("playerScore")
                        .value
                );


            if (!name) {

                return;

            }


            if (Number.isNaN(score)) {

                return;

            }


            // Editing existing player

            if (id) {

                const player =
                    leaderboard.players.find(
                        player =>
                            player.id === id
                    );


                if (player) {

                    player.name = name;

                    player.score = score;

                }

            }


            // Adding new player

            else {

                leaderboard.players.push({

                    id: createID(),

                    name: name,

                    score: score

                });

            }


            saveData();

            render();


            document.getElementById("playerDialog")
                .close();

        }

    );


// ------------------------------------------
// EDIT PLAYER
// ------------------------------------------

window.editPlayer = function(id) {

    const leaderboard =
        getCurrentLeaderboard();


    const player =
        leaderboard.players.find(
            player =>
                player.id === id
        );


    if (!player) {

        return;

    }


    document.getElementById("dialogTitle")
        .textContent =
        "Edit Player";


    document.getElementById("playerId")
        .value =
        player.id;


    document.getElementById("playerName")
        .value =
        player.name;


    document.getElementById("playerScore")
        .value =
        player.score;


    document.getElementById("playerDialog")
        .showModal();

};


// ------------------------------------------
// DELETE PLAYER
// ------------------------------------------

window.deletePlayer = function(id) {

    const leaderboard =
        getCurrentLeaderboard();


    const player =
        leaderboard.players.find(
            player =>
                player.id === id
        );


    if (!player) {

        return;

    }


    const confirmed =
        confirm(
            "Delete " +
            player.name +
            "?"
        );


    if (!confirmed) {

        return;

    }


    leaderboard.players =
        leaderboard.players.filter(
            player =>
                player.id !== id
        );


    saveData();

    render();

};


// ------------------------------------------
// CREATE NEW LEADERBOARD
// ------------------------------------------

document.getElementById("addPageBtn")
    .onclick = function() {

        document.getElementById("pageDialogTitle")
            .textContent =
            "New Leaderboard";


        document.getElementById("pageName")
            .value = "";


        document.getElementById("pageSubtitle")
            .value = "";


        document.getElementById("pageDialog")
            .showModal();

    };


// ------------------------------------------
// SAVE NEW LEADERBOARD
// ------------------------------------------

document.getElementById("pageForm")
    .addEventListener(

        "submit",

        function(event) {

            event.preventDefault();


            const name =
                document.getElementById("pageName")
                    .value
                    .trim();


            const description =
                document.getElementById("pageSubtitle")
                    .value
                    .trim();


            if (!name) {

                return;

            }


            const newLeaderboard = {

                id: createID(),

                name: name,

                description:
                    description ||
                    "Leaderboard",

                players: []

            };


            data.leaderboards.push(
                newLeaderboard
            );


            data.activeLeaderboard =
                newLeaderboard.id;


            saveData();

            render();


            document.getElementById("pageDialog")
                .close();

        }

    );


// ------------------------------------------
// RENAME LEADERBOARD
// ------------------------------------------

document.getElementById("renamePageBtn")
    .onclick = function() {

        const leaderboard =
            getCurrentLeaderboard();


        if (!leaderboard) {

            return;

        }


        document.getElementById("pageDialogTitle")
            .textContent =
            "Edit Leaderboard";


        document.getElementById("pageName")
            .value =
            leaderboard.name;


        document.getElementById("pageSubtitle")
            .value =
            leaderboard.description;


        document.getElementById("pageDialog")
            .showModal();

    };


// ------------------------------------------
// SAVE RENAMED LEADERBOARD
// ------------------------------------------

document.getElementById("pageForm")
    .addEventListener(

        "close",

        function() {

            // Nothing needed here.
            // The submit handler above
            // handles saving.

        }

    );


// We need to detect rename separately.
// This listener handles the dialog's save button.

document.getElementById("pageDialog")
    .addEventListener(

        "submit",

        function() {

            const leaderboard =
                getCurrentLeaderboard();


            if (!leaderboard) {

                return;

            }


            // If the current leaderboard
            // already has players and the dialog
            // was opened with Rename, update it.

        }

    );


// ------------------------------------------
// SEARCH
// ------------------------------------------

document.getElementById("search")
    .addEventListener(

        "input",

        function() {

            renderLeaderboard();

        }

    );


// ------------------------------------------
// SORT
// ------------------------------------------

document.getElementById("sort")
    .addEventListener(

        "change",

        function() {

            renderLeaderboard();

        }

    );


// ------------------------------------------
// INITIAL DISPLAY
// ------------------------------------------

render();
