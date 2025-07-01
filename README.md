# Valor Script Repository
These files should help you run Valor games on Roll20 with a minimum of pain and a maximum of fun streamlining quality-of-life features.

The files here are split into two sub-projects - Scripts, and Character Sheet.

### Valor Character Sheet
The files in this folder will give you a full functioning in-game character sheet template that you can use to quickly put together and update Valor characters on the fly. All derived values are calculated automatically, and techniques are given text descriptions based on their mechanics. Without the character sheet, several parts of the Scripts won't work.

### Valor API Scripts
This is a collection of scripts that will automate a lot of important Valor logic during battles, to keep the game flowing quickly. These can only be used by Pro level Roll20 subscribers. Without the Scripts, several parts of the character sheet won't work.

## Installation
1. From your campaign's main page, click Settings, then go to Game Settings.
2. Scroll down to Character Sheet Template, and from the dropdown, select Custom.
3. In the HTML Layout tab, copy the contents of valor.html into the editor.
4. In the CSS Styling tab, copy the contents of valor.css into the editor.
5. From your campaign's main page, click Settings, and go to API Scripts.
6. Click New Script, and copy the contents of valor.js into the editor.
7. On the lines below the initial header, decide which features you want to be on or off by setting them to 'true' or 'false'.
8. Save Script.
9. Refresh the Roll20 editor.

## Usage
Mostly self-explanatory - just put values into boxes, and the sheet will update other values as necessary. For Skills such as Proficiency that require extra info, enter it into the Notes field to the right of the Skill/Flaw. If you want to use a custom Skill or Flaw that isn't in the system, enter Custom Skill or Custom Flaw, and add details to the right. Set the Skill/Flaw level to equal the amount of SP you want the Custom trait to be worth.

For Techniques, Tech Level is automatically calculated based on core level and the list of modifiers. Put each mod on a separate line, ending with the mod level if relevant - if you want a Level 2 Ranged Technique modifier, put in something like "Ranged Technique 2" or "Ranged 2" - as long as it starts with 'ranged' and ends in '2', it'll read correctly. If there's no number listed, it will assume level 1. Clicking the "Use Technique" button will automatically deduct from your resources as required for the tech's limits. If you set "Targets" or "Bonus" to the right of the button before clicking, it will execute with the appropriate number of targets and the appropriate bonus to the attack roll.

Limits work the same way. For either one, if you want to use a mod or limit that isn't in the game library, preface it with Custom, i.e. "Custom - Encroachment Limit 4". The number will be used for either how many levels the mod adds to the technique, or as how much the limit reduces the Stamina cost by.

For Mimic Core techniques, put the exact name of the target technique in the "Mimic Tech" field.

For maximum benefit, associate a token with a character sheet, then set the three bars to represent "hp", "st" and "valor", in that order.

## Valor Commands

### Undo Tech Usage
Syntax: `!t-undo`
Reverses any expended resources from the most-recently used technique. Remembers up to the last 20 techniques used.

### Get Tech Status
Syntax: `!status`
Shows you (and only you) which of your techniques are ready to use, and which are blocked by Limits.

### Add Effect
Syntax: `!e Poison 2`

Adds a temporary effect to the Turn Tracker for the current selected character. If desired, add a number to the end of the command to specify a duration - if none is added, it will default to 3 turns. **Select the character creating the effect, NOT the target.**

If you want to create an effect with a number in the name, use quotes, i.e. `!e "Ongoing 10"`.

### Rest
Syntax: `!rest`

Recovers resources for the end of a scene. Valor will be set to 0, or lower/higher if they have the Weak-Willed Flaw or the Bravado Skill. Recovery is one Increment of Health and Stamina, with additional HP if they have the Fast Healing Skill. All of these are connected to the Valor Character Sheet above.

### Full Rest
Syntax: `!fullrest`

As above, but all Health and Stamina is recovered.

### Add/Subtract HP/ST
Syntax: `!addhp/subhp/addst/subst`

Depending on the command, adds or subtracts one increment of HP or ST from all selected tokens.

### Reset
Syntax: `!reset`

Wipes tech usage history for cooldown or ammo limits, sets Valor to original values. Doesn't recover any HP or ST.

### Set Valor Rate
Syntax: `!set-vrate 2`

Sets any selected characters to gain an amount of Valor per turn equal to the provided number. Use for anyone with the Limitless Power skill (Masters will automatically gain 2 Valor per round).

### Show defenses
Syntax: `!defres`

Shows you (and only you) the Defense and Resistance values of everyone on the current map.

### Show damage increments
Syntax: `!di`

Shows you (and only you) the Damage Increment values of everyone on the current map.

### Show Unmovable
Syntax: `!unmo`

Shows you (and only you) which characters on the current map have the skill Unmovable and at what level.

### Roll Initiative
Syntax: `!init`

Erases everything on the turn tracker and automatically rolls initiative for all combatants, setting everything up for a new scene. If multiple tokens represent the same character, initiative will be rolled just once for the whole group.

### Size Up
Syntax: `!sizeup`

Sends a message to the GM displaying the selected token's HP, ST, secondary attributes and Flaws.

###

## Automatic Features
### Status Tracker
Track temporary field effects by adding them as custom labels to the Turn Tracker, with a Round Calculation set to -1 (or use !e to do this automatically). The turn tracker will drop its remaining turns by 1 each turn, and when it reaches 0, it will automatically be removed from the Turn Tracker.

### Valor Updater
After you finish adding all characters to the turn order, add a label to the bottom called 'Round' - this will mark when one round ends and the next begins. Every time it passes, characters will automatically gain Valor for the new round. The red bar is assumed to be Valor, and it won't give characters Valor unless they have a defined max Valor. Masters will gain double Valor.

### Ongoing Effect Processor
When a character gains a regeneration or ongoing damage effect, add a label on the initiative right under them, and it will automatically process the effect after their turn.
- "Ongoing X" - The character will lose X HP at the end of each round.
- "Regen X" - The character will gain X HP at the end of each round.
- "SRegen X" - The character will gain X ST at the end of each round.

### Critical Health Warning
When a character enters or exits critical health, they will be privately notified about the change in status.

### Max Value Syncer
When a character's maximum HP or ST changes, their current HP or ST will automatically change to match.

### House Rules
Enables a set of unsupported alternate rules. Current changes:
* Treat Bravado as a fixed-level Skill, but give all characters +1 starting Valor for each season past the first.

## Options
To change the usage options, go to the top of valor.js in the API editor. Each of these lines ends in either `true` or `false` - swap out true/false to turn these features on/off.

Available options:
* `StatusTrackerEnabled` - Enables automatic tracking of temporary effects.
* `ValorUpdaterEnabled` - Enables automatic increase of Valor each round for all characters.
* `MaxValuesSyncEnabled` - Enables automatic updating of current HP/ST as max values change.
* `OngoingEffectProcessor` - Enables autommatic processing of regeneration and dongoing damage.
* `IgnoreLimitsOnMinions` - Disables processing of limits when using techniques for Flunkies or Soldiers.
* `HideNpcTechEffects` - When NPCs use techniques, displays the damage output and other effects only for the GM.
* `ShowTechAlerts` - Enables private alerts when techniques exit cooldown or run out of ammunition.
* `ShowHealthAlerts` - Enables private alerts when entering or leaving critical health.
* `HouseRulesEnabled` - Enables various unsupported house rules. Off by default.
* `RollBehindScreen` - When NPCs use techniques, displays any dice rolls only for the GM.
* `autoInitiativeUpdate` - Automatically move characters up and down the turn tracker if their initiative value changes.
* `autoInitiativeReport` - When characters are moved bu auto initiative update, reports it to the GM as a whisper.
* `confirmAutoInitiative` - Asks the GM at the start of each encounter whether or not they want to use auto initiative updating.
* `applyAttackResults` - When a technique is used, the GM is shown buttons to deal damage for a hit, a crit, or a damage increment.
* `showAttackResults` - When the buttons from apply attack results are clicked, reports the damage in the game chat.
* `sendDefenseButtons` - When a technique is used, the defending player is sent a set of buttons to defend with their best stats.
