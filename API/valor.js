/**
 * VALOR API SCRIPTS
 * v1.3.2
 * 
 * INSTALLATION INSTRUCTIONS
 * 1. From campaign, go to API Scripts.
 * 2. Create a new script, and paste the contents of this file into it.
 * 3. Keeping the API window open, enter game, and run the !scan command.
 * 4. Check the API output console below to get your player ID.
 * 5. Set gmID on line 70 to your player ID.
 * 
 * PASSIVE FUNCTIONALITY
 * Status Tracker
 * - When adding status markers to a token for temporary effects, add a number
 * to it via pressing a number key.
 * - After their turn, the number will automatically decrement.
 * - When it reaches 0, the marker will vanish.
 * - Useful for self-boosts.
 * 
 * Valor Updater
 * - After filling out the turn order, add a new label called "Round".
 * - When Round reaches the top of the initiative, all characters with
 * a max Valor (red bar) will gain 1 Valor (or more if you've used !set-vrate).
 * 
 * Token Sync
 * - When a token's HP, ST, or Valor change, any other token with the same
 * attached character will have their values automatically set to match.
 * - Only applies to player-controlled characters.
 * - Disabled by default. Turn this on if you're not using the Valor Character 
 * Sheet.
 * 
 * Max Value Sync
 * - When a token's Max HP or Max ST changes, its current HP or ST will change
 * by the same amount.
 * 
 * Ongoing Effect Processor
 * - Add a label after someone's turn on the init tracker to apply an automatic
 * - effect each round.
 * - Ongoing X - lose X HP
 * - Regen X - gain X HP
 * - SRegen X - gain X ST
 * 
 * NEW COMMANDS
 * !scan
 * - Outputs to the logs the current player ID.
 * - Outputs URLs for the token images for all characters.
 * 
 * !set-bravado [value]
 * - Select one or more characters and enter '!set-bravado X'
 * - This will internally register the character as having Bravado at level X.
 * - You can ignore this if you're using the Valor Character Sheet.
 * 
 * !set-vrate [value]
 * - Select one or more characters and enter '!set-vrate X'
 * - Selected characters will now gain X valor per round.
 * - Default is 1.
 * 
 * !rest
 * - All tokens recover one increment of HP and ST.
 * - Valor is reset to 0, or higher if the character has the Bravado skill.
 * - Use with !set-bravado.
 * 
 * !fullrest
 * - All tokens recover all HP and ST.
 * - Valor is reset to 0, or higher if the character has the Bravado skill.
 * - Use with !set-bravado.
 **/

// Run !scan and replace this value with your player ID
state.gmID = '-KSJ7FD4vYrOmQ7bG0EF';

// Settings for passive functions - 'true' for on, 'false' for off.
state.statusTrackerEnabled = true;
state.valorUpdaterEnabled = true;
state.maxValueSyncEnabled = true;
state.ongoingEffectProcessor = true;
state.tokenSyncEnabled = false;

// Status Tracker
// While this is active, any numbered status markers will automatically
// decrement after their turn, vanishing when the number hits 0.
// Warning: Doesn't quite match Valor effect duration rules.
function trackStatuses(obj) {
    if(!state.statusTrackerEnabled) {
        // Settings check
        return;
    }
    
    var turnorder = JSON.parse(obj.get('turnorder'));
    if(!turnorder || turnorder.length === 0) {
        // Do nothing if the init tracker is empty
        return;
    }
    
    var lastCharId = turnorder[turnorder.length - 1].id;
    var lastChar = findObjs({id: lastCharId})[0];
    if(!lastChar) {
        // Do nothing if the last actor wasn't a character
        return;
    }
    
    var statusMarkers = lastChar.get('statusmarkers').split(',');
    var newStatusMarkers = [];
    statusMarkers.forEach(function(status) {
        if(status.indexOf('@') > -1) {
            // Reduce counter by 1
            var splits = status.split('@');
            var time = parseInt(splits[1]);
            time--;
            if(time > 0) {
                // Only persist marker if counter > 0
                status = splits[0] + '@' + time;
                newStatusMarkers.push(status);
            }
        } else {
            // Leave un-counted markers alone
            newStatusMarkers.push(status);
        }
    })
    
    var newStatusMarkersJoin = newStatusMarkers.join(',');
    lastChar.set('statusmarkers', newStatusMarkersJoin);
}

// Valor updater
// To use: Put a label on the turn tracker called 'Round' at the end of the
// round. When you reach the end of the round, all characters with a red
// bar max value will gain 1 Valor.
// Does not consider Masters or Limitless Power skill.
function updateValor(obj) {
    if(!state.valorUpdaterEnabled) {
        // Settings check
        return;
    }
    
    var turnorder = JSON.parse(obj.get('turnorder'));
    if(!turnorder || turnorder.length === 0) {
        // Do nothing if initiative tracker is empty
        return;
    }
    
    var topChar = turnorder[0];
    if(!topChar || topChar.custom != 'Round') {
        // Only continue if the 'Round' counter is at the top of the init order
        return;
    }

    if(!state.charData) {
        state.charData = {};
    }
    
    var page = Campaign().get('playerpageid');
    var tokens = findObjs({_type: 'graphic', layer:'objects', _pageid: page});
    tokens.forEach(function(token) {
        var maxValor = parseInt(token.get('bar3_max'));
        if(maxValor) {
            // If it has a max Valor, it's tracking Valor - raise it
            var valor = parseInt(token.get('bar3_value'));
            var valorRate = 1;
            if(state.charData[token.get('represents')] &&
                state.charData[token.get('represents')].valorRate) {
                valorRate = parseInt(state.charData[token.get('represents')].valorRate);
            }
            token.set('bar3_value', valor + valorRate);
            if(valor > maxValor) {
                token.set('bar3_value', maxValor);
            }
        }
    });
    
    log('Valor updated for new round.')
}

// Internal function - gets a list of skills and their levels for a character ID.
// Uses the Valor Character Sheet structure.
function getSkills(charId) {
    var rawSkills = filterObjs(function(obj) {
        if(obj.get('_type') == 'attribute' &&
           obj.get('_characterid') == charId &&
           obj.get('name').indexOf('repeating_skills') > -1) {
               return true;
        }
        return false;
    });
    
    var skills = [];
    
    rawSkills.forEach(function(rawSkill) {
        var skillName = rawSkill.get('name');
        var skillId = skillName.split('_')[2];
        
        var oldSkill = skills.find(function(s) {
            return s.id == skillId
        });
        
        if(skillName.indexOf('skillname') > -1) {
            if(oldSkill) {
                oldSkill.name = rawSkill.get('current');
            } else {
                skills.push({ id: skillId, name: rawSkill.get('current'), level: 1 });
            }
        } else if(skillName.indexOf('skilllevel') > -1) {
            var level = parseInt(rawSkill.get('current'));
            if(level == level) {
                // It's not NaN, so assign skill level
                if(oldSkill) {
                    oldSkill.level = level;
                } else {
                    skills.push({ id: skillId, level: level });
                }
            }
        }
    });
    
    return skills;
}

// Internal function - gets a list of flaws and their levels for a character ID.
// Uses the Valor Character Sheet structure.
function getFlaws(charId) {
    var rawFlaws = filterObjs(function(obj) {
        if(obj.get('_type') == 'attribute' &&
           obj.get('_characterid') == charId &&
           obj.get('name').indexOf('repeating_flaws') > -1) {
               return true;
        }
        return false;
    });
    
    var flaws = [];
    
    rawFlaws.forEach(function(rawFlaw) {
        var flawName = rawFlaw.get('name');
        var flawId = flawName.split('_')[2];
        
        var oldFlaw = flaws.find(function(s) {
            return s.id == flawId
        });
        
        if(flawName.indexOf('flawname') > -1) {
            if(oldFlaw) {
                oldFlaw.name = rawFlaw.get('current');
            } else {
                flaws.push({ id: flawId, name: rawFlaw.get('current'), level: 1 });
            }
        } else if(flawName.indexOf('flawlevel') > -1) {
            var level = parseInt(rawFlaw.get('current'));
            if(level == level) {
                // It's not NaN, so assign flaw level
                if(oldFlaw) {
                    oldFlaw.level = level;
                } else {
                    flaws.push({ id: flawId, level: level });
                }
            }
        }
    });
    
    return flaws;
}

// !scan command
// Enter !scan in the chat to output each character's token image URL to the 
// logs.
// Also displays the speaking player's ID.
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!scan') == 0) {
        // Get GM ID
        log('Your player ID: ' + msg.playerid);
        
        var tokens = findObjs({_type: 'graphic'});
        var usedNames = [];
        
        // Get image URLs
        tokens.forEach(function(token) {
            var name = token.get('name');
            if(name !== '') {
                var imgsrc = token.get('imgsrc');
                if(imgsrc.indexOf('med.png') > -1) {
                    // For setting imgsrc, you always want the thumb.png
                    var split = imgsrc.split('med.png');
                    imgsrc = split[0] + 'thumb.png' + split[1];
                }
                if(usedNames.indexOf(name) == -1) {
                    log(name + ' Graphic: ' + imgsrc);
                    usedNames.push(name);
                }
            }
       });
    }
});

// !rest command
// Enter !rest in the chat to recover an Increment of HP/ST for each character.
// Also sets everyone's Valor to starting value.
// Does not consider Fast Healer skill.
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!rest') == 0
        && msg.playerid === state.gmID) {
        var page = Campaign().get('playerpageid');
        var tokens = findObjs({_type: 'graphic', layer:'objects', _pageid: page});
       
        tokens.forEach(function(token) {
            var hp = parseInt(token.get('bar1_value'));
            var maxHp = parseInt(token.get('bar1_max'));
            var st = parseInt(token.get('bar2_value'));
            var maxSt = parseInt(token.get('bar2_max'));
            
            var skills = getSkills(token.get('represents'));
            var flaws = getFlaws(token.get('represents'));
            log(flaws);
            
            // Restore Health
            if(maxHp) {
                if(hp < 0) {
                    hp = 0;
                }
                
                var hpRestore = maxHp / 5;
                
                // Check for Fast Healing
                if(skills.find(function(s) {
                    return s.name == 'fastHealing';
                })) {
                    var di = getAttrByName(token.get('represents'), 'di');
                    if(di) {
                        hpRestore += di;
                    }
                }
                
                hp += hpRestore;
                if(hp > maxHp) {
                    hp = maxHp;
                }
                token.set('bar1_value', hp);
            }
            
            // Restore Stamina
            if(maxSt) {
                if(st < 0) {
                    st = 0;
                }
                st += maxSt / 5;
                if(st > maxSt) {
                    st = maxSt;
                }
                token.set('bar2_value', st);
            }
            
            // Reset Valor
            var startingValor = 0;
            if(skills && skills.length > 0) {
                var bravado = skills.find(function(s) {
                    return s.name == 'bravado';
                });
                if(bravado && bravado.level) {
                    startingValor = bravado.level;
                }
                
                if(flaws) {
                    var weakWilled = flaws.find(function(f) {
                        return f.name == 'weakWilled';
                    });
                    if(weakWilled && weakWilled.level) {
                        startingValor = -weakWilled.level;
                    }
                }
            } else {
                // No skillset found - use set-bravado value instead
                if(state.charData[token.get('represents')] &&
                    state.charData[token.get('represents')].bravado) {
                    startingValor = state.charData[token.get('represents')].bravado;
                }
            }
            token.set('bar3_value', startingValor);
        });
        
        log('Partial rest complete.')
    }
});

// !fullrest command
// Enter !fullrest in the chat to recover all HP/ST for all characters.
// Also sets everyone's Valor to starting values.
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!fullrest') == 0
        && msg.playerid === state.gmID) {
        var page = Campaign().get('playerpageid');
        var tokens = findObjs({_type: 'graphic', layer:'objects', _pageid: page});
       
        if(!state.charData) {
            state.charData = {};
        }
        
        tokens.forEach(function(token) {
            token.set('bar1_value', token.get('bar1_max'));
            token.set('bar2_value', token.get('bar2_max'));
            
            // Reset Valor
            var startingValor = 0;
            var skills = getSkills(token.get('represents'));
            if(skills) {
                var bravado = skills.find(function(s) {
                    return s.name == 'bravado';
                });
                if(bravado && bravado.level) {
                    startingValor = bravado.level;
                }
            } else {
                // No skillset found - use set-bravado value instead
                if(state.charData[token.get('represents')] &&
                    state.charData[token.get('represents')].bravado) {
                    startingValor = state.charData[token.get('represents')].bravado;
                }
            }
            token.set('bar3_value', startingValor);
        });
        
        log('Full rest complete.')
    }
});

// !set-bravado command
// Enter !set-bravado X in the chat to assign the selected character a Bravado
// skill of level X.
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!set-bravado') == 0
        && msg.playerid === state.gmID) {
        var args = msg.content.split(/\s+/);
        
        if(args.length < 2) {
            log('Format: !set-bravado 2');
            return;
        }
        
        var setBravado = parseInt(args[1]);
        if(!state.charData) {
            state.charData = {};
        }
        
        msg.selected.forEach(function(s) {
            var token = getObj('graphic', s._id);
            if(token.get('represents') != '') {
                var id = token.get('represents');
                if(!state.charData[id]) {
                    state.charData[id] = {};
                }
                
                state.charData[id].bravado = setBravado;
                log('Set Bravado level to ' + setBravado + ' for ' + token.get('name') +'.');
            }
        });
    }
});

// !set-vrate command
// Enter !set-vrate X in the chat to make the selected character gain
// X valor each round.
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!set-vrate') == 0
        && msg.playerid === state.gmID) {
        var args = msg.content.split(/\s+/);
        if(args.length < 2) {
            log('Format: !set-vrate 2');
            return;
        }
        
        var setRate = parseInt(args[1]);
        if(!state.charData) {
            state.charData = {};
        }
        
        msg.selected.forEach(function(s) {
            var token = getObj('graphic', s._id);
            if(token.get('represents') != '') {
                var id = token.get('represents');
                if(!state.charData[id]) {
                    state.charData[id] = {};
                }
                
                state.charData[id].valorRate = setRate;
                log('Set Valor generation rate to ' + setRate + ' per turn ' + token.get('name') +'.');
            }
        });
    }
});

// PC token sync function
// Makes all stats for player-controlled tokens with the same name to stay in sync
// with each other across maps.
on('change:graphic', function(obj, prev) {
    if(!state.tokenSyncEnabled) {
        return;
    }
    
    if(obj.get('represents') == '') {
        // Do nothing if the updated token has no backing character
        return;
    }
    
    if(!prev) {
        return;
    }
    
    if(obj.get('bar1_value') == prev.bar1_value &&
       obj.get('bar2_value') == prev.bar2_value &&
       obj.get('bar3_value') == prev.bar3_value &&
       obj.get('bar1_max') == prev.bar1_max &&
       obj.get('bar2_max') == prev.bar2_max &&
       obj.get('bar3_max') == prev.bar3_max) {
        // Do nothing if none of the bars changed
        return;
    }
    
    var character = getObj('character', obj.get('represents'));
    var player = character.get('controlledby');
    if(player != '') {
        var bar1Value = obj.get('bar1_value');
        var bar2Value = obj.get('bar2_value');
        var bar3Value = obj.get('bar3_value');
        var bar1Max = obj.get('bar1_max');
        var bar2Max = obj.get('bar2_max');
        var bar3Max = obj.get('bar3_max');
        
        var sameTokens = findObjs({_type: "graphic", represents: character.get('_id')});
        sameTokens.forEach(function(token) {
            if(token.get('_id') != obj.get('_id')) {
                token.set('bar1_value', bar1Value);
                token.set('bar2_value', bar2Value);
                token.set('bar3_value', bar3Value);
                token.set('bar1_max', bar1Max);
                token.set('bar2_max', bar2Max);
                token.set('bar3_max', bar3Max);
            }
        });
    }
});

// Max Value sync function
// Makes HP and ST move in sync with their max values.
on('change:graphic', function(obj, prev) {
    if(!state.maxValueSyncEnabled) {
        return;
    }
    if(obj.get('represents') == '') {
        // Do nothing if the updated token has no backing character
        return;
    }
    
    if(!prev) {
        return;
    }
    if(obj.get('bar1_max') == prev.bar1_max &&
       obj.get('bar2_max') == prev.bar2_max) {
        // Do nothing if none of the max values changed
        return;
    }
    
    if(obj.get('bar1_max') && prev.bar1_max) {
        var bar1Value = parseInt(obj.get('bar1_value'));
        var bar1Change = parseInt(obj.get('bar1_max')) - prev.bar1_max;
        
        if(bar1Value) {
            obj.set('bar1_value', bar1Value + bar1Change);
        }
    }
    
    if(obj.get('bar2_max') && prev.bar2_max) {
        var bar2Value = parseInt(obj.get('bar2_value'));
        var bar2Change = parseInt(obj.get('bar2_max')) - prev.bar2_max;
        
        if(bar2Value) {
            obj.set('bar2_value', bar2Value + bar2Change);
        }
    }
});

// Ongoing Effect Processor
// Add a label under someone to apply an effect to them each time their turn ends.
// "Ongoing X" - lose X HP
// "Regen X" - gain X HP
// "SRegen X" - gain X ST
function processOngoingEffects(obj) {
    if(!state.ongoingEffectProcessor) {
        // Settings check
        return;
    }
    
    var turnorder = JSON.parse(obj.get('turnorder'));
    if(!turnorder || turnorder.length === 0) {
        // Do nothing if the init tracker is empty
        return;
    }
    
    var topChar = turnorder[0];
    if(!topChar || (topChar.custom.indexOf('Ongoing') == -1 && 
        topChar.custom.indexOf('Regen') == -1 &&
        topChar.custom.indexOf('SRegen') == -1)) {
        // Do nothing if the top label isn't Ongoing, Regen or SRegen
        return;
    }
    
    // Scan backwards for the character this condition applies to
    var i = turnorder.length - 1;
    var lastCharId = turnorder[i].id;
    var lastChar = getObj('graphic', lastCharId);
    while(!lastChar) {
        i--;
        if(i == 0) {
            // We didn't find anyone - abort
            return;
        }
        lastCharId = turnorder[i].id;
        lastChar = getObj('graphic', lastCharId);
    }
    
    // Update HP or ST
    var parts = topChar.custom.split(' ');
    var value = parseInt(parts[1]);
    if(parts[0] === 'Ongoing') {
        lastChar.set('bar1_value', lastChar.get('bar1_value') - value);
        log('Dealt ' + value + ' ongoing damage to ' + lastChar.get('name') + '.');
    } else if(parts[0] === 'Regen') {
        lastChar.set('bar1_value', parseInt(lastChar.get('bar1_value')) + value);
        if(lastChar.get('bar1_value') > lastChar.get('bar1_max')) {
            lastChar.set('bar1_value', lastChar.get('bar1_max'));
        }
        log('Regenerated ' + value + ' HP for ' + lastChar.get('name') + '.');
    } else if(parts[0] === 'SRegen') {
        lastChar.set('bar2_value', parseInt(lastChar.get('bar2_value')) + value);
        if(lastChar.get('bar2_value') > lastChar.get('bar2_max')) {
            lastChar.set('bar2_value', lastChar.get('bar2_max'));
        }
        log('Regenerated ' + value + ' ST for ' + lastChar.get('name') + '.');
    }
}

// Master Init Loop
// Only triggers on-init-change events when the person at the top of the
// initiative list changes.
// Prevents repeat events when adjusting other things on the init list.
on('change:campaign:turnorder', function(obj) {
    var turnorder = JSON.parse(obj.get('turnorder'));
    if(!turnorder || turnorder.length === 0) {
        // Do nothing if the init tracker is empty
        return;
    }
    
    var topChar = turnorder[0];
    
    if(state.lastActor) {
        var nextActor;
        // Get a label or ID for the current top actor
        if(topChar.custom) {
            nextActor = topChar.custom;
        } else {
            nextActor = topChar.id;
        }
        
        // If the top actor changed, the turn order advanced - do stuff
        if(state.lastActor !== nextActor) {
            state.lastActor = nextActor;
            updateValor(obj);
            trackStatuses(obj);
            processOngoingEffects(obj);
        }
    } else {
        if(topChar.custom) {
            state.lastActor = topChar.custom;
        } else {
            state.lastActor = topChar.id;
        }
    }
});

/**
 * Changelog
 * 
 * v1.0: Initial release.
 * 
 * v1.1:
 * - New feature: Auto-processing of ongoing damage and HP regeneration.
 * - Bugfix: Valor gains at end of round would sometimes be calculated multiple times.
 * 
 * v1.2:
 * - New command: !set-vrate
 * 
 * v1.2.1:
 * - Bugfix: Script would crash if you used Valor auto-tracking before ever using !set-bravado.
 * 
 * v1.2.2:
 * - Bugfix: Strange behavior from token sync when changing the names of tokens.
 * - Refactor: Added more code comments.
 * 
 * v1.3:
 * - Get Bravado and Fast Healing values from Valor Character Sheet.
 * 
 * v1.3.1:
 * - Get Weak Willed from the Valor Character Sheet.
 * - Update current HP when Max HP changes.
 * 
 * v1.3.2:
 * - Bugfix: Max sync and associating values with character sheets could crash the script.
 **/