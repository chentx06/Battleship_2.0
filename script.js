const hitSound = new Audio('hit.mp3');
const missSound = new Audio('miss.mp3');
const sinkSound = new Audio('sink.mp3');
const victorySound = new Audio('victory.mp3');

function speak(msg) {
    document.getElementById('vc-feedback').textContent = msg;
    const u = new SpeechSynthesisUtterance(msg);
    u.lang = 'en-US';
    window.speechSynthesis.speak(u);
}

let currentOrientation = 'horizontal';

document.getElementById('rotate-button').addEventListener('click', () => {
    currentOrientation = currentOrientation === 'horizontal' ? 'vertical' : 'horizontal';
    speak(`Orientation set to ${currentOrientation}`);
});

function placeShip(startCell, shipLength) {
    const board = startCell.parentElement;
    const startRow = parseInt(startCell.dataset.row);
    const startCol = parseInt(startCell.dataset.col);

    const cellsToPlace = [];

    for (let i = 0; i < shipLength; i++) {
        const row = currentOrientation === 'horizontal' ? startRow : startRow + i;
        const col = currentOrientation === 'horizontal' ? startCol + i : startCol;

        const cell = board.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
        if (!cell || cell.classList.contains('ship')) {
            speak("Invalid placement");
            return false;
        }
        cellsToPlace.push(cell);
    }

    cellsToPlace.forEach(cell => cell.classList.add('ship'));
    return true;
}

function createBoard(boardId) {
    const board = document.getElementById(boardId);
    board.innerHTML = '';
    board.style.display = 'grid';
    board.style.gridTemplateColumns = '40px repeat(10, 40px)';
    board.style.gridTemplateRows = '40px repeat(10, 40px)';

    const empty = document.createElement('div');
    empty.classList.add('label');
    board.appendChild(empty);

    for (let c = 0; c < 10; c++) {
        const header = document.createElement('div');
        header.classList.add('label');
        header.textContent = String.fromCharCode(65 + c); // A, B, ...
        board.appendChild(header);
    }

    for (let r = 0; r < 10; r++) {
        const rowLabel = document.createElement('div');
        rowLabel.classList.add('label');
        rowLabel.textContent = r + 1;
        board.appendChild(rowLabel);
        for (let c = 0; c < 10; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = r;
            cell.dataset.column = c;
            cell.addEventListener('dragover', e => e.preventDefault());
            cell.addEventListener('drop', handleDrop);
            board.appendChild(cell);
        }
    }
}

function createShips() {
    const lengths = [2,3,3,4,5];
    const pool = document.getElementById('ship-pool');
    pool.innerHTML = '';
    lengths.forEach((len, idx) => {
        const ship = document.createElement('div');
        ship.id = `ship-${idx}`;
        ship.classList.add('ship');
        ship.draggable = true;
        ship.dataset.length = len;
        ship.style.width = `${40 * len + (len - 1) * 2}px`;
        ship.style.height = '40px';
        ship.textContent = `${len}`.padStart(2, ' ');
        ship.addEventListener('dragstart', handleDragStart);
        pool.appendChild(ship);
    });
}

let draggedShip = null;
function handleDragStart(e) {
    draggedShip = e.target;
}

function handleDrop(e) {
    e.preventDefault();
    const cell = e.target;
    if (!cell.classList.contains('cell')) return;

    const length = +draggedShip.dataset.length;
    const row = +cell.dataset.row;
    const column = +cell.dataset.column;


    const boardId = cell.parentElement.id;

    if ((currentOrientation === 'horizontal' && column + length > 10) ||
        (currentOrientation === 'vertical' && row + length > 10)) {
        speak('Out of bounds, try another cell.');
        return;
    }

    for (let i = 0; i < length; i++) {
        const checkRow = currentOrientation === 'horizontal' ? row : row + i;
        const checkCol = currentOrientation === 'horizontal' ? column + i : column;
        const check = document.querySelector(
            `#${boardId} .cell[data-row="${checkRow}"][data-column="${checkCol}"]`
        );
        if (check.classList.contains('ship')) {
            speak('Overlap detected, try again.');
            return;
        }
    }

    for (let i = 0; i < length; i++) {
        const placeRow = currentOrientation === 'horizontal' ? row : row + i;
        const placeCol = currentOrientation === 'horizontal' ? column + i : column;
        const placeCell = document.querySelector(
            `#${boardId} .cell[data-row="${placeRow}"][data-column="${placeCol}"]`
        );
        placeCell.classList.add('ship');
    }

    draggedShip.remove();
    const colLabel = String.fromCharCode(65 + column);
    const rowLabel = row + 1;
    speak(`Placed ship of length ${length} at column ${colLabel}, row ${rowLabel}.`);

    const player = cell.parentElement.id === 'player1-board' ? 'player1' : 'player2';

    if (placedShipsCount[player] >= 5) {
        speak("You've already placed 5 ships.");
        return;
    }

    const cells = [];
    for (let i = 0; i < length; i++) {
        cells.push({ row, col: column + i, hit: false });
    }
    playerShips[player].push({
        length,
        cells
    });

    placedShipsCount[player]++;

    if (placedShipsCount[player] === 5) {
        document.getElementById('save-button').disabled = false;
        speak("All ships placed. You can now save your placement.");
    }
}

function makeBoardDroppable(player) {
    const boardId = player === 'player1' ? 'player1-board' : 'player2-board';
    const otherBoardId = player === 'player1' ? 'player2-board' : 'player1-board';

    document.querySelectorAll(`#${boardId} .cell`).forEach(cell => {
        cell.addEventListener('dragover', e => e.preventDefault());
        cell.addEventListener('drop', handleDrop);
    });

    document.querySelectorAll(`#${otherBoardId} .cell`).forEach(cell => {
        cell.removeEventListener('dragover', e => e.preventDefault());
        cell.removeEventListener('drop', handleDrop);
    });
}

window.addEventListener('DOMContentLoaded', () => {
    createBoard('player1-board');
    createBoard('player2-board');
    createShips();
    makeBoardDroppable(currentPlayer);

    const startSpeech = () => {
        speak('Welcome to Battleship! Hold spacebar to use our immersive mode, allowing you to speak to the game. Say instructions anytime for help.');
        window.removeEventListener('keydown', startSpeech); // remove listener after first use
    };

    window.addEventListener('keydown', startSpeech);
});


const playerShips = {
    player1: [],
    player2: []
};

let currentPlayer = 'player1';

document.getElementById('save-button').addEventListener('click', () => {
    if (currentPlayer === 'player1') {
        document.querySelectorAll('#player1-board .cell').forEach(cell => {
            cell.removeEventListener('drop', handleDrop);
            cell.removeEventListener('dragover', e => e.preventDefault());
        });
        grayOutBoard('player1-board');
        speak('Player 1 saved. Now Player 2, place your ships.');
        createShips();
        currentPlayer = 'player2';
        makeBoardDroppable(currentPlayer);
        document.getElementById('save-button').disabled = true;
    } else if (currentPlayer === 'player2') {
        document.querySelectorAll('#player2-board .cell').forEach(cell => {
            cell.removeEventListener('drop', handleDrop);
            cell.removeEventListener('dragover', e => e.preventDefault());
        });
        grayOutBoard('player2-board');
        speak('Player 2 saved. You may now start the game.');
        document.getElementById('start-button').disabled = false;
        document.getElementById('save-button').disabled = true;
    }
});

let placedShipsCount = {
    player1: 0,
    player2: 0
};


let currentTurn = 'player1';
let gameStarted = false;

document.getElementById('start-button').addEventListener('click', () => {
    speak('Game started. Player 1, make your move.');
    gameStarted = true;

    // turns the boards grey in the start
    grayOutBoard('player1-board');
    grayOutBoard('player2-board');

    // remove player 2's greyed-out board
    document.getElementById('player2-board').classList.remove('grayed-out');
    
    // set up the attack board
    updateAttackBoard();
    document.getElementById('start-button').disabled = true;
});

const totalShipParts = 17;
let hitCounts = {
    player1: 0,
    player2: 0
};

function handleAttack(e) {
    if (!gameStarted) return;

    const cell = e.target;
    const boardId = cell.parentElement.id;
    const opponent = currentTurn === 'player1' ? 'player2' : 'player1';

    // validate attack
    if ((currentTurn === 'player1' && boardId !== 'player2-board') ||
        (currentTurn === 'player2' && boardId !== 'player1-board')) {
        speak("Wrong board");
        return;
    }

    if (cell.classList.contains('hit') || cell.classList.contains('miss')) {
        speak('Already attacked there');
        return;
    }

    if (cell.classList.contains('ship')) {
        // hit processing
        cell.classList.add('hit');
        hitSound.currentTime = 0;
        hitSound.play();
        speak("Hit!");

        // update ship status
        const row = +cell.dataset.row;
        const col = +cell.dataset.column;
        let shipSunk = false;

        for (const ship of playerShips[opponent]) {
            for (const part of ship.cells) {
                if (part.row === row && part.col === col) {
                    part.hit = true;
                    hitCounts[opponent]++;
                }
            }

            if (ship.cells.every(part => part.hit)) {
                shipSunk = true;
                sinkSound.currentTime = 0;
                sinkSound.play();
                speak(`Sunk a ${ship.length}-unit ship!`);
            }
        }

        if (hitCounts[opponent] === totalShipParts) {
            victorySound.currentTime = 0;
            victorySound.play();
            speak(`${currentTurn} wins!`);
            gameStarted = false;
            return;
        }
    } else {
        // miss processing
        cell.classList.add('miss');
        missSound.currentTime = 0;
        missSound.play();
        speak("Miss.");
    }

    // switch turns
    currentTurn = currentTurn === 'player1' ? 'player2' : 'player1';
    updateAttackBoard();
}

function updateAttackBoard() {
    // removed all attack listeners
    document.querySelectorAll('#player1-board .cell, #player2-board .cell').forEach(cell => {
        cell.removeEventListener('click', handleAttack);
    });

    // added listeners to the correct board
    const opponentBoardId = currentTurn === 'player1' ? 'player2-board' : 'player1-board';
    document.querySelectorAll(`#${opponentBoardId} .cell`).forEach(cell => {
        cell.addEventListener('click', handleAttack);
    });

    speak(`${currentTurn === 'player1' ? 'Player 1' : 'Player 2'}, it's your turn.`);
}

document.getElementById('start-button').addEventListener('click', () => {
    speak('Game started. Player 1, make your move.');
    gameStarted = true;

    // gray out the player boards
    grayOutBoard('player1-board');
    grayOutBoard('player2-board');

    // set up the attack board
    updateAttackBoard();
    document.getElementById('start-button').disabled = true;
});

function grayOutBoard(boardId) {
    const board = document.getElementById(boardId);
    board.classList.add('grayed-out'); // add grayed-out class
    
    document.querySelectorAll(`#${boardId} .cell`).forEach(cell => {
        cell.style.backgroundColor = '#ccc';
        cell.style.borderColor = '#999';
        if (cell.classList.contains('ship')) {
            cell.style.borderColor = '#999';
        }
    });
}
