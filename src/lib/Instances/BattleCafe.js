/**
 * @class The AutomationBattleCafe regroups the BattleCafe panel elements
 */
class AutomationBattleCafe
{
    static Settings = {
                          FeatureEnabled: "BattleCafe-FarmEnabled",
                          StopOnPokedex: "BattleCafe-StopOnPokedex"
                      };

    /**
     * @brief Initializes the Battle Café components
     *
     * @param initStep: The current automation init step
     */
    static initialize(initStep)
    {
        if (initStep == Automation.InitSteps.BuildMenu)
        {
            // Disable the feature by default
            Automation.Menu.forceAutomationState(this.Settings.FeatureEnabled, false);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.StopOnPokedex, false);

            this.__internal__buildMenu();
        }
        else if (initStep == Automation.InitSteps.Finalize)
        {
            // Set the div visibility and content watcher
            setInterval(this.__internal__updateDivVisibilityAndContent.bind(this), 1000); // Refresh every 1s
        }
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    static __internal__autoBattleCafeLoop = null;
    static __internal__battleCafeInGameModal = null;
    static __internal__battleCafeSweetContainers = [];
    static __internal__currentlyVisibleSweet = null;
    static __internal__caughtPokemonIndicators = new Map();
    static __internal__pokemonPokerusIndicators = new Map();
    static __internal__battleButtonSelector = '#battleCafeModal button.btn-success';
    // Berries consumed by Battle Café sweets (EV-reducing set)
    static __internal__battleCafeBerries = [ BerryType.Pomeg, BerryType.Kelpsy, BerryType.Qualot, BerryType.Hondew, BerryType.Grepa, BerryType.Tamato ];

    /**
     * @brief Builds the 'Battle Café' menu panel
     */
    static __internal__buildMenu()
    {
        // Store the in-game modal internally
        this.__internal__battleCafeInGameModal = document.getElementById("battleCafeModal");

        let battleCafeTitle = '☕ Battle Café ☕';
        const battleCafeContainer =
            Automation.Menu.addFloatingCategory("automationBattleCafe", battleCafeTitle, this.__internal__battleCafeInGameModal);

        // Update the style to fit the width according to the panel content
        const mainContainer = battleCafeContainer.parentElement;
        mainContainer.style.width = "unset";
        mainContainer.style.minWidth = "145px";

        // Add an on/off button for farming automation
        const autoFarmTooltip = "Automatically battles trainers in the Battle Café."
                              + Automation.Menu.TooltipSeparator
                              + "Repeatedly fights trainers to farm Alcremie variants";
        const autoFarmButton =
            Automation.Menu.addAutomationButton("Auto Farm", this.Settings.FeatureEnabled, autoFarmTooltip, battleCafeContainer, true);
        autoFarmButton.addEventListener("click", this.__internal__toggleBattleCafeFarm.bind(this), false);

        // Add an on/off button to stop after pokedex completion
        const autoStopTooltip = "Automatically disables the Battle Café farming."
                              + Automation.Menu.TooltipSeparator
                              + "once all Alcremie variants are caught";
        const buttonLabel =
            'Stop on <span id="automation-battlecafe-pokedex-img"><img src="assets/images/pokeball/Pokeball.svg" height="17px"></span> :';
        Automation.Menu.addAutomationButton(buttonLabel, this.Settings.StopOnPokedex, autoStopTooltip, battleCafeContainer);

        battleCafeContainer.appendChild(document.createElement("br"));

        this.__internal__addInfo(null, -1, battleCafeContainer);

        for (const sweetIndex in BattleCafeController.evolutions)
        {
            const sweetData = BattleCafeController.evolutions[sweetIndex];

            const currentSweetContainer = document.createElement("div");
            currentSweetContainer.hidden = true;
            currentSweetContainer.style.textAlign = "left";
            currentSweetContainer.style.marginLeft = "5px";
            this.__internal__battleCafeSweetContainers.push(currentSweetContainer);

            currentSweetContainer.appendChild(document.createElement("br"));
            currentSweetContainer.appendChild(document.createTextNode("Day (6:00 → 18:00)"));
            currentSweetContainer.appendChild(document.createElement("br"));
            this.__internal__addInfo(sweetData, GameConstants.AlcremieSpins.dayClockwiseBelow5, currentSweetContainer);
            this.__internal__addInfo(sweetData, GameConstants.AlcremieSpins.dayClockwiseAbove5, currentSweetContainer);
            this.__internal__addInfo(sweetData, GameConstants.AlcremieSpins.dayCounterclockwiseBelow5, currentSweetContainer);
            this.__internal__addInfo(sweetData, GameConstants.AlcremieSpins.dayCounterclockwiseAbove5, currentSweetContainer);

            currentSweetContainer.appendChild(document.createElement("br"));
            currentSweetContainer.appendChild(document.createTextNode("Dusk (17:00 → 18:00)"));
            currentSweetContainer.appendChild(document.createElement("br"));
            this.__internal__addInfo(sweetData, GameConstants.AlcremieSpins.at5Above10, currentSweetContainer);

            currentSweetContainer.appendChild(document.createElement("br"));
            currentSweetContainer.appendChild(document.createTextNode("Night (18:00 → 6:00)"));
            currentSweetContainer.appendChild(document.createElement("br"));
            this.__internal__addInfo(sweetData, GameConstants.AlcremieSpins.nightClockwiseBelow5, currentSweetContainer);
            this.__internal__addInfo(sweetData, GameConstants.AlcremieSpins.nightClockwiseAbove5, currentSweetContainer);
            this.__internal__addInfo(sweetData, GameConstants.AlcremieSpins.nightCounterclockwiseBelow5, currentSweetContainer);
            this.__internal__addInfo(sweetData, GameConstants.AlcremieSpins.nightCounterclockwiseAbove5, currentSweetContainer);
            battleCafeContainer.appendChild(currentSweetContainer);
        }
    }

    /**
     * @brief Adds the given @p spinType info to the panel
     *
     * @param sweetData: The battle café sweet data
     * @param spinType: The spin type
     * @param {Element} parent: The parent div
     */
    static __internal__addInfo(sweetData, spinType, parent)
    {
        let container = document.createElement("div");
        parent.appendChild(container);

        let summary = "";
        let tooltip = "By spining for "
        let pokemonName = "Milcery (Cheesy)";
        if (spinType == -1)
        {
            container.style.textAlign = "center";
            summary = "3600"
            container.style.marginLeft = "5px";
            tooltip += "3600 seconds in any direction, with any sweet,";
        }
        else
        {
            // Spin count info
            container.style.marginLeft = "10px";
            if (spinType == GameConstants.AlcremieSpins.at5Above10)
            {
                tooltip += "11 seconds or more "
                summary += "11+";
            }
            else if ((spinType == GameConstants.AlcremieSpins.dayClockwiseAbove5)
                     || (spinType == GameConstants.AlcremieSpins.nightClockwiseAbove5)
                     || (spinType == GameConstants.AlcremieSpins.dayCounterclockwiseAbove5)
                     || (spinType == GameConstants.AlcremieSpins.nightCounterclockwiseAbove5))
            {
                tooltip += "5 seconds or more "
                summary += "5+";
            }
            else
            {
                tooltip += "1 to 4 seconds "
                summary += "1→4";
            }

            // Spin direction info
            if ((spinType == GameConstants.AlcremieSpins.dayClockwiseBelow5)
                || (spinType == GameConstants.AlcremieSpins.dayClockwiseAbove5)
                || (spinType == GameConstants.AlcremieSpins.nightClockwiseBelow5)
                || (spinType == GameConstants.AlcremieSpins.nightClockwiseAbove5))
            {
                // Clockwise symbole
                summary += " ↻";
                tooltip += "clockwise"
            }
            else
            {
                // Counter clockwise symbole
                summary += " ↺";
                tooltip += "counter-clockwise"
            }
            pokemonName = sweetData[spinType].name;
        }
        tooltip += ""

        let pokemonId = pokemonMap[pokemonName].id;
        summary += ` : #${pokemonId}`;
        tooltip += `\nyou can get ${pokemonName}`;

        // Set the tooltip
        container.classList.add("hasAutomationTooltip");
        container.classList.add("centeredAutomationTooltip");
        container.classList.add("shortTransitionAutomationTooltip");
        container.style.cursor = "help";
        container.setAttribute("automation-tooltip-text", tooltip);

        container.appendChild(document.createTextNode(summary));

        // Add the caught status placeholder
        const caughtIndicatorElem = document.createElement("span");
        container.appendChild(caughtIndicatorElem);
        this.__internal__caughtPokemonIndicators.set(
            pokemonName, { container: caughtIndicatorElem, pokemonId: pokemonId, currentStatus: null });

        // Add the pokérus status placeholder
        const pokerusIndicatorElem = document.createElement("span");
        pokerusIndicatorElem.style.marginRight = "4px";
        container.appendChild(pokerusIndicatorElem);
        this.__internal__pokemonPokerusIndicators.set(
            pokemonName, { container: pokerusIndicatorElem, pokemonId: pokemonId, currentStatus: null });
    }

    /**
     * @brief Toggle the 'Battle Café' category visibility based on the game state
     *        It will refresh the selected sweet as well
     *
     * The category is only visible the player entered the Battle Café
     */
    static __internal__updateDivVisibilityAndContent()
    {
        if (this.__internal__battleCafeInGameModal.classList.contains("show"))
        {
            const selectedSweet = BattleCafeController.selectedSweet();

            // Refresh caught statuses
            this.__internal__refreshCaughtStatus("Milcery (Cheesy)");
            const currentRewards = BattleCafeController.evolutions[selectedSweet];
            for (const rewardIndex in currentRewards)
            {
                this.__internal__refreshCaughtStatus(currentRewards[rewardIndex].name);
            }

            if (selectedSweet == this.__internal__currentlyVisibleSweet)
            {
                // Nothing changed
                return;
            }

            if (this.__internal__currentlyVisibleSweet != null)
            {
                this.__internal__battleCafeSweetContainers[this.__internal__currentlyVisibleSweet].hidden = true;
            }

            this.__internal__battleCafeSweetContainers[selectedSweet].hidden = false;
            this.__internal__currentlyVisibleSweet = selectedSweet;
        }
    }

    /**
     * @brief Refreshes the caught status of the given @p pokemonName, if it changed
     *
     * @param {string} pokemonName: The name of the pokemon to refresh
     */
    static __internal__refreshCaughtStatus(pokemonName)
    {
        // Refresh the caught status
        const internalCaughtData = this.__internal__caughtPokemonIndicators.get(pokemonName);
        const caughtStatus = Automation.Utils.getPokemonCaughtStatus(internalCaughtData.pokemonId);

        if (caughtStatus != internalCaughtData.currentStatus)
        {
            internalCaughtData.container.innerHTML = Automation.Menu.getCaughtStatusImage(caughtStatus);
            internalCaughtData.container.style.position = "relative";
            internalCaughtData.container.style.bottom = "2px";
            internalCaughtData.container.style.marginLeft = "3px";
            internalCaughtData.currentStatus = caughtStatus;
        }

        // Refresh the pokérus status
        const internalPokerusData = this.__internal__pokemonPokerusIndicators.get(pokemonName);
        const pokerusStatus = PartyController.getPokerusStatus(internalPokerusData.pokemonId);

        if (pokerusStatus != internalPokerusData.currentStatus)
        {
            internalPokerusData.container.innerHTML = Automation.Menu.getPokerusStatusImage(pokerusStatus);
            internalPokerusData.container.style.paddingLeft = (internalPokerusData.container.innerHTML == "") ? "0px" : "3px";
            internalPokerusData.currentStatus = pokerusStatus;
        }
    }

    /**
     * @brief Toggles the 'Battle Café Farm' feature
     *
     * If the feature was enabled and it's toggled to disabled, the loop will be stopped.
     * If the feature was disabled and it's toggled to enabled, the loop will be started.
     *
     * @param enable: [Optional] If a boolean is passed, it will be used to set the right state.
     *                Otherwise, the local storage value will be used
     */
    static __internal__toggleBattleCafeFarm(enable)
    {
        // If we got the click event, use the button status
        if ((enable !== true) && (enable !== false))
        {
            enable = (Automation.Utils.LocalStorage.getValue(this.Settings.FeatureEnabled) === "true");
        }

        if (enable)
        {
            // Only set a loop if there is none active
            if (this.__internal__autoBattleCafeLoop === null)
            {
                // Set auto-battle café loop
                this.__internal__autoBattleCafeLoop = setInterval(this.__internal__battleCafeFarmLoop.bind(this), 200); // Refresh every 0.2s
            }
        }
        else
        {
            // Unregister the loop
            clearInterval(this.__internal__autoBattleCafeLoop);
            this.__internal__autoBattleCafeLoop = null;
        }
    }

    /**
     * @brief The Battle Café Auto Farm loop
     *
     * It will automatically start battles with trainers in the Battle Café.
     * Phase 1: Farm berries to catch all Alcremie variants at least once
     * Phase 2: Farm to get all Alcremie variants with Pokerus (50+ captures each)
     */
    static __internal__battleCafeFarmLoop()
    {
        // Check if all pokemon have Pokerus (Phase 2 complete)
        if (this.__internal__areAllPokerusComplete())
        {
            Automation.Menu.forceAutomationState(this.Settings.FeatureEnabled, false);
            Automation.Notifications.sendNotif("All Alcremie variants have Pokerus!", "Battle Café");
            return;
        }

        // Check if we should stop based on pokedex completion (Phase 1 complete but not Phase 2)
        if ((Automation.Utils.LocalStorage.getValue(this.Settings.StopOnPokedex) === "true")
            && this.__internal__isPokedexCompleted()
            && !this.__internal__areAllPokerusComplete())
        {
            Automation.Menu.forceAutomationState(this.Settings.FeatureEnabled, false);
            Automation.Notifications.sendNotif("All Alcremie variants caught! To get Pokerus, re-enable the farming.", "Battle Café");
            return;
        }

        // Check if the Battle Café modal is visible
        if (!this.__internal__battleCafeInGameModal.classList.contains("show"))
        {
            return;
        }

        // Check if we're currently in a battle
        if (App.game.gameState === GameConstants.GameState.trainer)
        {
            return;
        }

        // Try to start a new battle
        // Look for the battle button in the Battle Café modal
        const battleButton = document.querySelector(this.__internal__battleButtonSelector);
        if (battleButton && !battleButton.disabled)
        {
            battleButton.click();
        }
    }

    /**
     * @brief Checks if all Alcremie variants have been caught
     *
     * @returns True if all variants are caught, false otherwise
     */
    static __internal__isPokedexCompleted()
    {
        // Check Milcery (Cheesy)
        const milceryName = "Milcery (Cheesy)";
        if (!App.game.party.alreadyCaughtPokemonByName(milceryName))
        {
            return false;
        }

        // Check all Alcremie variants
        const selectedSweet = BattleCafeController.selectedSweet();
        const currentRewards = BattleCafeController.evolutions[selectedSweet];
        for (const rewardIndex in currentRewards)
        {
            const pokemonName = currentRewards[rewardIndex].name;
            if (!App.game.party.alreadyCaughtPokemonByName(pokemonName))
            {
                return false;
            }
        }

        return true;
    }

    /**
     * @brief Checks if all Alcremie variants have been caught 50+ times (have Pokerus)
     *
     * @returns True if all variants have Pokerus, false otherwise
     */
    static __internal__areAllPokerusComplete()
    {
        const POKERUS_CAPTURE_THRESHOLD = 50;

        // Check Milcery (Cheesy)
        const milceryName = "Milcery (Cheesy)";
        const milceryId = pokemonMap[milceryName].id;
        if (App.game.statistics.pokemonCaptured[milceryId]() < POKERUS_CAPTURE_THRESHOLD)
        {
            return false;
        }

        // Check all Alcremie variants in all sweets
        for (const sweetIndex in BattleCafeController.evolutions)
        {
            const sweetData = BattleCafeController.evolutions[sweetIndex];
            for (const rewardIndex in sweetData)
            {
                const pokemonName = sweetData[rewardIndex].name;
                const pokemonId = pokemonMap[pokemonName].id;
                if (App.game.statistics.pokemonCaptured[pokemonId]() < POKERUS_CAPTURE_THRESHOLD)
                {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * @brief Toggles the 'Auto Berry Farm' feature
     *
     * If enabled, will automatically request the Farming automation to plant Battle Café berries.
     * If disabled, will stop requesting berries.
     *
     * @param enable: [Optional] If a boolean is passed, it will be used to set the right state.
     *                Otherwise, the local storage value will be used
     */
    static __internal__toggleBerryFarm(enable)
    {
        // If we got the click event, use the button status
        if ((enable !== true) && (enable !== false))
        {
            enable = (Automation.Utils.LocalStorage.getValue(this.Settings.AutoBerryFarm) === "true");
        }

        if (enable)
        {
            // Check if farming is available
            if (!App.game.farming.canAccess())
            {
                Automation.Notifications.sendWarningNotif("Farm not yet unlocked!", "Battle Café");
                Automation.Menu.forceAutomationState(this.Settings.AutoBerryFarm, false);
                return;
            }

            // Check if farming automation is enabled
            if (Automation.Utils.LocalStorage.getValue(Automation.Farm.Settings.FeatureEnabled) !== "true")
            {
                Automation.Notifications.sendWarningNotif("Please enable Farming automation first!", "Battle Café");
                Automation.Menu.forceAutomationState(this.Settings.AutoBerryFarm, false);
                return;
            }

            // Request the berries to be farmed
            this.__internal__requestBattleCafeBerries();
        }
        else
        {
            // Stop requesting berries
            this.__internal__stopRequestingBattleCafeBerries();
        }
    }

    /**
     * @brief Requests the Farming automation to plant Battle Café berries
     */
    static __internal__requestBattleCafeBerries()
    {
        if (!App.game.farming.canAccess())
        {
            return;
        }

        // Find the next berry that needs to be farmed
        const berryToFarm = this.__internal__getNextBerryToFarm();

        if (berryToFarm === null)
        {
            // Nothing needed: stop forcing a berry and clear watcher
            this.__internal__stopRequestingBattleCafeBerries();
            return;
        }

        // Request this berry to be planted
        Automation.Farm.ForcePlantBerriesAsked = berryToFarm;

        // Set up a watcher to rotate to the next berry when needed
        if (!this.__internal__berryFarmWatcher)
        {
            this.__internal__berryFarmWatcher = setInterval(function()
            {
                if (Automation.Utils.LocalStorage.getValue(this.Settings.AutoBerryFarm) !== "true")
                {
                    clearInterval(this.__internal__berryFarmWatcher);
                    this.__internal__berryFarmWatcher = null;
                    return;
                }

                const nextBerry = this.__internal__getNextBerryToFarm();
                if (nextBerry === null)
                {
                    this.__internal__stopRequestingBattleCafeBerries();
                    return;
                }

                if (nextBerry !== Automation.Farm.ForcePlantBerriesAsked)
                {
                    Automation.Farm.ForcePlantBerriesAsked = nextBerry;
                }
            }.bind(this), 30000); // Check every 30 seconds
        }

        Automation.Notifications.sendNotif(
            `Now farming ${BerryType[berryToFarm]} berries for Battle Café`,
            "Battle Café"
        );
    }

    /**
     * @brief Stops requesting berries from the Farming automation
     */
    static __internal__stopRequestingBattleCafeBerries()
    {
        // Clear the forced berry request if it was one of our berries
        if (Automation.Farm.ForcePlantBerriesAsked !== null
            && this.__internal__battleCafeBerries.includes(Automation.Farm.ForcePlantBerriesAsked))
        {
            Automation.Farm.ForcePlantBerriesAsked = null;
        }

        // Clear the watcher
        if (this.__internal__berryFarmWatcher)
        {
            clearInterval(this.__internal__berryFarmWatcher);
            this.__internal__berryFarmWatcher = null;
        }
    }

    /**
     * @brief Determines which Battle Café berry needs to be farmed next
     *
     * @returns The BerryType to farm, or null if all berries are sufficiently stocked
     */
    static __internal__getNextBerryToFarm()
    {
        const minBerryCount = 50; // Keep at least 50 of each berry

        // Find berries that are below the minimum threshold
        const berriesNeeded = this.__internal__battleCafeBerries.filter(berryType => {
            // Skip if berry is not unlocked yet
            if (!App.game.farming.unlockedBerries[berryType]())
            {
                return false;
            }

            // Check if we have enough of this berry
            const currentCount = App.game.farming.berryList[berryType]();
            return currentCount < minBerryCount;
        });

        if (berriesNeeded.length === 0)
        {
            return null; // All berries are sufficiently stocked
        }

        // Return the berry with the lowest count
        return berriesNeeded.reduce((minBerry, berry) => {
            const currentCount = App.game.farming.berryList[berry]();
            const minCount = App.game.farming.berryList[minBerry]();
            return currentCount < minCount ? berry : minBerry;
        });
    }

    static __internal__berryFarmWatcher = null;
}
