document.addEventListener('DOMContentLoaded', () => {
    // Game Configuration
    const GRID_ROWS = 5;
    const GRID_COLS = 5;
    const CELL_SIZE = 100; // px, from CSS
    const GAP_SIZE = 5;    // px, from CSS

    const BUILDING_COSTS = { /* ... (rest of config remains the same) ... */
        'townHall': { gold: 0, elixir: 0 },
        'goldMine': { gold: 0, elixir: 50 },
        'elixirCollector': { gold: 50, elixir: 0 }
    };
    const UPGRADE_COSTS = {
        'goldMine': { 1: { gold: 0, elixir: 100 }, 2: { gold: 0, elixir: 200 }, 3: { gold: 0, elixir: 300 } },
        'elixirCollector': { 1: { gold: 100, elixir: 0 }, 2: { gold: 200, elixir: 0 }, 3: { gold: 300, elixir: 0 } },
        'townHall': { 1: { gold: 200, elixir: 200 } }
    };
    const ABSOLUTE_MAX_LEVELS = { 'townHall': 2, 'goldMine': 4, 'elixirCollector': 4 };
    const TOWN_HALL_UNLOCKS = {
        0: { maxBuildingLevels: {}, buildingCaps: { 'townHall': 1 }, newBuildingsUnlocked: [] }, // Corrected line
        1: { maxBuildingLevels: { 'goldMine': 2, 'elixirCollector': 2, 'townHall': 1 }, buildingCaps: { 'townHall': 1, 'goldMine': 3, 'elixirCollector': 3 }, newBuildingsUnlocked: ['goldMine', 'elixirCollector'] },
        2: { maxBuildingLevels: { 'goldMine': 4, 'elixirCollector': 4, 'townHall': 2 }, buildingCaps: { 'townHall': 1, 'goldMine': 5, 'elixirCollector': 5 } }
    };

    // Resource state
    let gold = 100;
    let elixir = 100;

    // Building state
    let nextBuildingId = 1;
    const villageBuildings = [];
    let selectedBuildingIdForMove = null;

    // DOM elements
    const goldAmountSpan = document.getElementById('gold-amount');
    const elixirAmountSpan = document.getElementById('elixir-amount');
    const buildingsContainer = document.getElementById('buildings-container');
    const buildTownHallBtn = document.getElementById('build-town-hall-btn');
    const buildGoldMineBtn = document.getElementById('build-gold-mine-btn');
    const buildElixirCollectorBtn = document.getElementById('build-elixir-collector-btn');

    updateResourceDisplay();

    // --- Grid Helper Functions ---
    function isCellOccupied(row, col, excludeBuildingId = null) {
        return villageBuildings.some(b =>
            b.id !== excludeBuildingId &&
            b.gridPosition &&
            b.gridPosition.row === row &&
            b.gridPosition.col === col
        );
    }

    function findNextAvailableCell() {
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                if (!isCellOccupied(r, c)) return { row: r, col: c };
            }
        }
        return null;
    }

    function getCellFromCoordinates(clickX, clickY) {
        // Adjust for padding of the container if any (using 0 here as padding is on main)
        // const containerRect = buildingsContainer.getBoundingClientRect(); // Not needed if using clientLeft/Top
        const x = clickX - buildingsContainer.clientLeft;
        const y = clickY - buildingsContainer.clientTop;

        const col = Math.floor(x / (CELL_SIZE + GAP_SIZE));
        const row = Math.floor(y / (CELL_SIZE + GAP_SIZE));

        if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
            return { row, col };
        }
        return null;
    }


    // --- Core Helper Functions (remain largely the same) ---
    function getTownHallObject() { return villageBuildings.find(b => b.type === 'townHall'); }
    function getCurrentTownHallLevel() { const th = getTownHallObject(); return th ? th.level : 0; }
    function countBuildingsByType(type) { return villageBuildings.filter(b => b.type === type).length; }
    function findBuildingById(id) { return villageBuildings.find(b => b.id === id); }
    function getBuildingCap(type) { const thLvl = getCurrentTownHallLevel(); return TOWN_HALL_UNLOCKS[thLvl]?.buildingCaps[type] || 0; }
    function getMaxLevelForBuilding(type) { const thLvl = getCurrentTownHallLevel(); if (type === 'townHall') return ABSOLUTE_MAX_LEVELS.townHall; return TOWN_HALL_UNLOCKS[thLvl]?.maxBuildingLevels[type] || 0; }
    function isBuildingTypeUnlocked(type) {
        const thLvl = getCurrentTownHallLevel();
        // Town hall is always "unlocked" to be built if it doesn't exist.
        if (type === 'townHall' && !getTownHallObject()) return true;
        // For other buildings, check newBuildingsUnlocked array or if it has a cap defined for current TH level
        return TOWN_HALL_UNLOCKS[thLvl]?.newBuildingsUnlocked?.includes(type) || (TOWN_HALL_UNLOCKS[thLvl]?.buildingCaps[type] > 0);
    }

    // --- Resource Management (remains the same) ---
    function updateResourceDisplay() { goldAmountSpan.textContent = gold; elixirAmountSpan.textContent = elixir; updateAllButtonStates(); }
    function spendResources(costGold, costElixir) { if (gold >= costGold && elixir >= costElixir) { gold -= costGold; elixir -= costElixir; updateResourceDisplay(); return true; } return false; }
    function gainResources(amountGold, amountElixir) { gold += amountGold; elixir += amountElixir; updateResourceDisplay(); }

    // --- Building Element & Button Updates (DOM manipulation) ---
    function updateBuildingElementDOM(building) {
        const buildingDiv = buildingsContainer.querySelector(`[data-building-id="${building.id}"]`);
        if (!buildingDiv) return;

        if (building.gridPosition) {
            buildingDiv.style.gridRowStart = building.gridPosition.row + 1;
            buildingDiv.style.gridColumnStart = building.gridPosition.col + 1;
        }

        const textNode = Array.from(buildingDiv.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
        if (textNode) textNode.textContent = `${building.type} (Lvl ${building.level}) `;

        let upgradeButton = buildingDiv.querySelector('.upgrade-btn');
        if (!upgradeButton) {
            upgradeButton = document.createElement('button');
            upgradeButton.classList.add('upgrade-btn');
            upgradeButton.setAttribute('data-building-id', String(building.id)); // Ensure ID is string for attribute
            buildingDiv.appendChild(upgradeButton);
        }

        const currentMaxLvl = getMaxLevelForBuilding(building.type);
        const absoluteMaxLvl = ABSOLUTE_MAX_LEVELS[building.type];
        if (building.level >= absoluteMaxLvl) { upgradeButton.textContent = 'Max Level'; upgradeButton.disabled = true; }
        else if (building.level >= currentMaxLvl) { upgradeButton.textContent = `TH Lvl Up Req.`; upgradeButton.disabled = true; }
        else { const cost = UPGRADE_COSTS[building.type]?.[building.level]; if (cost) { upgradeButton.textContent = `Upgrade (G:${cost.gold}, E:${cost.elixir})`; upgradeButton.disabled = gold < cost.gold || elixir < cost.elixir; } else { upgradeButton.textContent = 'Error'; upgradeButton.disabled = true; } }

        if (selectedBuildingIdForMove === building.id) {
            buildingDiv.classList.add('selected-for-move');
        } else {
            buildingDiv.classList.remove('selected-for-move');
        }
    }

    function createBuildingElement(building) {
        const buildingDiv = document.createElement('div');
        buildingDiv.classList.add('building', building.type.toLowerCase().replace(/\s+/g, '-'));
        buildingDiv.setAttribute('data-building-id', String(building.id));
        const textNode = document.createTextNode(`${building.type} (Lvl ${building.level}) `);
        buildingDiv.appendChild(textNode);
        buildingsContainer.appendChild(buildingDiv);
        updateBuildingElementDOM(building);
    }

    function updateAllButtonStates() {
        updateBuildButtonStates();
        villageBuildings.forEach(b => updateBuildingElementDOM(b));
    }

    function updateBuildButtonStates() {
        const thLvl = getCurrentTownHallLevel();
        const townHallExists = !!getTownHallObject();

        // Town Hall Button
        // Cap for TH is 1. It's either built or not. If built, button is disabled.
        // The getBuildingCap('townHall') for TH Lvl 0 is now 1, and for TH Lvl 1 is also 1.
        buildTownHallBtn.disabled = townHallExists;
        buildTownHallBtn.textContent = townHallExists ? 'Town Hall Built' : 'Build Town Hall (Free)';

        ['goldMine', 'elixirCollector'].forEach(type => {
            const btn = type === 'goldMine' ? buildGoldMineBtn : buildElixirCollectorBtn;
            const cost = BUILDING_COSTS[type];
            const cap = getBuildingCap(type); // This will be 0 if TH Lvl 0 for these types.
            const count = countBuildingsByType(type);
            const unlocked = isBuildingTypeUnlocked(type); // Checks if TH Lvl > 0 for these.

            btn.disabled = !unlocked || !townHallExists || gold < cost.gold || elixir < cost.elixir || count >= cap;

            if (!townHallExists) { // Highest priority for disabling if no TH
                 btn.textContent = `Build ${type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1')} (Requires TH)`;
                 btn.disabled = true;
            } else if (!unlocked) { // TH exists but this building type not yet unlocked
                btn.textContent = `${type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1')} (TH Lvl Req.)`;
            } else if (count >= cap) { // Unlocked, TH exists, but cap reached
                btn.textContent = `${type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1')} (Max ${cap})`;
            } else { // Available to build
                btn.textContent = `Build ${type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1')} (Cost: ${type === 'goldMine' ? cost.elixir + "E" : cost.gold + "G"})`;
            }
        });
    }

    function handleBuildRequest(type) {
        const thLvl = getCurrentTownHallLevel();
        // If trying to build something other than TH, and TH doesn't exist.
        if (type !== 'townHall' && !getTownHallObject()) { alert("Build a Town Hall first!"); return; }

        // Check if the building type is unlocked at the current TH level (or if it's the TH itself).
        if (!isBuildingTypeUnlocked(type)) {
            alert(`${type.charAt(0).toUpperCase() + type.slice(1)} is not unlocked at current Town Hall level.`);
            return;
        }

        // Check against building caps.
        // For the first Town Hall, countBuildingsByType('townHall') is 0, getBuildingCap('townHall') is 1 (from TH_UNLOCKS[0]). So 0 < 1 is true.
        if (countBuildingsByType(type) >= getBuildingCap(type)) {
            alert(`${type.charAt(0).toUpperCase() + type.slice(1)} limit reached.`);
            return;
        }

        const availableCell = findNextAvailableCell();
        if (!availableCell) { alert("No empty space in the village!"); return; }

        const cost = BUILDING_COSTS[type];
        if (spendResources(cost.gold, cost.elixir)) {
            const newBuilding = createBuildingObject(type, availableCell);
            createBuildingElement(newBuilding);
        } else { alert(`Not enough resources.`); }
    }

    buildTownHallBtn.addEventListener('click', () => handleBuildRequest('townHall'));
    buildGoldMineBtn.addEventListener('click', () => handleBuildRequest('goldMine'));
    buildElixirCollectorBtn.addEventListener('click', () => handleBuildRequest('elixirCollector'));

    buildingsContainer.addEventListener('click', (event) => {
        const clickedElement = event.target;

        if (clickedElement.classList.contains('upgrade-btn')) {
            const buildingId = parseInt(clickedElement.getAttribute('data-building-id'));
            const building = findBuildingById(buildingId);
            if (!building) return;
            const currentMaxLvl = getMaxLevelForBuilding(building.type);
            const absoluteMaxLvl = ABSOLUTE_MAX_LEVELS[building.type];
            if (building.level >= absoluteMaxLvl) { alert("Max level."); return; }
            if (building.level >= currentMaxLvl) { alert(`TH Lvl Up Req.`); return; }
            const costDetails = UPGRADE_COSTS[building.type]?.[building.level];
            if (!costDetails) { console.error("Upgrade cost error"); alert("Cannot upgrade."); return; }
            if (spendResources(costDetails.gold, costDetails.elixir)) { building.level++; updateAllButtonStates(); }
            else { alert("Not enough resources."); }
            return;
        }

        const clickedBuildingDiv = clickedElement.closest('.building');
        if (clickedBuildingDiv) {
            const clickedBuildingId = parseInt(clickedBuildingDiv.getAttribute('data-building-id'));
            if (selectedBuildingIdForMove === null) {
                selectedBuildingIdForMove = clickedBuildingId;
            } else if (selectedBuildingIdForMove === clickedBuildingId) {
                selectedBuildingIdForMove = null;
            } else {
                selectedBuildingIdForMove = clickedBuildingId;
            }
            updateAllButtonStates();
            return;
        }

        if (selectedBuildingIdForMove !== null) {
            const cell = getCellFromCoordinates(event.offsetX, event.offsetY);
            if (cell) {
                if (!isCellOccupied(cell.row, cell.col, selectedBuildingIdForMove)) {
                    const buildingToMove = findBuildingById(selectedBuildingIdForMove);
                    if (buildingToMove) {
                        buildingToMove.gridPosition.row = cell.row;
                        buildingToMove.gridPosition.col = cell.col;
                        selectedBuildingIdForMove = null;
                        updateAllButtonStates();
                    }
                } else {
                    selectedBuildingIdForMove = null;
                    updateAllButtonStates();
                    alert("Cannot move to an occupied cell.");
                }
            } else {
                selectedBuildingIdForMove = null;
                updateAllButtonStates();
            }
        }
    });

    function createBuildingObject(type, gridPos) { const newBuilding = { id: nextBuildingId++, type: type, level: 1, gridPosition: gridPos ? { row: gridPos.row, col: gridPos.col } : null }; villageBuildings.push(newBuilding); return newBuilding; }

    setInterval(() => { let g=0, e=0; villageBuildings.forEach(b => { if (b.type === 'goldMine') g+=(b.level*10); if (b.type === 'elixirCollector') e+=(b.level*10); }); gainResources(g,e); }, 5000);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && selectedBuildingIdForMove !== null) {
            selectedBuildingIdForMove = null;
            updateAllButtonStates();
        }
    });

    updateAllButtonStates();
});
