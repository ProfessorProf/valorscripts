# Valor Scripts - NekoMod

This is a slightly modified version of the Valor Scripts developed by Quinn Gordon, implementing a few mods specific for games run by a few of NekoIncardine's friends.

To wit:
- It implements a "Basic Attack" limit, which zeroes out the Stamina cost. It's intended for a Basic Attacks houserule derived from Valor Alter (also by Quinn Gordon).
- It implements a "Free Technique" modifier, which zeroes out the Technique Point cost. It's intended for things like picking weapons up off the floor, akin to the Valor Fighting Game rules.

Future objectives in scope include:
- Extending the sheet with a dedicated page for Challenge Points from Tools of the Trade

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

### Use Tech
Syntax: `!t Fireball 3 +1`

Performs a technique as your character. If you're the GM, it'll pick one based on selected tokens. Tech can be indicated by number (1 is the top of the list), name, or start of name. Optionally, add a number indicating the number of targets, and/or a number with a + or - before it indicating a bonus or penalty to the roll (order doesn't matter). Stamina, Health and Valor on the user will be used up automatically. `!t`, `!tech` and `!technique` can be used interchangeably.

Any of these will work:
* `!t 1` Performs the first technique on your tech list.
* `!tech Fi` Performs the first technique on your tech list starting with 'Fi' (i.e. Fireball).
* `!technique Doom Fist` Performs the first technique on your tech list starting with 'Doom Fist'.
* `!t Fireball 3` Performs the Fireball technique and rolls against 3 targets.
* `!t Fireball +1` Performs the Fireball technique and rolls against 1 target with a +1 bonus to the attack roll (if the second parameter starts with + or -, it'll read it as a roll bonus instead of a target count).
* `!t "Doom F" 2 -1` Performs the Doom Fist technique and rolls against 2 targets with a -1 penalty to the attack roll.
* `!t Doom Fist +2 3` Performs the Doom Fist technique and rolls against 3 targets with a +2 bonus to the attack roll.

### Undo Tech Usage
Syntax: `!t-undo`
Reverses any expended resources from the most-recently used technique. Remembers up to the last 20 techniques used.

### Get Tech Status
Syntax: `!status`
Shows you (and only you) which of your techniques are ready to use, and which are blocked by Limits.

### Get Critical Hit Damage
Syntax: `!crit`
Shows you (and only you) how much damage the previous technique would have done if it had scored a critical hit.

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
Syntax: `!def`

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

### Create Mook
Syntax: `!mook -l 10 -t soldier -s str guts`

Creates a randomly-generated mook character sheet. Newly-created sheet will have the name 'New Mook', and will include a couple random skills and techniques based on its attributes.

Has three parameters:
* Level (`-l [level]`) sets the level of the character. Defaults to 1.
* Type (`-t [type]`) sets the type. Accepted values are 'flunky' and 'soldier'. Defaults to Flunky.
* Stats (`-s [stats separated by spaces]`) sets the high attributes for the character. Maximum three. Defaults to a random selection.

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
To change the usage options, go to lines 14-22 of valor.js in the API editor. Each of these lines ends in either `true` or `false` - swap out true/false to turn these features on/off.

Available options:
* `StatusTrackerEnabled` - Enables automatic tracking of temporary effects. Enabled by default.
* `ValorUpdaterEnabled` - Enables automatic increase of Valor each round for all characters. On by default.
* `MaxValuesSyncEnabled` - Enables automatic updating of current HP/ST as max values change. On by default.
* `OngoingEffectProcessor` - Enables autommatic processing of regeneration and dongoing damage. On by default.
* `IgnoreLimitsOnMinions` - Disables processing of limits when using techniques for Flunkies or Soldiers. On by default.
* `HideNpcTechEffects` - When NPCs use techniques, displays the damage output and other effects only for the GM. Off by default.
* `ShowTechAlerts` - Enables private alerts when techniques exit cooldown or run out of ammunition. On by default.
* `ShowHealthAlerts` - Enables private alerts when entering or leaving critical health. On by default.
* `HouseRulesEnabled` - Enables various unsupported house rules. Off by default.
* `RollBehindScreen` - When NPCs use techniques, displays any dice rolls only for the GM. Off by default.
