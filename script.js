document.addEventListener('DOMContentLoaded', () => {
    // Game Configuration (TROOP_DEFINITIONS, BUILDING_COSTS, etc. remain same)
    const GRID_ROWS = 5; const GRID_COLS = 5; const CELL_SIZE = 100; const GAP_SIZE = 5;
    const BUILDING_COSTS = { 'townHall': { gold: 0, elixir: 0 }, 'goldMine': { gold: 0, elixir: 50 }, 'elixirCollector': { gold: 50, elixir: 0 }, 'barracks': { gold: 100, elixir: 0 }, 'armyCamp': { gold: 0, elixir: 200 } };
    const UPGRADE_COSTS = { 'goldMine': { 1: { cost: {gold: 0, elixir: 100} }, 2: { cost: {gold: 0, elixir: 200} }, 3: { cost: {gold: 0, elixir: 300} } }, 'elixirCollector': { 1: { cost: {gold: 100, elixir: 0} }, 2: { cost: {gold: 200, elixir: 0} }, 3: { cost: {gold: 300, elixir: 0} } }, 'townHall': { 1: { cost: {gold: 200, elixir: 200} } }, 'barracks': { 1: { cost: {gold: 150, elixir: 0} }, 2: { cost: {gold: 300, elixir: 0} } }, 'armyCamp': { 1: { cost: {gold: 0, elixir: 300} }, 2: { cost: {gold: 0, elixir: 500} } } };
    const ARMY_CAMP_HOUSING_PER_LEVEL = { 1: 20, 2: 30, 3: 40 };
    const ABSOLUTE_MAX_LEVELS = { 'townHall': 2, 'goldMine': 4, 'elixirCollector': 4, 'barracks': 3, 'armyCamp': 3 };
    const TOWN_HALL_UNLOCKS = { 0: { maxBuildingLevels: {}, buildingCaps: { 'townHall': 1 }, newBuildingsUnlocked: [] }, 1: { maxBuildingLevels: { 'goldMine': 2, 'elixirCollector': 2, 'townHall': 1, 'armyCamp': 1 }, buildingCaps: { 'townHall': 1, 'goldMine': 3, 'elixirCollector': 3, 'armyCamp': 1 }, newBuildingsUnlocked: ['goldMine', 'elixirCollector', 'armyCamp']  }, 2: { maxBuildingLevels: { 'goldMine': 4, 'elixirCollector': 4, 'townHall': 2, 'barracks': 1, 'armyCamp': 2 }, buildingCaps: { 'townHall': 1, 'goldMine': 5, 'elixirCollector': 5, 'barracks': 1, 'armyCamp': 2 }, newBuildingsUnlocked: ['goldMine', 'elixirCollector', 'barracks', 'armyCamp'] } };
    const KNOWN_BUILDING_TYPES_FOR_UNLOCK_DISPLAY = ['goldMine', 'elixirCollector', 'barracks', 'armyCamp'];
    const TROOP_DEFINITIONS = { 'warrior': { name: 'Warrior', trainingCost: { resourceType: 'elixir', amount: 25 }, trainingTime: 0, housingSpace: 1, barracksLevelRequired: 1, hp: 50, dps: 10, attackRange: 1, moveSpeed: 1 } };
    const NPC_BASE_DEFINITION = { buildings: [ { id: 'npc_th1', type: 'townHall', level: 1, position: { x: 2, y: 2 } }, { id: 'npc_c1', type: 'cannon', level: 1, position: { x: 1, y: 1 } }, { id: 'npc_c2', type: 'cannon', level: 1, position: { x: 3, y: 3 } }, { id: 'npc_gm1', type: 'goldMine', level: 1, position: { x: 0, y: 2 } }, { id: 'npc_ec1', type: 'elixirCollector', level: 1, position: { x: 4, y: 2 } } ] };
    const BUILDING_HP = { 'townHall': { 1: 500, 2: 700 }, 'goldMine': { 1: 150, 2: 200, 3: 250, 4: 300 }, 'elixirCollector': { 1: 150, 2: 200, 3: 250, 4: 300 }, 'barracks': { 1: 200, 2: 250, 3: 300 }, 'armyCamp': { 1: 100, 2: 150, 3: 200 }, 'cannon': { 1: 250, 2: 300 } };
    const DEFENSIVE_BUILDING_STATS = { 'cannon': { 1: { dps: 10, range: 3, attackSpeed: 1 }, 2: { dps: 15, range: 3, attackSpeed: 1 } } };

    // Game State
    let gold = 100, elixir = 100, currentArmyHousingUsed = 0, maxArmyHousing = 0;
    let trainedArmy = []; // Stores IDs of troops in the player's army
    let nextBuildingId = 1;
    const villageBuildings = [];
    let selectedBuildingIdForMove = null;
    let currentSelectedBuildingForInfo = null;
    let isInAttackMode = false;

    // Combat State
    let currentNpcBattleBuildings = [];
    let activePlayerTroops = []; // Stores troop instances during battle
    let combatLoopInterval = null;
    let selectedTroopForDeployment = null;


    // DOM Elements (key ones, others obtained as needed)
    const goldAmountSpan = document.getElementById('gold-amount');
    const elixirAmountSpan = document.getElementById('elixir-amount');
    const currentArmyHousingSpan = document.getElementById('current-army-housing');
    const maxArmyHousingSpan = document.getElementById('max-army-housing');
    const buildingsContainer = document.getElementById('buildings-container');
    const infoPanel = document.getElementById('info-panel');
    const attackModeBtn = document.getElementById('attack-mode-btn');
    const attackViewDiv = document.getElementById('attack-view');
    const npcBaseArea = document.getElementById('npc-base-area');
    const troopDeploymentBar = document.getElementById('troop-deployment-bar');
    const endAttackBtn = document.getElementById('end-attack-btn');
    const mainGameViewElements = [ document.querySelector('main > #resource-display'), document.getElementById('game-area'), document.getElementById('actions-panel'), document.querySelector('header'), document.querySelector('footer') ];
    const infoPanelTitle = document.getElementById('info-panel-title');
    const infoPanelType = document.getElementById('info-panel-type');
    const infoPanelLevel = document.getElementById('info-panel-level');
    const infoPanelDetails = document.getElementById('info-panel-details');
    const infoPanelCloseBtn = document.getElementById('info-panel-close-btn');
    const infoPanelUpgradeBtn = document.getElementById('info-panel-upgrade-btn');
    const infoPanelMoveBtn = document.getElementById('info-panel-move-btn');
    const buildTownHallBtn = document.getElementById('build-town-hall-btn');
    const buildGoldMineBtn = document.getElementById('build-gold-mine-btn');
    const buildElixirCollectorBtn = document.getElementById('build-elixir-collector-btn');
    const buildBarracksBtn = document.getElementById('build-barracks-btn');
    const buildArmyCampBtn = document.getElementById('build-army-camp-btn');


    // --- Combat Loop Functions ---
    function startCombatLoop() {
        if (combatLoopInterval) clearInterval(combatLoopInterval); // Clear existing before starting new
        combatLoopInterval = setInterval(gameTick, 1000); // Tick every 1 second
        console.log("Combat loop started.");
    }

    function stopCombatLoop() {
        clearInterval(combatLoopInterval);
        combatLoopInterval = null;
        console.log("Combat loop stopped.");
    }

    function gameTick() {
        console.log("Game Tick...");

        // A. Player Troop Actions
        activePlayerTroops.forEach(troop => {
            if (troop.currentHp <= 0) return; // Skip dead troops

            // Find Target if needed
            if (!troop.targetBuildingId || !currentNpcBattleBuildings.find(b => b.id === troop.targetBuildingId && b.currentHp > 0)) {
                // Simple target selection: first available non-destroyed building
                const firstAvailableTarget = currentNpcBattleBuildings.find(b => b.currentHp > 0);
                if (firstAvailableTarget) {
                    troop.targetBuildingId = firstAvailableTarget.id;
                    console.log(`${troop.type} (ID: ${troop.id}) targeting ${firstAvailableTarget.type} (ID: ${firstAvailableTarget.id})`);
                } else {
                    troop.targetBuildingId = null; // No targets left
                }
            }

            // Attack Target
            if (troop.targetBuildingId) {
                const targetBuilding = currentNpcBattleBuildings.find(b => b.id === troop.targetBuildingId);
                if (targetBuilding && targetBuilding.currentHp > 0) {
                    targetBuilding.currentHp -= troop.dps; // Assuming 1 attack per tick
                    console.log(`${troop.type} (ID: ${troop.id}) attacks ${targetBuilding.type} (ID: ${targetBuilding.id}), HP left: ${targetBuilding.currentHp}`);

                    // Update visual representation of NPC building HP
                    const npcBuildingDiv = npcBaseArea.querySelector(`[data-npc-building-id="${targetBuilding.id}"]`);
                    if (npcBuildingDiv) {
                        npcBuildingDiv.textContent = `${targetBuilding.type.charAt(0).toUpperCase() + targetBuilding.type.slice(1)} (Lvl ${targetBuilding.level}) HP: ${Math.max(0, targetBuilding.currentHp)}/${targetBuilding.maxHp}`;
                        if (targetBuilding.currentHp <= 0) {
                            npcBuildingDiv.classList.add('destroyed'); // Add a class for visual feedback
                            console.log(`${targetBuilding.type} (ID: ${targetBuilding.id}) destroyed!`);
                        }
                    }
                }
            }
        });

        // B. NPC Defensive Building Actions
        currentNpcBattleBuildings.forEach(npcBuilding => {
            if (npcBuilding.currentHp > 0 && npcBuilding.type === 'cannon') { // Only cannons attack for now
                const stats = DEFENSIVE_BUILDING_STATS.cannon[npcBuilding.level];
                if (!stats) return;

                // Simple target selection: first available player troop
                const targetTroop = activePlayerTroops.find(t => t.currentHp > 0);
                if (targetTroop) {
                    targetTroop.currentHp -= stats.dps; // Assuming 1 attack per tick
                    console.log(`NPC ${npcBuilding.type} (ID: ${npcBuilding.id}) attacks ${targetTroop.type} (ID: ${targetTroop.id}), HP left: ${targetTroop.currentHp}`);
                    if (targetTroop.currentHp <= 0) {
                        console.log(`Player troop ${targetTroop.type} (ID: ${targetTroop.id}) destroyed!`);
                    }
                }
            }
        });

        // C. Cleanup dead troops
        activePlayerTroops = activePlayerTroops.filter(troop => troop.currentHp > 0);

        // D. Check Win/Loss (Basic)
        const npcTownHall = currentNpcBattleBuildings.find(b => b.type === 'townHall' && b.id === 'npc_th1'); // Assuming npc_th1 is main TH
        if (npcTownHall && npcTownHall.currentHp <= 0) {
            alert("Victory! You destroyed the NPC Town Hall!");
            stopCombatLoop();
            // Potentially call exitAttackMode() or a specific win screen function
            // exitAttackMode(); // For now, just exit
        } else if (activePlayerTroops.length === 0 && currentNpcBattleBuildings.some(b => b.currentHp > 0)) {
            alert("Defeat! All your troops have been vanquished.");
            stopCombatLoop();
            // exitAttackMode(); // For now, just exit
        } else if (currentNpcBattleBuildings.every(b => b.currentHp <= 0)) {
            alert("Victory! You destroyed all NPC buildings!"); // Alternative win condition
            stopCombatLoop();
        }
    }


    // --- Attack Mode UI Rendering ---
    function renderNpcBase() { /* ... (same as previous) ... */ }
    function renderTroopDeploymentBar() { /* ... (same as previous) ... */ }

    // --- Attack Mode Transition Functions ---
    function enterAttackMode() {
        if (trainedArmy.length === 0) {
            alert("You have no troops to attack with! Train some in the Barracks.");
            return;
        }
        isInAttackMode = true;
        mainGameViewElements.forEach(el => el.classList.add('hidden'));
        if(infoPanel) infoPanel.classList.add('hidden');
        attackViewDiv.classList.remove('hidden');

        renderNpcBase(); // Sets up currentNpcBattleBuildings
        renderTroopDeploymentBar();
        selectedTroopForDeployment = null;
        activePlayerTroops = []; // Reset active troops for new battle
        // Combat loop starts only when first troop is deployed
        console.log("Entered Attack Mode");
    }

    function exitAttackMode() {
        stopCombatLoop(); // Ensure loop is stopped
        isInAttackMode = false;
        attackViewDiv.classList.add('hidden');
        mainGameViewElements.forEach(el => el.classList.remove('hidden'));
        activePlayerTroops = []; // Clear active troops
        // currentNpcBattleBuildings is reset in renderNpcBase next time
        console.log("Exited Attack Mode.");
        updateResourceDisplay();
    }

    attackModeBtn.addEventListener('click', enterAttackMode);
    endAttackBtn.addEventListener('click', exitAttackMode);

    // --- Troop Deployment Logic ---
    troopDeploymentBar.addEventListener('click', (event) => { /* ... (same as previous) ... */ });

    npcBaseArea.addEventListener('click', (event) => {
        if (!isInAttackMode || !selectedTroopForDeployment) return;
        const troopDef = TROOP_DEFINITIONS[selectedTroopForDeployment];
        if (!troopDef) { console.error("Selected troop undefined:", selectedTroopForDeployment); return; }
        const troopIndexInArmy = trainedArmy.indexOf(selectedTroopForDeployment);
        if (troopIndexInArmy === -1) { alert(`No more ${troopDef.name}s!`); selectedTroopForDeployment = null; renderTroopDeploymentBar(); return; }

        // Create troop instance
        const troopInstance = {
            id: `player_troop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            type: selectedTroopForDeployment,
            ...JSON.parse(JSON.stringify(troopDef)), // Deep copy base stats
            currentHp: troopDef.hp,
            targetBuildingId: null,
            // position: { x: event.offsetX, y: event.offsetY } // Conceptual, if needed
        };
        activePlayerTroops.push(troopInstance);

        // Update army and housing
        trainedArmy.splice(troopIndexInArmy, 1);
        currentArmyHousingUsed -= troopDef.housingSpace;

        console.log(`Deployed ${troopDef.name} (ID: ${troopInstance.id}). Remaining in army: ${trainedArmy.filter(id => id === selectedTroopForDeployment).length}`);

        selectedTroopForDeployment = null;
        renderTroopDeploymentBar();
        updateArmyHousingDisplay();

        if (!combatLoopInterval) { // Start combat if not already started
            startCombatLoop();
        }
    });

    // --- (All other functions from previous steps are assumed to be here and complete) ---
    // For brevity, only showing modified/new functions for this step.
    // Ensure all helper functions (calculateMaxArmyHousing, showInfoPanel, etc.) and event listeners are correctly defined.
    TOWN_HALL_UNLOCKS[0] = { maxBuildingLevels: {}, buildingCaps: { 'townHall': 1 }, newBuildingsUnlocked: [] };
    TOWN_HALL_UNLOCKS[1] = { maxBuildingLevels: { 'goldMine': 2, 'elixirCollector': 2, 'townHall': 1, 'armyCamp': 1 }, buildingCaps: { 'townHall': 1, 'goldMine': 3, 'elixirCollector': 3, 'armyCamp': 1 }, newBuildingsUnlocked: ['goldMine', 'elixirCollector', 'armyCamp'] };
    TOWN_HALL_UNLOCKS[2] = { maxBuildingLevels: { 'goldMine': 4, 'elixirCollector': 4, 'townHall': 2, 'barracks': 1, 'armyCamp': 2 }, buildingCaps: { 'townHall': 1, 'goldMine': 5, 'elixirCollector': 5, 'barracks': 1, 'armyCamp': 2 }, newBuildingsUnlocked: ['goldMine', 'elixirCollector', 'barracks', 'armyCamp'] };
    calculateMaxArmyHousing = () => { maxArmyHousing = 0; villageBuildings.forEach(b => { if (b.type === 'armyCamp') maxArmyHousing += ARMY_CAMP_HOUSING_PER_LEVEL[b.level] || 0; }); updateArmyHousingDisplay(); };
    updateArmyHousingDisplay = () => { currentArmyHousingSpan.textContent = currentArmyHousingUsed; maxArmyHousingSpan.textContent = maxArmyHousing; };
    showInfoPanel = () => { if (!currentSelectedBuildingForInfo) return; const b = currentSelectedBuildingForInfo; infoPanelTitle.textContent = `${b.type.charAt(0).toUpperCase() + b.type.slice(1)} Details`; infoPanelType.textContent = b.type; infoPanelLevel.textContent = b.level; infoPanelDetails.innerHTML = ''; if (b.type === 'goldMine' || b.type === 'elixirCollector') { const r = b.level * 10; const rt = b.type === 'goldMine' ? 'Gold' : 'Elixir'; infoPanelDetails.innerHTML = `<p><strong>Production:</strong> ${r} ${rt} / 5s</p>`; } else if (b.type === 'townHall') { const thLvl = b.level; const cUnlocks = TOWN_HALL_UNLOCKS[thLvl]; let dHtml = '<h4>Current Lvl Unlocks:</h4><ul>'; KNOWN_BUILDING_TYPES_FOR_UNLOCK_DISPLAY.forEach(t => { const cap = cUnlocks.buildingCaps[t] || 'N/A'; const maxL = cUnlocks.maxBuildingLevels[t] || 'N/A'; if (cUnlocks.buildingCaps.hasOwnProperty(t)) dHtml += `<li>${t.charAt(0).toUpperCase()+t.slice(1).replace(/([A-Z])/g,' $1')} Cap: ${cap}, Max Lvl: ${maxL}</li>`; else dHtml += `<li>${t.charAt(0).toUpperCase()+t.slice(1).replace(/([A-Z])/g,' $1')}: Not Unlocked</li>`; }); dHtml += '</ul>'; if (thLvl < ABSOLUTE_MAX_LEVELS.townHall) { const nUnlocks = TOWN_HALL_UNLOCKS[thLvl + 1]; if (nUnlocks) { dHtml += `<h4>Next Lvl Unlocks (Lvl ${thLvl+1}):</h4><ul>`; KNOWN_BUILDING_TYPES_FOR_UNLOCK_DISPLAY.forEach(t => { let unlThis = cUnlocks.buildingCaps.hasOwnProperty(t); let unlNext = nUnlocks.buildingCaps.hasOwnProperty(t); if(unlNext && !unlThis) dHtml += `<li>Unlocks ${t.charAt(0).toUpperCase()+t.slice(1).replace(/([A-Z])/g,' $1')} (Cap: ${nUnlocks.buildingCaps[t]}, Max Lvl: ${nUnlocks.maxBuildingLevels[t]})</li>`; else if (unlNext) { const cap = nUnlocks.buildingCaps[t]; const maxL = nUnlocks.maxBuildingLevels[t]; const oCap = cUnlocks.buildingCaps[t]; const oMaxL = cUnlocks.maxBuildingLevels[t]; if (cap !== oCap) dHtml += `<li>${t.charAt(0).toUpperCase()+t.slice(1).replace(/([A-Z])/g,' $1')} Cap: ${cap} (was ${oCap||0})</li>`; if (maxL !== oMaxL) dHtml += `<li>${t.charAt(0).toUpperCase()+t.slice(1).replace(/([A-Z])/g,' $1')} Max Lvl: ${maxL} (was ${oMaxL||0})</li>`;}}); dHtml += '</ul>'; } } infoPanelDetails.innerHTML = dHtml; } else if (b.type === 'barracks') { let bHtml = `<p>Trains troops.</p><h4>Trainable:</h4>`; let hasTroops = false; for (const troopId in TROOP_DEFINITIONS) { const troopDef = TROOP_DEFINITIONS[troopId]; if (b.level >= troopDef.barracksLevelRequired) { hasTroops = true; bHtml += `<div class="troop-training-item"><span>${troopDef.name}</span><span>Cost: ${troopDef.trainingCost.amount}${troopDef.trainingCost.resourceType.charAt(0).toUpperCase()}</span><span>Space: ${troopDef.housingSpace}</span><button class="train-troop-btn" data-troop-id="${troopId}" ${(currentArmyHousingUsed+troopDef.housingSpace > maxArmyHousing || elixir < troopDef.trainingCost.amount) ? 'disabled' : ''}>Train</button></div>`; } } if (!hasTroops) bHtml += "<p>None at this Lvl.</p>"; infoPanelDetails.innerHTML = bHtml; } else if (b.type === 'armyCamp') { const housing = ARMY_CAMP_HOUSING_PER_LEVEL[b.level] || 0; let acHtml = `<p><strong>Housing Provided:</strong> ${housing}</p><p>Total Army Space: ${currentArmyHousingUsed} / ${maxArmyHousing}</p><h4>Army Composition:</h4>`; if (trainedArmy.length === 0) acHtml += "<p>No troops trained.</p>"; else { const counts = {}; trainedArmy.forEach(id => counts[id] = (counts[id] || 0) + 1); acHtml += "<ul>"; for (const id in counts) { acHtml += `<li>${TROOP_DEFINITIONS[id].name}: ${counts[id]}</li>`; } acHtml += "</ul>"; } infoPanelDetails.innerHTML = acHtml; } else { infoPanelDetails.innerHTML = '<p>No additional details.</p>'; } const cMaxLvl = getMaxLevelForBuilding(b.type); const absMaxLvl = ABSOLUTE_MAX_LEVELS[b.type]; infoPanelUpgradeBtn.disabled = false; if (b.level >= absMaxLvl) { infoPanelUpgradeBtn.textContent = 'Max Level'; infoPanelUpgradeBtn.disabled = true; } else if (b.level >= cMaxLvl) { infoPanelUpgradeBtn.textContent = `TH Lvl Up Req.`; infoPanelUpgradeBtn.disabled = true; } else { const costInfo = UPGRADE_COSTS[b.type]?.[b.level]; const cost = costInfo?.cost || costInfo; if (cost) { infoPanelUpgradeBtn.textContent = `Upgrade (G:${cost.gold}, E:${cost.elixir})`; infoPanelUpgradeBtn.disabled = gold < cost.gold || elixir < cost.elixir; } else { infoPanelUpgradeBtn.textContent = 'Error/Max'; infoPanelUpgradeBtn.disabled = true; if(b.level < absMaxLvl && b.level < cMaxLvl) console.warn(`Missing cost for ${b.type} Lvl ${b.level}`); } } infoPanelMoveBtn.disabled = !b; infoPanel.classList.remove('hidden'); };
    hideInfoPanel = () => { infoPanel.classList.add('hidden'); currentSelectedBuildingForInfo = null; };
    if(infoPanelCloseBtn) infoPanelCloseBtn.addEventListener('click', hideInfoPanel);
    if(infoPanelUpgradeBtn) infoPanelUpgradeBtn.addEventListener('click', () => { if (!currentSelectedBuildingForInfo) return; const b = currentSelectedBuildingForInfo; const cMaxLvl = getMaxLevelForBuilding(b.type); const absMaxLvl = ABSOLUTE_MAX_LEVELS[b.type]; if (b.level >= absMaxLvl) { alert("Max level."); return; } if (b.level >= cMaxLvl) { alert(`TH Lvl Up Req.`); return; } const costInfo = UPGRADE_COSTS[b.type]?.[b.level]; const cost = costInfo?.cost || costInfo; if (!cost) { console.error("Upgrade cost error for",b.type,b.level); alert("Cannot upgrade."); return; } if (spendResources(cost.gold, cost.elixir)) { b.level++; if (b.type === 'armyCamp') calculateMaxArmyHousing(); showInfoPanel(); updateBuildingElementDOM(b); updateAllButtonStates(); } else { alert("Not enough resources."); } });
    if(infoPanelMoveBtn) infoPanelMoveBtn.addEventListener('click', () => { if (currentSelectedBuildingForInfo) { selectedBuildingIdForMove = currentSelectedBuildingForInfo.id; hideInfoPanel(); updateAllButtonStates(); } });
    if(infoPanel) infoPanel.addEventListener('click', (event) => { if (event.target.classList.contains('train-troop-btn')) { const troopId = event.target.dataset.troopId; const troopDef = TROOP_DEFINITIONS[troopId]; if (!troopDef) { console.error("Troop def not found:", troopId); return; } if (currentArmyHousingUsed + troopDef.housingSpace > maxArmyHousing) { alert("Not enough housing!"); return; } if (troopDef.trainingCost.resourceType === 'elixir') { if (elixir < troopDef.trainingCost.amount) { alert("Not enough Elixir!"); return; } elixir -= troopDef.trainingCost.amount; } else { alert("Other costs TBD"); return; } trainedArmy.push(troopId); currentArmyHousingUsed += troopDef.housingSpace; updateResourceDisplay(); showInfoPanel(); } });
    isCellOccupied = (r,c,excludeId=null) => villageBuildings.some(b=>b.id!==excludeId && b.gridPosition && b.gridPosition.row===r && b.gridPosition.col===c);
    findNextAvailableCell = () => { for(let r=0;r<GRID_ROWS;r++) for(let c=0;c<GRID_COLS;c++) if(!isCellOccupied(r,c)) return {row:r,col:c}; return null; };
    getCellFromCoordinates = (cX,cY) => { const x=cX-buildingsContainer.clientLeft; const y=cY-buildingsContainer.clientTop; const col=Math.floor(x/(CELL_SIZE+GAP_SIZE)); const row=Math.floor(y/(CELL_SIZE+GAP_SIZE)); if(row>=0 && row<GRID_ROWS && col>=0 && col<GRID_COLS) return {row,col}; return null; };
    getTownHallObject = () => villageBuildings.find(b=>b.type==='townHall');
    getCurrentTownHallLevel = () => {const th=getTownHallObject(); return th?th.level:0;};
    countBuildingsByType = (t) => villageBuildings.filter(b=>b.type===t).length;
    findBuildingById = (id) => villageBuildings.find(b=>b.id===id);
    getBuildingCap = (t) => {const thLvl=getCurrentTownHallLevel(); return TOWN_HALL_UNLOCKS[thLvl]?.buildingCaps[t]||0;};
    getMaxLevelForBuilding = (t) => {const thLvl=getCurrentTownHallLevel(); if(t==='townHall')return ABSOLUTE_MAX_LEVELS.townHall; return TOWN_HALL_UNLOCKS[thLvl]?.maxBuildingLevels[t]||0;};
    isBuildingTypeUnlocked = (t) => {const thLvl=getCurrentTownHallLevel(); if(t==='townHall'&&!getTownHallObject())return true; return TOWN_HALL_UNLOCKS[thLvl]?.newBuildingsUnlocked?.includes(t)||(TOWN_HALL_UNLOCKS[thLvl]?.buildingCaps[t]>0);};
    updateResourceDisplay = () => {goldAmountSpan.textContent=gold;elixirAmountSpan.textContent=elixir;updateArmyHousingDisplay();updateAllButtonStates();};
    spendResources = (g,e) => {if(gold>=g&&elixir>=e){gold-=g;elixir-=e;updateResourceDisplay();return true;}return false;};
    gainResources = (g,e) => {gold+=g;elixir+=e;updateResourceDisplay();};
    updateBuildingElementDOM = (b) => {const div=buildingsContainer.querySelector(`[data-building-id="${b.id}"]`);if(!div)return;if(b.gridPosition){div.style.gridRowStart=b.gridPosition.row+1;div.style.gridColumnStart=b.gridPosition.col+1;}let txtNode=Array.from(div.childNodes).find(n=>n.nodeType===Node.TEXT_NODE);if(!txtNode){txtNode=document.createTextNode('');div.insertBefore(txtNode,div.firstChild);}txtNode.textContent=`${b.type.charAt(0).toUpperCase()+b.type.slice(1)} (Lvl ${b.level}) `;if(selectedBuildingIdForMove===b.id)div.classList.add('selected-for-move');else div.classList.remove('selected-for-move');};
    createBuildingElement = (b) => {const div=document.createElement('div');div.classList.add('building',b.type.toLowerCase().replace(/\s+/g,''));div.setAttribute('data-building-id',String(b.id));buildingsContainer.appendChild(div);updateBuildingElementDOM(b);};
    updateAllButtonStates = () => {updateBuildButtonStates();villageBuildings.forEach(b=>updateBuildingElementDOM(b));if(currentSelectedBuildingForInfo&&!infoPanel.classList.contains('hidden'))showInfoPanel();};
    updateBuildButtonStates = () => { const thLvl = getCurrentTownHallLevel(); const townHallExists = !!getTownHallObject(); buildTownHallBtn.disabled = townHallExists; buildTownHallBtn.textContent = townHallExists ? 'Town Hall Built' : 'Build Town Hall (Free)'; ['goldMine', 'elixirCollector', 'barracks', 'armyCamp'].forEach(type => { let btn; if (type === 'goldMine') btn = buildGoldMineBtn; else if (type === 'elixirCollector') btn = buildElixirCollectorBtn; else if (type === 'barracks') btn = buildBarracksBtn; else if (type === 'armyCamp') btn = buildArmyCampBtn; if (!btn) return; const cost = BUILDING_COSTS[type]; const cap = getBuildingCap(type); const count = countBuildingsByType(type); const unlocked = isBuildingTypeUnlocked(type); btn.disabled = false; let btnText = `Build ${type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1')} (Cost: ${cost.gold > 0 ? cost.gold + "G" : cost.elixir + "E"})`; if (!townHallExists && type !== 'townHall') { btnText = `Build ${type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1')} (Requires TH)`; btn.disabled = true; } else if (!unlocked) { btnText = `${type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1')} (TH Lvl Req.)`; btn.disabled = true; } else if (count >= cap) { btnText = `${type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1')} (Max ${cap})`; btn.disabled = true; } else if (gold < cost.gold || elixir < cost.elixir) { btn.disabled = true; } btn.textContent = btnText; }); };
    handleBuildRequest = (type) => { const thLvl = getCurrentTownHallLevel(); if (type !== 'townHall' && !getTownHallObject()) { alert("Build a Town Hall first!"); return; } if (!isBuildingTypeUnlocked(type)) { alert(`${type.charAt(0).toUpperCase() + type.slice(1)} is not unlocked at current TH level.`); return; } if (countBuildingsByType(type) >= getBuildingCap(type)) { alert(`${type.charAt(0).toUpperCase() + type.slice(1)} limit reached for current TH level.`); return; } const availableCell = findNextAvailableCell(); if (!availableCell) { alert("No empty space in the village!"); return; } const cost = BUILDING_COSTS[type]; if (spendResources(cost.gold, cost.elixir)) { const newBuilding = createBuildingObject(type, availableCell); createBuildingElement(newBuilding); if (type === 'armyCamp') { calculateMaxArmyHousing(); } } else { alert(`Not enough resources to build ${type}.`); } };
    createBuildingObject = (type, gridPos) => { const newBuilding = { id: nextBuildingId++, type: type, level: 1, gridPosition: gridPos ? { row: gridPos.row, col: gridPos.col } : null }; villageBuildings.push(newBuilding); return newBuilding; };
    setInterval(() => { let g=0, e=0; villageBuildings.forEach(b => { if (b.type === 'goldMine') g+=(b.level*10); if (b.type === 'elixirCollector') e+=(b.level*10); }); gainResources(g,e); }, 5000);
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { if (selectedBuildingIdForMove !== null) { selectedBuildingIdForMove = null; updateAllButtonStates(); } if (!infoPanel.classList.contains('hidden')) { hideInfoPanel(); } if(isInAttackMode) { stopCombatLoop(); exitAttackMode(); } } }); // Added stopCombatLoop and exitAttackMode on Esc if in attack mode
    buildingsContainer.addEventListener('click', (event) => { const clickedElement = event.target; const clickedBuildingDiv = clickedElement.closest('.building'); if (clickedBuildingDiv) { const clickedBuildingId = parseInt(clickedBuildingDiv.getAttribute('data-building-id')); if (selectedBuildingIdForMove !== null) { if (selectedBuildingIdForMove === clickedBuildingId) { selectedBuildingIdForMove = null; } else { selectedBuildingIdForMove = clickedBuildingId; } hideInfoPanel(); } else { currentSelectedBuildingForInfo = findBuildingById(clickedBuildingId); showInfoPanel(); } updateAllButtonStates(); return; } if (selectedBuildingIdForMove !== null) { const cell = getCellFromCoordinates(event.offsetX, event.offsetY); if (cell) { if (!isCellOccupied(cell.row, cell.col, selectedBuildingIdForMove)) { const buildingToMove = findBuildingById(selectedBuildingIdForMove); if (buildingToMove) { buildingToMove.gridPosition.row = cell.row; buildingToMove.gridPosition.col = cell.col; } } else { alert("Cannot move to an occupied cell."); } } selectedBuildingIdForMove = null; hideInfoPanel(); updateAllButtonStates(); } });

    // Final initial calls
    calculateMaxArmyHousing();
    updateResourceDisplay();
});
