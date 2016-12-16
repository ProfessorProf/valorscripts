# Valor Script Repository
These files should help you run Valor games on Roll20 with a minimum of pain and a maximum of fun streamlining quality-of-life features.

The files here are split into two sub-projects - API, and Character Sheet.

## Valor Character Sheet
The files in this folder will give you a full functioning in-game character sheet template that you can use to quickly put together and update Valor characters on the fly. All derived values are calculated automatically, and techniques are given text descriptions based on their mechanics.

### Installation
1. From your campaign's main page, click Settings, then go to Game Settings.
2. Scroll down to Character Sheet Template, and from the dropdown, select Custom.
3. In the HTML Layout tab, copy the contents of valor.html into the editor.
4. In the CSS Styling tab, copy the contents of valor.css into the editor.
5. Refresh the Roll20 editor.

### Usage
Mostly self-explanatory - just put values into boxes, and the sheet will update other values as necessary. For Skills such as Proficiency that require extra info, enter it into the Notes field to the right of the Skill/Flaw. If you want to use a custom Skill or Flaw that isn't in the system, enter Custom Skill or Custom Flaw, and add details to the right. Set the Skill/Flaw level to equal the amount of SP you want the Custom trait to be worth.

For Techniques, Tech Level is automatically calculated based on core level and the list of modifiers. Put each mod on a separate line, ending with the mod level if relevant - if you want a Level 2 Ranged Technique modifier, put in something like "Ranged Technique 2" or "Ranged 2" - as long as it starts with 'ranged' and ends in '2', it'll read correctly. If there's no number listed, it will assume level 1. Clicking the "Use Technique" button will automatically deduct from your resources as required for the tech's limits.

Limits work the same way. For either one, if you want to use a mod or limit that isn't in the game library, preface it with Custom, i.e. "Custom - Encroachment Limit 4". The number will be used for either how many levels the mod adds to the technique, or as how much the limit reduces the Stamina cost by.

For maximum benefit, associate a token with a character sheet, then set the three bars to represent "hp", "st" and "valor", in that order.

## Valor API Scripts
This is a collection of scripts that will automate a lot of important Valor logic during battles, to keep the game flowing quickly. These can only be used by Pro level Roll20 subscribers.

### Installation
1. From your campaign's main page, click Settings, and go to API Scripts.
2. Click New Script, and copy the contents of valor.js into the editor.
3. On the lines below the initial documentation, decide which features you want to be on or off by setting them to 'true' or 'false'.
4. Save Script.

### New Commands

#### Scan
Syntax: `!scan`

Displays, in the API Output Console, the URLs for the token images of all character-connected tokens in the game.

#### Use Tech
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

#### Add Effect
Syntax: `!e Poison 2`

Adds a temporary effect to the Turn Tracker for the current selected character. If desired, add a number to the end of the command to specify a duration - if none is added, it will default to 3 turns. **Select the character creating the effect, NOT the target.**

If you want to create an effect with a number in the name, use quotes, i.e. `!e "Ongoing 10"`.

#### Rest
Syntax: `!rest`

Recovers resources for the end of a scene. Valor will be set to 0, or lower/higher if they have the Weak-Willed Flaw or the Bravado Skill. Recovery is one Increment of Health and Stamina, with additional HP if they have the Fast Healing Skill. All of these are connected to the Valor Character Sheet above.

#### Full Rest
Syntax: `!fullrest`

As above, but all Health and Stamina is recovered.

#### Set Bravado
Syntax: `!set-bravado 1`

**Only use this if you are NOT using the Valor Character Sheet.** Gives any selected characters a Bravado Skill level equal to the number set in the command, to be used with the Rest and Full Rest commands. This will be ignored if they have a Valor Character Sheet, in which case the skill list on the character sheet will be used instead.

#### Set Valor Rate
Syntax: `!set-valor-rate 2`

Sets any selected characters to gain an amount of Valor per turn equal to the provided number. Use for anyone with the Limitless Power skill (Masters will automatically gain 2 Valor per round).

### Automatic Features
#### Status Tracker
Track temporary field effects by adding them as custom labels to the Turn Tracker, with a Round Calculation set to -1 (or use !e to do this automatically). The turn tracker will drop its remaining turns by 1 each turn, and when it reaches 0, it will automatically be removed from the Turn Tracker.

#### Valor Updater
After you finish adding all characters to the turn order, add a label to the bottom called 'Round' - this will mark when one round ends and the next begins. Every time it passes, characters will automatically gain Valor for the new round. The red bar is assumed to be Valor, and it won't give characters Valor unless they have a defined max Valor. Masters will gain double Valor.

#### Ongoing Effect Processor
When a character gains a regeneration or ongoing damage effect, add a label on the initiative right under them, and it will automatically process the effect after their turn.
- "Ongoing X" - The character will lose X HP at the end of each round.
- "Regen X" - The character will gain X HP at the end of each round.
- "SRegen X" - The character will gain X ST at the end of each round.

#### Token Status Sync
Disabled by default - **only enable this if you are NOT using the Valor Character Sheet.** If there are multiple player-controlled tokens representing the same character, then any changes to the HP, ST, or Valor of one will be reflected on all others.
