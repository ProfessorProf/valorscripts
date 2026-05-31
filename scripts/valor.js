/**
 * VALOR API SCRIPTS v2.0.3a
 * 
 * INSTALLATION INSTRUCTIONS
 * 1. From campaign, go to API Scripts.
 * 2. Create a new script, and paste the contents of this file into it.
 * 3. Click Save Script.
 * 
 * For usage instructions, consult the readme file.
 **/

// Settings for optional functions - 'true' for on, 'false' for off.
state.statusTrackerEnabled = true;      // Erase statuses on the turn order when they reach 0.
state.valorUpdaterEnabled = true;       // Add Valor for all Elites and Masters when a new round starts.
state.maxValueSyncEnabled = true;       // Move HP and ST to match when max HP and max ST change.
state.sheetSyncEnabled = true;          // Move HP and ST to match when a token changes to a new character sheet.
state.ongoingEffectProcessor = true;    // Parse regen and ongoing damage as they happen.
state.ignoreLimitsOnMinions = true;     // Disables limit blocking for Flunkies and Soldiers.
state.showTechAlerts = true;            // Send alerts for when ammo changes and when techs come off of cooldown.
state.showHealthAlerts = true;          // Send alerts when characters enter or leave critical health.
state.houseRulesEnabled = true;         // Enables various unsupported house rules.
state.autoResolveTechBenefits = true;   // Enables automatic adjustment of HP for Healing, Boosts, and Transformations.
state.hideNpcTechEffects = false;       // For non-player characters, don't show players the tech effect when using !t.
state.rollBehindScreen = false;         // Hide NPC rolls from the players.
state.autoInitiativeUpdate = true;      // If a character's initiative changes during play, move them accordingly.
state.autoInitiativeReport = true;      // If a character's initiative changes during play, send a whisper to the GM.
state.confirmAutoInitiative = false;    // Confirm whether or not to auto-update initiative before each scene.
state.applyAttackResults = true;        // Allows GM to directly apply attack results with a chat button on a hit.
state.showAttackResults = true;         // Sends messages to the chat when attack results are applied.
state.sendDefenseButtons = true;        // Sends buttons players can click to automatically defend.
state.verboseTechniques = true;         // Gives more detailed information about techniques in the chat window.

const valorName = 'Valor';	// Name of the character who sends system messages. If no character exists with this name, messages will be sent from nobody, which can add irregularities in the chat logs.
state.narratorId = '';

const resetAttributes = ['rollbonus', 'attackrollbonus', 'defenserollbonus', 'physicalattackbonus', 'energyattackbonus', 
    'defensebonus', 'resistancebonus', 'physicalshield', 'energyshield', 'versatileshield'];

const coreLibrary = [
    { cost: 2, levelUp: 1, id: 'damage', action: 'Attack', needsStat: true },
    { cost: 0, levelUp: 0, id: 'custom' },
    { cost: 1, levelUp: 1, id: 'barrier', action: 'Support' },
    { cost: 0, levelUp: 2, id: 'boost', action: 'Support' },
    { cost: 1, levelUp: 1, id: 'healing', action: 'Support' },
    { cost: 1, levelUp: 1, id: 'shield', action: 'Support' },
    { cost: 0, levelUp: 0, id: 'mimic', action: 'Attack', needsStat: true },
    { cost: 3, levelUp: 2, id: 'summoning', action: 'Slow' },
    { cost: 1, levelUp: 1, id: 'weaken', action: 'Support', needsStat: true },
    { cost: 4, levelUp: 2, id: 'ultDamage', action: 'Attack', ultimate: true, needsStat: true },
    { cost: 0, levelUp: 3, id: 'ultTransform', action: 'Support', ultimate: true },
    { cost: 0, levelUp: 3, id: 'ultMimic', ultimate: true },
    { cost: 3, levelUp: 3, id: 'ultDomain', action: 'Support', ultimate: true, needsStat: true }
];


const flawLibrary = [
    { cost: 1,  levelUp: 1, speed: 3, id: 'customFlaw', name: 'Custom Flaw', namePattern: '^custom' },
    { cost: 2,  levelUp: 0, speed: 0, id: 'aggravatedWounds', name: 'Aggravated Wounds', namePattern: '^aggravated', description: 'Incoming healing is halved.' },
    { cost: 5,  levelUp: 0, speed: 0, id: 'berserker', name: 'Berserker', namePattern: '^berserk', description: 'When critical, get +10 attack, -10 defense/resistance, +1 to attack rolls, and -2 to defense rolls.' },
    { cost: 4,  levelUp: 0, speed: 0, id: 'compulsion', name: 'Compulsion', namePattern: '^compulsion', description: 'Every even-numbered round, waste a support action or lose 1 Valor.' },
    { cost: 4,  levelUp: 0, speed: 0, id: 'despair', name: 'Despair', namePattern: '^despair', description: 'The first time an ally falls in a scene, -2 Valor.' },
    { cost: 2,  levelUp: 1, speed: 2, id: 'energyVulnerability', name: 'Energy Vulnerability', namePattern: '^energy vuln', description: 'Resistance is reduced.' },
    { cost: 3,  levelUp: 0, speed: 0, id: 'feeble', name: 'Feeble', namePattern: '^feeble', description: '-1 to defense rolls against Muscle techniques.' },
    { cost: 3,  levelUp: 2, speed: 2, id: 'fragile', name: 'Fragile', namePattern: '^fragile', description: 'Max Health is reduced by [({fl}+1)*15].' },
    { cost: 2,  levelUp: 1, speed: 2, id: 'lackOfControl', name: 'Lack of Control', namePattern: '^lack ', description: 'Max Stamina is reduced by [({fl}*6+25].' },
    { cost: 5,  levelUp: 0, speed: 0, id: 'malevolentEntity', name: 'Malevolent Entity', namePattern: '^malevolent entity', description: 'When damage leaves you critical, roll to resist being taken over by the Malevolent Entity.' },
    { cost: 1,  levelUp: 0, speed: 0, id: 'nonProficient', name: 'Non-Proficient', detail: true, namePattern: '^non[ -]?proficient', description: '-1 to rolls made for a specific Challenge action.' },
    { cost: 3,  levelUp: 0, speed: 0, id: 'oblivious', name: 'Oblivious', namePattern: '^oblivious', description: '-1 to defense rolls against Intuition techniques.' },
    { cost: 2,  levelUp: 1, speed: 1, id: 'slow', name: 'Slow', namePattern: '^slow$', description: 'Move is reduced by [{fl}].' },
    { cost: 2,  levelUp: 0, speed: 0, id: 'slowHealing', name: 'Slow Healing', namePattern: '^slow heal', description: "Don't recover health in the first scene after a fight." },
    { cost: 1,  levelUp: 0, speed: 0, id: 'slowToAct', name: 'Slow to Act', namePattern: '^slow to act', description: 'Initiative rolls are reduced by 2.' },
    { cost: 3,  levelUp: 0, speed: 0, id: 'unthreatening', name: 'Unthreatening', namePattern: '^unthreatening', description: "Enemies aren't slowed in your Zone of Control." },
    { cost: 3,  levelUp: 0, speed: 0, id: 'uncoordinated', name: 'Uncoordinated', namePattern: '^uncoordinated', description: '-1 to defense rolls against Dexterity techniques.' },
    { cost: 3,  levelUp: 0, speed: 0, id: 'violent', name: 'Violent', namePattern: '^violent', description: "If you choose not to attack anyone on a turn, -2 Valor." },
    { cost: 3,  levelUp: 0, speed: 0, id: 'weakAura', name: 'Weak Aura', namePattern: '^weak aura', description: "-1 to defense rolls against Aura attacks." },
    { cost: 2,  levelUp: 1, speed: 2, id: 'weakDefender', name: 'Weak Defender', namePattern: '^weak defend', description: "Defense is reduced by [({fl}+1)*2]." },
    { cost: 4,  levelUp: 3, speed: 1, id: 'weakWilled', name: 'Weak Willed', namePattern: '^weak will', description: "-1 Valor at the start of a scene." },
    { cost: 1,  levelUp: 0, speed: 0, id: 'unprincipled', name: 'Unprincipled', namePattern: '^unprincipled', description: "Gain an extra Vice." },
    { cost: 2,  levelUp: 1, speed: 1, id: 'elementalVulnerability', name: 'Elemental Vulnerability', detail: true, namePattern: '^elemental vuln', description: "Take [({fl}*4)+2] extra damage from one element." },
    { cost: 2,  levelUp: 1, speed: 1, id: 'armorReliant', name: 'Armor Reliant', namePattern: '^armor reliant', description: "Defense reduced when not wearing armor." },
    { cost: 2,  levelUp: 1, speed: 1, id: 'wardReliant', name: 'Ward Reliant', namePattern: '^ward reliant', description: "Resistance reduced when not using a ward." },
    { cost: 4,  levelUp: 0, speed: 0, id: 'broadForm', name: 'Board Form', namePattern: '^broad form', description: "Smaller characters can stand on top of you." },
    { cost: 3,  levelUp: 0, speed: 0, id: 'fearTheDarkness', name: 'Fear the Darkness', namePattern: '^fear the dark', description: "When someone in your party succumbs to the Malevolent Entity, -2 Valor." },
    { cost: 7,  levelUp: 0, speed: 0, id: 'immobile', name: 'Immobile', namePattern: '^immobile', description: "Cannot move." },
    { cost: 3,  levelUp: 0, speed: 0, id: 'insubstantial', name: 'Insubstantial', namePattern: '^insubstantial', description: "Characters can occupy your space." },
    { cost: 2,  levelUp: 0, speed: 0, id: 'situationalCompulsion', name: 'Situational Compulsion', namePattern: '^situational compulsion', description: "When a specific condition occurs, you must waste a Support Action or lose 1 Valor." },
    { cost: 5,  levelUp: 0, speed: 0, id: 'sunlightWeakness', name: 'Sunlight Weakness', namePattern: '^sunlight', description: "While standing in sunlight, you lose a Health Increment and 1 Valor each turn." },
    { cost: 3,  levelUp: 0, speed: 0, id: 'thresheld', name: 'Thresheld', namePattern: '^thresheld', description: "You cannot enter a home or haven without explicit permission." },
    { cost: 2,  levelUp: 0, speed: 0, id: 'weakGuard', name: 'Weak Guard', namePattern: '^weak guard', description: "Critical threshold is reduced by 2." },
    { cost: 10, levelUp: 0, speed: 0, id: 'malevolentPossession', name: 'Malevolent Possession', namePattern: '^malevolent possess', description: "Malevolent Entity has been applied to you by an outside force." },
    { cost: 3,  levelUp: 2, speed: 2, id: 'weakPhysicalAttacker', name: 'Weak physical Attacker', namePattern: '^weak phys(ical)? attack', description: "Physical Attack is reduced by [({fl}+1)*3]." },
    { cost: 3,  levelUp: 2, speed: 2, id: 'weakEnergyAttacker', name: 'Weak Energy Attacker', namePattern: '^weak en(ergy)? attack', description: "Energy Attack is reduced by [({fl}+1)*3]." },
    { cost: 4,  levelUp: 0, speed: 0, id: 'impairedAccuracy', name: 'Impaired Accuracy', namePattern: '^impaired acc', description: "-1 to attack rolls." },
    { cost: 4,  levelUp: 0, speed: 0, id: 'impairedEvasion', name: 'Impaired Evasion', namePattern: '^impaired (evd|eva)', description: "-1 to defense rolls." },
    { cost: 3,  levelUp: 0, speed: 0, id: 'flightless', name: 'Flightless', namePattern: '^flightless', description: "Cannot fly." },
    { cost: 3,  levelUp: 0, speed: 0, id: 'battleDamage', name: 'Battle Damage', namePattern: '^battle damage', description: "If you take a Health Increment of damage, -1 to all rolls for the rest of the scene." }
];

const skillLibrary = [
    { cost: 1,  levelUp: 1, speed: 3, id: 'customSkill', name: 'Custom Skill', detail: true, namePattern: '^custom', description: ' ' },
    { cost: 8,  levelUp: 0, speed: 0, id: 'balancedFighter', name: 'Balanced Fighter', namePattern: '^balanced', description: "+1 to all active attributes below your highest attribute." },
    { cost: 6,  levelUp: 6, speed: 0, id: 'bravado', name: 'Bravado', namePattern: '^bravado', description: "+1 Valor at the start of a scene." },
    { cost: 3,  levelUp: 0, speed: 0, rollStats: ['aura'], id: 'discreetAura', name: 'Discreet Aura', namePattern: '^discreet', description: "Can roll Aura to resist Spirit Sight." },
    { cost: 4,  levelUp: 0, speed: 0, id: 'darksight', name: 'Darksight', namePattern: '^dark( )?sight', description: "No penalties from fighting in darkness." },
    { cost: 6,  levelUp: 3, speed: 1, id: 'energyAttacker', name: 'Energy Attacker', namePattern: '^en(ergy)? attack', description: "Energy Attack is increased by [({sl}+1)*3]." },
    { cost: 4,  levelUp: 0, speed: 0, id: 'fastHealing', name: 'Fast Healing', namePattern: '^fast heal', description: "Heal more between scenes." },
    { cost: 4,  levelUp: 2, speed: 1, id: 'improvedDamageIncrement', name: 'Improved Damage Increment', namePattern: '^improved damage inc', description: "Damage Increment increased." },
    { cost: 2,  levelUp: 1, speed: 2, id: 'increasedSize', name: 'Increased Size', namePattern: '^increased size', description: "Take up more space, +1 to attack rolls, -1 to defense rolls, +2 to critical threshold." },
    { cost: 4,  levelUp: 2, speed: 1, id: 'ironDefense', name: 'Iron Defense', namePattern: '^iron def', description: "Defense is increased by [({sl}+1)*2]." },
    { cost: 6,  levelUp: 3, speed: 1, id: 'physicalAttacker', name: 'Physical Attacker', namePattern: '^phys(ical)? attack', description: "Physical Attack is increased by [({sl}+1)*3]." },
    { cost: 4,  levelUp: 2, speed: 1, id: 'resistant', name: 'Resistant', namePattern: '^resistan', description: "Resistance is increased by [({sl}+1)*2]." },
    { cost: 4,  levelUp: 2, speed: 1, id: 'sprinter', name: 'Sprinter', namePattern: '^sprint', description: "Move is increased by [{sl}]." },
    { cost: 5,  levelUp: 2, speed: 2, id: 'tireless', name: 'Tireless', namePattern: '^tireless', description: "Max Stamina is increased by [{sl}*6+2]." },
    { cost: 6,  levelUp: 3, speed: 2, id: 'tough', name: 'Tough', namePattern: '^tough$', description: "Max Health is increased by [({sl}+1)*15]." },
    { cost: 6,  levelUp: 3, speed: 2, id: 'versatileFighter', name: 'Versatile Fighter', namePattern: '^versatile', description: "Technique Points are increased by [({sl}+1)*2]." },
    { cost: 5,  levelUp: 0, speed: 0, id: 'skyAttack', name: 'Sky Attack', namePattern: '^sky attack', description: "Bonus damage against flying targets." },
    { cost: 6,  levelUp: 0, speed: 0, id: 'breakValorLimit', name: 'Break Valor Limit', namePattern: '^break valor', description: "Max Valor is increased by 10." },
    { cost: 8,  levelUp: 0, speed: 0, id: 'expandedReach', name: 'Expanded Reach', namePattern: '^expanded reach', description: "Zone of Control is one space wider." },
    { cost: 4,  levelUp: 0, speed: 0, id: 'expandedRange', name: 'Expanded Range', namePattern: '^expanded range', description: "Skills with a range of 5 instead have a range of 20." },
    { cost: 12, levelUp: 0, speed: 0, id: 'extraAction', name: 'Extra Action', namePattern: '^extra action', description: "Gain an extra Support Action each turn." },
    { cost: 6,  levelUp: 4, speed: 1, id: 'regeneration', name: 'Regeneration', namePattern: '^regen', description: "Recover [{sl}*10] health each turn." },
    { cost: 4,  levelUp: 2, speed: 1, id: 'staminaRecovery', name: 'Stamina Recovery', namePattern: '^stamina recover', description: "Recover [{sl}*4] stamina each turn." },
    { cost: 6,  levelUp: 0, speed: 0, id: 'teleportation', name: 'Teleportation', namePattern: '^teleport', description: "Ignore all obstacles when moving." },
    { cost: 6,  levelUp: 0, speed: 0, id: 'unyieldingDetermination', name: 'Unyielding Determination', namePattern: '^unyielding', description: "+1 Valor when gaining valor from dramatic speech or action." },
    { cost: 4,  levelUp: 0, speed: 0, id: 'violentAura', name: 'Violent Aura', namePattern: '^violent aura', description: "While active, damage all enemies in your Zone of Control at start of turn." },
    { cost: 5,  levelUp: 0, speed: 0, id: 'bounceBack', name: 'Bounce Back', namePattern: '^bounce back', description: "If Valor is below 0, gain 1 extra Valor each round." },
    { cost: 4,  levelUp: 2, speed: 2, id: 'crisis', name: 'Crisis', namePattern: '^crisis$', description: "Attack is increased by [({sl}+1)*3] while critical." },
    { cost: 3,  levelUp: 0, speed: 0, id: 'dangerSense', name: 'Danger Sense', namePattern: '^danger sense', description: "Can't be Surprised." },
    { cost: 5,  levelUp: 0, speed: 0, id: 'desperation', name: 'Desperation', namePattern: '^desperation', description: "+1 to defense rolls while Critical." },
    { cost: 5,  levelUp: 0, speed: 0, id: 'digdeep', name: 'Dig Deep', namePattern: '^dig deep', description: "Can pay for techniques using Health instead of Stamina." },
    { cost: 2,  levelUp: 0, speed: 0, id: 'discretion', name: 'Discretion', namePattern: '^discretion', description: "Can choose to reduce any of your rolls by 3." },
    { cost: 6,  levelUp: 3, speed: 2, id: 'empowerAttack', name: 'Empower Attack', namePattern: '^empower', description: "Can use a Slow Action when attacking to do [({sl}+1)*3] extra damage." },
    { cost: 4,  levelUp: 0, speed: 0, id: 'improvedSwimming', name: 'Improved Swimming', namePattern: '^improved swim', description: "No penalties to rolls while swimming." },
    { cost: 4,  levelUp: 0, speed: 0, rollStats: ['dexterity'], id: 'nimbleMovement', name: 'Nimble Movement', namePattern: '^nimble move', description: "On success, move through the target's Zone of Control without being slowed this turn." },
    { cost: 6,  levelUp: 0, speed: 0, id: 'overloadLimits', name: 'Overload Limits', namePattern: '^overload limit', description: "Can ignore limits by paying full Stamina cost." },
    { cost: 4,  levelUp: 0, speed: 0, id: 'passiveHealing', name: 'Passive Healing', namePattern: '^passive heal', description: "Can forego a Stamina Increment when recovering to heal someone else by a Health Increment." },
    { cost: 5,  levelUp: 0, speed: 0, id: 'protector', name: 'Protector', namePattern: '^protector', description: "When you Cover a specific character, +1 Valor." },
    { cost: 3,  levelUp: 0, speed: 0, id: 'quickToAct', name: 'Quick to Act', namePattern: '^quick to act', description: "+3 to Initiative rolls." },
    { cost: 5,  levelUp: 3, speed: 1, id: 'recklessAttack', name: 'Reckless Attack', namePattern: '^reckless', description: "Can increase attack rolls, but take a penalty to defense rolls." },
    { cost: 5,  levelUp: 0, speed: 0, id: 'resoluteStrike', name: 'Resolute Strike', namePattern: '^resolute strike', description: "If Valor is at least 2, can roll with Resolve when attacking." },
    { cost: 5,  levelUp: 0, speed: 0, id: 'revenge', name: 'Revenge', namePattern: '^revenge', description: "The first time an ally falls in a scene, +2 Valor." },
    { cost: 4,  levelUp: 0, speed: 0, id: 'rollingRecovery', name: 'Rolling Recovery', namePattern: '^rolling recover', description: "If you stand from prone with a Move Action, you can move at half speed." },
    { cost: 5,  levelUp: 0, speed: 0, id: 'teamTactics', name: 'Team Tactics', namePattern: '^team tactic', description: "+1 to attack rolls if you and an ally are adjacent to the target, but not each other." },
    { cost: 4,  levelUp: 2, speed: 1, id: 'unmovable', name: 'Unmovable', namePattern: '^unmovable', description: "Reduces distance of repositions by [{sl}*2]." },
    { cost: 5,  levelUp: 0, speed: 0, id: 'abundantCreation', name: 'Abundant Creation', namePattern: '^abundant creat', description: "Can create an extra Attack Node, Portal, or Refraction Point with each action." },
    { cost: 5,  levelUp: 0, speed: 0, id: 'cloneTactics', name: 'Clone Tactics', namePattern: '^clone tactic', description: "+1 to attack rolls if you and a clone are both within range of the target." },
    { cost: 4,  levelUp: 0, speed: 0, id: 'combatToss', name: 'Combat Toss', namePattern: '^combat toss', description: "If you Toss someone, they get +1 to their next attack roll." },
    { cost: 4,  levelUp: 0, speed: 0, id: 'daredevil', name: 'Daredevil', namePattern: '^daredevil', description: "When critical, +1 valor each time you successfully defend against an attack." },
    { cost: 5,  levelUp: 0, speed: 0, id: 'phasing', name: 'Phasing', namePattern: '^phasing', description: "Can spend 2 Stamina to pass through walls." },
    { cost: 6,  levelUp: 0, speed: 0, id: 'risingAttack', name: 'Rising Attack', namePattern: '^rising attack', description: "When standing from prone, +1 to your next attack roll." },
    { cost: 5,  levelUp: 0, speed: 0, id: 'safeStride', name: 'Safe Stride', namePattern: '^safe stride', description: "Ignore damaging terrain." },
    { cost: 6,  levelUp: 0, speed: 0, id: 'splitMove', name: 'Split Move', namePattern: '^split move', description: "Can split your movement between two Move Actions." },
    { cost: 4,  levelUp: 0, speed: 0, rollStats: ['aura', 'intuition'], id: 'transposition', name: 'Transposition', namePattern: '^transposition', description: "Can swap positions with someone when using Swift Step." },
    { cost: 5,  levelUp: 0, speed: 0, id: 'underhanded', name: 'Underhanded', namePattern: '^underhanded', description: "No penalties up to -5 Valor." },
    { cost: 4,  levelUp: 0, speed: 0, id: 'wallWalk', name: 'Wall Walk', namePattern: '^wall walk', description: "Count as flying when adjacent to a wall." },
    { cost: 6,  levelUp: 0, speed: 0, id: 'waterAdaptation', name: 'Water Adaptation', namePattern: '^water adaptation', description: "Do not lose valor while in water." },
    { cost: 4,  levelUp: 0, speed: 0, id: 'waterWalk', name: 'Water Walk', namePattern: '^water walk', description: "Treat water as solid ground." },
    { cost: 4,  levelUp: 0, speed: 0, id: 'xRayVision', name: 'X-Ray Vision', namePattern: '^x[ -]?ray', description: "Target enemies through walls without penalty." },
    { cost: 6,  levelUp: 0, speed: 0, id: 'unshakeable', name: 'Unshakeable', namePattern: '^unshakeable', description: "Immune to Shaken." },
    { cost: 6,  levelUp: 0, speed: 0, id: 'unstoppable', name: 'Unstoppable', namePattern: '^unstoppable', description: "If Valor is at least 2, keep fighting up to one Health Increment below 0." },
    { cost: 4,  levelUp: 0, speed: 0, id: 'extendedRange', name: 'Extended Range', namePattern: '^extended range', description: "All skills with a range of 5 have a range of 20." },
    { cost: 3,  levelUp: 0, speed: 0, id: 'freeFlight', name: 'Free Flight', namePattern: '^free flight', description: "Fly costs no Stamina." },
    { cost: 5,  levelUp: 0, speed: 0, id: 'freeSwiftStep', name: 'Free Swift Step', namePattern: '^free swift step', description: "Swift Step costs no Stamina." },
    { cost: 5,  levelUp: 2, speed: 2, id: 'attackNode', action: 'support', name: 'Attack Node', namePattern: '^attack node$', description: "4 Stamina; Create an Attack Node within range 5 from which you can target your techniques." },
    { cost: 5,  levelUp: 0, speed: 0, id: 'darkHealing', name: 'Dark Healing', action: 'free', namePattern: '^dark heal', description: "Recover a Health Increment, but risk succumbing to the Malevolent Entity." },
    { cost: 5,  levelUp: 0, speed: 0, id: 'dirtyTrick', name: 'Dirty Trick', action: 'free', namePattern: '^dirty trick', description: "Make a target Surprised, but lose 2 Valor." },
    { cost: 2,  levelUp: 0, speed: 0, id: 'duel', action: 'support', name: 'Duel', namePattern: '^duel', description: "Challenge someone to a duel. On success, both gain 2 Valor, and anyone who interferes loses 4 Valor." },
    { cost: 4,  levelUp: 3, speed: 1, rollStats: ['intuition'], id: 'effectTransfer', action: 'support', name: 'Effect Transfer', namePattern: '^effect transfer', description: "Move an Attack Node, Portal, Refraction Node, or Persistent Effect." },
    { cost: 6,  levelUp: 0, speed: 0, rollStats: ['dexterity', 'intuition'], id: 'feint', action: 'support', name: 'Feint', namePattern: '^feint', description: "On success, next attack against target deals [{di}] extra damage." },
    { cost: 5,  levelUp: 0, speed: 0, id: 'inspire', name: 'Inspire', action: 'support', namePattern: '^inspire', description: "Grant 1 Valor to a target who doesn't have more Valor than you." },
    { cost: 5,  levelUp: 3, speed: 1, rollStats: ['aura', 'resolve'], id: 'intimidate', action: 'support', name: 'Intimidate', namePattern: '^intimidate', description: "On success, target is Shaken." },
    { cost: 4,  levelUp: 0, speed: 0, id: 'jump', name: 'Jump', action: 'support', namePattern: '^jump', description: "2 Stamina; Become Flying for the rest of the turn." },
    { cost: 5,  levelUp: 3, speed: 1, rollStats: ['intuition', 'aura', 'resolve'], id: 'nullify', action: 'support', name: 'Nullify', namePattern: '^nullify', description: "On success, remove a Boost, Weaken, Barrier, Attack Node, Refraction Point, Portal, or Seal created by the target." },
    { cost: 4,  levelUp: 2, speed: 2, rollStats: ['resolve'], id: 'provoke', action: 'support', name: 'Provoke', namePattern: '^provoke', description: "On success, target must attack you next turn or lose 1 Valor." },
    { cost: 5,  levelUp: 3, speed: 1, id: 'recharge', name: 'Recharge', action: 'support', namePattern: '^recharge', description: "Restore the duration of a boost or Persistent technique." },
    { cost: 3,  levelUp: 1, speed: 2, rollStats: ['intuition'], id: 'sizeUp', action: 'support', name: 'Size Up', namePattern: '^size up', description: "On success, learn the Health, Stamina, Active Attributes, and Flaws of the target." },
    { cost: 5,  levelUp: 0, speed: 0, id: 'spiritSight', name: 'Spirit Sight', action: 'support', namePattern: '^spirit sight', description: "2 Stamina; While active, you can see invisible and concealed targets, and can always tell clones from the original." },
    { cost: 5,  levelUp: 2, speed: 1, id: 'toss', name: 'Toss', namePattern: '^toss', action: 'support', description: "Move an ally in your Zone of Control up to 4 spaces." },
    { cost: 6,  levelUp: 0, speed: 0, rollStats: ['intuition'], id: 'battleAnalysis', action: 'support', name: 'Battle Analysis', namePattern: '^battle analysis', description: "On success, may choose once later to gain +5 to a defense roll against the target's attacks." },
    { cost: 6,  levelUp: 3, speed: 1, id: 'clone', name: 'Clone', namePattern: '^clone$', action: 'support', description: "5 Stamina; Create a clone, who can use techniques in your place. If it's attacked, the clone is destroyed." },
    { cost: 4,  levelUp: 0, speed: 0, rollStats: ['intuition', 'aura'], id: 'effectCapture', action: 'support', name: 'Effect Capture', namePattern: '^effect capture', description: "5 Stamina; On success, take control of a Boost, Weaken, Attack Node, Portal, Refraction Point, or Persistent effect." },
    { cost: 4,  levelUp: 0, speed: 0, id: 'healthTransference', name: 'Health Transference', action: 'support', namePattern: '^health transfer', description: "Lose a Health Increment; target ally within 5 spaces gains a Health Increment." },
    { cost: 6,  levelUp: 3, speed: 2, id: 'portal', name: 'Portal', namePattern: '^portal$', action: 'support', description: "5 Stamina; Create a portal within 5 spaces; all spaces containing portals are adjacent." },
    { cost: 4,  levelUp: 2, speed: 2, id: 'refractionPoint', name: 'Refraction Point', action: 'support', namePattern: '^refraction point', description: "3 Stamina; Create a Refraction Point within 5 spaces; if a technique hits it, you can target the technique again originating from that point." },
    { cost: 6,  levelUp: 3, speed: 1, rollStats: ['muscle', 'dexterity', 'intuition', 'aura', 'resolve'], action: 'support', id: 'seal', name: 'Seal', namePattern: '^seal$', description: "5 Stamina; On success, disable an enemy's Techniques or Active Skills for 3 rounds." },
    { cost: 6,  levelUp: 0, speed: 0, id: 'shadowMeld', name: 'Shadow Meld', namePattern: '^shadow( )?meld', action: 'move', description: "You can hide in plain sight while in darkness." },
    { cost: 4,  levelUp: 0, speed: 0, id: 'staminaTransference', name: 'Stamina Transference', action: 'support', namePattern: '^stamina transfer', description: "Lose a Stamina increment; target ally within 5 spaces gains a Stamina Increment." },
    { cost: 5,  levelUp: 2, speed: 1, id: 'swiftStep', name: 'Swift Step', namePattern: '^swift step', action: 'support move', description: "Move [{sl}+3] spaces as a Support Action, or extend the distance of a Move by [{sl}+3]." },
    { cost: 4,  levelUp: 0, speed: 0, id: 'attackNodeNetwork', name: 'Attack Node Network', namePattern: '^attack node network', description: "+1 to attack rolls if you and an attack node are both in range of the target." },
    { cost: 6,  levelUp: 0, speed: 0, rollStats: ['intuition'], id: 'exploitWeakness', action: 'support', name: 'Exploit Weakness', namePattern: '^exploit weakness', description: "On success, may choose once later to gain +5 to an attack roll against the target." },
    { cost: 5,  levelUp: 0, speed: 0, rollStats: ['intuition', 'aura', 'resolve'], id: 'flunkyDomination', action: 'support', name: 'Flunky Domination', namePattern: '^flunky domination', description: "On success, dictate an Attack Action for a flunky within 5 spaces to take." },
    { cost: 6,  levelUp: 2, speed: 1, id: 'fly', name: 'Fly', namePattern: '^fly$', action: 'support', description: "Take flight, increasing Move and making you immune to melee attacks from non-flying enemies." },
    { cost: 6,  levelUp: 0, speed: 0, id: 'refractionChain', name: 'Refraction Chain', namePattern: '^refraction chain', description: "When attacking through a refraction point, deal increased damage." },
    { cost: 3,  levelUp: 0, speed: 0, id: 'swiftJump', name: 'Swift Jump', namePattern: '^swift jump', description: "Jump is a Free Action." },
    { cost: 6,  levelUp: 0, speed: 0, id: 'combinationAttack', name: 'Combination Attack', namePattern: '^comb(o|ination) attack', description: "Once per scene, attack together with an ally, both gaining +2 to attack rolls on anything you both target." },
    { cost: 6,  levelUp: 0, speed: 0, id: 'counterattack', name: 'Counterattack', namePattern: '^counter( )?attack', description: "Store an attack, then use it as a reaction when attacked." },
    { cost: 6,  levelUp: 2, speed: 2, id: 'cover', name: 'Cover', namePattern: '^cover$', description: "Take damage in place of an adjacent ally." },
    { cost: 5,  levelUp: 0, speed: 0, id: 'ignoreEffect', name: 'Ignore Effect', namePattern: '^ignore effect', description: "While Valor is at least 2, you can use Resolve against all Active Skills." },
    { cost: 3,  levelUp: 2, speed: 1, id: 'interruptAttack', name: 'Interrupt Attack', namePattern: '^interrupt attack', description: "When an enemy leaves your Zone of Control, you can use a stored attack as a reaction, reducing their Move by [{sl}*2]." },
    { cost: 4,  levelUp: 0, speed: 0, id: 'afterimage', name: 'Afterimage', namePattern: '^after( )?image', description: "When you Swift Step, you can leave a Clone behind, or stand still and create a Clone where you would have moved." },
    { cost: 4,  levelUp: 0, speed: 0, id: 'areaShield', name: 'Area Shield', namePattern: '^area shield', description: "When defending with Aura against a Line or Blast attack, you can defend in place of allies within your Zone of Control." },
    { cost: 3,  levelUp: 0, speed: 0, id: 'clash', name: 'Clash', namePattern: '^clash$', description: "When attacked, use a stored attack as a reaction against the attacker; whichever attack roll is higher hits, and the other is negated." },
    { cost: 5,  levelUp: 0, speed: 0, id: 'damageFeedback', name: 'Damage Feedback', namePattern: '^damage feedback', description: "When defending against melee attacks with Muscle, deal damage to the attacker." },
    { cost: 5,  levelUp: 2, speed: 1, id: 'divingEscape', name: 'Diving Escape', namePattern: '^diving escape', description: "When defending against Line or Blast attacks with Dexterity, move towards a safe space." },
    { cost: 6,  levelUp: 0, speed: 0, id: 'finalAttack', name: 'Final Attack', namePattern: '^final attack', description: "When incapcitated, use one last Damage technique, ignoring all limits." },
    { cost: 5,  levelUp: 0, speed: 0, id: 'lineDeflect', name: 'Line Deflect', namePattern: '^line deflect', description: "When defending against a Line attack, you can change the direction of the line." },
    { cost: 5,  levelUp: 0, speed: 0, id: 'mobileCover', name: 'Mobile Cover', namePattern: '^mobile cover', description: "Store a move, then use it to move adjacent to an ally and Cover them." },
    { cost: 4,  levelUp: 0, speed: 0, id: 'mobileDodge', name: 'Mobile Dodge', namePattern: '^mobile dodge', description: "When defending against an attack with Dexterity, move 1 space." },
    { cost: 6,  levelUp: 0, speed: 0, id: 'opportunisticDodge', name: 'Opportunistic Dodge', namePattern: '^opportunistic dodge', description: "When defending against an attack with Intuition, gain +1 to your next attack against the attacker." },
    { cost: 4,  levelUp: 2, speed: 1, id: 'pushAway', name: 'Push Away', namePattern: '^push away', description: "When defending against a melee attack with Resolve, push the target [{sl}*2] spaces away." },
    { cost: 4,  levelUp: 0, speed: 0, id: 'rangedInterrupt', name: 'Ranged Interrupt', namePattern: '^ranged interrupt', description: "Can use Interrupt Attack at any range, as long as your technique can reach the target." },
    { cost: 6,  levelUp: 0, speed: 0, rollStats: ['resolve'], id: 'shrugOff', name: 'Shrug Off', namePattern: '^shrug off', description: "When at 2 or more Health, if an attack would incapacitate you, roll Resolve against attacker; on a success, you endure at 1 Health." },
    { cost: 4,  levelUp: 0, speed: 0, id: 'defensiveClash', name: 'Defensive Clash', namePattern: '^defensive clash', description: "Can use Clash in combination with Cover." },
    { cost: 4,  levelUp: 0, speed: 0, id: 'deflectingShield', name: 'Deflecting Shield', namePattern: '^deflecting shield', description: "Can use Line Deflect in combination with Area Shield." },
    { cost: 6,  levelUp: 0, speed: 0, id: 'prepared', name: 'Prepared', namePattern: '^prepared', description: "At the start of the scene, store a technique." },
    { cost: 5,  levelUp: 0, speed: 0, id: 'acceleration', name: 'Acceleration', action: 'free', namePattern: '^acceleration', description: "Overdrive for +1 Dexterity for the rest of the scene." },
    { cost: 5,  levelUp: 0, speed: 0, id: 'analysis', name: 'Analysis', action: 'free', namePattern: '^analysis', description: "Overdrive for +1 Intuition for the rest of the scene." },
    { cost: 6,  levelUp: 3, speed: 1, id: 'blazingMight', name: 'Blazing Might', action: 'free', namePattern: '^blazing might', description: "Overdrive for +[({sl}+1)*4] Energy Attack for the rest of the scene." },
    { cost: 5,  levelUp: 0, speed: 0, id: 'burningPassion', name: 'Burning Passion', action: 'free', namePattern: '^burning passion', description: "Overdrive for +1 Resolve for the rest of the scene." },
    { cost: 6,  levelUp: 3, speed: 1, id: 'fightingSpirit', name: 'Fighting Spirit', action: 'free', namePattern: '^fighting spirit', description: "Overdrive for +[({sl}+1)*4] Physical Attack for the rest of the scene." },
    { cost: 6,  levelUp: 3, speed: 1, id: 'hardenedDefense', name: 'Hardened Defense', action: 'free', namePattern: '^hardened def', description: "Overdrive for +[({sl}+1)*4] Defense for the rest of the scene." },
    { cost: 6,  levelUp: 3, speed: 1, id: 'hardenedResistance', name: 'Hardened Resistance', action: 'free', namePattern: '^hardened res', description: "Overdrive for +[({sl}+1)*4] Resistance for the rest of the scene." },
    { cost: 5,  levelUp: 0, speed: 0, id: 'resoluteAura', name: 'Resolute Aura', action: 'free', namePattern: '^resolute aura', description: "Overdrive for +1 Aura for the rest of the scene." },
    { cost: 5,  levelUp: 0, speed: 0, id: 'strengthOfWill', name: 'Strength of Will', action: 'free', namePattern: '^strength of will', description: "Overdrive for +1 Muscle for the rest of the scene." },
    { cost: 3,  levelUp: 0, speed: 0, id: 'asset', name: 'Asset', detail: true, namePattern: '^asset', description: "Once per Challenge Scene, use an asset to gain +3 to a roll." },
    { cost: 3,  levelUp: 0, speed: 0, id: 'challengeTechnique', name: 'Challenge Technique', detail: true, namePattern: '^challenge tech', description: "Once per Challenge Scene, use a challenge technique to gain +3 to a roll." },
    { cost: 3,  levelUp: 0, speed: 0, id: 'favorableInsight', name: 'Favorable Insight', namePattern: '^favo(u)?rable insight', description: "Can make an opposed roll to gain insight into the structure of a Challenge Scene." },
    { cost: 2,  levelUp: 0, speed: 0, id: 'proficiency', name: 'Proficiency', detail: true, namePattern: '^proficiency', description: "+1 to rolls when using a specific Challenge Action." },
    { cost: 3,  levelUp: 0, speed: 0, id: 'recovery', name: 'Recovery', namePattern: '^recovery', description: "When you fail with a specific Challenge Action and it would move a meter, you can spend 1 Valor to prevent it." },
    { cost: 4,  levelUp: 0, speed: 0, id: 'favorableSuccess', name: 'Favorable Success', namePattern: '^favorable success', description: "When you move a meter by 2 or more points, you can move another meter by 1 point." },
    { cost: 6,  levelUp: 4, speed: 1, id: 'companion', name: 'Companion', namePattern: '^companion$', description: "You have a Companion who can use techniques in your place. If it takes damage, it's temporarily disabled." },
    { cost: 2,  levelUp: 1, speed: 2, id: 'fastCompanion', name: 'Fast Companion', namePattern: '^fast companion', description: "All your Companions have +[{sl}] Move." },
    { cost: 4,  levelUp: 2, speed: 1, id: 'hiddenCompanion', name: 'Hidden Companion', namePattern: '^hidden companion', description: "Your Companion can become invisible." },
    { cost: 3,  levelUp: 1, speed: 1, id: 'mount', name: 'Mount', namePattern: '^mount$', action: 'support', description: "Mount your Companion, letting you use its Movement speed as your own." },
    { cost: 2,  levelUp: 0, speed: 0, id: 'senseMalice', name: 'Sense Malice', namePattern: '^sense malice', description: "Your Companion can sense hostile intent." },
    { cost: 3,  levelUp: 1, speed: 1, id: 'allyMount', name: 'Ally Mount', namePattern: '^ally mount', description: "Your allies can Mount your Companion." },
    { cost: 4,  levelUp: 4, speed: 1, id: 'companionZoneOfControl', name: 'Companion Zone of Control', namePattern: '^companion z', description: "Your Companion extends your Zone of Control around it." },
    { cost: 4,  levelUp: 0, speed: 0, id: 'extendedRevival', name: 'Extended Revival', namePattern: '^extended reviv', description: "You can revive multiple Companions with one action." },
    { cost: 4,  levelUp: 0, speed: 0, id: 'flankAttack', name: 'Flank Attack', namePattern: '^flank', description: "+1 to attack rolls if you and your Companion are both adjacent to an enemy." },
    { cost: 2,  levelUp: 0, speed: 0, id: 'protectAlly', name: 'Protect Ally', namePattern: '^protect ally', description: "Sacrifice your Companion to protect an ally from an attack." },
    { cost: 4,  levelUp: 0, speed: 0, id: 'protectMaster', name: 'Protect Master', namePattern: '^protect master', description: "Sacrifice your Companion to protect yourself from an attack." },
    { cost: 3,  levelUp: 0, speed: 0, id: 'rangedRevival', name: 'Ranged Revival', namePattern: '^ranged reviv', description: "You can revive a Companion from up to 5 spaces away." },
    { cost: 3,  levelUp: 1, speed: 1, id: 'tossingCompanion', name: 'Tossing Companion', namePattern: '^tossing companion', description: "You can use Toss through your Companion." },
    { cost: 4,  levelUp: 0, speed: 0, id: 'trustingCompanion', name: 'Trusting Companion', namePattern: '^trusting companion', description: "Your allies can revive your Companion." },
    { cost: 2,  levelUp: 0, speed: 0, id: 'companionSense', name: 'Companion Sense', namePattern: '^companion sense', description: "You can use Spirit Sense through your Companion, without having the Skill." },
    { cost: 3,  levelUp: 3, speed: 1, id: 'flyingCompanion', name: 'Flying Companion', namePattern: '^flying companion', description: "Your Companion can fly." },
    { cost: 3,  levelUp: 0, speed: 0, id: 'instantMount', name: 'Instant Mount', namePattern: '^instant mount', description: "Mounting your Companion is a Free Action." },
    { cost: 4,  levelUp: 0, speed: 0, id: 'reactiveCompanion', name: 'Reactive Companion', namePattern: '^reactive companion', description: "Your Companion can use Reaction Skills." },
    { cost: 12, levelUp: 0, speed: 0, id: 'valiant', name: 'Valiant', namePattern: '^valiant', description: "Gain an extra Valor every round." },
    { cost: 8,  levelUp: 0, speed: 0, id: 'invisibility', name: 'Invisibility', action: 'support', namePattern: '^invisibility', description: "Become invisible, requiring an opposed Intuition or Aura roll to detect." },
    { cost: 8,  levelUp: 3, speed: 1, id: 'revive', name: 'Revive', action: 'support', namePattern: '^revive$', description: "Revive up to four Flunkies or one Soldier within 5 spaces." },
    { cost: 2,  levelUp: 0, speed: 0, id: 'principled', name: 'Principled', namePattern: '^principled', description: "Gain an extra Pillar." },
    { cost: 6,  levelUp: 3, speed: 2, id: 'illusoryAssailant', name: 'Illusory Assailant', action: 'support', namePattern: '^illusory assailant', description: "Create illusory attackers who disappear when hit by an attac. As a Support Action, you can make one attack, but the attack inflicts Shaken instead of dealing damage." },
    { cost: 3,  levelUp: 0, speed: 0, id: 'illusoryDisguise', name: 'Illusory Disguise', action: 'support', namePattern: '^illusory disguise', description: "Change your appearance to something else of your size and shape." },
    { cost: 4,  levelUp: 2, speed: 2, id: 'illusoryTerrain', name: 'Illusory Terrain', action: 'support', namePattern: '^illusory terrain', description: "Target spaces become impassable or rough terrain, which only affects those caught in the illusion." },
    { cost: 4,  levelUp: 0, speed: 0, id: 'pierceIllusion', name: 'Pierce Illusion', namePattern: '^pierce illusion', description: "You can roll to resist an illusion even while unaware of it." },
    { cost: 4,  levelUp: 2, speed: 1, id: 'elementalResistance', name: 'Elemental Resistance', detail: true, namePattern: '^elemental resist', description: "Take [{sl}*4+2] less damage when hit by a certain element of damage." },
    { cost: 3,  levelUp: 0, speed: 0, id: 'elementalAttunement', name: 'Elemental Attunement', detail: true, namePattern: '^elemental attune', description: "All your damage is of a certain element." },
    { cost: 4,  levelUp: 2, speed: 0, id: 'aquatic', name: 'Aquatic', namePattern: '^aquatic$', description: "Suffer no penalties underwater, but lose 2 Valor per turn when out of water." },
    { cost: 4,  levelUp: 2, speed: 0, id: 'construct', name: 'Construct', namePattern: '^construct$', description: "Critical threshold increased by 2. Take reduced damage from Damage Increments. Defense increased, Resistance reduced." },
    { cost: 4,  levelUp: 2, speed: 0, id: 'elemental', name: 'Elemental', namePattern: '^elemental$', description: "Pick an element; all your damage is attuned to that element, you resist that element, and you gain 1 Valor whenever you take damage of that element. Pick another element to be vulnerable to." },
    { cost: 4,  levelUp: 2, speed: 0, id: 'undead', name: 'Undead', namePattern: '^undead$', description: "Critical threshold increased by 2. Mind techniques against you get -1 to attack roll. When between 0 and one negative Health Increment, you can still take one Attack Action each turn." },
    { cost: 6,  levelUp: 0, speed: 0, id: 'diminuitive', name: 'Diminuitive', namePattern: '^diminuitive', description: "-1 to attack rolls, +1 to defense rolls." },
    { cost: 4,  levelUp: 2, speed: 1, id: 'healer', name: 'Healer', namePattern: '^healer', description: "Increase health recovered with Healing techniques." },
    { cost: 1,  levelUp: 1, speed: 0, id: 'increasedLength', name: 'Increased Length', namePattern: '^increased length', description: "You occupy multiple spaces in a line." },
    { cost: 1,  levelUp: 0, speed: 0, id: 'largeHead', name: 'Large Head', namePattern: '^large head', description: "Your head takes up more space." },
    { cost: 4,  levelUp: 3, speed: 0, id: 'limitedRegeneration', name: 'Limited Radiation', namePattern: '^limited regen', description: "Recover health each round, but if you take damage from a certain element, your regeneration is blocked that round." },
    { cost: 1,  levelUp: 0, speed: 0, id: 'longTail', name: 'Long Tail', namePattern: '^long tail', description: "Your tail takes up more spaces." },
    { cost: 6,  levelUp: 0, speed: 0, id: 'morale', name: 'Morale', namePattern: '^morale', description: "Can use Valor like an Elite." },
    { cost: 6,  levelUp: 0, speed: 0, id: 'hardenedResolve', name: 'Hardened Resolve', namePattern: '^hardened resolve', description: "If you have no Valor, you can still use techniques or skills that require Valor." },
    { cost: 6,  levelUp: 0, speed: 0, id: 'standTall', name: 'Stand Tall', namePattern: '^stand tall', description: "You cannot be knocked prone." },
    { cost: 6,  levelUp: 0, speed: 0, id: 'terrainAdaptation', name: 'Terrain Adaptation', namePattern: '^terrain adapt', description: "You aren't slowed down by rough terrain." },
    { cost: 12, levelUp: 0, speed: 0, id: 'ultimateAttack', name: 'Ultimate Attack', namePattern: '^ultimate attack', description: "Gains one Ultimate Technique." },
    { cost: 6,  levelUp: 0, speed: 0, id: 'unscrupulous', name: 'Unscrupulous', namePattern: '^unscrupulous', description: "You aren't incapacitated until -20 Valor." },
    { cost: 3,  levelUp: 0, speed: 0, id: 'alteredDurability', name: 'Altered Durability', namePattern: '^altered durability', description: "The required Core Level for a technique to defeat you is increased." },
    { cost: 3,  levelUp: 0, speed: 0, id: 'amphibious', name: 'Amphibious', namePattern: '^amphibious', description: "Suffer no roll penalties while out of water." },
    { cost: 6,  levelUp: 0, speed: 0, id: 'destructiveBurrow', name: 'Destructive Burrow', namePattern: '^destructive burrow', description: "Spaces you burrow through become Rough Terrain." },
    { cost: 6,  levelUp: 3, speed: 1, id: 'durableFlunky', name: 'Durable Flunky', namePattern: '^durable flunky', description: "You cannot be defeated by a technique with too low a Core Level." },
    { cost: 3,  levelUp: 0, speed: 0, id: 'freeBurrow', name: 'Free Burrow', namePattern: '^free burrow', description: "Burrowing costs no Stamina." },
    { cost: 4,  levelUp: 0, speed: 0, id: 'landAdaptation', name: 'Land Adaptation', namePattern: '^land adapt', description: "Don't lose Valor or Health from being outside of water." },
    { cost: 8,  levelUp: 0, speed: 0, id: 'resurrectingFlunky', name: 'Resurrecting Flunky', namePattern: '^resurrecting flunky', description: "Revive at the start of your turn, unless attacked again while defeated." },
    { cost: 8,  levelUp: 0, speed: 0, id: 'trample', name: 'Trample', namePattern: '^trample', description: "You can move over smaller enemies, dealing a Damage Increment of damage to them." },
    { cost: 6,  levelUp: 0, speed: 0, id: 'toweringPresence', name: 'Towering Presence', namePattern: '^towering presence', description: "Ignore the Zones of Control of smaller enemies." },
    { cost: 2,  levelUp: 2, speed: 0, id: 'burrow', name: 'Burrow', namePattern: '^burrow', description: "Burrow underground, getting +1 to defense rolls against Ranged or Line attacks. Ignore terrain until you surface." },
    { cost: 3,  levelUp: 0, speed: 0, id: 'humanshape', name: 'Human Shape', namePattern: '^human( )?shape', description: "Assume the form of a human." },
    { cost: 4,  levelUp: 2, speed: 0, id: 'limitedFlight', name: 'Limited Flight', namePattern: '^limited flight', description: "Gain +1 to defense rolls against techniques that wouldn't be able to hit flying targets." },
    { cost: 6,  levelUp: 0, speed: 0, rollStats: ['muscle', 'aura', 'resolve'], id: 'pressingSwarm', name: 'Pressing Swarm', namePattern: '^pressing swarm', description: "On success, move targets inside the swarm with you." },
    { cost: 12, levelUp: 0, speed: 0, id: 'shapeshifter', name: 'Shapeshifter', namePattern: '^shapeshifter', description: "Swap between two different character sheets." },
    { cost: 1,  levelUp: 1, speed: 0, rollStats: ['muscle', 'dexterity', 'aura', 'intuition', 'resolve'], id: 'skillCopy', name: 'Skill Copy', namePattern: '^skill copy', description: "On success, copy a Skill from the target." },
    { cost: 3,  levelUp: 1, speed: 0, id: 'swiftStance', name: 'Swift Stance', namePattern: '^swift stance', description: "While in this stance, increase Move but decrease Defense." },
    { cost: 8,  levelUp: 0, speed: 0, id: 'victorAtAnyCost', name: 'Victor at Any Cost', namePattern: '^victor(y)? at any cost', description: "If you don't have 3 Valor, you can spend 5 Valor to Overdrive, falling into negative Valor." },
    { cost: 1,  levelUp: 1, speed: 0, id: 'increasedCompanionSize', name: 'Increased Companion Size', namePattern: '^increased companion size', description: "Increase the size of your Companion." },
    { cost: 2,  levelUp: 0, speed: 0, id: 'changeAttributes', name: 'Change Attributes', namePattern: '^change attr', description: "Your base attributes change in this form." },
    { cost: 2,  levelUp: 2, speed: 1, id: 'enhancedRange', name: 'Enhanced Range', namePattern: '^enhanced range', description: "+1 Range for each level of Ranged Technique." },
    { cost: 8,  levelUp: 0, speed: 0, id: 'greatAccuracy', name: 'Great Accuracy', namePattern: '^great acc', description: "+1 to Attack Rolls." },
    { cost: 8,  levelUp: 0, speed: 0, id: 'greatEvasion', name: 'Great Evasion', namePattern: '^great (evd|eva)', description: "+1 to Defense Rolls." },
    { cost: 6,  levelUp: 0, speed: 0, id: 'powerfulBlow', name: 'Powerful Blow', namePattern: '^powerful blow', description: "All your techniques gain a level of Reposition." },
    { cost: 6,  levelUp: 0, speed: 0, id: 'longReach', name: 'Long Reach', namePattern: '^long reach', description: "Can attack enemies one space past your Zone of Control."},
];

const modLibrary = [
    { id: 'blastradius', cost: 2, levelUp: 2, season: 1, name: 'Blast Radius', namePattern: '^blast', tags: ['multitarget'], description: 'Hits everything within radius [{ml}]. ', quickdescription: 'Blast [{ml}]. ',
        spirit: { cost: 1 } },
    { id: 'chainattack', cost: 1, levelUp: 1, season: 2, name: 'Chain Attack', namePattern: '^chain', tags: ['multitarget'], description: 'Chain [{ml}]. ' },
    { id: 'lineattack', cost: 1, levelUp: 1, season: 1, name: 'Line Attack', namePattern: '^line(?! ?v)', tags: ['multitarget'], description: 'Hits everything in a line of length [{ml}*3]. ', quickdescription: 'Line [{ml}*3]. ',
        strength: { description: 'Hits everything in a line of length [{ml}*2]. ', quickdescription: 'Line [{ml}*2]. '  },
        agility: { description: 'Hits everything in a line of length [{ml}*2]. ', quickdescription: 'Line [{ml}*2]. ' },
        spirit: { description: 'Hits everything in a line of length [{ml}*3+1]. ', quickdescription: 'Line [{ml}*3+1]. ', } },
    { id: 'linevariation', cost: 1, levelUp: 1, season: 2, name: 'Line Variation', namePattern: '^line v', tags: [], description1: 'Line can change directions once. ', description: 'Line can change directions [{ml}] times. ', quickdescription: 'Line Variation [{ml}]. ',
        mind: { description: 'Line can change directions [{ml}+1] times. ', quickdescription: 'Line Variation [{ml}+1]. ' } },
    { id: 'multiple targets', cost: 1, levelUp: 1, season: 1, name: 'Multiple Targets', namePattern: '^multiple', tags: ['multitarget'], description1: 'Pick one additional target. ', description: 'Pick [{ml}] additional targets. ', quickdescription: 'Multiple [{ml}+1]. ',
        agility: { description: 'Pick [{ml}+1] additional targets. ', quickdescription: 'Multiple [{ml}+2]. ' } },
    { id: 'indirectattack', cost: 3, levelUp: 0, season: 2, name: 'Indirect Attack', namePattern: '^indirect', tags: [], description: 'Targets anywhere within 20 spaces. ', quickdescription: 'Indirect. ' },
    { id: 'rangedtechnique', cost: 1, levelUp: 1, name: 'Ranged Technique', namePattern: '^ranged', tags: [], description: 'Range [{ml}*3]. ', quickdescription: 'Range [{ml}*3]. ',
        strength: { description: 'Range [{ml}*2]. ' },
        agility: { description: 'Range [{ml}*4]. ' },
        spirit: { description: 'Range [{ml}*4]. ' } },
    { id: 'rushattack', cost: 3, levelUp: 0, season: 1, name: 'Rush Attack', namePattern: '^rush', tags: ['addmove', 'multitarget'], description: 'Move, then target all spaces you moved through. ', quickdescription: 'Rush. ',
        strength: { cost: 2 },
        agility: { cost: 2 } },
    { id: 'smartaoe', cost: 2, levelUp: 0, season: 2, name: 'Smart Area of Effect', namePattern: '^smart', tags: [], description: 'Exclude any number of targets from the technique. ', quickdescription: 'Smart AOE. ',
        mind: { season: 1, cost: 1 } },
    { id: 'whirlwindattack', cost: 2, levelUp: 0, season: 1, name: 'Whirlwind', namePattern: '^whirlwind', tags: ['multitarget'], description: 'Targets all enemies in your Zone of Control. ', quickdescription: 'Whirlwind. ',
        strength: { cost: 1 },
        agility: { cost: 1 } },
    { id: 'debilitatingstrike', cost: 0, levelUp: 0, season: 1, name: 'Debilitating Strike', namePattern: '^debilitat', tags: ['special', 'flaws'] },
    { id: 'drain', cost: 0, levelUp: 0, season: 1, name: 'Drain', namePattern: '^drain', tags: ['special', 'important'], description: 'Recover HP equal to half the greatest damage dealt to any target. ', quickdescription: 'Drain. ' },
    { id: 'persistenteffect', cost: 0, levelUp: 0, season: 1, name: 'Persistent', namePattern: '^persist', tags: ['special', 'reroll', 'important'], description: 'Repeats at the start of your next 2 turns. ', quickdescription: 'Persisent. ' },
    { id: 'piercing', cost: 0, levelUp: 0, season: 1, name: 'Piercing Strike', namePattern: '^piercing', tags: ['special'], description: 'Ignore defense and resistance. ', quickdescription: 'Piercing. ' },
    { id: 'sapping', cost: 0, levelUp: 0, season: 1, name: 'Sapping', namePattern: '^sapping', tags: ['special'], description: 'Target takes a third of the initial damage on each of their next three turns. ', quickdescription: 'Sapping. ' },
    { id: 'accurate', cost: 4, levelUp: 0, season: 1, name: 'Accurate Strike', namePattern: '^accurate', tags: [],
        agility: { cost: 3 } },
    { id: 'aurastrike', cost: 1, levelUp: 0, season: 1, name: 'Aura Strike', namePattern: '^aura', tags: [], },
    { id: 'damageshift', cost: 1, levelUp: 0, season: 1, name: 'Damage Shift', namePattern: '^damage shift', tags: [], },
    { id: 'darknesszone', cost: 1, levelUp: 0, season: 1, name: 'Darkness Zone', namePattern: '^darkness', tags: [], description: 'Target area is filled with darkness. ', quickdescription: 'Darkness Zone. ' },
    { id: 'dash', cost: 1, levelUp: 1, season: 1, name: 'Dash', namePattern: '^dash', tags: [], description1: 'Move 1 space before or after the attack. ', description: 'Move [{ml}] spaces before or after the attack. ', quickdescription: 'Dash [{ml}]. ',
        agility: { description: 'Move [{ml}+1] spaces before or after the attack. ', quickdescription: 'Dash [{ml}+1]. ' } },
    { id: 'destruction', cost: 1, levelUp: 1, season: 1, name: 'Destruction', namePattern: '^destruct', tags: [], description: 'Reduces durability of objects by an addtional [{ml}*2]. ', quickdescription: '+[{ml}*2] durability damage. ' },
    { id: 'dexterousstrike', cost: 1, levelUp: 0, season: 1, name: 'Dexterous Strike', namePattern: '^dexte?rous', tags: [], },
    { id: 'dropattack', cost: 1, levelUp: 0, season: 1, name: 'Drop Attack', namePattern: '^drop', tags: [], description: 'If the target is flying, they fall and take [{di}] damage. ', quickdescription: 'Drop attack. ' },
    { id: 'highbarrier', cost: 1, levelUp: 0, season: 1, name: 'High Barrier', namePattern: '^high barrier', tags: [], description: 'Barrier blocks flying characters. ', quickdescription: 'Blocks flying. ' },
    { id: 'immobilizingstrike', cost: 1, levelUp: 0, season: 1, name: 'Immobilize', namePattern: '^immobiliz', tags: ['important'], description: 'Target is immobilized. ', quickdescription: 'Immobilize. ' },
    { id: 'intuitivestrike', cost: 1, levelUp: 0, season: 1, name: 'Intuitive Strike', namePattern: '^intuitive', tags: [], },
    { id: 'knockdown', cost: 3, levelUp: 0, season: 1, name: 'Knock Down', namePattern: '^knock', tags: ['important'], description: 'Target is knocked prone. ', quickdescription: 'Knock down. ' },
    { id: 'launching', cost: 3, levelUp: 0, season: 2, name: 'Launching', namePattern: '^launch', tags: ['important'], description: 'Target is launched. ', quickdescription: 'Launching. ' },
    { id: 'lightzone', cost: 1, levelUp: 0, season: 1, name: 'Light Zone', namePattern: '^light', tags: [], description: 'Darkness is removed from target area. ', quickdescription: 'Light zone. ' },
    { id: 'muscularstrike', cost: 1, levelUp: 0, season: 1, name: 'Muscular Strike', namePattern: '^muscular', tags: [], },
    { id: 'phasingattack', cost: 1, levelUp: 0, season: 2, name: 'Phasing Attack', namePattern: '^phasing', tags: [], description: 'Can attack through walls and cover. ', quickdescription: 'Phasing. ' },
    { id: 'quicksummon', cost: 3, levelUp: 0, season: 2, name: 'Quick Summon', namePattern: '^quick summon', tags: [], },
    { id: 'rammingattack', cost: 2, levelUp: 0, season: 1, name: 'Ramming', namePattern: '^ram', tags: ['addmove', 'important'], description: 'Push the enemy along with you as you move. ', quickdescription: 'Ram. ',
        strength: { cost: 1 } },
    { id: 'reposition', cost: 1, levelUp: 1, season: 1, name: 'Reposition', namePattern: '^reposition', tags: [], description: 'Move the target [{ml}+1] spaces. ', quickdescription: 'Reposition [{ml}+1]. ',
        strength: { description: 'Move the target [{ml}+2] spaces. ', quickdescription: 'Reposition [{ml}+2]. ', } },
    { id: 'selectivebarrier', cost: 1, levelUp: 0, season: 2, name: 'Selective Barrier', namePattern: '^selective', tags: [], description: 'Can let characters pass through if desired. ', quickdescription: 'Selective barrier. ' },
    { id: 'terraindisruption', cost: 1, levelUp: 0, season: 2, name: 'Terrain Disruption', namePattern: '^terrain disrupt', tags: ['important'], description: 'Target area becomes rough terrain. ', quickdescription: 'Terrain disruption. ' },
    { id: 'terrainrepair', cost: 1, levelUp: 0, season: 2, name: 'Terrain Repair', namePattern: '^terrain repair', tags: ['important'], description: 'Target area erases rough terrain. ', quickdescription: 'Terrain repair. ' },
    { id: 'throw', cost: 2, levelUp: 0, season: 1, name: 'Throw', namePattern: '^throw', tags: ['reroll', 'important'], description: 'If the target hits someone else, attack them as well. ', quickdescription: 'Throw. ',
        strength: { cost: 1 } },
    { id: 'violentbarrier', cost: 1, levelUp: 0, season: 1, name: 'Violent Barrier', namePattern: '^violent bar', tags: [], description: 'Characters who run into the barrier take [{di}] damage. ', quickdescription: 'Violent barrier. ' },
    { id: 'consecutivetransformation', cost: 2, levelUp: 2, season: 3, name: 'Consecutive Transformation', namePattern: '^consecutive', tags: [], description: 'Effect stacks with other transformations. ', quickdescription: 'Consecutive Transformation. ' },
    { id: 'intimidatingtransformation', cost: 2, levelUp: 2, season: 3, name: 'Intimidating Transformation', namePattern: '^intimidating t', tags: [], description: 'On transform and every turn after, roll Resolve or Aura to render everyone in adjacent spaces Shaken. ', quickdescription: 'Intimidating Transformation. ' },
    { id: 'transformally', cost: 2, levelUp: 0, season: 1, name: 'Transform Ally', namePattern: '^transform ally', tags: [], description: 'Transforms an ally within 5 spaces. ', quickdescription: 'Transform Ally. ' },
    { id: 'unerring', cost: 2, levelUp: 0, season: 1, name: 'Unerring Attack', namePattern: '^unerring', tags: [], description: 'Can be used again if it misses all targets. ', quickdescription: 'Unerring. ' },
    { id: 'elementalattack', cost: 1, levelUp: 0, season: 1, name: 'Elemental Attack', namePattern: '^element', tags: [], description: 'Deals elemental damage. ', quickdescription: 'Elemental. ',
        spirit: { cost: 0 },
        mind: { cost: 0 }},
    { id: 'defeatlock', cost: 3, levelUp: 0, season: 1, name: 'Defeat Lock', namePattern: '^defeat lock', tags: [], description: "If target is incapacitated, they can't be revived for 24 hours unless this character is defeated. ", quickdescription: 'Defeat Lock. ' },
    { id: 'drawout', cost: 1, levelUp: 0, season: 1, name: 'Draw Out the Dark', namePattern: '^draw out', tags: [], description: "On a hit, targets with Malevolent Entity must make a roll to maintain control. ", quickdescription: 'Draw Out the Dark. ' },
    { id: 'effectlock', cost: 2, levelUp: 0, season: 1, name: 'Effect Lock', namePattern: '^effect lock', tags: [], description: "If centered on a target, the area of effect follows them as they move. ", quickdescription: 'Effect Lock. ' },
    { id: 'encroachingmalevolence', cost: 1, levelUp: 0, season: 1, name: 'Encroaching Malevolence', namePattern: '^encroaching mal', tags: [], description: "Target gains 1 Malevolence. ", quickdescription: '+1 Malevolence. ' },
    { id: 'intimidatingstrike', cost: 3, levelUp: 0, season: 1, name: 'Intimidating Strike', namePattern: '^intimidating s', tags: [], description: "On a hit, the target is Shaken. ", quickdescription: 'Target is Shaken. ' },
    { id: 'overwhelmingmalevolence', cost: 3, levelUp: 0, season: 1, name: 'Overwhelming Malevolence', namePattern: '^overwhelming mal', tags: [], description: "On a hit, the target gains 1 Malevolence that lasts until the next rest scene. ", quickdescription: '+1 Malevolence. ' },
    { id: 'pullunder', cost: 3, levelUp: 0, season: 1, name: 'Pull Under', namePattern: '^pull under', tags: [], description: "Target is pulled underwater. ", quickdescription: 'Pull Under. ' },
    { id: 'repair', cost: 2, levelUp: 0, season: 1, name: 'Repair', namePattern: '^repair', tags: [], description: "Can heal robots and undead. ", quickdescription: 'Repair. ' },
    { id: 'targetingmark', cost: 4, levelUp: 0, season: 1, name: 'Targeting Mark', namePattern: '^targeting mark', tags: [], description: "On a hit, Mark the target, giving your allies +1 to hit that target for 3 turns. ", quickdescription: 'Targeting Mark. ' },
    { id: 'astralform', cost: 4, levelUp: 0, season: 1, name: 'Astral Form', namePattern: '^astral form', tags: [], description: "Project an astral body into the center of the domain; you can attack from it and it projects a Zone of Control. ", quickdescription: 'Astral Form. ' },
    { id: 'astralmovement', cost: 4, levelUp: 0, season: 1, name: 'Astral Movement', namePattern: '^astral mo', tags: [], description: "Your astral body can move within your domain whenever you move. ", quickdescription: 'Astral Form. ' },
    { id: 'influentialcontrol', cost: 6, levelUp: 0, season: 1, name: 'Influential Control', namePattern: '^influential con', tags: [], description1: "In your domain, your Zone of Control is one space wider. ", description: "In your domain, your Zone of Control is [{ll}] spaces wider. ", quickdescription: 'Influential Control [{ll}]. ' },
    { id: 'lockeddomain', cost: 4, levelUp: 0, season: 1, name: 'Locked Domain', namePattern: '^locked domain', tags: [], description: "Characters must succeed at an opposed roll against you to exit your domain. Attacks across the edge of the domain are made at a -2 penalty. ", quickdescription: 'Locked Domain. ' },
    { id: 'shiftingtransformation', cost: 4, levelUp: 0, season: 1, name: 'Shifting Transformation', namePattern: '^shifting transformation', tags: [], description: "Switch to another form and replace one of its Transformations with this one. ", quickdescription: 'Shifting Transformation. ' },
    { id: 'shiftingdomain', cost: 4, levelUp: 0, season: 1, name: 'Shifting Domain', namePattern: '^shifting domain', tags: [], description: "Switch to another form and replace one of its Domains with this one. ", quickdescription: 'Shifting Domain. ' },
    { id: 'touchofmalevolence', cost: 6, levelUp: 0, season: 1, name: 'Touch of Malevolence', namePattern: '^touch of mal', tags: [], description: "Whenever you hit a target with a Damage or Weaken tech in this form, they gain 1 Malevolence. ", quickdescription: 'Touch of Malevolence. ' },
    { id: 'continuousrecovery', cost: 0, levelUp: 0, season: 1, name: 'Continuous Recovery', namePattern: '^continuous r', tags: [], description: "Repeat healing at the start of your next two turns. ", quickdescription: 'Continuous Recovery. ' },
];

const limitLibrary = [
    { id: 'airborne', value: 1, levelUp: 0, season: 3, name: 'Airborne Limit', namePattern: '^airborne', tags: [], description: 'Must be flying. ', quickdescription: 'Must be flying. ' },
    { id: 'ally', value: 1, levelUp: 0, season: 1, name: 'Ally Limit', namePattern: '^ally', tags: [], description: "Can't use this technique on yourself. ", quickdescription: 'Ally only. ' },
    { id: 'ammo', value: 3, levelUp: 3, season: 1, name: 'Ammunition Limit', namePattern: '^amm(o|unition)', tags: [], description: "Can be used [4-{ll}] times per scene. ", quickdescription: 'Ammo [4-{ll}]. ' },
    { id: 'clone', value: 2, levelUp: 0, season: 2, name: 'Clone Limit', namePattern: '^clone', tags: [], description: "Must have a clone to use this technique. ", quickdescription: 'Requires clone. ' },
    { id: 'companion', value: 2, levelUp: 0, season: 1, name: 'Companion Limit', namePattern: '^companion', tags: [], description: "Only your companion can use this technique. ", quickdescription: 'Companion. ' },
    { id: 'cooldown', value: 2, levelUp: 2, season: 1, name: 'Cooldown Limit', namePattern: '^cooldown', tags: [], description1: "Must wait for one turn before using again. ", description: "Must wait for [{ll}] turns before using again. ", quickdescription: 'Cooldown [{ll}]. ' },
    { id: 'darkpower', value: 10, levelUp: 0, season: 1, name: 'Dark Power Limit', namePattern: '^dark pow', tags: [], description: "Malevolent Entity gets a chance to take control. ", quickdescription: 'Dark Power. ' },
    { id: 'drop', value: 4, levelUp: 0, season: 1, name: 'Drop Limit', namePattern: '^drop', tags: [], description: "You stop flying upon use. ", quickdescription: 'Drop. ' },
    { id: 'falling', value: 4, levelUp: 0, season: 1, name: 'Falling Limit', namePattern: '^(fall|prone)', tags: [], description: "You fall prone upon use. ", quickdescription: 'Fall prone. ' },
    { id: 'form', value: 2, levelUp: 2, season: 1, name: 'Form Limit', namePattern: '^form', tags: [], description: "You must be transformed to use this technique. ", quickdescription: 'Form [{ll}]. ' },
    { id: 'grantflaw', value: 1, levelUp: 1, season: 1, name: 'Grant Flaw Limit', namePattern: '^(grant )?flaw', tags: ['flaws'], },
    { id: 'grantskill', value: 1, levelUp: 1, season: 1, name: 'Grant Skill Limit', namePattern: '^(grant )?skill', tags: ['skills'], },
    { id: 'health', value: 2, levelUp: 2, season: 1, name: 'Health Limit', namePattern: '^health', tags: [], },
    { id: 'immobile', value: 3, levelUp: 0, season: 1, name: 'Immobile Limit', namePattern: '^immobile', tags: [], description: "Can't be used after moving. ", quickdescription: 'Immobile. ' },
    { id: 'initiative', value: 3, levelUp: 3, season: 1, name: 'Initiative Limit', namePattern: '^initiative', tags: [], description: "Initiative reduced by [{ll}] upon use. ", quickdescription: 'Initiative [{ll}]. ' },
    { id: 'injury', value: 2, levelUp: 2, season: 1, name: 'Injury Limit', namePattern: '^injury', tags: [], description: "HP must be at or below [Math.ceil({hp} * (1 - 0.2 * {ll}))] to use. ", quickdescription: 'HP must be at or below [Math.ceil({hp} * (1 - 0.2 * {ll}))]. ' },
    { id: 'landbound', value: 1, levelUp: 0, season: 1, name: 'Landbound Limit', namePattern: '^landbound', tags: [], description: "Doesn't affect flying targets. ", quickdescription: 'Landbound. ' },
    { id: 'mercy', value: 3, levelUp: 0, season: 1, name: 'Mercy', namePattern: '^mercy', tags: ['important'], description: "Can't reduce anyone below 1 HP. ", quickdescription: 'Mercy. ' },
    { id: 'minimumrange', value: 1, levelUp: 0, season: 1, name: 'Minimum Range Limit', namePattern: '^minimum r', tags: [], description1: "Doesn't affect targets within 1 space of you. ", description: "Doesn't affect targets within [{ll}] spaces of you. ", quickdescription: 'Minimum Range [{ll}]. ' },
    { id: 'movement', value: 1, levelUp: 0, season: 1, name: 'Movement Limit', namePattern: '^move', tags: [], description1: "Must be at least 1 space away from where you started your turn to use. ", description: "Must be at least [{ll}] spaces away from where you started your turn to use. ", quickdescription: 'Movement Limit [{ll}]. ' },
    { id: 'nodesacrifice', value: 8, levelUp: 0, season: 2, name: 'Node Sacrifice Limit', namePattern: '^node sac', tags: [], description: "Must be used through an Attack Node, and destroys the Node. ", quickdescription: 'Node Sacrifice. ' },
    { id: 'pull', value: 1, levelUp: 0, season: 1, name: 'Pull Limit', namePattern: '^pull', tags: [], description: "All movement must be towards you. ", quickdescription: 'Pull. ' },
    { id: 'push', value: 1, levelUp: 0, season: 1, name: 'Push Limit', namePattern: '^push', tags: [], description: "All movement must be away from you. ", quickdescription: 'Push. ' },
    { id: 'reaction', value: 3, levelUp: 0, season: 1, name: 'Reaction Limit', namePattern: '^react', tags: [], description: "Can only be used as a reaction. ", quickdescription: 'Reaction. ' },
    { id: 'refraction', value: 2, levelUp: 0, season: 2, name: 'Refraction Limit', namePattern: '^refract', tags: [], description: "Can only be used through a refraction node. ", quickdescription: 'Refraction. ' },
    { id: 'reload', value: 4, levelUp: 0, season: 1, name: 'Reload Limit', namePattern: '^reload', tags: [], description: "Must spend a support action to reload. ", quickdescription: 'Reload. ' },
    { id: 'revert', value: 10, levelUp: 0, season: 3, name: 'Revert Limit', namePattern: '^revert', tags: [], description: "Must be transformed, and the transformation ends upon use. ", quickdescription: 'Revert. ' },
    { id: 'self', value: 1, levelUp: 0, season: 1, name: 'Self Limit', namePattern: '^self', tags: [], description: "Can only target yourself. ", quickdescription: 'Targets self. ' },
    { id: 'sequence', value: 4, levelUp: 0, season: 1, name: 'Sequence Limit', namePattern: '^sequence', tags: [], description: "A specific other technique must be used before this one. ", quickdescription: 'Sequence. ' },
    { id: 'setup', value: 1, levelUp: 0, season: 1, name: 'Set-Up Limit', namePattern: '^set( |-)?up', tags: [], description: "Can't use until turn [{ll}+1]. ", quickdescription: 'Setup, turn [{ll}+1]. ' },
    { id: 'singlecompanion', value: 3, levelUp: 0, season: 1, name: 'Single Companion Limit', namePattern: '^single companion', tags: [], description: "Only a specific companion can use this technique. ", quickdescription: 'Single Companion. ' },
    { id: 'slow', value: 6, levelUp: 0, season: 1, name: 'Slow Limit', namePattern: '^slow', tags: ['slow'] },
    { id: 'temporary', value: 6, levelUp: 0, season: 1, name: 'Temporary Limit', namePattern: '^temporary', tags: [], description: "Duration reduced by 1 turn. ", quickdescription: 'Temporary. ' },
    { id: 'time', value: 5, levelUp: 5, season: 2, name: 'Time Limit', namePattern: '^time', tags: [], description: "Effect ends in [5-{ll}] turns. ", quickdescription: 'Time limit [5-{ll}]. ' },
    { id: 'unstablesummon', value: 4, levelUp: 4, season: 1, name: 'Unstable Summon Limit', namePattern: '^unstable', tags: [], description: "Summon has a [{ll}] in 10 chance to ignore orders. ", quickdescription: 'Unstable summon [{ll}]. ' },
    { id: 'upkeeplimit', value: 4, levelUp: 4, season: 1, name: 'Upkeep Limit', namePattern: '^upkeep', tags: [], description: "Effect costs [{ll}] stamina per turn to maintain. ", quickdescription: 'Upkeep [{ll}]. ' },
    { id: 'valor', value: 2, levelUp: 2, season: 1, name: 'Valor Limit', namePattern: '^valor(?! ?c)', tags: [], description: "Requires [{ll}] valor. " },
    { id: 'valorconsumption', value: 5, levelUp: 5, season: 1, name: 'Valor Consumption Limit', namePattern: '^valor consum', tags: [], description: "Valor reduced by [{ll}]. " },
    { id: 'vitality', value: 3, levelUp: 0, season: 1, name: 'Vitality Limit', namePattern: '^vitality', tags: [], description: "Health must be above [Math.ceil({hp} * 0.4)] to use. ", quickdescription: 'HP must be over [Math.ceil({hp} * 0.4)] to use. ' },
    { id: 'darksurrender', value: 30, levelUp: 0, season: 2, name: 'Dark Surrender Limit', namePattern: '^dark surrender', tags: [], description: "Your Malevolent Entity takes control. ", quickdescription: 'Dark Surrender. ' },
    { id: 'final', value: 9999, levelUp: 0, season: 3, name: 'Final Limit', namePattern: '^final', tags: [], description: "Health and Valor are reduced to 0. ", quickdescription: 'Final. ' },
    { id: 'ultimatecooldown', value: 10, levelUp: 10, season: 1, name: 'Ultimate Cooldown Limit', namePattern: '^ultimate cooldown', tags: [], description1: "Can't be used again for one scene. ", description: "Can't be used again for [{ll}] scenes. ", quickdescription: 'Ultimate Cooldown [{ll}]. ' },
    { id: 'ultimatehealth', value: 20, levelUp: 0, season: 1, name: 'Ultimate Health Limit', namePattern: '^ultimate health', tags: [] },
    { id: 'ultimatevalor', value: 10, levelUp: 10, season: 1, name: 'Ultimate Valor Limit', namePattern: '^ultimate valor', tags: [] },
    { id: 'fatigue', value: 15, levelUp: 0, season: 1, name: 'Fatigue Limit', namePattern: '^fatigue', tags: [], description: "Become Fatigued after use. ", quickdescription: 'Fatigue. ' },
    { id: 'weaponrequirement', value: 3, levelUp: 0, season: 1, name: 'Weapon Requirement Limit', namePattern: '^weapon req', tags: [], description: "Requires weapon. " },
    { id: 'weaponreliant', value: 1, levelUp: 0, season: 1, name: 'Weapon Reliant Limit', namePattern: '^weapon rel', tags: [], description: "-10 damage if you don't have a weapon. ", quickdescription: 'Weapon reliant. ' },
    { id: 'expendableammo', value: 1, levelUp: 1, season: 1, name: 'Expendable Ammo Limit', namePattern: '^expendable ammo', tags: [], description: "Requires ammo that must be purchased or found. ", quickdescription: 'Expendable ammo. ' },
    { id: 'synchronization', value: 2, levelUp: 2, season: 1, name: 'Synchronization Limit', namePattern: '^sync', tags: [], description: "Requires [{ll}] synchronization with your Ego Weapon. ", quickdescription: 'Synchronization [{ll}]. ' },
];

const summaryItems = [
    {id: 'drain', type: 'mod', name: 'Drain'},
    {id: 'persistenteffect', type: 'mod', name: 'Persistent'},
    {id: 'darknesszone', type: 'mod', name: 'Darkness Zone'},
    {id: 'drop', type: 'mod', name: 'Drop Attack'},
    {id: 'immobilizingstrike', type: 'mod', name: 'Immobilize'},
    {id: 'knockdown', type: 'mod', name: 'Knock Down'},
    {id: 'lightzone', type: 'mod', name: 'Light Zone'},
    {id: 'rammingattack', type: 'mod', name: 'Ramming Attack'},
    {id: 'throw', type: 'mod', name: 'Throw'},
    {id: 'launching', type: 'mod', name: 'Launching'},
    {id: 'terraindisruption', type: 'mod', name: 'Terrain Disruption'},
    {id: 'terrainrepair', type: 'mod', name: 'Terrain Repair'},
    {id: 'mercy', type: 'limit', name: 'Mercy'},
];

// !debug command
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!debug') == 0 && playerIsGM(msg.playerid)) {
        sendChat(`character|${state.narratorId}`, 'Test', {noarchive: true});
    }
});

// !init command
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!init') == 0 && playerIsGM(msg.playerid)) {
        // Get params
        let split = getParams(msg.content);
    
        let confirm = split.length > 0 && split[0] == '--confirm';
    
        rollInitiative(confirm);
    }
});

on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!autoinit') == 0
        && state.confirmAutoInitiative
        && playerIsGM(msg.playerid)) {
        let split = getParams(msg.content);
        if(split.length == 1 && split[0] == '--off') {
            sendValorMessage('Auto-initiative disabled for this scene.', {recipient: 'gm', noarchive: true});
            state.autoInitiativeForScene = false;
        } else {
            sendValorMessage('Auto-initiative enabled for this scene.', {recipient: 'gm', noarchive: true});
            state.autoInitiativeForScene = true;
        }
    }
});

// !rest command
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!rest') == 0
        && playerIsGM(msg.playerid)) {
        performRest(false);
    }
});

// !fullrest command
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!fullrest') == 0
        && playerIsGM(msg.playerid)) {
        performRest(true);
    }
});

// !roll-as command
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!roll-as') == 0) {
        let split = getParams(msg.content);
        if(split.length < 3) {
            log('Not enough arguments.');
        } else {
            let actorId = split[0];
            let roll = split[1];
            let label = split[2];
        
            sendChat(`character|${actorId}`, `[[${roll}]] ${label}`);
        }
    }
});

// !d-roll command
// Performs a specific roll as a specific character.
// Meant to be used by the character sheet, not the user.
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!d-roll') == 0) {
        let split = getParams(msg.content);
        
        if(split.length < 5) {
            log('!d-roll: Not enough arguments.');
        }
        
        let attackerId = split[0];
        let defenderId = split[1];
        let techName = unescape(split[2]);
        let attribute = split[3];
        let count = parseInt(split[4]) || 1;
        
        if(techName[0] == '"') {
            techName = techName.substring(1, techName.length - 1);
        }
        
        performDefenseRoll(attackerId, defenderId, techName, attribute, count);
    }
});

// !tech-undo command
on('chat:message', function(msg) {
    if((msg.type == 'api' && msg.content.indexOf('!t-undo') == 0 || 
    msg.type == 'api' && msg.content.indexOf('!tech-undo') == 0) && playerIsGM(msg.playerid)) {
        undoTech();
    }
});

// !tech-apply command
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!tech-apply') == 0) {
        let split = getParams(msg.content);
        if(split.length < 2) {
            log('Not enough arguments.');
            return;
        }
        
        const tokenId = split[0];
        const techId = split[1];
        const forcedDamage = split.length > 2 ? (parseInt(split[2]) || -1) : -1;
        const rawDamage = split.length > 3;
        
        applyTech(tokenId, techId, forcedDamage, rawDamage);
    }
});

// !effect command
on('chat:message', function(msg) {
    if((msg.type == 'api' && msg.content.indexOf('!e ') == 0 || 
       msg.type == 'api' && msg.content.indexOf('!effect') == 0) && playerIsGM(msg.playerid)) {
        // Get params
        let split = getParams(msg.content);
        if(split.length < 1) {
            log('Not enough arguments.');
            return;
        }

        let turnOrder = JSON.parse(Campaign().get('turnorder'));
        if(!turnOrder || turnOrder.length == 0) {
            // Nothing to do
            log('Turn Tracker is not enabled.');
        }
        
        // Figure out who the actor is
        let actor = getActor(msg);
        if(!actor) {
            for(i = 0; i < turnOrder.length; i++) {
                if(turnOrder[i].id != '-1') {
                    let token = getObj('graphic', turnOrder[i].id);
                    actor = getObj('character', token.get('represents'));
                    break;
                }
            }
        }
        
        let effectName = split.join(' ');
        let duration = parseInt(split[split.length - 1]);
        
        if(duration != duration) {
            duration = 3;
        } else {
            effectName = split.slice(0, split.length - 1).join(' ');
        }
        
        addEffect(turnOrder, actor.get('_id'), effectName, duration);
    }
});

function addEffect(turnOrder, id, effectName, duration) {
    // Add a new item to the turn log
    for(i = 0; i < turnOrder.length; i++) {
        if(turnOrder[i].id != '-1') {
            let token = getObj('graphic', turnOrder[i].id);
            if(token && (token.get('represents') == id ||
                token.get('_id') == id)) {
                let effect = {
                    id: '-1',
                    custom: effectName,
                    pr: duration || 1,
                    formula: duration == 0 ? null : '-1'
                };
                let newTurnOrder = turnOrder.slice(0, i + 1).concat([effect]).concat(turnOrder.slice(i + 1));
                Campaign().set('turnorder', JSON.stringify(newTurnOrder));
                log('Effect ' + effectName + ' added to Turn Tracker.');
                return true;
            }
        }
    }
    
    log('Actor not found on Turn Tracker.');
    return false;
}

// !mimic command
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!mimic') == 0) {
        let split = getParams(msg.content);
        if(split.length < 2) {
            log('Not enough arguments.');
        } else {
            let actorId = split[0];
            let techId = split[1];
            let mimic = split[2];
        
            mimicTech(actorId, techId, mimic);
        }
    }
});

// !duplicate command
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!duplicate') == 0) {
        let split = getParams(msg.content);
        if(split.length < 1) {
            log('Not enough arguments.');
        } else {
            let actorId = split[0];
        
            duplicateCharacter(actorId);
        }
    }
});

// !d-finalize command
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!d-finalize') == 0) {
        let split = getParams(msg.content);
        if(split.length < 1) {
            log('Not enough arguments.');
        } else {
            let actorId = split[0];
        
            finalizeCharacter(actorId);
        }
    }
});

// !tech command
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!tech') == 0 
    && msg.content.indexOf('!tech-apply') == -1) {
        let split = getParams(msg.content);
        if(split.length < 2) {
            log('Not enough arguments.');
        } else {
            let techId = split[0];
            let actorId = '';
            let targets = [];
            let override = false;
            let bonus = 0;
            
            for(let i = 1; i < split.length - 1; i += 2) {
                let paramname = split[i];
                let paramvalue = split[i+1];
                if(paramvalue[0] == '"') paramvalue = paramvalue.substring(1, paramvalue.length - 1);
                paramvalue = paramvalue.trim();
                
                switch(paramname.substring(2)) {
                    case 'as':
                        actorId = paramvalue;
                        break;
                    case 'targets':
                        targets = paramvalue.trim().split(' ');
                        break;
                    case 'override':
                        override = true;
                        break;
                    case 'bonus':
                        bonus = parseInt(paramvalue) || 0;
                        break;
                }
            }
            performTech(techId, actorId, targets, msg.content, bonus, override);
        }
    }
});

// !sizeup command
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!sizeup') == 0 && playerIsGM(msg.playerid)) {
        // Get params
        let split = getParams(msg.content);
    
        let selected = null;
        if(msg.selected && msg.selected.length > 0) {
            selected = msg.selected[0];
        }
        
        sizeUp(selected);
    }
});

// !addhp/addst/subhp/subst commands
on('chat:message', function(msg) {
    if(msg.type == 'api' && ((msg.content.indexOf('!addhp') == 0 ||
            msg.content.indexOf('!addst') == 0 ||
            msg.content.indexOf('!subhp') == 0 ||
            msg.content.indexOf('!subst') == 0)
            && playerIsGM(msg.playerid))) {
        const direction = msg.content.startsWith('!add') ? 1 : -1;
        const stat = msg.content.indexOf('st') > -1 ? 'stamina' : 'health';
        let tokens = [];
        if(msg.selected) {
            for(const s of msg.selected) {
                const selectedToken = getObj('graphic', s._id);
                if(selectedToken.get('represents')) {
                    tokens.push(selectedToken);
                }
            }
            for(const token of tokens) {
                updateValue(token.get('_id'), stat, 0.2 * direction, true);
            }
        }
    }
});

// !status command
on('chat:message', function(msg) {
    if(msg.type == 'api' && (msg.content.indexOf('!status') == 0)) {
        let actor = getActor(msg);
        if(!actor) return;
        statusCheck(actor.get('_id'));
    }
});

// !def command
// Displays defense and resistance for all active characters.
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!def') == 0
        && playerIsGM(msg.playerid)) {
        // Get list of tokens
        let page = Campaign().get('playerpageid');
        let allTokens = findObjs({_type: 'graphic', layer:'objects', _pageid: page});
        let actorIds = [];
        let tokens = [];
        let duplicateIds = [];
        
        for(var token of allTokens) {
            let actorId = token.get('represents');
            if(actorId && actorIds.indexOf(actorId) == -1) {
                log(`Adding ${token.get('name')} to defense token list`);
                actorIds.push(actorId);
                tokens.push(token);
            }
        }
        
        let message = '';
        let turnOrder = [];
        for(var token of tokens) {
            let actorId = token.get('represents');
            let actor = getObj('character', actorId);
            
            if(actor) {
                let def = parseInt(getAttrByName(actorId, 'defense'));
                let res = parseInt(getAttrByName(actorId, 'resistance'));
                let defBonus = parseInt(getAttrByName(actorId, 'defensebonus'));
                let resBonus = parseInt(getAttrByName(actorId, 'resistancebonus'));
                if (defBonus == defBonus) def += defBonus;
                if (resBonus == resBonus) res += resBonus;
                let actorName = actor.get('name');
                if(message.length > 0) {
                    message += '<br />';
                }
                message += `${actorName}: Def **${def}**, Res **${res}**`;
            }
        }
        
        sendValorMessage(`<div>${message}</div>`, {recipient: 'gm', noarchive: true});
    }
});

// !di command
// Displays damage increments for all active characters.
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!di') == 0
        && playerIsGM(msg.playerid)) {
        // Get list of tokens
        let page = Campaign().get('playerpageid');
        let allTokens = findObjs({_type: 'graphic', layer:'objects', _pageid: page});
        let actorIds = [];
        let tokens = [];
        let duplicateIds = [];
        
        for(var token of allTokens) {
            let actorId = token.get('represents');
            if(actorId && actorIds.indexOf(actorId) == -1) {
                log('Adding ' + token.get('name') + ' to defense token list');
                actorIds.push(actorId);
                tokens.push(token);
            }
        }

        let message = '';
        let turnOrder = [];
        for(var token of tokens) {
            let actorId = token.get('represents');
            let actor = getObj('character', actorId);
            
            if(actor) {
                let di = getAttrByName(actorId, 'damageincrement')
                let actorName = actor.get('name');
                if(message.length > 0) {
                    message += '<br />';
                }
                message += `${actorName}: DI **${di}**`;
            }
        }
        
        sendValorMessage(`<div>${message}</div>`, {recipient: 'gm', noarchive: true});
    }
});

// !unmo command
// Displays defense and resistance for all active characters.
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!unmo') == 0
        && playerIsGM(msg.playerid)) {
        // Get list of tokens
        let page = Campaign().get('playerpageid');
        let allTokens = findObjs({_type: 'graphic', layer:'objects', _pageid: page});
        let actorIds = [];
        let tokens = [];
        
        for(var token of allTokens) {
            let actorId = token.get('represents');
            if(actorId && actorIds.indexOf(actorId) == -1) {
                log('Adding ' + token.get('name') + ' to token list');
                actorIds.push(actorId);
                tokens.push(token);
            }
        }

        let message = '';
        for(var token of tokens) {
            let actorId = token.get('represents');
            let actor = getObj('character', actorId);
            
            if(actor) {
                let skills = getSkills(actorId);
                let unmovable = skills.find(s => s.id == 'unmovable');
                if(unmovable) {
                    let actorName = actor.get('name');
                    if(message.length > 0) {
                        message += '<br />';
                    }
                    message += `${actorName}: Unmovable **${unmovable.level}**`;
                }
            }
        }
        
        if(message.length == 0) {
            message = 'No characters in this scene have Unmovable.';
        }
        
        sendValorMessage(`<div>${message}</div>`, {recipient: 'gm', noarchive: true});
    }
});

// Max Value sync function
// Makes HP and ST move in sync with their max values.
on('change:attribute', function(obj, prev) {
    if(state.maxValueSyncEnabled) {
        if(obj.get('name') == 'health' || 
            obj.get('name') == 'stamina') {
            if(prev.max && obj.get('max') && prev.max != obj.get('max')) {
                let oldMax = parseInt(prev.max);
                let newMax = parseInt(obj.get('max'));
                if(oldMax == oldMax && newMax == newMax) {
                    let maxChange = newMax - oldMax;
                    let charId = obj.get('_characterid');
                    updateValueForCharacter(charId, obj.get('name'), maxChange);
                    log(`Max ${obj.get('name')} for character ${charId} changed from ` +
                        `${oldMax} to ${newMax}, changing value by ${maxChange}`);
                }
            }
        }
    }
});

// Max Value sync function
// Makes HP and ST move in sync with their max values.
on('change:graphic', function(obj, prev) {
    if(state.sheetSyncEnabled) {
        const tokenId = obj.get('_id');
        const oldActorId = prev.represents;
        const newActorId = obj.get('represents');
        let newAttrs = filterObjs(function(obj) {
            return obj.get('_type') == 'attribute' &&
                obj.get('characterid') == newActorId &&
                (obj.get('name') == 'health' || obj.get('name') == 'stamina' || obj.get('name') == 'valor');
        });
        if(oldActorId && newActorId && oldActorId != newActorId) {
            log(`Token changed from ${prev.represents} to ${obj.get('represents')}, applying bar updates`);

            let oldHealth = {
                link: prev.bar1_link,
                value: parseInt(prev.bar1_value),
                max: parseInt(prev.bar1_max)
            };
            let newHealth = {
                link: obj.get('bar1_link'),
                value: parseInt(getAttrByName(newActorId, 'health')),
                max: parseInt(getAttrByName(newActorId, 'health', 'max'))
            };
            
            let oldStamina = {
                link: prev.bar2_link,
                value: parseInt(prev.bar2_value),
                max: parseInt(prev.bar2_max)
            };
            let newStamina = {
                link: obj.get('bar2_link'),
                value: parseInt(getAttrByName(newActorId, 'stamina')),
                max: parseInt(getAttrByName(newActorId, 'stamina', 'max'))
            };
            
            let oldValor = prev.bar3_value;
            
            if(oldHealth.link) {
                newHealth.link = newAttrs.find(a => a.get('name') =='health').get('_id');
                const maxHpChange = newHealth.max - oldHealth.max;
                newHealth.value = oldHealth.value + maxHpChange;
                
                newStamina.link = newAttrs.find(a => a.get('name') =='stamina').get('_id');
                const maxStChange = newStamina.max - oldStamina.max;
                newStamina.value = oldStamina.value + maxStChange;
                
                let valorLink = newAttrs.find(a => a.get('name') =='valor').get('_id');
                
                obj.set('bar1_link', newHealth.link);
                obj.set('bar2_link', newStamina.link);
                obj.set('bar3_link', valorLink);
                setTimeout(function() {
                    let token = getObj('graphic', tokenId)
                    token.set('bar1_value', newHealth.value);
                    token.set('bar2_value', newStamina.value);
                    token.set('bar3_value', oldValor);
                }, 1000);
            }
        }
    }
});

// Critical HP warning
// Whisper to a character's owner when they fall under 40% Health
on('change:graphic', function(obj, prev) {
    if(!state.showHealthAlerts) {
        return;
    }
    if(obj.get('represents') == '') {
        // Do nothing if the updated token has no backing character
        return;
    }
    
    if(!obj || !prev) {
        return;
    }
    if(obj.get('bar1_value') && prev.bar1_value &&
       obj.get('bar1_value') == prev.bar1_value) {
        // Do nothing if none of the values changed
        return;
    }
    
    let page = Campaign().get('playerpageid');
    if(obj.get('_pageid') != page) {
        // Do nothing if it was a token on another page
        return;
    }
    
    let oldHp = parseInt(prev.bar1_value);
    criticalHealthWarning(obj, oldHp);
});

// Master Init Loop
// Only triggers on-init-change events when the person at the top of the
// initiative list changes.
// Prevents repeat events when adjusting other things on the init list.
on('change:campaign:turnorder', function(obj) {
    let turnOrder = JSON.parse(obj.get('turnorder'));
    if(!turnOrder || turnOrder.length === 0) {
        // Do nothing if the init tracker is empty
        return;
    }
    
    let topChar = turnOrder[0];
    
    if(state.lastActor) {
        let nextActor;
        // Get a label or ID for the current top actor
        if(topChar.custom) {
            nextActor = topChar.custom;
        } else {
            nextActor = topChar.id;
        }
        
        // If Round moved from the top to the bottom - do valor updates
        if(turnOrder[turnOrder.length - 1].custom && turnOrder[turnOrder.length - 1].custom.toLowerCase() == 'round' && 
            state.lastActor.toLowerCase() == 'round') {
            updateValor();
            alertCooldowns();
        }
        
        // If the top actor changed, the turn order advanced - do stuff
        if(state.lastActor !== nextActor) {
            state.lastActor = nextActor;
            processOngoingEffects(turnOrder);
            trackStatuses(turnOrder);
            updateInitiative(turnOrder);
        }
    } else {
        if(topChar.custom) {
            state.lastActor = topChar.custom;
        } else {
            state.lastActor = topChar.id;
        }
    }
});

/* Utility Functions */
var generateUUID = (function() {
    "use strict";

    var a = 0, b = [];
    return function() {
        var c = (new Date()).getTime() + 0, d = c === a;
        a = c;
        for (var e = new Array(8), f = 7; 0 <= f; f--) {
            e[f] = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz".charAt(c % 64);
            c = Math.floor(c / 64);
        }
        c = e.join("");
        if (d) {
            for (f = 11; 0 <= f && 63 === b[f]; f--) {
                b[f] = 0;
            }
            b[f]++;
        } else {
            for (f = 0; 12 > f; f++) {
                b[f] = Math.floor(64 * Math.random());
            }
        }
        for (f = 0; 12 > f; f++){
            c += "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz".charAt(b[f]);
        }
        return c;
    };
}()),

generateRowID = function () {
    "use strict";
    return generateUUID().replace(/_/g, "Z");
};

function parseText(text, attrs) {
    let output = text;
    var evals = output.match(/\[.*?\]/);
    let tries = 0;
    while(evals && evals.length > 0) {
        let str = evals[0];
        str = str.substring(1, str.length - 1);
        for(const attr of attrs) {
            str = str.replace(`{${attr.name}}`, attr.value)
        }
        output = output.replace(evals[0], eval(str));
        evals = output.match(/\[(.*?)\]/);
        tries++;
        if(tries > 10) break;
    }
    return output;
}

function capitalize(str) {
    return str.substring(0, 1).toUpperCase() + str.substring(1);
}

function getRound() {
    if(!state.techHistory) {
        state.techHistory = [];
    }
    
    let rawTurnOrder = Campaign().get('turnorder');
    let turnOrder = rawTurnOrder ? JSON.parse(rawTurnOrder) : [];
    if(!turnOrder || turnOrder.length === 0) return;
    
    let round = turnOrder.find(t => t.custom == 'Round');

    return parseInt(round.pr) || 0;
}

function getParams(str) {
    let split = str.match(/(".*?")|(\S+)/g)
        .map(s => (s.length > 0 && s[0] == '"' ? s.substring(1, s.length - 1) : s));
    return split.slice(1);
}

function bonusDisplay(bonus) {
    if(bonus == 0) return '';
    if(bonus > 0) return `+${bonus}`;
    return `${bonus}`;
}

// Actor Identifier
// Takes a message and identifies the character associated with it.
// Priority 1: Selected token.
// Priority 2: 'As:' field.
// Priority 3: Any character controlled by the player.
function getActor(msg) {
    let actor;
    if(msg.selected && msg.selected.length > 0) {
        // The first selected character is the actor
        let token = getObj('graphic', msg.selected[0]._id);
        actor = getObj('character', token.get('represents'));
    } else {
        // Try to find a character who matches the "Who" block for the speaker
        let characters = filterObjs(function(obj) {
            return obj.get('_type') === 'character' &&
                   obj.get('name') === msg.who;
        });
        
        if(characters.length > 0) {
            // The first character with a matching name is the actor
            actor = characters[0];
        } else {
            // Try to find a character controlled by the speaker
            characters = filterObjs(function(obj) {
                return obj.get('_type') === 'character' &&
                       obj.get('controlledBy') &&
                       obj.get('controlledBy').indexOf(msg.playerid) > -1;
            });
            
            if(characters.length > 0) {
                actor = characters[0];
            }
        }
    }
    return actor;
}

function getSkills(actorId, tempOnly = false) {
    let attributes = findObjs({
        _characterid: actorId,
        _type: 'attribute',
    });
    
    let skillAttributes = attributes.filter(a => (a.get('name').toLowerCase().indexOf('repeating_skill') > -1 && !tempOnly) || 
                                                 a.get('name').toLowerCase().indexOf('repeating_tempskill') > -1);
                                                 
    let output = {};
    for(let attribute of skillAttributes) {
        let name = attribute.get('name').split('_')[3];
        let id = attribute.get('name').split('_')[2];
        
        if(!output[id]) {
            output[id] = {};
        }
        
        output[id][name] = attribute.get('current');
    }
    
    for(let k of Object.keys(output)) {
        output[k].rowId = k;
    }
    
    let arr = Object.keys(output).map(k => output[k]);
    
    for(var skill of arr) {
        if(!skill.level) skill.level = 1;
    }
    
    return arr;
}

function getFlaws(actorId, tempOnly = false) {
    let attributes = findObjs({
        _characterid: actorId,
        _type: 'attribute',
    });
    
    let flawAttributes = attributes.filter(a => (a.get('name').toLowerCase().indexOf('repeating_flaw') > -1 && !tempOnly) ||
                                                a.get('name').toLowerCase().indexOf('repeating_tempflaw') > -1);
                                                
    let output = {};
    for (let attribute of flawAttributes) {
        let name = attribute.get('name').split('_')[3];
        let id = attribute.get('name').split('_')[2];
        
        if(id == 'undefined') {
            attribute.remove();
            continue;
        }
        
        if(!output[id]) {
            output[id] = {};
        }
        
        output[id][name] = attribute.get('current');
    }
    
    for(let k of Object.keys(output)) {
        output[k].rowId = k;
    }
    
    let arr = Object.keys(output).map(k => output[k]);
    
    for(var flaw of arr) {
        if(!flaw.level) flaw.level = 1;
    }
    
    return arr;
}

function getTechs(actorId) {
    let attributes = findObjs({
        _characterid: actorId,
        _type: 'attribute',
    });
    
    let techAttributes = attributes.filter(a => 
        a.get('name').toLowerCase().indexOf('repeating_tech') > -1 &&
        a.get('name').toLowerCase().indexOf('_name') > -1);
        
    let techs = [];
    for(var t of techAttributes) {
        let techId = t.get('name').split('_')[2];
        techs.push(getTech(techId));
    }
    
    return techs;
}

function getTech(techId) {
    let attributes = findObjs({
        _type: 'attribute',
    });
    
    let techAttributes = attributes.filter(a => a.get('name').toLowerCase().indexOf(techId.toLowerCase()) > -1);
    
    let output = {};
    
    if(techAttributes.length > 0) {
        output.actorId = techAttributes[0].get('_characterid');
    }
    
    for (let attribute of techAttributes) {
        let name = attribute.get('name').split('_')[3];

        output[name] = attribute.get('current');
    }
    
    // Separate out mods/limits
    if(output.mods) {
        let mods = output.mods.split('\n')
            .map(m => m.trim().toLowerCase());
        
        output.mods = [];
        for(let modName of mods) {
            let modSplit = modName.split(' ');
            let modLevel = parseInt(modSplit[modSplit.length - 1]) || 0;
            
            if(modLevel) {
                modName = modSplit.slice(0, modSplit.length - 1).join(' ');
            } else {
                modLevel = 1;
            }
            
            let modData = modLibrary.find(m => modName.toLowerCase().match(m.namePattern));
            
            if(modData) {
                modName = modData.id;
            }
            output.mods.push({id: modName, level: modLevel});
        }
    } else {
        output.mods = [];
    }
    
    if(output.limits) {
        let limits = output.limits.split('\n')
            .map(m => m.trim().toLowerCase());
        
        output.limits = [];
        for(let limitName of limits) {
            let limitSplit = limitName.split(' ');
            let limitLevel = parseInt(limitSplit[limitSplit.length - 1]) || 0;
            
            if(limitLevel) {
                limitName = limitSplit.slice(0, limitSplit.length - 1).join(' ');
            } else {
                limitLevel = 1;
            }
            
            let limitData = limitLibrary.find(l => limitName.toLowerCase().match(l.namePattern));
            
            if(limitData) {
                limitName = limitData.id;
            }
            
            output.limits.push({id: limitName, level: limitLevel});
        }
    } else {
        output.limits = [];
    }
    
    if(output.core == 'custom') {
        output.cost = output.customcost;
    }
    
    // Default values
    if(!output.core) output.core = 'damage';
    if(!output.corepower) output.corepower = 1;
    
    output.id = techId;
    return output;
}

function getTechUser(actorId) {
    const requestedAttrs = ['strength', 'agility', 'spirit', 'mind', 'guts',
        'muscle', 'dexterity', 'aura', 'intuition', 'resolve',
        'strengthattack', 'agilityattack', 'spiritattack', 'mindattack',
        'health', 'stamina', 'valor', 'level', 'type',
        'adjustaccuracy', 'attackrollbonus', 'damageincrement',
        'physicalattackbonus', 'energyattackbonus'];
    let attributes = findObjs({
        _characterid: actorId,
        _type: 'attribute',
    });
    
    let actorAttributes = attributes.filter(a => requestedAttrs.includes(a.get('name')));
    
    let output = {};
    for (let attribute of actorAttributes) {
        let name = attribute.get('name');

        output[name] = attribute.get('current');
        if(attribute.get('max')) {
            output[`${name}_max`] = attribute.get('max');
        }
    }
    
    let actor = getObj('character', actorId);
    output.name = actor.get('name');
    
    return output;
}

function getTechTarget(tokenId) {
    const requestedAttrs = ['name', 'defense', 'resistance', 'defensebonus', 'resistancebonus', 'health'];
    
    let token = getObj('graphic', tokenId);
    if(!token) return null;
    
    let actorId = token.get('represents');
    let actor = getObj('character', actorId);
    let output = {};

    if(actor) {
        output.name = actor.get('name');
        let attributes = findObjs({
            _characterid: actorId,
            _type: 'attribute',
        });
        
        let actorAttributes = attributes.filter(a => requestedAttrs.includes(a.get('name')));
        
        for (let attribute of actorAttributes) {
            let name = attribute.get('name');
    
            output[name] = attribute.get('current');
            if(attribute.get('max')) {
                output[`${name}_max`] = attribute.get('max');
            }
        }
    } else {
        // Nobody found - return blank target
        output.name = token.get('name');
        output.defense = 0;
        output.resistance = 0;
    }
    
    output.id = actorId;
    
    return output;
}

function getTechEffects(tech, actor) {
    let effects = {
        requiresRoll: false,
        damage: 0,
        damageType: 'physical',
        crit: 0,
        healing: 0,
        shield: 0,
        shieldType: 'physical',
        skills: '',
        flaws: '',
        other: ''
    };
    
    switch(tech.core) {
        case 'damage':
            effects.requiresRoll = true;
            effects.damage = 15 + tech.corepower * 5;
            if(tech.stat) {
                let attack = parseInt(actor[`${tech.stat}attack`]) || 0;
                effects.damage += attack;
                effects.crit = effects.damage + attack;
            }
            break; 
        case 'ultDamage':
            effects.requiresRoll = true;
            effects.damage = 24 + tech.corepower * 8;
            if(tech.stat) {
                let attack = parseInt(actor[`${tech.stat}attack`]) || 0;
                effects.damage += attack;
                effects.crit = effects.damage + attack;
            }
            break;
        case 'healing':
            effects.healing = 9 + tech.corepower * 3;
            if(tech.stat) {
                let statBonus = Math.ceil((parseInt(actor[tech.stat]) || 0) / 2);
                effects.healing += statBonus;
            }
            if(actor.type == 'flunky' || actor.type == 'soldier') effects.healing = Math.ceil(effects.healing / 2);
            break;
        case 'shield':
            effects.shield = 12 + tech.corepower * 4;
            if(tech.stat) {
                let statBonus = parseInt(actor[tech.stat]) || 0;
                effects.shield += statBonus;
            }
            effects.shieldType = tech.shieldtype || 'physical';
            break;
        case 'boost':
            effects.skills = tech.skills;
            break;
        case 'weaken':
            effects.flaws = tech.flaws;
            break;
        case 'barrier':
            effects.other = `Barrier strength ${tech.corepower}`;
            break;
        case 'summoning':
            effects.other = 'Summon';
            break;
        case 'ultDomain':
            effects.skills = tech.skills;
            effects.flaws = tech.flaws;
            break;
        case 'ultTransform':
            effects.healing = (parseInt(actor.level) || 1) * 10;
            if(actor.type == 'master') effects.healing *= 2;
            effects.skills = tech.skills;
            break;
    }
    
    for(const mod of tech.mods) {
        let modData = modLibrary.find(m => m.id == mod.id);
        if(modData) {
            switch(mod.id) {
                case 'debilitatingstrike':
                    effects.flaws = tech.flaws;
                    break;
                case 'continuousrecovery':
                    effects.healing = 6 + tech.corepower * 2;
                    if(tech.stat) {
                        let statBonus = Math.ceil((parseInt(actor[tech.stat]) || 0) / 2);
                        effects.healing += statBonus;
                    }
                    break;
            }
            
            if(modData.tags.includes('special')) {
                effects.damage = 12 + tech.corepower * 4;
                if(tech.stat) {
                    let attack = Math.ceil((parseInt(actor[`${tech.stat}attack`]) || 0) / 2);
                    effects.damage += attack;
                    effects.crit = effects.damage + attack * 2;
                }
            }
        }
    }
    
    if(effects.damage) {
        if(tech.stat == 'mind' || tech.stat == 'spirit') {
            effects.damage += parseInt(actor.energyattackbonus) || 0;
            effects.crit += parseInt(actor.energyattackbonus) || 0;
        } else {
            effects.damage += parseInt(actor.physicalattackbonus) || 0;
            effects.crit += parseInt(actor.physicalattackbonus) || 0;
        }
        
        if(tech.stat == 'mind' || tech.stat == 'spirit') {
            effects.damageType = 'energy';
        }
        
        if(tech.mods.find(m => m.id == 'piercing')) {
            effects.damageType = 'piercing';
        }
        
        if(tech.mods.find(m => m.id == 'damageshift')) {
            if(effects.damageType == 'physical') effects.damageType = 'energy';
            else if(effects.damageType == 'energy') effects.damageType = 'physical';
        }
        
    }
    
    for(const limit of tech.limits) {
        let limitData = limitLibrary.find(l => limit.id == l.id);
        if(limitData) {
            switch(limitData.id) {
                case 'grantflaw':
                    effects.flaws = tech.flaws;
                    break;
                case 'grantskill':
                    effects.skills = tech.skills;
                    break;
            }
        }
    }
    
    return effects;
}

// Internal function - get the current and max health for a character
// If a token ID is provided, it prioritizes the values on the token; otherwise,
// it uses the charId to get the attribute
function getHp(tokenId, charId) {
    let hp = null;
    let hpMax = null;
    let token = tokenId ? getObj('graphic', tokenId) : null;
    
    if(token) {
        // Get HP by token
        hp = parseInt(token.get('bar1_value')) || null;
        hpMax = parseInt(token.get('bar1_max')) || null;
    }
    
    if(!hp || !hpMax) {
        // Get HP by character
        hp = parseInt(getAttrByName(charId, 'health')) || null;
        hpMax = parseInt(getAttrByName(charId, 'health', 'max')) || null;
    }
    
    if(hp != null && hpMax != null) {
        return { val: hp, max: hpMax };
    } else {
        return { val: 1, max: 1 };
    }
}

// Internal function - get the current and max stamina for a character
// If a token ID is provided, it prioritizes the values on the token; otherwise,
// it uses the charId to get the attribute
function getSt(tokenId, charId) {
    let st = null;
    let stMax = null;
    let token = tokenId ? getObj('graphic', tokenId) : null;
    
    if(token) {
        // Get ST by token
        st = parseInt(token.get('bar2_value')) || null;
        stMax = parseInt(token.get('bar2_max')) || null;
    }
    
    if(!st || !stMax) {
        // Get ST by character
        st = parseInt(getAttrByName(charId, 'stamina')) || null;
        stMax = parseInt(getAttrByName(charId, 'stamina', 'max')) || null;
    }
    
    if(st && stMax) {
        return { val: st, max: stMax };
    } else {
        return { val: 1, max: 1 };
    }
}

function updateValue(tokenId, attribute, amount, ratio, absolute) {
    let token = getObj('graphic', tokenId);
    
    let bar = '1';
    switch(attribute) {
        case 'stamina':
            bar = '2';
            break;
        case 'valor':
            bar = '3';    
    }
    if(!token) {
        log("Couldn't find token for ID " + tokenId);
        return;
    }
    
    let attr = getObj('attribute', token.get(`bar${bar}_link`));
    if(attr) {
        let oldValue = parseInt(attr.get('current'));
        let maxValue = parseInt(attr.get('max'));
        if(oldValue != oldValue) {
            oldValue = 0;
        }
        if(maxValue != maxValue) {
            maxValue = 0;
        }
        
        let valueChange = ratio ? Math.ceil(amount * maxValue) : amount;
        let newValue = absolute ? valueChange : oldValue + valueChange;
        
        if(newValue > maxValue) {
            newValue = maxValue;
        }
        
        attr.set('current', newValue);
        if(attribute == 'health') {
            ///criticalHealthWarning(token, oldValue);
        }
    } else {
        let oldValue = parseInt(token.get(`bar${bar}_value`));
        let maxValue = parseInt(token.get(`bar${bar}_max`));
        if(oldValue != oldValue) {
            oldValue = 0;
        }
        if(maxValue != maxValue) {
            maxValue = 0;
        }
        
        let valueChange = ratio ? Math.ceil(amount * maxValue) : amount;
        let newValue = absolute ? valueChange : oldValue + valueChange;
        
        if(newValue > maxValue) {
            newValue = maxValue;
        }
        
        token.set(`bar${bar}_value`, newValue);
        if(attribute == 'health') {
            //criticalHealthWarning(token, oldValue);
        }
    }
}
function updateValueForCharacter(characterId, attribute, amount, ratio, absolute) {
    let actor = getObj('character', characterId);
    
    if(!actor) {
        log("Couldn't find character for ID " + characterId);
        return;
    }
    
    let attrs = filterObjs(function(obj) {
        return obj.get('_type') == 'attribute' &&
            obj.get('characterid') == characterId &&
            obj.get('name') == attribute;
    });
    
    if(attrs && attrs.length > 0) {
        let attr = attrs[0];
        let oldValue = parseInt(attr.get('current'));
        let maxValue = parseInt(attr.get('max'));
        if(oldValue != oldValue) {
            oldValue = 0;
        }
        if(maxValue != maxValue) {
            maxValue = 0;
        }
        
        let valueChange = ratio ? Math.ceil(amount * maxValue) : amount;
        let newValue = absolute ? valueChange : oldValue + valueChange;
        
        if(newValue > maxValue) {
            newValue = maxValue;
        }
        
        attr.set('current', newValue);
    }
}

function sendValorMessage(message, params = {}) {
    let recipient = params.recipient;
    let noarchive = params.noarchive;
    let actor = params.actor;
    
    let who = '';
    if(actor) {
        who = `character|${actor}`;
    } else {
        if(!state.narratorId) {
            let narrator = filterObjs(function(obj) {
                return obj.get('_type') === 'character' &&
                       obj.get('name') === valorName;
            });
            if(narrator.length > 0) {
                state.narratorId = narrator[0].get('_id');
            } else {
                state.narratorId = 'nobody';
            }
        }
        
        if(state.narratorId != 'nobody') {
            who = `character|${state.narratorId}`;
        } else {
            who = 'Valor';
        }
    }
    
    
    let param = { noarchive: noarchive };
    
    if(recipient) {
        sendChat(who, `/w "${recipient}" ${message}`, null, param);
    } else {
        sendChat(who, message, param);
    }
}

/* Main functionality */

function rollInitiative(confirm) {
    let rawTurnOrder = Campaign().get('turnorder');
    let turnOrder = rawTurnOrder ? JSON.parse(rawTurnOrder) : [];
    
    if(!confirm && turnOrder && turnOrder.length > 0) {
        // No --confirm, ask for verification
        sendValorMessage('You will lose all information currently on the Turn Tracker.<br>[Continue](!init --confirm)', {recipient: 'gm', noarchive: true});
        return;
    }
    
    log('Initiative roll commencing');
    
    turnOrder = [];
    
    // Get list of tokens
    let page = Campaign().get('playerpageid');
    let allTokens = findObjs({_type: 'graphic', _pageid: page});
    let actors = [];
    let tokens = [];
    let duplicateTokens = [];
    
    // Destroy existing Init Tokens
    for(i = 0; i < allTokens.length; i++) {
        if(allTokens[i].get('left') == -1000 && allTokens[i].get('top') == -1000) {
            log('Deleting old Init Token for ' + allTokens[i].get('name'));
            allTokens[i].remove();
            allTokens.splice(i, 1);
            i--;
        }
    }
    
    for(const token of allTokens) {
        let layer = token.get('layer');
        if(layer != "gmlayer" && layer != "objects") continue;
        
        let actorId = token.get('represents');
        let existingActor = actors.find(a => a.id == actorId && a.layer == layer);
        if(!existingActor) {
            log('Adding ' + token.get('name') + ' to init token list');
            actors.push({ id: actorId, layer: layer });
            tokens.push(token);
        } else {
            let duplicateToken = duplicateTokens.find(d => d.id == actorId && d.layer == layer);
            if(!duplicateToken) {
                log('Adding ' + token.get('name') + ' to duplicate token list');
                duplicateTokens.push({id: actorId, layer: layer});
                let oldToken = tokens.find(t => t.get('represents') == actorId);
                tokens.splice(tokens.indexOf(oldToken), 1);
            }
        }
    }
    
    // For duplicate character tokens, create an init-tracker token that the players can't see
    for(const token of duplicateTokens) {
        let oldToken = allTokens.find(t => t.get('represents') == token.id && t.get('layer') == token.layer);
        let newToken = createObj('graphic', {
            _pageid: oldToken.get('_pageid'),
            left: -1000,
            top: -1000,
            width: 70,
            height: 70,
            layer: oldToken.get('layer'),
            imgsrc: oldToken.get('imgsrc').replace('med.', 'thumb.'),
            name: oldToken.get('name'),
            showname: true,
            represents: oldToken.get('represents')
        });
        tokens.push(newToken);
    }

    // Split out tokens for which all tokens are hidden
    let hiddenTokens = tokens.filter(t => !actors.some(a => a.id == t.get('represents') && a.layer == "objects"));
    let visibleTokens = tokens.filter(t => actors.some(a => a.id == t.get('represents') && a.layer == "objects"));
    
    let message = '<table><tr><td>**ROLLING INITIATIVE**</td></tr>';
    let hiddenMessage = '';

    for(var token of visibleTokens) {
        if(token) {
            let actorId = token.get('represents');
            let actor = getObj('character', actorId);
            
            if(actor) {
                let initMod = getAttrByName(actorId, 'initiative');
                let init = initMod + randomInteger(10);
                let actorName = actor.get('name');
                turnOrder.push({
                    id: token.get('_id'),
                    pr: init,
                    custom: '',
                    _pageid: page
                });
                message += '<tr><td>' + actorName + ' - **' + init + '**</td></tr>';
            }
        }
    }
    message += '</table>';
    
    if(hiddenTokens.length > 0) {
        hiddenMessage = '<table><tr><td>**HIDDEN INITIATIVE**</td></tr>';
        for(var token of hiddenTokens) {
            if(token) {
                let actorId = token.get('represents');
                let actor = getObj('character', actorId);
                
                if(actor) {
                    let initMod = getAttrByName(actorId, 'initiative');
                    let init = initMod + randomInteger(10);
                    let actorName = actor.get('name');
                    turnOrder.push({
                        id: token.get('_id'),
                        pr: init,
                        custom: '',
                        _pageid: page
                    });
                    hiddenMessage += '<tr><td>' + actorName + ' - **' + init + '**</td></tr>';
                }
            }
        }
        hiddenMessage += '</table>';
    }
    
    turnOrder = turnOrder.sort(function(a, b) {
        return b.pr - a.pr;
    });
    
    turnOrder.push({
        id: "-1",
        pr: 1,
        custom: 'Round',
        formula: "1",
        _pageid: page
    });
    Campaign().set('turnorder', JSON.stringify(turnOrder));
    
    //state.techData = {};
    state.techHistory = [];
    state.lastActor = null;
    
    resetBonuses();
    
    sendValorMessage(message);
    if(hiddenMessage.length > 1) {
        sendValorMessage(hiddenMessage, {recipient: 'gm'});
    }
    
    if(state.confirmAutoInitiative) {
        sendValorMessage('Enable automatic initiative updating?' +
            '[Yes](!autoinit --on)' +
            '[No](!autoinit --off)', {recipient: 'gm', noarchive: true});
    }
}

function performRest(full) {
    // Find all characters 
    var characters = findObjs({ type: 'character' });
    
    for(const character of characters) {
        const id = character.get('_id');
        const skills = getSkills(id);
        
        updateValueForCharacter(id, 'health', full ? 1 : 0.2, true, false);
        updateValueForCharacter(id, 'stamina', full ? 1 : 0.2, true, false);
        
        if(skills.find(s => s.id == 'fastHealing')) {
            const di = parseInt(getAttrByName(id, 'damageincrement')) || 0;
            updateValueForCharacter(id, 'health', di, false, false);
        }
    }
    
    resetBonuses();
}

function resetBonuses() {
    let bonuses = filterObjs(obj => obj.get('_type') == 'attribute' && 
        resetAttributes.includes(obj.get('name')));
    for(const bonus of bonuses) {
        bonus.set('current', 0);
    }
    
    var characters = findObjs({ type: 'character' });
    for(const character of characters) {
        const id = character.get('_id');
        const level = getAttrByName(id, 'level');
        const skills = getSkills(id);
        
        let valor = 0;
        let bravado = skills.find(s => s.id == 'bravado');
        if(state.houseRulesEnabled) {
            valor = Math.ceil(level / 5) - 1;
            if(bravado) valor++;
        } else {
            valor += bravado.level;
        }
        
        let valorAttr = findObjs({
            _characterid: id,
            _type: 'attribute',
            _name: 'valor'
        });
        if(valorAttr && valorAttr.length > 0) {
            valorAttr[0].set('current', valor);
        }
    }
        
    let tempAttrs = filterObjs(o => o.get('_type') == 'attribute' && o.get('name').indexOf('temp') > -1);
    for(const tempAttr of tempAttrs) {
        tempAttr.remove();
    }
    
    state.narratorId = '';
}


function performTech(techId, actorId, targets, msg, bonus, override = false) {
    let actor = getTechUser(actorId);
    let tech = getTech(techId);
    
    let type = actor.type;
    tech.rawName = tech.name;
    let effects = getTechEffects(tech, actor);
    let coreData = coreLibrary.find(c => c.id == tech.core);
    
    let params = {
        reroll: tech.reroll == 'on',
        digdeep: tech.digdeep == 'on',
        overloadlimits: tech.overloadLimits == 'on'
    };
    
    let techQualifiers = [];
    let defenseButtons = [];
    
    if(tech.core == 'mimic' || tech.core == 'ultMimic') {
        let mimic = tech.mimictarget || '';
        
        // Find tech by name
        let attrs = filterObjs(function(obj) {
            return obj.get('_type') == 'attribute' &&
                obj.get('name').indexOf('tech') > -1 &&
                obj.get('name').indexOf('_name') > -1 &&
                obj.get('current').toLowerCase().trim() == mimic.toLowerCase().trim()
        });
        
        if(mimic.length == 0) {
            sendValorMessage("Please enter a technique to mimic.", {recipient: actor.name, noarchive: true});
            return;
        } else if(!attrs || attrs.length == 0) {
            sendValorMessage(`Can't find technique '${mimic}'.`, {recipient: actor.name, noarchive: true});
            return;
        } else {
            let targetTechId = attrs[0].get('name').split('_')[2];
            let targetActorId = attrs[0].get('_characterid');
            let targetTech = getTech(targetTechId);
            
            let targetCoreData = coreLibrary.find(c => c.id == targetTech.core);
            if(targetCoreData.ultimate && !coreData.ultimate) {
                sendValorMessage(`Only Ultimate Mimic Core can mimic ultimate techniques.`, {recipient: actor.name, noarchive: true});
                return;
            }
            
            targetTech.corepower = tech.level - targetTech.modlevel;
            if(targetTech.corepower < 1) {
                sendValorMessage(`Mimicry failed for tech '${mimic}'.`, {recipient: actor.name, noarchive: true});
                return;
            }
            targetTech.name = `${tech.name} [${targetTech.name}]`;
            effects = getTechEffects(targetTech, actor);
            targetTech.stat = tech.stat;
            tech = targetTech;
            
        }
    }
    
    let costs = {};
    let turnOrder = null;
    
    // Can we do the tech?
    let skipLimits = false;
    if(override) skipLimits = true;
    if(params.overloadlimits) skipLimits = true;
    if(state.ignoreLimitsOnMinions && (type == 'soldier' || type == 'flunky' || type == 'swarm')) skipLimits = true;
    
    let error = '';
    if(!skipLimits) {
        let techHistory = state.techHistory.filter(h => h.id == tech.id);
        let lastUsage = (techHistory && techHistory.length > 0) ? techHistory[0] : null;
        let round = getRound();
        
        if(coreData.ultimate && !tech.mods.find(m => m.id)) {
            error += 'Already used. ';
        }
        
        if(parseInt(actor.stamina) < parseInt(tech.cost)) {
            error = 'Not enough stamina. ';
        }
        
        for(var limit of tech.limits) {
            let limitData = limitLibrary.find(l => l.id == limit.id);
            if(limitData) {
                switch(limitData.id) {
                    case 'valor':
                        if(actor.valor < limit.level) {
                            error += 'Not enough valor. ';
                        }
                        break;
                    case 'valorconsumption':
                        costs.valor = limit.level;
                        break;
                    case 'cooldown':
                        if(lastUsage && round < lastUsage.round + limit.level + 1) {
                            error += 'Still on cooldown. ';
                        }
                        break;
                    case 'ammo':
                        let ammoCap = 4 - limit.level;
                        let ammoUsed = techHistory ? techHistory.length : 0;
                        if(ammoUsed >= ammoCap) {
                            error += 'Out of ammo. ';
                        }
                        break;
                    case 'health':
                        costs.hp = limit.level * 5;
                        break;
                    case 'ultimatehealth':
                        costs.hp = Math.ceil(actor.health_max / 5);
                        break;
                    case 'initiative':
                        costs.init = limit.level;
                        // Find us on the turn order
                        if(!state.techHistory) {
                            state.techHistory = [];
                        }
                        
                        let rawTurnOrder = Campaign().get('turnorder');
                        turnOrder = rawTurnOrder ? JSON.parse(rawTurnOrder) : [];
                        if(turnOrder) {
                            for(var t of turnOrder) {
                                let tokenId = t.id;
                                let token = getObj('graphic', tokenId);
                                if(token && token.get('represents') == actorId) {
                                    if(t.pr < limit.level) {
                                        error += 'Not enough initiative. ';
                                        break;
                                    }
                                }
                            }
                        }
                        break;
                    case 'injury':
                        let hpLimit = Math.ceil(actor.health_max * (5 - limit.level) / 5 );
                        if(actor.health > hpLimit) {
                            error += `HP must be ${hpLimit} or less to use. `;
                        }
                        break;
                    case 'vitality':
                        let vitalityPoint = Math.ceil(actor.health_max * 0.4 );
                        if(actor.health <= vitalityPoint) {
                            error += `HP must be over ${vitalityPoint} to use. `;
                        }
                        break;
                    case 'setup':
                        if(round < limit.level + 1) {
                            error += `Can't use until round ${limit.level + 1}. `;
                        }
                        break;
                    case 'ultimatevalor':
                        costs.valor = limit.level;
                        if(actor.valor < limit.level) {
                            error += 'Not enough valor. ';
                        }
                        break;
                }
            }
        }
    }
    
    if(error) {
        let overrideButton = `[Override](${msg} --override 1)`;
        let cleanButton = overrideButton.replace(/\"/g, '&#' + '34;');
        error += cleanButton;
        sendValorMessage(error, {recipient: actor.name, noarchive: true});
        return;
    }
    
    let skills = getSkills(actorId);
    let flaws = getSkills(actorId);
    let eAtt = skills.find(s => s.id == 'elementalAttunement');
    if(eAtt && eAtt.detail) {
        tech.element = eAtt.detail;
    }
    
    if(params.digdeep) {
        techQualifiers.push('Dig Deep');
    }
    
    if(params.overloadlimits) {
        techQualifiers.push('Overload Limits');
    }
    
    if(params.reroll) {
        techQualifiers.push('Reroll');
    } else {
        // Identify and pay costs
        costs.st = tech.cost;
        if(params.digdeep) {
            costs.hp = (costs.hp || 0) + costs.st * 5;
            costs.st = 0;
        }
        if(params.overloadlimits) {
            costs.st += parseInt(tech.limitstamina) || 0;
        }
        if(costs.st) {
            updateValueForCharacter(actorId, 'stamina', -costs.st, 0, false);
        }
        if(costs.hp) {
            updateValueForCharacter(actorId, 'health', -costs.hp, 0, false);
        }
        if(costs.valor) {
            updateValueForCharacter(actorId, 'valor', -costs.valor, 0, false);
        }
        if(costs.init) {
            if(turnOrder) {
                for(var t of turnOrder) {
                    let tokenId = t.id;
                    let token = getObj('graphic', tokenId);
                    if(token && token.get('represents') == actorId) {
                        t.pr -= costs.init;
                        break;
                    }
                }
                Campaign().set('turnorder', JSON.stringify(turnOrder));
            }
            
        }
    }

    let activeStat = '';
    switch(tech.stat) {
        case 'strength':
            activeStat = 'muscle';
            break;
        case 'agility':
            activeStat = 'dexterity';
            break;
        case 'spirit':
            activeStat = 'aura';
            break;
        case 'mind':
            activeStat = 'intuition';
            break;
        case 'guts':
            activeStat = 'resolve';
            break;
    }
    
    let regen = false;
    let modSummary = '';
    for(const mod of tech.mods) {
        let modData = modLibrary.find(m => mod.id == m.id);
        if(modData) {
            if(state.verboseTechniques || modData.tags.includes('important')) {
                if(modSummary.length > 0) modSummary += ', ';
                let modName = mod.level == 1 ? modData.name : `${modData.name} ${mod.level}`;
                modSummary += modName;
            }
            
            switch(modData.id) {
                case 'muscularstrike':
                    activeStat = 'muscule';
                    break;
                case 'dexterousstrike':
                    activeStat = 'dexterity';
                    break;
                case 'aurastrike':
                    activeStat = 'aura';
                    break;
                case 'intuitivestrike':
                    activeStat = 'intuition';
                    break;
                case 'continuousrecovery':
                    regen = true;
                    break;
            }
        }
    }
    
    if(!activeStat && coreData.needsStat) {
        sendValorMessage("Specify a stat for this technique.", {recipient: actor.name, noarchive: true});
        return;
    }
    
    if(tech.element)
        modSummary += `${tech.element} Element`;
    
    let summary = `*${modSummary}*`;
    
    let rollValue = parseInt(actor[activeStat]) || 0;
    let rollBonus = 0;
    if(tech.mods.find(m => m.id == 'accurate')) {
        rollBonus += 2;
    }
    rollBonus += parseInt(actor.adjustaccuracy) || 0;
    rollBonus += parseInt(actor.attackrollbonus) || 0
    
    rollBonus += bonus;
    
    let lines = [];
    let hiddenLines = [];
    
    let header = '';
    if(effects.requiresRoll) {
        header = rollBonus ? `Rolling ${capitalize(activeStat)}${bonusDisplay(rollBonus)}`
            : `Rolling ${capitalize(activeStat)}`;
        if(!state.rollBehindScreen) header += ':';
    } else if(targets.length > 1) {
        header = 'Targets ';
    } else if(targets.length == 1) {
        header = 'Target ';
    }
    
    let crisis = skills.find(s => s.id == 'crisis');
    if(crisis) {
        let hpRatio = actor.health / actor.health_max;
        if(hpRatio <= 0.4) {
            techQualifiers.push('Crisis');
            effects.damage += (crisis.level + 1) * 3;
        }
    }
    
    let berserker = flaws.find(s => s.id == 'berserker');
    if(berserker) {
        let hpRatio = actor.health / actor.health_max;
        if(hpRatio <= 0.4) {
            techQualifiers.push('Berserker');
            effects.damage += 10;
        }
    }
    
    if(techQualifiers.length > 0) {
        tech.name += ` (${techQualifiers.join(', ')})`;
    }
    
    let noTargets = true;
    for(var targetId of targets) {
        if(targetId == 'self') {
            let page = Campaign().get('playerpageid');
            let tokens = findObjs({
                _type: 'graphic',
                _represents: actorId, 
                _pageid: page
            });
            if(tokens && tokens.length > 0) {
                targetId = tokens[0].get('_id');
            } else {
                continue;
            }
        }
        
        target = getTechTarget(targetId);
        if(!target) continue;
        noTargets = false;
        
        let line = '';
        let hiddenLine = '';
        
        if(effects.requiresRoll) {
            if(state.rollBehindScreen) {
                if(state.hideNpcTechEffects) {
                    line += `VS ${target.name}`;
                    hiddenLine += `VS ${target.name}: [[1d10+${rollValue}${bonusDisplay(rollBonus)}]]`;
                } else {
                    line += `VS ${target.name}: `;
                    hiddenLine += `VS ${target.name}: [[1d10+${rollValue}${bonusDisplay(rollBonus)}]]`;
                }
            } else {
                if(state.hideNpcTechEffects) {
                    line += `VS ${target.name}: [[1d10+${rollValue}${bonusDisplay(rollBonus)}]]`;
                    hiddenLine += `VS ${target.name}: `;
                } else {
                    line += `VS ${target.name}: [[1d10+${rollValue}${bonusDisplay(rollBonus)}]]`;
                }
            }
            
            if(state.sendDefenseButtons) {
                var index = defenseButtons.findIndex(b => b.id == target.id);
                
                if(index > -1) {
                    defenseButtons[index].count++;
                } else {
                    // Get target's active attributes
                    let highest = 0;
                    const targetMuscle = getAttrByName(target.id, 'muscle');
                    if(targetMuscle > highest) highest = targetMuscle;
                    const targetDexterity = getAttrByName(target.id, 'dexterity');
                    if(targetDexterity > highest) highest = targetDexterity;
                    const targetAura = getAttrByName(target.id, 'aura');
                    if(targetAura > highest) highest = targetAura;
                    const targetIntuition = getAttrByName(target.id, 'intuition');
                    if(targetIntuition > highest) highest = targetIntuition;
                    const targetResolve = getAttrByName(target.id, 'resolve');
                    if(targetResolve > highest) highest = targetResolve;
                    
                    let text = `${target.name}, Defend:<br>`;
                    let escapedTech = escape(tech.rawName);
                    
                    if(targetMuscle == highest) {
                        text += ` <a href="!d-roll ${actorId} ${target.id} &${escapedTech}& muscle {0}">Muscle</a>`;
                    }
                    if(targetDexterity == highest) {
                        text += ` <a href="!d-roll ${actorId} ${target.id} &${escapedTech}& dexterity {0}">Dexterity</a>`;
                    }
                    if(targetAura == highest) {
                        text += ` <a href="!d-roll ${actorId} ${target.id} &${escapedTech}& aura {0}">Aura</a>`;
                    }
                    if(targetIntuition == highest) {
                        text += ` <a href="!d-roll ${actorId} ${target.id} &${escapedTech}& intuition {0}">Intuition</a>`;
                    }
                    if(targetResolve == highest) {
                        const valor = parseInt(getAttrByName(target.id, 'valor')) || 0;
                        let valorMax = parseInt(getAttrByName(actorId, 'valor', 'max')) || 0;
                        if(valor >= 2 || valorMax == 0) {
                            text += ` <a href="!d-roll ${actorId} ${target.id} ${escapedTech} resolve {0}">Resolve</a>`;
                        }
                    }
                    
                    defenseButtons.push({id: target.id, name: target.name, text: text, count: 1});
                }
            }
        } else {
            if(header.length > 8) header += ', ';
            header += target.name;
        }
        
        let techEffects = [];
        let targetDR = 0;
        
        if(effects.damage) {
            let damage = effects.damage;
            let elementalEffect = '';
            
            let targetFlaws = getFlaws(target.id);
            let targetSkills = getSkills(target.id);
            
            if(tech.element) {
                let element = tech.element.trim().toLowerCase();
                let targetSkills = getSkills(target.id);
                let eVuln = targetFlaws.find(f => f.id == 'elementalVulnerability');
                if(eVuln && eVuln.detail.trim().toLowerCase() == element) {
                    elementalEffect = ' (Vulnerable)';
                    damage += eVuln.level * 4 + 2;
                }
                let eRes = targetSkills.find(s => s.id == 'elementalResistance');
                if(eRes && eRes.detail.trim().toLowerCase() == element) {
                    elementalEffect = ' (Resist)';
                    targetDR += eRes.level * 4 + 2;
                }
            }
            
            if(effects.damageType == 'physical') 
                targetDR += (parseInt(target.defense) || 0) + (parseInt(target.defensebonus) || 0);
            else if(effects.damageType == 'energy')
                targetDR += (parseInt(target.resistance) || 0) + (parseInt(target.resistancebonus) || 0);
            
            let targetBerserker = targetFlaws.find(f => f.id == 'berserker');
            if(targetBerserker) {
                let hpRatio = (parseInt(target.health) || 1) / (parseInt(target.health_max) || 1);
                if(hpRatio <= 0.4) {
                    targetDR = Math.max(targetDR - 10, 0);
                }
            }
            
            let finalDamage = Math.max(damage - targetDR, 0);
            techEffects.push(`Damage [[{${damage}-${targetDR},0}kh1]]${elementalEffect}`);
            
            if(tech.mods.find(m => m.id == 'sapping')) {
                if(finalDamage > 0) {
                    let ongoing = Math.ceil(finalDamage / 3);
                    techEffects.push(`Ongoing ${ongoing}`);
                }
            }
            
            let repo = tech.mods.find(m => m.id == 'reposition');
            if(repo) {
                let distance = repo.level + 1;
                if(tech.stat == 'strength') distance++;
                let targetUnmo = targetSkills.find(s => s.id == 'unmovable');
                if(targetUnmo) distance = Math.max(distance - targetUnmo.level * 2, 0);
                techEffects.push(`Reposition ${distance}`);
            }
        }
        
        if(state.autoResolveTechBenefits) {
            if(effects.healing) {
                updateValue(targetId, 'health', effects.healing);
                
                if(regen) {
                    let turnOrder = JSON.parse(Campaign().get('turnorder'));
                    result = addEffect(turnOrder, targetId, `Regen ${effects.healing}`, 2);
                }
            }
            
            if(effects.shield) {
                let shieldAttrName = `${effects.shieldType}shield`;
                let shieldAttrs = findObjs({
                    _characterid: target.id,
                    _type: 'attribute',
                    name: shieldAttrName
                });
                if(shieldAttrs && shieldAttrs.length > 0) {
                    shieldAttr = shieldAttrs[0];
                    let currentValue = parseInt(shieldAttr.get('current')) || 0;
                    if(effects.shield > shieldAttr) {
                        shieldAttr.set('current', effects.shield);
                    }
                } else {
                    let obj = createObj("attribute", {
                        name: shieldAttrName,
                        current: effects.shield,
                        characterid: target.id
                    });
                }
            }
            
            if(effects.skills) {
                let skillList = effects.skills.split(',').map(s => s.trim());
                let tempSkills = getSkills(target.id, true);
                let uniqueRowIds = [];
                for(var skillName of skillList) {
                    let skillSplit = skillName.split(' ');
                    let skillLevel = parseInt(skillSplit[skillSplit.length - 1]) || 0;
                    
                    if(skillLevel) {
                        skillName = skillSplit.slice(0, skillSplit.length - 1).join(' ');
                    } else {
                        skillLevel = 1;
                    }
    
                    let skillData = skillLibrary.find(s => skillName.toLowerCase().match(s.namePattern));
                    if(skillData) {
                        let tempSkill = tempSkills.find(ts => ts.id == skillData.id);
                        if(tempSkill) {
                            let skillLevelAttrs = findObjs({
                                _characterid: target.id,
                                _type: 'attribute',
                                name: `repeating_tempskill_${tempSkill.rowId}_level`
                            });
                            if(skillLevelAttrs && skillLevelAttrs.length > 0) {
                                let skillLevelAttr = skillLevelAttrs[0];
                                let oldLevel = parseInt(skillLevelAttr.get('current'));
                                if(oldLevel < skillLevel) {
                                    skillLevelAttr.set('current', skillLevel);
                                }
                            } else if(skillLevel > 1) {
                                createObj("attribute", {
                                    name: `repeating_tempskill_${tempSkill.rowId}_level`,
                                    current: skillLevel,
                                    characterid: target.id,
                                });
                            }
                        } else {
                            let rowId = generateRowID();
                            while(uniqueRowIds.includes(rowId)) {
                                rowId = generateRowID();
                            }
                            uniqueRowIds.push(rowId);
                            
                            createObj("attribute", {
                                name: `repeating_tempskill_${rowId}_id`,
                                current: skillData.id,
                                characterid: target.id,
                            });
                            createObj("attribute", {
                                name: `repeating_tempskill_${rowId}_level`,
                                current: skillLevel,
                                characterid: target.id,
                            });
                        }
                    }
                }
            }
            
            if(tech.core == 'ultTransform') {
                let rollBonusAttrs = findObjs({
                    _characterid: target.id,
                    _type: 'attribute',
                    name: 'rollbonus'
                });
                
                if(rollBonusAttrs && rollBonusAttrs.length > 0) {
                    rollBonusAttr = rollBonusAttrs[0];
                    let currentValue = parseInt(rollBonusAttr.get('current')) || 0;
                    rollBonusAttr.set('current', currentValue + 1);
                } else {
                    let obj = createObj("attribute", {
                        name: 'rollbonus',
                        current: 1,
                        characterid: target.id
                    });
                }
            }
        }

        if(state.applyAttackResults) {
            let applyCommand = `!tech-apply ${targetId} ${techId}`;
            
            if(effects.damage) {
                // Create the Hit button
                let hitDamagePhrase = `${Math.max(effects.damage, 0)} ${effects.damageType}`;
                let critDamagePhrase = ` ${effects.damageType}`;
                let diDamagePhrase = `${parseInt(actor.damageincrement) || 0} ${effects.damageType}`;
                
                hiddenLine += ` <a href="${applyCommand}" style="padding:3px">Hit</a>`;
                hiddenLine += ` <a href="${applyCommand} ${Math.max(effects.crit, 0)}" style="padding:3px">Crit</a>`;
                hiddenLine += ` <a href="${applyCommand} ${parseInt(actor.damageincrement) || 0} di" style="padding:3px">DI</a>`;
            } else if(effects.flaws) {
                hiddenLine += ` <a href="${applyCommand}" style="padding:3px">Apply</a>`;
            }
        }
        
        if(techEffects.length > 0) {
            if(state.hideNpcTechEffects) {
                if(hiddenLine.indexOf(']]') > -1) hiddenLine += ', ';
                hiddenLine += techEffects.join(', ')
            } else {
                if(line.indexOf(']]') > -1) line += ', ';
                line += techEffects.join(', ');
            }
        }
        
        if(line) lines.push(line);
        if(hiddenLine) hiddenLines.push(hiddenLine);
    }
    
    if(noTargets) {
        // Display generic info
        let line = '';
        let hiddenLine = '';
        if(effects.requiresRoll) {
            if(state.rollBehindScreen) {
                hiddenLine = `[[1d10+${rollValue}${bonusDisplay(rollBonus)}]]`;
            } else {
                header += ` [[1d10+${rollValue}${bonusDisplay(rollBonus)}]]`;
            }
            
            let effectLine = '';
            if(effects.damage) {
                effectLine += `Damage <b>${effects.damage}</b>`;
                switch(effects.damageType) {
                    case 'physical':
                        effectLine += ' - Defense';
                        break;
                    case 'energy':
                        effect += ' - Resistance';
                        break;
                }
            }
            
            if(state.hideNpcTechEffects) {
                if(hiddenLine.length > 0) hiddenLine += '<br />';
                hiddenLine += effectLine;
            } else {
                line = effectLine;
            }
        }
        
        if(line) lines.push(line);
        if(hiddenLine) hiddenLines.push(hiddenLine);
    }
    
    if(header) {
        lines.unshift(header);
    }
    
    if(effects.healing) {
        if(state.hideNpcTechEffects) hiddenLines.push(`HP +<span style="color:darkgreen">**${effects.healing}**</span>`);
        else lines.push(`HP +<span style="color:darkgreen">**${effects.healing}**</span>`);
    }
    
    if(effects.shield) {
        if(state.hideNpcTechEffects) hiddenLines.push(`Grants ${effects.shieldType} shield with <span style="color:darkblue">**${effects.shield}**</span> HP`);
        else lines.push(`Grants ${effects.shieldType} shield with <span style="color:darkblue">**${effects.shield}**</span> HP`);
    }
    
    if(effects.skills) {
        if(state.hideNpcTechEffects) hiddenLines.push(`Skills: ${effects.skills}`);
        else lines.push(`Skills: ${effects.skills}`);
    }
    
    if(effects.flaws) {
        if(state.hideNpcTechEffects) hiddenLines.push(`Flaws: ${effects.flaws}`);
        else lines.push(`Flaws: ${effects.flaws}`);
    }
    
    if(effects.other) {
        if(state.hideNpcTechEffects) hiddenLines.push(`${effects.other}`);
        else hiddenLines.push(`${effects.other}`);
    }
    
    let template = 'valor';
    if(tech.core.indexOf('ult') > -1) {
        template = 'valor-ult';
    }
    
    if(!params.reroll) {
        // Record tech usage
        recordTech(tech, actorId, costs, effects);
    }
    
    if(params.reroll) {
        log('Reroll was enabled.');
        let techAttrs = filterObjs(function(obj) {
            if(obj.get('_type') == 'attribute' &&
               obj.get('name').indexOf(tech.id) > -1 &&
               obj.get('name').indexOf('reroll') > -1 &&
               obj.get('name').toLowerCase().indexOf('hasreroll') == -1) {
                   return true;
            }
            return false;
        });
        if(techAttrs && techAttrs.length > 0) {
            let reroll = techAttrs[0];
            reroll.set('current', '0');
        }
    }
    
    if(params.digdeep) {
        log('Dig Deep was enabled.');
        let techAttrs = filterObjs(function(obj) {
            if(obj.get('_type') == 'attribute' &&
               obj.get('name').indexOf(tech.id) > -1 &&
               obj.get('name').toLowerCase().indexOf('digdeep') > -1 &&
               obj.get('name').toLowerCase().indexOf('hasdigdeep') == -1) {
                   return true;
            }
            return false;
        });
        if(techAttrs && techAttrs.length > 0) {
            let reroll = techAttrs[0];
            reroll.set('current', '0');
        }
    }
    
    if(params.overloadlimits) {
        log('Overload Limits was enabled.');
        let techAttrs = filterObjs(function(obj) {
            if(obj.get('_type') == 'attribute' &&
               obj.get('name').indexOf(tech.id) > -1 &&
               obj.get('name').toLowerCase().indexOf('overloadlimits') > -1 &&
               obj.get('name').toLowerCase().indexOf('hasoverloadlimits') == -1) {
                   return true;
            }
            return false;
        });
        if(techAttrs && techAttrs.length > 0) {
            let reroll = techAttrs[0];
            reroll.set('current', '0');
        }
    }
    
    if(hiddenLines.length > 0) {
        let hiddenCommand = hiddenLines.join('<br/>');
        sendValorMessage(hiddenCommand, {actor: actorId, recipient: 'gm'});
    }
    let command = `&{template:${template}} {{name=${tech.name}}} {{roll=${lines.join('<br/>')}}} {{summary=${summary}}}`;
    sendValorMessage(command, {actor: actorId});
    
    if(state.sendDefenseButtons) {
        defenseButtons.forEach(function(button) {
            var text = button.text;
            text = text.replaceAll('{0}', button.count);
            sendValorMessage(text, {recipient: button.name, noarchive: true});
        });
    }
}

function recordTech(tech, actorId, costs, effects) {
    let round = getRound();
    
    state.techHistory.unshift({id: tech.id, user: actorId, round: round, cost: costs, effects: effects});
    if(state.techHistory.length > 20) state.techHistory = state.techHistory.slice(0, 20);
}

// Ongoing Effect Processor
// Add a label under someone to apply an effect to them each time their turn ends.
// "Ongoing X" - lose X HP
// "Regen X" - gain X HP
// "SRegen X" - gain X ST
function processOngoingEffects(turnOrder) {
    if(!state.ongoingEffectProcessor) {
        // Settings check
        return;
    }
    
    if(!turnOrder || turnOrder.length === 0) {
        // Do nothing if the init tracker is empty
        return;
    }
    
    let effectChar = turnOrder[turnOrder.length - 1];
    if(!effectChar || (effectChar.custom.indexOf('Ongoing') == -1 && 
        effectChar.custom.indexOf('Regen') == -1 &&
        effectChar.custom.indexOf('SRegen') == -1)) {
        // Do nothing if the top label isn't Ongoing, Regen or SRegen
        return;
    }
    
    // Scan backwards for the character this condition applies to
    let i = turnOrder.length - 2;
    let lastCharId = turnOrder[i] ? turnOrder[i].id : null;
    let lastChar = lastCharId ? getObj('graphic', lastCharId) : null;
    while(!lastChar) {
        i--;
        if(i == 0) {
            // We didn't find anyone - abort
            return;
        }
        let lastCharId = turnOrder[i] ? turnOrder[i].id : null;
        if(lastCharId) {
            lastChar = getObj('graphic', lastCharId);
        }
    }
    
    lastCharId = lastChar.get('_id')
    
    // Update HP or ST
    let parts = effectChar.custom.split(' ');
    let value = parseInt(parts[1]);
    let actor = getObj('character', lastChar.get('represents'));
    let name = lastChar.get('name');
    if(actor) {
        name = actor.get('name');
    }
    
    if(value == value) {
        if(parts[0] === 'Ongoing') {
            updateValue(lastCharId, 'health', -value);
            sendValorMessage(`${name} took ${value} ongoing damage.`);
        } else if(parts[0] === 'Regen') {
            updateValue(lastCharId, 'health', value);
            sendValorMessage(`${name} recovered ${value} health.`);
        } else if(parts[0] === 'SRegen') {
            updateValue(lastCharId, 'stamina', value);
            sendValorMessage(`${name} recovered ${value} stamina.`);
        }
    }
}


function criticalHealthWarning(obj, oldHp) {
    var newHp = parseInt(obj.get('bar1_value'));
    var maxHp = parseInt(obj.get('bar1_max'));
    
    if(oldHp == oldHp && newHp == newHp && maxHp == maxHp && oldHp != newHp) {
        var critical = Math.ceil(maxHp * 0.4);
        var message;
        if(oldHp > critical && newHp <= critical) {
            message = ' is now at critical health.';
        } else if (oldHp <= critical && newHp > critical) {
            message = ' is no longer at critical health.';
        }
        if(message) {
            // Message character
            let controlledBy;
            let name;
            
            let charId = obj.get('represents');
            if(charId) {
                let actor = getObj('character',charId);
                controlledBy = actor.get('controlledby');
                name = actor.get('name');
            } else {
                name = obj.get('name');
            }
            
            let whisperTo = 'gm';
            
            if(controlledBy && controlledBy != '') {
                whisperTo = name;
            }
            
            if(name) {
                sendValorMessage(`${name} ${message}`, {recipient: whisperTo, noarchive: true});
            }
        }
    }
}

function getNextUp(turnOrder, character) {
    let id = turnOrder.indexOf(character);
    if(id == -1) {
        id = turnOrder.length - 1;
    } else {
        id--;
    }
    
    while(id > -1) {
        const nextChar = turnOrder[id];
        if(nextChar.id == '-1') {
            if(nextChar.custom == 'Round') {
                // We made it to the top of the round
                return null;
            }
        } else {
            return nextChar;
        }
        id--;
    }
}

function updateInitiative(turnOrder) {
    if((!state.autoInitiativeUpdate && !state.autoInitiativeReport) ||
        (state.confirmAutoInitiative && !state.autoInitiativeForScene)) {
        return;
    }
    
    if(!turnOrder || turnOrder.length == 0 || turnOrder[0].id == '-1') {
        return;
    }
    
    let last = getNextUp(turnOrder, null);
    let nextToLast = getNextUp(turnOrder, last);
    let initiativeJumps = 0;
    
    while(nextToLast && parseInt(last.pr) > parseInt(nextToLast.pr)) {
        // Swap nextToLast and last in the turnOrder, along with all their statuses
        initiativeJumps++;
        const lastIndex = turnOrder.indexOf(last);
        let lastEffects = 0;
        while(lastIndex + lastEffects + 1 < turnOrder.length &&
            turnOrder[lastIndex + lastEffects + 1].id == '-1' &&
            turnOrder[lastIndex + lastEffects + 1].custom != 'Round') {
            lastEffects++;
        }
        const nextToLastIndex = turnOrder.indexOf(nextToLast);
        let nextToLastEffects = 0;
        while(nextToLastIndex + nextToLastEffects + 1 < turnOrder.length &&
            turnOrder[nextToLastIndex + nextToLastEffects + 1].id == '-1' &&
            turnOrder[nextToLastIndex + nextToLastEffects + 1].custom != 'Round') {
            nextToLastEffects++;
        }
        
        turnOrder = turnOrder.slice(0, nextToLastIndex)
            .concat(turnOrder.slice(lastIndex, lastIndex + lastEffects + 1))
            .concat(turnOrder.slice(nextToLastIndex, nextToLastIndex + nextToLastEffects + 1))
            .concat(turnOrder.slice(lastIndex + lastEffects + 1));
        nextToLast = getNextUp(turnOrder, last);
    }
    
    if(initiativeJumps > 0) {
        // Initiative was updated!
        if(state.autoInitiativeUpdate) {
            Campaign().set('turnorder', JSON.stringify(turnOrder));
        }
        if(state.autoInitiativeReport) {
            const token = getObj('graphic', last.id);
            actor = getObj('character', token.get('represents'));
            let name = actor ? actor.get('name') : token.get('name');
            if(!name) name == last.custom;
            
            if(name) {
                sendChat('Valor', `/w gm ${name} advanced by ${initiativeJumps} ${initiativeJumps == 1 ? 'position' : 'positions'} in the initiative order.`);
            } else {
                sendChat('Valor', `/w gm Someone advanced by ${initiativeJumps} ${initiativeJumps == 1 ? 'position' : 'positions'} in the initiative order.`);
            }
        }
    }
}

function mimicTech(actorId, techId, mimic) {
    let mimicSummary = '';
    if(!mimic) mimic = '';
    let mimicTech = getTech(techId);

    // Find tech by name
    let attrs = filterObjs(function(obj) {
        return obj.get('_type') == 'attribute' &&
            obj.get('name').indexOf('tech') > -1 &&
            obj.get('name').indexOf('_name') > -1 &&
            obj.get('current').toLowerCase().trim() == mimic.toLowerCase().trim()
    });
    
    if(mimic.length == 0) {
        mimicSummary = ' ';
    } else if(!attrs || attrs.length == 0) {
        mimicSummary = "Couldn't find a technique by that name.";
    } else {
        let targetTechId = attrs[0].get('name').split('_')[2];
        let targetActorId = attrs[0].get('_characterid');
        let targetTech = getTech(targetTechId);
        let mimicTech = getTech(techId);
        
        let coreData = coreLibrary.find(c => c.id == mimicTech.core);
        
        mimicSummary = getTechSummary(actorId, targetActorId, targetTechId, parseInt(mimicTech.corepower) || 1, mimicTech.stat, coreData.ultimate);
        if(!mimicSummary) {
            mimicSummary = "You can't mimic this technique.";
        }
    }
    
    let summaryAttr = findObjs({
        _characterid: actorId,
        _type: 'attribute',
        name: `repeating_tech_${techId}_mimicsummary`
    });
    
    if(summaryAttr && summaryAttr.length > 0) {
        summaryAttr[0].set('current', mimicSummary);
    } else {
        let obj = createObj("attribute", {
            name: `repeating_tech_${techId}_mimicsummary`,
            current: mimicSummary,
            characterid: actorId
        });
    }
}

function getTechSummary(actorId, targetActorId, techId, techLevel, techStat, ultimate = false) {
    let targetTech = getTech(techId);
    
    let corepower = techLevel - targetTech.modlevel;
    
    if(corepower < 1) {
        return null;
    }
    
    let core = targetTech.core;
    if(core == 'mimic' || core == 'ultMimic') {
        return null;
    }
    
    let targetCoreData = coreLibrary.find(c => c.id == targetTech.core);
    if(targetCoreData.ultimate && !ultimate) {
        return null;
    }
    
    let rollStat = targetTech.stat;
    let skills = targetTech.skills;
    let flaws = targetTech.flaws;
    let mods = targetTech.mods;
    let limits = targetTech.limits;
    
    let hp = parseInt(getAttrByName(actorId, 'health', 'max')) || 1;
    let di = parseInt(getAttrByName(actorId, 'damageincrement')) || 1;
    let level = parseInt(getAttrByName(actorId, 'level')) || 1;
    let type = getAttrByName(actorId, 'level');
    
    let stcost = 0;
    let hpcost = 0;
    let valorcost = 0;
    let modLevels = 0;
    let limitSt = 0;

    let coreQuickSummary = '';
    let modQuickSummary = '';
    let limitQuickSummary = '';
    
    let coreData = coreLibrary.find(c => c.id == core);
    
    let rollStatActive = '';
    let requiresRoll = false;
    let damage = 0;
    let damageType = 'physical';
    let shield = 0;
    let shieldType = '';
    let healing = 0;
    let domainRadius = 0;
    
    switch(core) {
        case 'damage':
            requiresRoll = true;
            damage = corepower * 5 + 15;
            damage += parseInt(getAttrByName(actorId, `${rollStat}attack`)) || 0;
            damageType = 'physical';
            if(rollStat == 'mind' || rollStat == 'spirit') damageType == 'energy';
            break;
        case 'healing':
            healing = corepower * 3 + 9;
            healing += Math.ceil((parseInt(getAttrByName(actorId, rollStat)) || 0) / 2);
            break;
        case 'shield':
            shield = corepower * 4 + 12;
            shield += parseInt(getAttrByName(actorId, rollStat)) || 0;
            break;
        case 'boost':
            skillSPMax = corepower * 2;
            break;
        case 'barrier':
        case 'summoning':
            targetMode = 'self';
            break;
        case 'weaken':
            flawSPMax = corepower;
            break;
        case 'mimic':
        case 'ultMimic':
            isMimic = true;
            break;
        case 'ultDamage':
            requiresRoll = true;
            damage = corepower * 8 + 24;
            damage += parseInt(getAttrByName(actorId, `${rollStat}attack`)) || 0;
            damageType = 'physical';
            if(rollStat == 'mind' || rollStat == 'spirit') damageType == 'energy';
            break;
        case 'ultTransform':
            targetMode = 'self';
            healing = level * 10;
            break;
        case 'ultDomain':
            targetMode = 'self';
            domainRadius = Math.ceil(level / 5);
            break;
    }
    
    let rollBonus = 0;
    if(requiresRoll) {
        switch(techStat) {
            case 'strength':
                rollStatActive = 'Muscle';
                break;
            case 'agility':
                rollStatActive = 'Dexterity';
                break;
            case 'spirit':
                rollStatActive = 'Aura';
                break;
            case 'mind':
                rollStatActive = 'Intuition';
                break;
            case 'guts':
                rollStatActive = 'Resolve';
                break;
        }
        rollBonus = parseInt(getAttrByName(actorId, rollStatActive)) || 0;
    }
    
    // Mods
    for(let mod of mods) {
        let modId = mod.id;
        let modLevel = mod.level;
        
        const modData = modLibrary.find(m => m.id == modId);
        
        if(modData) {
            let modBaseCost = modData.cost;
            let modLevelUp = modData.levelUp;
            let modTags = modData.tags;
            let modQuickText = modData.quickdescription;
            let modStatData = modData[rollStat];
            let modName = modData.name;
            
            if(modStatData) {
                if(typeof modStatData.cost === "number") modBaseCost = modStatData.cost;
                if(modStatData.levelUp) modLevelUp = modStatData.levelUp;
                if(modStatData.quickdescription) modQuickText = modStatData.quickdescription;
            }
            
            if(modQuickText) {
                modQuickText = parseText(modQuickText, [
                    { name: 'ml', value: modLevel },
                    { name: 'di', value: di },
                ]);
            } else {
                modText = '';
                modQuickText = '';
            }
            
            switch(modData.id) {
                case 'damageshift':
                    modQuickSummary += 'Damage shift. ';
                    break;
                case 'continuousrecovery':
                    healing = corepower * 2 + 6;
                    healing += Math.ceil((parseInt(getAttrByName(actorId, rollStat)) || 0) / 2);
                    break;
                case 'transformally':
                    targetMode = 'single';
                    break;
            }
            
            if(modData.id == 'accurate') {
                rollBonus += 2;
            }
            
            if(modTags.includes('special')) {
                damage = corepower * 4 + 8;
                damage += Math.ceil((parseInt(getAttrByName(actorId, `${rollStat}attack`)) || 0) / 2);
            }
            
            if(modTags.includes('reroll')) {
                hasReroll = true;
            }
            
            if(modTags.includes('flaws')) {
                hasFlaws = true;
                flawSPMax = corepower;
            }
            
            if(modTags.includes('multitarget')) {
                if(core != 'barrier') {
                    targetMode = 'multi';
                }
            }
            
            let modCost = modBaseCost + modLevelUp * (modLevel - 1);
            
            modQuickSummary += modQuickText;
            modLevels += modCost;
        }
    }
    
    // Limits
    for(let limit of limits) {
        let limitLevel = limit.level;
        
        const limitData = limitLibrary.find(l => l.id == limit.id);
        let limitName = limitData.name;
        
        if(limitData) {
            let limitValue = limitData.value;
            let limitLevelUp = limitData.levelUp;
            let limitTags = limitData.tags;
        
            let limitQuickText = limitData.quickdescription ? limitData.quickdescription : limitData.description;
            
            if(limitQuickText) {
                limitQuickText = parseText(limitQuickText, [
                    { name: 'll', value: limitLevel },
                    { name: 'hp', value: hp },
                ]);
            } else {
                limitQuickText = '';
            }
            
            switch(limitData.id) {
                case 'ammo':
                    if(limitLevel == 3) {
                        limitText = 'Can be used once per scene. ';
                    }
                    break;
                case 'time':
                    if(limitLevel == 4) {
                        limitText = 'Effect ends after one turn. ';
                    }
                    break;
                case 'health':
                    hpcost = limitLevel * 5;
                    break;
                case 'ultimatehealth':
                    hpcost = Math.ceil(hp / 5);
                    break;
                case 'ultimatevalor':
                    valorcost = limitLevel;
                    break;
                case 'final':
                    rollBonus += 5;
                    break;
                case 'self':
                    targetMode = 'self';
                    break;
            }
            
            let limitCost = limitValue + limitLevelUp * (limitLevel - 1);
            
            limitQuickSummary += limitQuickText;
            limitSt += limitCost;
        }
    }
    
    techLevel += modLevels;
    
    stcost = Math.max(coreData.cost + coreData.levelUp * techLevel - limitSt, 0);
    
    let costs = [];
    let quickCosts = [];
    if(stcost > 0) {
        costs.push(`${stcost} stamina`);
        quickCosts.push(`${stcost} ST`);
    }
    if(hpcost > 0) {
        costs.push(`${hpcost} health`);
        quickCosts.push(`${hpcost} HP`);
    }
    if(valorcost > 0) {
        costs.push(`${valorcost} valor`);
        quickCosts.push(`${valorcost} valor`);
    }
    
    if(costs.length > 0) {
        limitQuickSummary = `Costs ${quickCosts.join(', ')}. ` + limitQuickSummary;
    }
    
    if(coreData.ultimate) {
        modLevels = Math.ceil(modLevels / 2);
        if(modLevels > 0) modLevels--;
    }
    
    if(healing && type == 'master') healing *= 2;
    
    switch(core) {
        case 'damage':
        case 'ultDamage':
            coreQuickSummary = `${damage} ${damageType} damage.`
            if(skills) {
                coreQuickSummary += ` Grants ${skills}.`;
            }
            if(flaws) {
                coreQuickSummary += ` Inflicts ${flaws}. `;
            }
            break;
        case 'healing':
            coreQuickSummary = `Heal for ${healing}.`
            break;
        case 'shield':
            coreQuickSummary = `${shield} ${shieldType} shield.`
            break;
        case 'boost':
            if(skills) {
                coreQuickSummary = `Grants ${skills}.`;
            } else {
                coreQuickSummary = 'Grants skills.';
            }
            break;
        case 'weaken':
            if(flaws) {
                coreQuickSummary = `Inflicts ${flaws}. `;
            } else {
                coreQuickSummary = 'Inflicts flaws. ';
            }
            break;
        case 'barrier':
            coreQuickSummary = `Barrier strength ${corepower}.`;
            break;
        case 'summoning':
            coreQuickSummary = 'Summon.';
            break;
        case 'ultTransform':
            coreQuickSummary = `+1 to all rolls , +${healing} HP.`;
            if(skills) {
                coreQuickSummary += ` Grants ${skills}.`;
            }
            break;
        case 'ultDomain':
            coreQuickSummary = `Domain radius ${domainRadius}.`;
            if(skills) {
                coreQuickSummary += ` Grants ${skills}.`;
            }
            if(flaws) {
                coreQuickSummary += ` Inflicts ${flaws}. `;
            }
            break;
    }
    
    if(requiresRoll) {
        coreQuickSummary = `Roll ${rollStatActive}, ` + coreQuickSummary;
    }
    
    const quickSummary = `${coreQuickSummary} ${modQuickSummary} ${limitQuickSummary}`;
    
    return quickSummary;
}

// Status Tracker
// While this is active, the system will send an alert when an effect ends.
function trackStatuses(turnOrder) {
    if(!state.statusTrackerEnabled) {
        // Settings check
        return;
    }
    
    let newTurnOrder = turnOrder;
    if(!newTurnOrder || newTurnOrder.length === 0) {
        // Do nothing if the init tracker is empty
        return;
    }
    
    let lastChar = newTurnOrder[newTurnOrder.length - 1];
    if(lastChar.id != '-1') {
        // Do nothing if the last actor was a character
        return;
    }
    
    if(lastChar.pr == 0 && lastChar.formula == '-1') {
        // A countdown effect ended
        sendValorMessage(`Effect '${lastChar.custom}' has ended.`);
        newTurnOrder = newTurnOrder.slice(0, newTurnOrder.length - 1);
        // Auto-reduce the next item if it's an effect too
        if(lastChar.formula == '-1') {
            lastChar.pr--;
        }
        Campaign().set('turnorder', JSON.stringify(newTurnOrder));
        trackStatuses(newTurnOrder);
    }
}


// Valor updater
// To use: Put a label on the turn tracker called 'Round' at the end of the
// round. When you reach the end of the round, all characters with a red
// bar max value will gain 1 Valor.
function updateValor() {
    if(!state.valorUpdaterEnabled) {
        // Settings check
        return;
    }
    
    if(!state.charData) {
        state.charData = {};
    }

    let updatedCharacters = [];
    
    let page = Campaign().get('playerpageid');
    let tokens = findObjs({_type: 'graphic', layer:'objects', _pageid: page});
    for(var token of tokens) {
        let charId = token.get('represents');
        let skills = getSkills(charId);
        
        let maxValor = parseInt(token.get('bar3_max')) || 0;
        if(maxValor) {
            if(charId) {
                if(updatedCharacters.includes(charId)) {
                    // This character has already been given valor this round
                    return;
                } else {
                    updatedCharacters.push(charId);
                }
            }
            const hp = getHp(token.get('_id'), charId);
            
            if(!hp.val || hp.val <= 0) {
                // They're KO'd - don't add Valor
                return;
            }
            
            // If it has a max Valor, it's tracking Valor - raise it
            let valor = parseInt(token.get('bar3_value')) || 0;
            let valorRate = 1;
            
            let charClass = getAttrByName(charId, 'type');
            if(skills.find(s => s.id == 'valiant')) {
                valorRate++;
            }
            if(charClass == 'master') {
                valorRate *= 2;
            }
            
            log('Character ' + token.get('name') + ' gains ' + valorRate + ' for new round.');
            
            updateValue(token.get('_id'), 'valor', valorRate);
            
            if(skills.find(s => s.id == 'bounceBack')) {
                updateValue(token.get('_id'), 'valor', 1);
            }
        }
    }
    
    log('Valor update complete.')
}


function alertCooldowns() {
    if(!state.showTechAlerts) {
        return;
    }
    
    let turnOrder;
    if(Campaign().get('turnorder') == '') {
        turnOrder = [];
    } else {
        turnOrder = JSON.parse(Campaign().get('turnorder'));
    }
    
    let lastChar = turnOrder[turnOrder.length - 1];
    if(!lastChar || lastChar.custom.toLowerCase() != 'round') {
        return;
    }

    let round = lastChar.pr;
    if(!round) {
        return;
    }
    
    let checkedTechs = [];
    for(let t of state.techHistory) {
        if(checkedTechs.includes(t.id)) continue;
        let tech = getTech(t.id);
        checkedTechs.push(t.id);
        
        if(!tech) continue;
        
        let cooldownLimit = tech.limits.find(l => l.id == 'cooldown');
        if(!cooldownLimit) continue;
        
        if(round == t.round + cooldownLimit.level + 1) {
            let actor = getObj('character', t.user);
            sendValorMessage(`Technique "${tech.name}" is no longer on cooldown.`, {recipient: actor.get('name'), noarchive: true});
        }
    }
}


// !sizeup command
function sizeUp(selected) {
    // Use selected token or first token on active page that represents character
    let token = getObj('graphic', selected._id);
    
    if(!token) {
        sendValorMessage('Select a token with an attached character sheet.', {recipient: 'gm', noarchive: true});
        return;
    }
    
    let charId = token.get('represents');
    
    let name = token.get('name');
    let character = getObj('character', charId);
    if(!name && character) {
        name = character.get('name');
    }
    
    let summary = '';
    
    let hp = getHp(token.get('_id'), charId);
    let st = getSt(token.get('_id'), charId);
    summary += `HP: ${hp.val}/${hp.max}<br/>`;
    summary += `ST: ${st.val}/${st.max}<br/>`;
    
    let mus = getAttrByName(charId, 'muscle');
    let dex = getAttrByName(charId, 'dexterity');
    let aur = getAttrByName(charId, 'aura');
    let int = getAttrByName(charId, 'intuition');
    let res = getAttrByName(charId, 'resolve');
    summary += 'Mus ' + mus + ', Dex ' + dex + ', Aur ' + aur + ', Int ' + int + ', Res ' + res + '<br/>';
    
    let flaws = getFlaws(charId);
    
    if(flaws) {
        let flawNames = flaws.map(f => f.name).join(', ');
        if(flawNames) {
            summary += `Flaws: ${flawNames}<br/>`;
        }
    }
    
    sendValorMessage(`<div>${summary}</div>`, {recipient: 'gm', noarchive: true});
}

function statusCheck(actorId) {
    const techs = getTechs(actorId);
    const actor = getTechUser(actorId);

    let techStatus = [];
    for(const tech of techs) {
        let lines = [];
        let coreData = coreLibrary.find(c => c.id == tech.core);
    
        let techHistory = state.techHistory.filter(h => h.id == tech.id);
        let lastUsage = (techHistory && techHistory.length > 0) ? techHistory[0] : null;
        let round = getRound();
        
        if(coreData && coreData.ultimate && lastUsage &&
            !tech.mods.find(m => m.id == 'unerring')) {
            lines.push('already used');
        }
        
        for(const limit of tech.limits) {
            let limitData = limitLibrary.find(l => l.id == limit.id);
            if(limitData) {
                
                switch(limitData.id) {
                    case 'valor':
                        if(actor.valor < limit.level) {
                            lines.push('not enough valor');
                        }
                        break;
                    case 'cooldown':
                        if(lastUsage && round < lastUsage.round + limit.level + 1) {
                            lines.push('on cooldown');
                        }
                        break;
                    case 'ammo':
                        let ammoCap = 4 - limit.level;
                        let ammoUsed = techHistory ? techHistory.length : 0;
                        if(ammoUsed >= ammoCap) {
                            lines.push('out of ammo');
                        }
                        break;
                    case 'initiative':
                        costs.init = limit.level;
                        // Find us on the turn order
                        if(!state.techHistory) {
                            state.techHistory = [];
                        }
                        
                        let rawTurnOrder = Campaign().get('turnorder');
                        turnOrder = rawTurnOrder ? JSON.parse(rawTurnOrder) : [];
                        if(turnOrder) {
                            for(var t of turnOrder) {
                                let tokenId = t.id;
                                let token = getObj('graphic', tokenId);
                                if(token && token.get('represents') == actorId) {
                                    if(t.pr < limit.level) {
                                        lines.push('not enough initiative');
                                        break;
                                    }
                                }
                            }
                        }
                        break;
                    case 'injury':
                        let hpLimit = Math.ceil(actor.health_max * (5 - limit.level) / 5 );
                        if(actor.health > hpLimit) {
                            lines.push('HP too high');
                        }
                        break;
                    case 'vitality':
                        let vitalityPoint = Math.ceil(actor.health_max * 0.4 );
                        if(actor.health <= vitalityPoint) {
                            lines.push('HP too low');
                        }
                        break;
                    case 'setup':
                        if(round < limit.level + 1) {
                            lines.push("can't use yet");
                        }
                        break;
                    case 'ultimatevalor':
                        costs.valor = limit.level;
                        if(actor.valor < limit.level) {
                            lines.push("not enough valor");
                        }
                        break;
                }
            }
        }
        
        let status = 'OK';
        if(lines.length > 0) {
            status = capitalize(lines.join(', '));
        }
        
        techStatus.push(`**${tech.name}**: ${status}`);
    }
    
    let message = `<table><tr><td>${techStatus.join('</td></tr><tr><td>')}</td></tr></table>`;
    sendValorMessage(message, {recipient: actor.name, noarchive: true});
}

function applyTech(tokenId, techId, forcedDamage, rawDamage) {
    const token = getObj('graphic', tokenId);
    if(!token) {
        log(`Token not found for ID ${tokenId}`);
        return;
    }
    
    const targetId = token.get('represents');
    let addedEffect = false;
    let shieldDamage = 0;
    let healthDamage = 0;
    
    let tech = getTech(techId);
    let actor = getTechUser(tech.actorId);
    let effects = getTechEffects(tech, actor);
    let target = getTechTarget(tokenId);
    let turnOrder = JSON.parse(Campaign().get('turnorder'));
    
    if(effects.damage) {
        let damage = effects.damage;
        let targetDR = 0;
        if(forcedDamage > -1) damage = forcedDamage;
        
        if(!rawDamage) {
            let targetFlaws = getFlaws(target.id);
            let targetSkills = getSkills(target.id);
            
            if(tech.element) {
                let element = tech.element.trim().toLowerCase();
                let targetSkills = getSkills(target.id);
                let eVuln = targetFlaws.find(f => f.id == 'elementalVulnerability');
                if(eVuln && eVuln.detail.trim().toLowerCase() == element) {
                    damage += eVuln.level * 4 + 2;
                }
                let eRes = targetSkills.find(s => s.id == 'elementalResistance');
                if(eRes && eRes.detail.trim().toLowerCase() == element) {
                    targetDR += eRes.level * 4 + 2;
                }
            }
            
            if(effects.damageType == 'physical') 
                targetDR += (parseInt(target.defense) || 0) + (parseInt(target.defensebonus) || 0);
            else if(effects.damageType == 'energy')
                targetDR += (parseInt(target.resistance) || 0) + (parseInt(target.resistancebonus) || 0);
            
            let targetBerserker = targetFlaws.find(f => f.id == 'berserker');
            if(targetBerserker) {
                let hpRatio = (parseInt(target.health) || 1) / (parseInt(target.health_max) || 1);
                if(hpRatio <= 0.4) {
                    targetDR = Math.max(targetDR - 10, 0);
                }
            }
        }
        
        healthDamage = Math.max(damage - targetDR, 0);
        
        if(tech.mods.find(m => m.id == 'sapping')) {
            if(finalDamage > 0) {
                let ongoing = Math.ceil(healthDamage / 3);
                result = addEffect(turnOrder, tokenId, `"Ongoing ${ongoing}`, 3);
                addedEffect = true;
            }
        }
        
        if(effects.damageType == 'physical' || effects.damageType == 'energy') {
            let typedShield = parseInt(getAttrByName(targetId, `${effects.damageType}shield`)) || 0;
            let versatileShield = parseInt(getAttrByName(targetId, 'versatileshield')) || 0;
            
            if(typedShield > 0) {
                let typedShieldDamage = Math.min(healthDamage, typedShield);
                shieldDamage += typedShieldDamage;
                healthDamage -= typedShieldDamage;
                
                let shieldAttrName = `${effects.damageType}shield`;
                let shieldAttrs = findObjs({
                    _characterid: targetId,
                    _type: 'attribute',
                    name: shieldAttrName
                });
                if(shieldAttrs && shieldAttrs.length > 0) {
                    shieldAttr = shieldAttrs[0];
                    let currentValue = parseInt(shieldAttr.get('current')) || 0;
                    shieldAttr.set('current', currentValue - shieldDamage);
                }
            }
            if(healthDamage && versatileShield > 0) {
                let versatileShieldDamage = Math.min(healthDamage, versatileShield);
                shieldDamage += versatileShieldDamage;
                healthDamage -= versatileShieldDamage;
                
                let shieldAttrName = 'versatileshield';
                let shieldAttrs = findObjs({
                    _characterid: targetId,
                    _type: 'attribute',
                    name: shieldAttrName
                });
                if(shieldAttrs && shieldAttrs.length > 0) {
                    shieldAttr = shieldAttrs[0];
                    let currentValue = parseInt(shieldAttr.get('current')) || 0;
                    shieldAttr.set('current', currentValue - versatileShieldDamage);
                }
            }
        }
        
        updateValue(tokenId, 'hp', -healthDamage);
    }
    
    if(effects.flaws && !rawDamage) {
        let flawList = effects.flaws.split(',').map(f => f.trim());
        let tempFlaws = getFlaws(target.id, true);
        let uniqueRowIds = [];
        
        for(var flawName of flawList) {
            let flawSplit = flawName.split(' ');
            let flawLevel = parseInt(flawSplit[flawSplit.length - 1]) || 0;
            
            if(flawLevel) {
                flawName = flawSplit.slice(0, flawSplit.length - 1).join(' ');
            } else {
                flawLevel = 1;
            }
    
            let flawData = flawLibrary.find(f => flawName.toLowerCase().match(f.namePattern));
            if(flawData) {
                let tempFlaw = tempFlaws.find(ts => ts.id == flawData.id);
                if(tempFlaw) {
                    let flawLevelAttrs = findObjs({
                        _characterid: target.id,
                        _type: 'attribute',
                        name: `repeating_tempflaw_${tempFlaw.rowId}_level`
                    });
                    
                    if(flawLevelAttrs && flawLevelAttrs.length > 0) {
                        let flawLevelAttr = flawLevelAttrs[0];
                        let oldLevel = parseInt(flawLevelAttr.get('current'));
                        if(oldLevel < flawLevel) {
                            flawLevelAttr.set('current', flawLevel);
                            addedEffect = true;
                        }
                    } else if(flawLevel > 1) {
                        createObj("attribute", {
                            name: `repeating_tempflaw_${tempFlaw.rowId}_level`,
                            current: flawLevel,
                            characterid: target.id,
                        });
                            addedEffect = true;
                    }
                } else {
                    let rowId = generateRowID();
                    while(uniqueRowIds.includes(rowId)) {
                        rowId = generateRowID();
                    }
                    uniqueRowIds.push(rowId);
                    createObj("attribute", {
                        name: `repeating_tempflaw_${rowId}_id`,
                        current: flawData.id,
                        characterid: target.id,
                    });
                    createObj("attribute", {
                        name: `repeating_tempflaw_${rowId}_level`,
                        current: flawLevel,
                        characterid: target.id,
                    });
                    addedEffect = true;
                }
            }
        }
    }
    
    if(state.showAttackResults) {
        const token = getObj('graphic', tokenId);
        const tokenName = token.get('name');
        if(tokenName) {
            let messages = [];
            if(shieldDamage > 0) {
                messages.push(`${tokenName} blocked ${shieldDamage} damage with a shield.`);
            }
            if(effects.damage > 0) {
                messages.push(`${tokenName} took ${healthDamage} damage.`);
            }
            
            if(addedEffect) {
                messages.push(`${tokenName} gained a new effect.`);
            }
            
            sendValorMessage(messages.join('<br />'));
        }
    }
}

function performDefenseRoll(attackerId, defenderId, techName, attribute, count) {
    let attributeName = '';
    let primaryName = '';
    switch(attribute) {
        case 'muscle': 
            attributeName = 'Muscle';
            primaryName = 'strength';
            break;
        case 'dexterity': 
            attributeName = 'Dexterity';
            primaryName = 'agility';
            break;
        case 'aura': 
            attributeName = 'Aura';
            primaryName = 'spirit';
            break;
        case 'intuition': 
            attributeName = 'Intuition';
            primaryName = 'mind';
            break;
        case 'resolve': 
            attributeName = 'Resolve';
            primaryName = 'guts';
            break;
    }
    
    if(techName[0] == '&' && techName[techName.length - 1] == '&') {
        techName = techName.substring(1, techName.length - 1);
    }
    
    const techs = getTechs(attackerId);
    const tech = techs.find(t => t.name == techName);
    
    const attributeValue = getAttrByName(defenderId, attribute);
    const rollBonus = getAttrByName(defenderId, 'rollbonus');
    const defRollBonus = getAttrByName(defenderId, 'defenserollbonus');
    
    if(primaryName != tech.stat) {
        log(`!d-roll: Substituting ${attribute} for ${tech.stat}`);
        
        switch(attribute) {
            case 'aura':
                // Chip stamina
                var level = getAttrByName(attackerId, 'level');
                var attackerSeason = Math.ceil(level / 5);
                updateValueForCharacter(defenderId, 'stamina', attackerSeason * -2, false, false);
                break;
        }
    }
    
    let roll = '';
    for(let i = 0; i < count; i++) {
        roll += `[[1d10+${attributeValue}+${rollBonus}+${defRollBonus}]] `;
    }
    roll += `${attributeName} Defense`;
    
    sendChat('character|' + defenderId, roll);
}

function undoTech() {
    // Get the last tech's data out of the tech history
    if(!state.techHistory) {
        state.techHistory = [];
    }
    if(!state.techData) {
        state.techData = {};
    }
    
    if(state.techHistory.length == 0) {
        log("Can't remember any more tech usage.");
        return;
    }
    
    let techLog = state.techHistory[0];
    let turnOrder = JSON.parse(Campaign().get('turnorder'));
    
    let page = Campaign().get('playerpageid');
    let tokens = findObjs({
        _type: 'graphic',
        _represents: techLog.user,
        _pageid: page
    });
    
    if(!tokens || tokens.length == 0) {
        log("Character not present in scene.");
        return;
    }
    let token = tokens[0];
    let tokenId = token.get('_id');
    let name = token.get('name');
    if(!name) {
        let character = getObj('character', techLog.user);
        if(!character) {
            log("Character not present in scene.");
            return;
        }
        
        name = character.get('name');
    }
    
    // Refund lost resources
    let hpCost = parseInt(techLog.cost.hp) || 0;
    let stCost = parseInt(techLog.cost.st) || 0;
    let valorCost = parseInt(techLog.cost.valor) || 0;
    let initCost = parseInt(techLog.cost.init) || 0;
    updateValue(tokenId, 'health', hpCost);
    updateValue(tokenId, 'stamina', stCost);
    updateValue(tokenId, 'valor', valorCost);
    if(turnOrder && initCost) {
        turnOrder.forEach(function(turn) {
            if(turn && turn.id === tokenId) {
                turn.pr += initCost;
            }
        });

        Campaign().set('turnorder', JSON.stringify(turnOrder));
    }
    
    // Remove tech from history
    state.techHistory = state.techHistory.slice(1);
    
    let message = name ? 'Reverted use of technique ' + techLog.techName + ' used by ' + name + '. ' :
        'Reverted use of technique' + techLog.techName + '. ';
    sendChat('Valor', message);
    log(message + state.techHistory.length + ' techs remaining in history log.');
}


// !duplicate command
// Used by character sheet - create a temporary level-up sheet for a given character.
function duplicateCharacter(actorId) {
    let actor = getObj('character', actorId);
    let name = actor.get('name');
    let levelUpName = `Level Up - ${name}`;
    
    // Find existing levelup sheet
    let existing = findObjs({
        type: 'character',
        name: levelUpName
    });
    
    if(existing && existing.length > 0) {
        sendValorMessage('You already have a level-up sheet.', {recipient: name, noarchive: true});
        return;
    }
    
    // Create new character, copy over basic traits
    let newActor = createObj('character', {
        name: levelUpName,
        inplayerjournals: actor.get('inplayerjournals'),
        controlledby: actor.get('controlledby'),
        avatar: actor.get('avatar')
    });
    
    let newActorId = newActor.get('_id');
    
    // Copy over attributes
    let attributes = findObjs({
        _type: 'attribute',
        _characterid: actorId
    });
    
    for(var attribute of attributes) {
        let oldAttrs = findObjs({
            _type: 'attribute',
            _characterid: newActorId,
            name: attribute.get('name')
        });
        if(oldAttrs && oldAttrs.length > 0) {
            let oldAttr = oldAttrs[0];
            oldAttr.set('current', attribute.get('current'));
            oldAttr.set('max', attribute.get('max'));
        } else {
            let obj = createObj('attribute', {
                name: attribute.get('name'),
                current: attribute.get('current'),
                max: attribute.get('max'),
                characterid: newActorId
            });
        }
    }
    
    // Mark the new one as a duplicate
    createObj('attribute', {
        name: 'is_duplicate',
        current: 'on',
        characterid: newActorId
    });
    
    log('Character ' + actor.get('name') + ' created a new level up sheet.');
}

function finalizeCharacter(actorId) {
    let actor = getObj('character', actorId);
    let name = actor.get('name');
    let originalName = name.substring(11);
    
    if(!name.startsWith('Level Up - ')) {
        sendValorMessage("This is not a level-up sheet.", {recipient: name, noarchive: true});
        return;
    }
    
    // Fetch the original sheet
    let oldActors = findObjs({
        type: 'character',
        name: originalName
    });
    
    if(!oldActors || oldActors.length == 0) {
        sendValorMessage("Can't find the original sheet.", {recipient: name, noarchive: true});
        return;
    }
    let oldActor = oldActors[0];
    
    let oldActorId = oldActor.get('_id');
    
    let oldAttributes = findObjs({
        _type: 'attribute',
        _characterid: oldActorId
    });
    let attributes = findObjs({
        _type: 'attribute',
        _characterid: actorId
    });
    
    let oldHp = oldAttributes.find(function(obj) {
        return obj.get('name') == 'health';
    });
    let newHp = attributes.find(function(obj) {
        return obj.get('name') == 'health';
    });
    let oldHpMax = parseInt(oldHp.get('max'));
    let newHpMax = parseInt(newHp.get('max'));
    
    let oldSt = oldAttributes.find(function(obj) {
        return obj.get('name') == 'stamina';
    });
    let newSt = attributes.find(function(obj) {
        return obj.get('name') == 'stamina';
    });
    let oldStMax = parseInt(oldSt.get('max'));
    let newStMax = parseInt(newSt.get('max'));
    
    let oldLevel = oldAttributes.find(function(obj) {
        return obj.get('name') == 'level';
    });
    let newLevel = attributes.find(function(obj) {
        return obj.get('name') == 'level';
    });
    let oldLevelValue = oldLevel ? parseInt(oldLevel.get('current')) : 1;
    let newLevelValue = newLevel ? parseInt(newLevel.get('current')) : 1;
    
    // Get list of skills/flaws/techs from old sheet
    let oldFlaws = [];
    let oldSkills = [];
    let oldTechs = [];
    oldAttributes.forEach(function(attr) {
        let attrName = attr.get('name');
        if(attrName && attrName.indexOf('repeating_flaws_') > -1) {
            let flawId = attrName.substring(16, 36);
            if(oldFlaws.indexOf(flawId) == -1) {
                oldFlaws.push(flawId);
            }
        }
        if(attrName && attrName.indexOf('repeating_skills_') > -1) {
            let skillId = attrName.substring(17, 37);
            if(oldSkills.indexOf(skillId) == -1) {
                oldSkills.push(skillId);
            }
        }
        if(attrName && attrName.indexOf('repeating_techs_') > -1) {
            let techId = attrName.substring(16, 36);
            if(oldTechs.indexOf(techId) == -1) {
                oldTechs.push(techId);
            }
        }
    });
    
    // Paste over attributes
    let newFlaws = [];
    let newSkills = [];
    let newTechs = [];
    
    const ignore = ['rollbonus', 'accuracybonus', 'evasionbonus', 'defensebonus', 'resistancebonus', 
        'physicalattackbonus', 'energyattackbonus', 'physicalshield', 'energyshield', 'versatileshield', 'is_duplicate'];
    const ignoreCurrent = ['health', 'stamina', 'valor'];
    
    for(var attr of attributes) {
        let attrName = attr.get('name');
        if(ignore.includes(attrName)) continue;
        
        let oldAttribute = oldAttributes.find(a => a.get('name') == attrName);
        
        if(oldAttribute) {
            oldAttribute.set('max', attr.get('max'));
            if(!ignoreCurrent.includes(attrName)) {
                oldAttribute.set('current', attr.get('current'));
            }
        } else {
            log(`Discovered new attribute "${attrName}"`);
            createObj('attribute', {
                name: attrName,
                current: attr.get('current'),
                max: attr.get('max'),
                characterid: oldActorId
            });
        }
        
        if(attrName && attrName.indexOf('repeating_flaws_') > -1) {
            let flawId = attrName.substring(16, 36);
            if(newFlaws.indexOf(flawId) == -1) {
                newFlaws.push(flawId);
            }
        }
        if(attrName && attrName.indexOf('repeating_skills_') > -1) {
            let skillId = attrName.substring(17, 37);
            if(newSkills.indexOf(skillId) == -1) {
                newSkills.push(skillId);
            }
        }
        if(attrName && attrName.indexOf('repeating_techs_') > -1) {
            let techId = attrName.substring(16, 36);
            if(newTechs.indexOf(techId) == -1) {
                newTechs.push(techId);
            }
        }
    }
    
    // Identify deleted flaws/skills/techs
    oldFlaws.forEach(function(flaw) {
        if(newFlaws.indexOf(flaw) == -1) {
            log('Deleting Flaw ID ' + flaw);
            
            oldAttributes.forEach(function(attr) {
                let attrName = attr.get('name');
                if(attrName && attrName.indexOf(flaw) > -1) {
                    attr.remove();
                }
            });
        }
    });
    oldSkills.forEach(function(skill) {
        if(newSkills.indexOf(skill) == -1) {
            log('Deleting Skill ID ' + skill);
            
            oldAttributes.forEach(function(attr) {
                let attrName = attr.get('name');
                if(attrName && attrName.indexOf(skill) > -1) {
                    attr.remove();
                }
            });
        }
    });
    oldTechs.forEach(function(tech) {
        if(newTechs.indexOf(tech) == -1) {
            log('Deleting Tech ID ' + tech);
            
            oldAttributes.forEach(function(attr) {
                let attrName = attr.get('name');
                if(attrName && attrName.indexOf(tech) > -1) {
                    attr.remove();
                }
            });
        }
    });
    
    // Update current HP and ST
    if(oldHpMax == oldHpMax && newHpMax == newHpMax) {
        let hpChange = newHpMax - oldHpMax;
        
        let oldHpValue = parseInt(oldHp.get('current'));
        if(oldHpValue == oldHpValue) {
            oldHp.set('current', oldHpValue + hpChange);
        }
    }
    
    if(oldStMax == oldStMax && newStMax == newStMax) {
        let stChange = newStMax - oldStMax;
        
        let oldStValue = parseInt(oldSt.get('current'));
        if(oldStValue == oldStValue) {
            oldSt.set('current', oldStValue + stChange);
        }
    }
    
    // Delete the level-up sheet
    actor.remove();
    
    if(oldLevelValue == oldLevelValue && newLevelValue == newLevelValue) {
        if(oldLevelValue < newLevelValue) {
            sendChat('Valor', `Character sheet for ${oldActor.get('name')} has been updated, gaining ${newLevelValue - oldLevelValue} ` +
                `${newLevelValue - oldLevelValue == 1 ? 'level' : 'levels'}.`);
        } else if(oldLevelValue > newLevelValue) {
            sendChat('Valor', `Character sheet for ${oldActor.get('name')} has been updated, losing ${oldLevelValue - newLevelValue} ` +
                `${oldLevelValue - newLevelValue == 1 ? 'level' : 'levels'}.`);
        } else {
            sendChat('Valor', `Character sheet for ${oldActor.get('name')} has been updated.`);
        }
    }
    
    log('Character sheet for ' + oldActor.get('name') + ' has been updated.');
}
