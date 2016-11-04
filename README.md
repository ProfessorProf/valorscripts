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

For Techniques, Tech Level is automatically calculated based on core level and the list of modifiers. Put each mod on a separate line, ending with the mod level if relevant - if you want a Level 2 Ranged Technique modifier, put in something like "Ranged Technique 2" or "Ranged 2" - as long as it starts with 'ranged' and ends in '2', it'll read correctly. If there's no number listed, it will assume level 1.

Limits work the same way. For either one, if you want to use a mod or limit that isn't in the game library, preface it with Custom, i.e. "Custom - Encroachment Limit 4". The number will be used for either how many levels the mod adds to the technique, or as how much the limit reduces the Stamina cost by.

For maximum benefit, associate a token with a character sheet, then set the three bars to represent "hp", "st" and "valor", in that order.

## Valor API Scripts
This is a collection of scripts that will automate a lot of important Valor logic during battles, to keep the game flowing quickly. These can only be used by Pro level Roll20 subscribers.

### Installation
1. From your campaign's main page, click Settings, and go to API Scripts.
2. Click New Script, and copy the contents of valor.js into the editor.
3. Save Script.
4. Keep this window open, and in another tab, open the campaign Roll20 editor.
5. In the chat box, type "!scan".
6. Back in the API Scripts tab, look in the API Output Console to find your Player ID.
7. Find the line right near the top of the script file that starts with `state.gmID =`, and replace the string in there with your player ID.
8. On the lines below that, decide which features you want to be on or off by setting them to 'true' or 'false'.
9. Save Script.

### New Commands

#### Scan
Syntax: `!scan`

Displays, in the API Output Console, the current player ID and the URLs for the token images of all character-connected tokens in the game.

#### Use Tech
Syntax: `!t Fireball 3 +1`

Performs a technique as your character. If you're the GM, it'll pick one based on selected tokens. Tech can be indicated by number (1 is the top of the list), name (use quotation marks if it's more than one word), or start of name. Optionally, add a number after that if you want to roll against multiple targets. Finally, optionally indicate a bonus to add to the attack roll. Stamina, Health and Valor on the user will be used up automatically. `!t`, `!tech` and `!technique` can be used interchangeably.

Examples:
* `!t 1` Performs the first technique on your tech list.
* `!tech Fi` Performs the first technique on your tech list starting with 'Fi' (i.e. Fireball).
* `!technique "Doom Fist"` Performs the first technique on your tech list starting with 'Doom Fist'.
* `!t Fireball 3` Performs the Fireball technique and rolls against 3 targets.
* `!t Fireball 1 +1` Performs the Fireball technique and rolls against 1 target with a +1 bonus to the attack roll.
* `!t "Doom F" 2 -1` Performs the Doom Fist technique and rolls against 2 targets with a -2 penalty to the attack roll.

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

Sets any selected characters to gain an amount of Valor per turn equal to the provided number. Use for Masters or anyone with the Limitless Power skill.

### Automatic Features
#### Status Tracker
A convenient tool for tracking self-targeted boosts. When a character gains such an effect, click their token, then put your mouse over the desired status marker and press 3. This will give it a 3-turn timer that will tick down every time their turn ends. When it reaches 0, the marker will vanish.

Note that this does not quite produce accurate behavior for effects placed by one character on another character, such as Weakens. For these, I recommend adding a label to the initiative tracker.

#### Valor Updater
After you finish adding all characters to the turn order, add a label to the bottom called 'Round' - this will mark when one round ends and the next begins. Every time it passes, characters will automatically gain Valor for the new round. The red bar is assumed to be Valor, and it won't give characters Valor unless they have a defined max Valor.

#### Max Value Sync
When a character's maximum HP or ST changes for any reason, their current HP or ST will change by the same amount.

#### Ongoing Effect Processor
When a character gains a regeneration or ongoing damage effect, add a label on the initiative right under them, and it will automatically process the effect after their turn.
- "Ongoing X" - The character will lose X HP at the end of each round.
- "Regen X" - The character will gain X HP at the end of each round.
- "SRegen X" - The character will gain X ST at the end of each round.

#### Token Status Sync
Disabled by default - **only enable this if you are NOT using the Valor Character Sheet.** If there are multiple player-controlled tokens representing the same character, then any changes to the HP, ST, or Valor of one will be reflected on all others.
