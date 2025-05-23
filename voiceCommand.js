//js recognizing voice commands
//browser support
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
    alert("Speech Recognition is not supported in this browser.");
} else {
    //initialize
    const recognition = new SpeechRecognition();

    //game situation
    let spacebarPressed = false;
    let lastSpokenMessage = '';
    let currentStep = 'awaitingLength';

    //for ship placement
    let currentOrientation = 'horizontal';
    let currentPlayer = 'player1';
    let gameStarted = false;
    let selectedShipLength = null;

    //ship lengths
    // important! Remaining ships
    const allShipLengths = [2, 3, 3, 4, 5];
    const availableShips = {
        player1: [...allShipLengths],
        player2: [...allShipLengths]
    };
    const placedShips = { player1: [], player2: [] };

    //track turn, track win
    let currentTurn = 'player1';
    const playerShips = {
        player1: [],
        player2: []
    };
    const hitCounts = {
        player1: 0,
        player2: 0
    };
    const totalShipParts = 17;

    //API recognition properties
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;

    // speechSynthesis placing text and reading it
    //making sure dont repeat same msg
    function speak(message, force = false) {
        if (!force && message === lastSpokenMessage) return;

        lastSpokenMessage = message;
        document.getElementById('vc-feedback').textContent = message;

        //new speech
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
    }

    //default message
    function startRecognition() {
        try {
            recognition.start();
            speak("Listening... " + getCurrentInstruction());
        } catch (e) {
            console.error("Recognition error:", e);
            speak("Voice command failed. Hold spacebar and try again.");
        }
    }

    //when stopped pressing spacebar
    function stopRecognition() {
        try {
            recognition.stop();
        } catch (e) {
            console.error("Recognition stop error:", e);
        }
    }

    //tell the player current situation
    function getCurrentInstruction() {
        if (gameStarted) {
            return `${currentTurn}'s turn. Say a coordinate (like 'B5') or 'instructions' for help`;
        }

        //if not all ships placed, continue asking for placements
        if (currentStep === 'awaitingLength') {
            const shipsLeft = getAvailableShips();
            if (shipsLeft.length === 0) {
                return "All ships placed. Say 'save' to continue or 'instructions' for help";
            }
            return `Select a ship size to place. Available sizes: ${shipsLeft.join(', ')}. Say 'instructions' for help`;
        }

        //if alr gave length command
        if (currentStep === 'awaitingCoordinates' && selectedShipLength) {
            return `Place your ${selectedShipLength}-unit ship. Say coordinates (like 'A1') or 'rotate' to change orientation`;
        }

        return "Ready for commands. Say 'instructions' for help";
    }

    //tell the available ships
    function getAvailableShips() {
        return [...availableShips[currentPlayer]].sort();
    }

    //instructions
    function giveDetailedInstructions() {
        if (gameStarted) {
            speak(`Game instructions - YOU ARE IN THE ATTACK PHASE:
            ${currentTurn}, you're attacking now. 
            Say a letter from A to J and number from one to ten like "B5" to attack the opponent's board.
            I will announce if you hit, miss or when you sank a ship. 
            To win, sink all 5 enemy ships first. You will take turns to attack.
            Current commands: Say coordinates or 'instructions' to repeat this.`);
        } else {
            speak(`Game instructions - YOU ARE IN THE SETUP PHASE:
            ${currentPlayer} is supposed to place their ships, (the available ships are of length 2, 3, 3, 4, 5).
            First say a ship size (like "3") to select from pool.
            Second say coordinates (like "C4") to place it.
            Third, say "rotate" to change ship direction.
            The current orientation is ${currentOrientation}ly.
            Current commands: Say a ship length,then the coordinates, or 'rotate', or 'instructions'.`);
        }
    }

    //start and stop recognition depending on spacebar
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !spacebarPressed) {
            e.preventDefault();
            spacebarPressed = true;
            startRecognition();
        }
    });
    document.addEventListener('keyup', (e) => {
        if (e.code === 'Space' && spacebarPressed) {
            e.preventDefault();
            spacebarPressed = false;
            stopRecognition();
        }
    });

    //do things basd on recognized speech
    recognition.onresult = (event) => {
        const transcript = event.results[event.results.length-1][0].transcript.trim().toLowerCase();
        document.getElementById('vc-feedback').textContent = `You said: ${transcript}`;

        if (transcript.includes('rotate')) {
            currentOrientation = currentOrientation === 'horizontal' ? 'vertical' : 'horizontal';
            speak(`Ships will now place ${currentOrientation}ly. ${getCurrentInstruction()}`);
            return;
        }
        if (transcript.includes('save')) {
            handleSave();
            return;
        }
        if (transcript.includes('instructions') || transcript.includes('help')) {
            giveDetailedInstructions();
            return;
        }
        //other handling of speech recognized
        if (gameStarted) {
            handleAttackCommand(transcript);
        } else if (currentStep === 'awaitingLength') {
            handleShipSelection(transcript);
        } else if (currentStep === 'awaitingCoordinates') {
            handlePlacement(transcript);
        }
    };

    //when player says ship to select
    function handleShipSelection(transcript) {
        if (availableShips[currentPlayer].length === 0) {
            speak("All ships have been placed. Say 'save' to continue.");
            return;
        }

        //important! to recognize dimensions better
        const lengthMap = {
            'two': 2, 'to': 2, 'too': 2, '2': 2,
            'three': 3, 'tree': 3, '3': 3,
            'four': 4, 'for': 4, 'fore': 4, '4': 4,
            'five': 5, 'fife': 5, '5': 5
        };

        const requestedLength = lengthMap[transcript];
        const available = getAvailableShips();
 
        //to recognize length
        if (requestedLength && available.includes(requestedLength)) {
            selectedShipLength = requestedLength;
            currentStep = 'awaitingCoordinates';
            speak(`Ready to place ${selectedShipLength}-unit ship. Say a position to place the ship from a top left block at a coordinate like 'A1'.`);
        } else {
            speak(`Available ships: ${available.join(', ')}. Say 'instructions' for help.`);
        }
    }

    //for player to place ship
    function handlePlacement(transcript) {
        if (availableShips[currentPlayer].length === 0) {
            speak("All ships have been placed. Say 'save' to continue.");
            return;
        }

        const coords = parseCoordinates(transcript);
        if (!coords) {
            speak("Say any coordinate from 'A1' to 'J10'.");
            return;
        }

        const boardId = `${currentPlayer}-board`;
        const cell = document.querySelector(`#${boardId} .cell[data-row="${coords.row}"][data-column="${coords.col}"]`);

        //IMPORTANT to place it at the position player wants
        if (placeShip(cell, selectedShipLength)) {
            const index = availableShips[currentPlayer].indexOf(selectedShipLength);
            if (index > -1) {
                availableShips[currentPlayer].splice(index, 1);
            }

            trackShipPlacement(coords.row, coords.col, selectedShipLength);
            placedShips[currentPlayer].push(selectedShipLength);
            disableOneShipInPool(selectedShipLength);

            const remaining = availableShips[currentPlayer].length;

            const placedLength = selectedShipLength;
            selectedShipLength = null;
            currentStep = 'awaitingLength';

            speak(`Placed at ${formatCoords(coords)}. ${remaining} ship${remaining !== 1 ? 's' : ''} left. ${getCurrentInstruction()}`);

            if (availableShips[currentPlayer].length === 0) {
                speak("All ships placed. Say 'save' when ready.");
            }
        } else {
            speak("Invalid placement. Try again or say 'instructions' for help.");
        }
    }

    //important! where ship is placed
    function trackShipPlacement(startRow, startCol, length) {
        const cells = [];
        for (let i = 0; i < length; i++) {
            const row = currentOrientation === 'horizontal' ? startRow : startRow + i;
            const col = currentOrientation === 'horizontal' ? startCol + i : startCol;
            cells.push({ row, col, hit: false });
        }

        playerShips[currentPlayer].push({
            length,
            cells,
            sunk: false
        });
    }
    
    //removing ship from pool
    function disableOneShipInPool(length) {
        const ships = Array.from(document.querySelectorAll(`#ship-pool .ship[data-length="${length}"]`))
            .filter(ship => !ship.style.opacity || ship.style.opacity === '1');

        if (ships.length > 0) {
            const shipToDisable = ships[0];
            shipToDisable.style.opacity = '0.5';
            shipToDisable.style.backgroundColor = '#cccccc';
            shipToDisable.draggable = false;
            shipToDisable.style.cursor = 'not-allowed';
        }
    }

    //when player says save, if player is 2 start game
    function handleSave() {
        if (availableShips[currentPlayer].length > 0) {
            speak(`Still ${availableShips[currentPlayer].length} ships to place. Say 'instructions' for help.`);
            return;
        }

        if (currentPlayer === 'player1') {
            currentPlayer = 'player2';
            currentStep = 'awaitingLength';
            resetShipPool();
            speak("Player 2's turn to place ships. " + getCurrentInstruction());
        } else {
            gameStarted = true;
            currentStep = 'playing';
            currentTurn = 'player1';
            updateTurnIndicator();
            speak("Game started! Player 1 attacks first. " + getCurrentInstruction());
        }
    }

    //attack commands handling
    function handleAttackCommand(transcript) {
        if (!gameStarted) {
            speak("Game over. Reload page to play again.");
            return;
        }

        const coords = parseCoordinates(transcript);
        if (!coords) {
            speak("Say coordinates like 'C5' or 'H10'. Say 'instructions' for help.");
            return;
        }

        const opponent = currentTurn === 'player1' ? 'player2' : 'player1';
        const boardId = `${opponent}-board`;
        const cell = document.querySelector(`#${boardId} .cell[data-row="${coords.row}"][data-column="${coords.col}"]`);

        if (!cell) {
            speak("Invalid coordinates. Try again.");
            return;
        }

        if (cell.classList.contains('hit') || cell.classList.contains('miss')) {
            speak("Already attacked there. Try another coordinate.");
            return;
        }
        
        const hitSound = document.getElementById('hit-sound');
        const missSound = document.getElementById('miss-sound');
        const sinkSound = document.getElementById('sink-sound');
        const victorySound = document.getElementById('victory-sound');

        let hitCausedSinking = false;
        let sunkShipLength = null;
        let isHit = false;

        //when something is hit
        if (cell.classList.contains('ship')) {
            isHit = true;
            cell.classList.add('hit');
            cell.style.backgroundColor = 'orange';

            // update looks j and play sound
            for (const ship of playerShips[opponent]) {
                for (const part of ship.cells) {
                    if (part.row === coords.row && part.col === coords.col) {
                        part.hit = true;
                        hitCounts[opponent]++;
                    }
                }

                const isSunk = ship.cells.every(part => part.hit);
                if (isSunk && !ship.sunk) {
                    ship.sunk = true;
                    hitCausedSinking = true;
                    sunkShipLength = ship.length;
                }
            }

            //when all ships of 1 player hit
            if (hitCounts[opponent] === totalShipParts) {
                victorySound.currentTime = 0;
                victorySound.play();
                speak(`${currentTurn} wins the game! Reload page to play again.`);
                gameStarted = false;
                return;
            }
            hitSound.currentTime = 0;
            hitSound.play();
            speak("Hit!");

            if (hitCausedSinking) {
                // calculations of ships remaining
                const remainingShips = playerShips[opponent].filter(ship => !ship.sunk).length;
                let remainingMessage = remainingShips > 0
                    ? `Opponent has ${remainingShips} ship${remainingShips !== 1 ? 's' : ''} remaining.`
                    : "All enemy ships destroyed!";

                // announce sinking
                setTimeout(() => {
                    speak(`You sunk a ${sunkShipLength}-unit ship! ${remainingMessage}`);
                    sinkSound.currentTime = 0;
                    sinkSound.play();

                    //for announcing turn
                    setTimeout(() => {
                        if (gameStarted) {
                            currentTurn = currentTurn === 'player1' ? 'player2' : 'player1';
                            updateTurnIndicator();
                            speak(`${currentTurn}'s turn now. ${getCurrentInstruction()}`);
                        }
                        //important! gives 5 sec time pause before announcing next player turn
                    }, 5000);
                }, 1000);
                return;
            }
        } else {
            cell.classList.add('miss');
            cell.style.backgroundColor = 'grey';
            missSound.currentTime = 0;
            missSound.play();
            speak("Miss.");
        }

        // switch turns only if game is still on and no one won
        if (gameStarted) {
            currentTurn = currentTurn === 'player1' ? 'player2' : 'player1';
            updateTurnIndicator();
            speak(`${currentTurn}'s turn now. ${getCurrentInstruction()}`);
        }
    }

    //taking turns
    function updateTurnIndicator() {
        const indicator = document.getElementById('current-turn');
        if (indicator) {
            indicator.textContent = currentTurn === 'player1' ? 'Player 1' : 'Player 2';
            //indicator.style.color = currentTurn === 'player1' ? 'blue' : 'red';
        }
    }

    //a new ship pool for saving (player 2)
    function resetShipPool() {
        const pool = document.getElementById('ship-pool');
        pool.innerHTML = '';

        availableShips.player2.forEach((len, idx) => {
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

    function parseCoordinates(transcript) {
        const match = transcript.match(/([a-j])\s*(\d{1,2})/i);
        if (!match) return null;

        const col = match[1].toUpperCase().charCodeAt(0) - 65;
        const row = parseInt(match[2]) - 1;

        return (row >= 0 && row < 10 && col >= 0 && col < 10)
            ? { row, col }
            : null;
    }

    function formatCoords({row, col}) {
        return `${String.fromCharCode(65 + col)}${row + 1}`;
    }

    //when placing a ship
    function placeShip(cell, length) {
        if (!cell) return false;

        const board = cell.parentElement;
        const startRow = parseInt(cell.dataset.row);
        const startCol = parseInt(cell.dataset.column);
        const cells = [];

        //important! cell based
        for (let i = 0; i < length; i++) {
            const r = currentOrientation === 'horizontal' ? startRow : startRow + i;
            const c = currentOrientation === 'horizontal' ? startCol + i : startCol;
            const targetCell = board.querySelector(`.cell[data-row="${r}"][data-column="${c}"]`);

            if (!targetCell || targetCell.classList.contains('ship')) {
                return false;
            }
            cells.push(targetCell);
        }

        cells.forEach(cell => {
            cell.classList.add('ship');
            cell.dataset.shipLength = length;
        });

        return true;
    }

    //initialize ships same way as script.js
    function initializeShipPool() {
        const pool = document.getElementById('ship-pool');
        pool.innerHTML = '';

        availableShips.player1.forEach((len, idx) => {
            const ship = document.createElement('div');
            ship.id = `ship-${idx}`;
            ship.classList.add('ship');
            ship.draggable = true;
            ship.dataset.length = len;
            ship.style.width = `${40 * len + (len - 1) * 2}px`;
            ship.style.height = '40px';
            ship.textContent = `${len}`.padStart(2, ' ');
            ship.style.backgroundColor = '#0077b6';
            ship.style.border = '2px solid #023e8a';
            ship.style.color = 'white';
            ship.style.display = 'flex';
            ship.style.alignItems = 'center';
            ship.style.justifyContent = 'center';
            ship.style.cursor = 'grab';
            ship.style.margin = '5px 0';
            ship.addEventListener('dragstart', handleDragStart);
            pool.appendChild(ship);
        });
    }

    //Initialize when loaded
    window.addEventListener('DOMContentLoaded', () => {
        initializeShipPool();
        updateTurnIndicator();
        speak("Welcome to Voice Command Battleship! Hold SPACEBAR and speak commands. Say 'instructions' anytime for help.");
    });
}
