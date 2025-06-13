document.addEventListener('DOMContentLoaded', () => {
    // Resource state
    let gold = 100;
    let elixir = 100;
    let goldMineCount = 0;
    let elixirCollectorCount = 0;

    // DOM elements
    const goldAmountSpan = document.getElementById('gold-amount');
    const elixirAmountSpan = document.getElementById('elixir-amount');
    const buildingsContainer = document.getElementById('buildings-container');

    const buildTownHallBtn = document.getElementById('build-town-hall-btn');
    const buildGoldMineBtn = document.getElementById('build-gold-mine-btn');
    const buildElixirCollectorBtn = document.getElementById('build-elixir-collector-btn');

    // Initial resource display update
    updateResourceDisplay();

    // --- Resource Management ---
    function updateResourceDisplay() {
        goldAmountSpan.textContent = gold;
        elixirAmountSpan.textContent = elixir;
    }

    function spendResources(costGold, costElixir) {
        if (gold >= costGold && elixir >= costElixir) {
            gold -= costGold;
            elixir -= costElixir;
            updateResourceDisplay();
            return true;
        }
        alert("Not enough resources!");
        return false;
    }

    function gainResources(amountGold, amountElixir) {
        gold += amountGold;
        elixir += amountElixir;
        updateResourceDisplay();
    }

    // --- Building Logic ---
    let townHallBuilt = false;

    function createBuildingElement(type) {
        const buildingDiv = document.createElement('div');
        buildingDiv.classList.add('building', type.toLowerCase().replace(/\s+/g, '-')); // e.g., 'town-hall'
        buildingDiv.textContent = type;
        buildingsContainer.appendChild(buildingDiv);
    }

    buildTownHallBtn.addEventListener('click', () => {
        if (!townHallBuilt) {
            if (spendResources(0, 0)) { // Free
                createBuildingElement('Town Hall');
                townHallBuilt = true;
                buildTownHallBtn.disabled = true;
                buildTownHallBtn.textContent = 'Town Hall Built';
                // Enable other build buttons once Town Hall is built
                buildGoldMineBtn.disabled = false;
                buildElixirCollectorBtn.disabled = false;
            }
        }
    });

    buildGoldMineBtn.addEventListener('click', () => {
        if (townHallBuilt) {
            if (spendResources(0, 50)) { // Cost: 50 Elixir
                createBuildingElement('Gold Mine');
                goldMineCount++; // Increment gold mine count
            }
        } else {
            alert("Build a Town Hall first!");
        }
    });

    buildElixirCollectorBtn.addEventListener('click', () => {
        if (townHallBuilt) {
            if (spendResources(50, 0)) { // Cost: 50 Gold
                createBuildingElement('Elixir Collector');
                elixirCollectorCount++; // Increment elixir collector count
            }
        } else {
            alert("Build a Town Hall first!");
        }
    });

    // --- Global Game Loop for Resource Generation ---
    setInterval(() => {
        const goldPerInterval = goldMineCount * 10;
        const elixirPerInterval = elixirCollectorCount * 10;
        gainResources(goldPerInterval, elixirPerInterval);
    }, 5000); // Generate resources every 5 seconds

    // --- Initial state of buttons ---
    // Disable mine/collector buttons until Town Hall is built
    buildGoldMineBtn.disabled = true;
    buildElixirCollectorBtn.disabled = true;

});
