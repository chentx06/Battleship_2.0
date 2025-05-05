//Speak & display
function speak(msg) {
    document.getElementById('vc-feedback').textContent = msg;
    const u = new SpeechSynthesisUtterance(msg);
    u.lang = 'en-US';
    window.speechSynthesis.speak(u);
}

//10×10 board with labels (columns A-J, rows 1-10)
function createBoard(boardId) {
    const board = document.getElementById(boardId);
    // clear if recreating
    board.innerHTML = '';
    // Adjust grid to 11×11 for labels
    board.style.display = 'grid';
    board.style.gridTemplateColumns = '40px repeat(10, 40px)';
    board.style.gridTemplateRows = '40px repeat(10, 40px)';

    // top-left empty cell
    const empty = document.createElement('div');
    empty.classList.add('label');
    board.appendChild(empty);

    // column headers A-J
    for (let c = 0; c < 10; c++) {
        const header = document.createElement('div');
        header.classList.add('label');
        header.textContent = String.fromCharCode(65 + c); // A, B, ...
        board.appendChild(header);
    }

    // rows 1-10
    for (let r = 0; r < 10; r++) {
        // row header
        const rowLabel = document.createElement('div');
        rowLabel.classList.add('label');
        rowLabel.textContent = r + 1;
        board.appendChild(rowLabel);
        // row cells
        for (let c = 0; c < 10; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = r;
            cell.dataset.column = c;
            // allow drop
            cell.addEventListener('dragover', e => e.preventDefault());
            cell.addEventListener('drop', handleDrop);
            board.appendChild(cell);
        }
    }
}

//put ships in pool
function createShips() {
    const lengths = [5, 4, 3, 3, 2];
    const pool = document.getElementById('ship-pool');
    pool.innerHTML = '';
    lengths.forEach((len, idx) => {
        const ship = document.createElement('div');
        ship.id = `ship-${idx}`;
        ship.classList.add('ship');
        ship.draggable = true;
        ship.dataset.length = len;
        // visual length is 40*length + gaps
        ship.style.width = `${40 * len + (len - 1) * 2}px`;
        ship.style.height = '40px';
        ship.textContent = `${len}`.padStart(2, ' ');
        ship.addEventListener('dragstart', handleDragStart);
        pool.appendChild(ship);
    });
}

//drag & drop
let draggedShip = null;
function handleDragStart(e) {
    draggedShip = e.target;
}

function handleDrop(e) {
    e.preventDefault();
    const cell = e.target;
    // ignore drops on label cells
    if (!cell.classList.contains('cell')) return;
    const length = +draggedShip.dataset.length;
    const row = +cell.dataset.row;
    const column = +cell.dataset.column;

    // simple horizontal placement
    if (column + length > 10) {
        speak('Out of bounds, try another cell.');
        return;
    }

    // check overlap
    const boardId = cell.parentElement.id;
    for (let i = 0; i < length; i++) {
        const check = document.querySelector(
            `#${boardId} .cell[data-row="${row}"][data-column="${column + i}"]`
        );
        if (check.classList.contains('ship')) {
            speak('Overlap detected, try again.');
            return;
        }
    }

    // put ship
    for (let i = 0; i < length; i++) {
        const placeCell = document.querySelector(
            `#${boardId} .cell[data-row="${row}"][data-column="${column + i}"]`
        );
        placeCell.classList.add('ship');
    }
    //removing from pool
    draggedShip.remove();
    const colLabel = String.fromCharCode(65 + column);
    const rowLabel = row + 1;
    speak(`Placed ship of length ${length} at column ${colLabel}, row ${rowLabel}.`);

    //track the ship
    const player = cell.parentElement.id === 'player1-board' ? 'player1' : 'player2';

    // prevent placing more than 5 ships
    if (placedShipsCount[player] >= 5) {
        speak("You've already placed 5 ships.");
        return;
    }

    // track ship
    playerShips[player].push({
        row,
        col: column,
        length
    });

    placedShipsCount[player]++;

    if (placedShipsCount[player] === 5) {
        document.getElementById('save-button').disabled = false;
        speak("All ships placed. You can now save your placement.");
    }
}

//function that doesnt allow player 1 to drag ships onto player 2 board
function makeBoardDroppable(player) {
    const boardId = player === 'player1' ? 'player1-board' : 'player2-board';
    const otherBoardId = player === 'player1' ? 'player2-board' : 'player1-board';

    // Enable drop on current player's board
    document.querySelectorAll(`#${boardId} .cell`).forEach(cell => {
        cell.addEventListener('dragover', e => e.preventDefault());
        cell.addEventListener('drop', handleDrop);
    });

    // Disable drop on other player's board
    document.querySelectorAll(`#${otherBoardId} .cell`).forEach(cell => {
        cell.removeEventListener('dragover', e => e.preventDefault());
        cell.removeEventListener('drop', handleDrop);
    });
}

// initialize
window.addEventListener('DOMContentLoaded', () => {
    createBoard('player1-board');
    createBoard('player2-board');
    createShips();
    makeBoardDroppable(currentPlayer); // Enable only Player 1 board
    speak('Welcome! Drag your ships onto Player 1 board to begin.');
});

//store placed ships into this
const playerShips = {
    player1: [],
    player2: []
};

//updated the save button and locks the placment of the ships and moves onto player 2
let currentPlayer = 'player1';

document.getElementById('save-button').addEventListener('click', () => {
    if (currentPlayer === 'player1') {
        // Lock Player 1 Board
        document.querySelectorAll('#player1-board .cell').forEach(cell => {
            cell.removeEventListener('drop', handleDrop);
            cell.removeEventListener('dragover', e => e.preventDefault());
        });
        speak('Player 1 saved. Now Player 2, place your ships.');
        createShips(); // Refresh ship pool
        currentPlayer = 'player2';
        makeBoardDroppable(currentPlayer);
        document.getElementById('save-button').disabled = true;
    } else if (currentPlayer === 'player2') {
        // Lock Player 2 Board
        document.querySelectorAll('#player2-board .cell').forEach(cell => {
            cell.removeEventListener('drop', handleDrop);
            cell.removeEventListener('dragover', e => e.preventDefault());
        });
        speak('Player 2 saved. You may now start the game.');
        document.getElementById('start-button').disabled = false;
        document.getElementById('save-button').disabled = true;
    }
});

//track placed ships
let placedShipsCount = {
    player1: 0,
    player2: 0
};



//next steps:
//add flipping
//modify drag and drop more so it's more accurate
