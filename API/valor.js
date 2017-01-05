/**
 * VALOR API SCRIPTS
 * v1.6.2
 * 
 * INSTALLATION INSTRUCTIONS
 * 1. From campaign, go to API Scripts.
 * 2. Create a new script, and paste the contents of this file into it.
 * 3. Click Save Script.
 * 
 * PASSIVE FUNCTIONALITY
 * Status Tracker
 * - When a character gains a temporary status, add it to the init tracker as
 * a label after their turn and a Round Calculation of -1.
 * - When its timer ticks down to 0, it will automatically be removed from the
 * list, and the chat will be informed.
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
 * - Outputs URLs for the token images for all characters.
 * 
 * !t [tech] [targets] [bonus]
 * - Performs a Technique. Requires Valor Character sheet.
 * - For "tech", put either a number or the beginning of the tech name. 
 * - Identifies the actor via selected token or 'As:' field or who you control.
 * - Rolls against the indicated number of targets (Default 1).
 * - Adds a bonus value to all rolls (Default 0).
 * - Automatically subtracks Stamina, Health, Initiative and Valor from cost/limits.
 * 
 * !t-undo
 * - Reverts usage of previous technique, restoring all lost resources.
 * - Can remember up to 20 technique usages.
 * 
 * !e [Label] [duration]
 * - Adds a temporary effect created by the selected character to the turn 
 * tracker.
 * - By default, the duration is 3 turns.
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
 * - You can ignore this if you're using the Valor Character Sheet.
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

// Settings for passive functions - 'true' for on, 'false' for off.
state.statusTrackerEnabled = true;
state.valorUpdaterEnabled = true;
state.maxValueSyncEnabled = true;
state.ongoingEffectProcessor = true;
state.tokenSyncEnabled = false;
state.ignoreLimitsOnMinions = true; // Disables limit blocking for Flunkies and Soldiers.

// Status Tracker
// While this is active, any numbered status markers will automatically
// decrement after their turn, vanishing when the number hits 0.
// Warning: Doesn't quite match Valor effect duration rules.
function trackStatuses(turnOrder) {
    if(!state.statusTrackerEnabled) {
        // Settings check
        return;
    }
    
    var newTurnOrder = turnOrder;
    if(!newTurnOrder || newTurnOrder.length === 0) {
        // Do nothing if the init tracker is empty
        return;
    }
    
    if(newTurnOrder[0].id != '-1') {
        // Do nothing if the last actor was a character
        return;
    }
    
    if(newTurnOrder[0].pr == 0 && newTurnOrder[0].formula == '-1') {
        // A countdown effect ended
        sendChat('Valor', "Effect '" + newTurnOrder[0].custom + "' has ended.");
        newTurnOrder = newTurnOrder.slice(1);
        // Auto-reduce the next item if it's an effect too
        if(newTurnOrder[0].formula == '-1') {
            newTurnOrder[0].pr--;
        }
        Campaign().set('turnorder', JSON.stringify(newTurnOrder));
        trackStatuses(newTurnOrder);
    }
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

// Internal function - gets a list of techs and their levels for a character ID.
// Uses the Valor Character Sheet structure.
function getTechs(charId) {
    var rawTechs = filterObjs(function(obj) {
        if(obj.get('_type') == 'attribute' &&
           (!charId || obj.get('_characterid') == charId) &&
           obj.get('name').indexOf('repeating_techs') > -1) {
               return true;
        }
        return false;
    });
    
    var techs = [];
    rawTechs.forEach(function(rawTech) {
        var techName = rawTech.get('name');
        var techId = techName.split('_')[2];
        
        var oldTech = techs.find(function(s) {
            return s.id == techId
        });
        
        if(techName.indexOf('tech_name') > -1) {
            if(oldTech) {
                oldTech.name = rawTech.get('current');
            } else {
                techs.push({ id: techId, name: rawTech.get('current')});
            }
        } else if(techName.indexOf('tech_core') > -1 && 
                  techName.indexOf('tech_core_') == -1) {
            if(oldTech) {
                oldTech.core = rawTech.get('current');
            } else {
                techs.push({ id: techId, core: rawTech.get('current')});
            }
        } else if(techName.indexOf('tech_stat') > -1) {
            if(oldTech) {
                oldTech.stat = rawTech.get('current');
            } else {
                techs.push({ id: techId, stat: rawTech.get('current')});
            }
        } else if(techName.indexOf('tech_micro_summary') > -1) {
            if(oldTech) {
                oldTech.summary = rawTech.get('current');
            } else {
                techs.push({ id: techId, summary: rawTech.get('current')});
            }
        } else if(techName.indexOf('tech_cost') > -1) {
            var cost = parseInt(rawTech.get('current'));
            if(cost != cost) {
                cost = 0;
            }
            
            if(oldTech) {
                oldTech.cost = cost;
            } else {
                techs.push({ id: techId, cost: cost});
            }
        } else if(techName.indexOf('tech_limits') > -1) {
            var limits = rawTech.get('current').split('\n');
            
            if(oldTech) {
                oldTech.limits = limits;
            } else {
                techs.push({ id: techId, limits: limits});
            }
        } else if(techName.indexOf('tech_mods') > -1) {
            var mods = rawTech.get('current').split('\n');
            
            if(oldTech) {
                oldTech.mods = mods;
            } else {
                techs.push({ id: techId, mods: mods});
            }
        } else if(techName.indexOf('tech_micro_summary') > -1) {
            if(oldTech) {
                oldTech.summary = rawTech.get('current');
            } else {
                techs.push({ id: techId, summary: rawTech.get('current')});
            }
        } else if(techName.indexOf('tech_is_mimic') > -1) {
            if(oldTech) {
                oldTech.isMimic = rawTech.get('current');
            } else {
                techs.push({ id: techId, isMimic: rawTech.get('current')});
            }
        } else if(techName.indexOf('tech_mimic_target') > -1) {
            if(oldTech) {
                oldTech.mimicTarget = rawTech.get('current');
            } else {
                techs.push({ id: techId, mimicTarget: rawTech.get('current')});
            }
        } else if(techName.indexOf('tech_core_level') > -1) {
            var coreLevel = parseInt(rawTech.get('current'));
            if(coreLevel != coreLevel) {
                coreLevel = 0;
            }
            if(oldTech) {
                oldTech.coreLevel = coreLevel;
            } else {
                techs.push({ id: techId, coreLevel: coreLevel});
            }
        } else if(techName.indexOf('tech_level') > -1) {
            var techLevel = parseInt(rawTech.get('current'));
            if(techLevel != techLevel) {
                techLevel = 0;
            }
            if(oldTech) {
                oldTech.techLevel = techLevel;
            } else {
                techs.push({ id: techId, techLevel: techLevel});
            }
        } else if(techName.indexOf('tech_tech_stat') > -1) {
            if(oldTech) {
                oldTech.techStat = rawTech.get('current');
            } else {
                techs.push({ id: techId, techLevel: rawTech.get('current')});
            }
        }
    });
    
    return techs;
}

function getTechByName(techId, charId) {
    if(!techId) {
        return undefined;
    }
    
    var techs = getTechs(charId);
    var tech;
    // They put a string, pull up tech by name
    var matchingTech = techs.find(function(t) {
        return t && t.name && 
        t.name.toLowerCase().indexOf(techId.toLowerCase()) == 0;
    });
    
    if(matchingTech) {
        tech = matchingTech;
    } else {
		// Drop the Starts With requirement and try again
		matchingTech = techs.find(function(t) {
			return t.name.toLowerCase().indexOf(techId.toLowerCase()) > -1;
		});
		if(matchingTech) {
			tech = matchingTech;
		} else {
			// Drop all non-alphanumeric characters and try again
			var alphaTechId = techId.replace(/\W/g, '');
			matchingTech = techs.find(function(t) {
				return t && t.name &&
				t.name.toLowerCase().replace(/\W/g, '').indexOf(alphaTechId.toLowerCase()) > -1;
			});
			if(matchingTech) {
				tech = matchingTech;
			}
		}
    }
    
    if(tech && tech.core == 'mimic' && tech.mimicTarget && charId) {
        // Re-get the mimicked technique
        var mimicTech = tech;
        tech = getTechByName(tech.mimicTarget);
        tech.name = mimicTech.name + ' [' + tech.name + ']';

        // Revise core level
        tech.coreLevel = mimicTech.coreLevel - (tech.techLevel - tech.coreLevel);
        
        if(tech.coreLevel <= 0) {
            // Set core type back to mimic so that invocation can see it
            tech.core = 'mimic';
        } else {
            // Recalculate healing/damage
            switch(tech.core) {
                case 'damage':
                    var piercing = tech.mods.find(function(m) {
                        return m.toLowerCase().indexOf('piercing') > -1;
                    });
                    var damage = (tech.coreLevel + 3) * 5;
                    var atk = getAttrByName(charId, tech.stat + 'Atk');
                    if(piercing) {
                        damage = (tech.coreLevel + 3) * 4;
                        atk = Math.ceil(atk / 2);
                    }
                    damage += atk;
                    
                    tech.summary = 'Damage: <span style="color: darkred">**' + 
                                   damage +
                                   ((tech.stat == 'str' || tech.stat == 'agi') ?
                                   '**</span> - Defense' :
                                   '**</span> - Resistance');
                    break;
                case 'healing':
                    var healing = (tech.coreLevel + 3) * 5;
                    var power = getAttrByName(charId, tech.stat);
                    healing += power;
                    
                    tech.summary = 'Restores <span style="color:darkgreen">**' + healing + '**</span> HP'
                    break;
            }
        }
        
        // Roll using the chosen stat
        tech.stat = mimicTech.stat;
    }
    
    if(tech && !tech.core) {
        tech.core = 'damage';
    }
    return tech;
}

// Actor Identifier
// Takes a message and identifies the character associated with it.
// Priority 1: Selected token.
// Priority 2: 'As:' field.
// Priority 3: Any character controlled by the player.
function getActor(msg) {
	var actor;
	if(msg.selected && msg.selected.length > 0) {
		// The first selected character is the actor
		var token = getObj('graphic', msg.selected[0]._id);
		actor = getObj('character', token.get('represents'));
	} else {
		// Try to find a character who matches the "Who" block for the speaker
		var characters = filterObjs(function(obj) {
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
        var charId = token.get('represents');
        var maxValor = parseInt(token.get('bar3_max'));
        if(maxValor) {
            // If it has a max Valor, it's tracking Valor - raise it
            var valor = parseInt(token.get('bar3_value'));
            var valorRate = 1;
            
            if(state.charData[charId] &&
                state.charData[charId].valorRate &&
                parseInt(state.charData[charId].valorRate) != 1) {
                valorRate = parseInt(state.charData[charId].valorRate);
            } else {
                var charClass = getAttrByName(charId, 'type');
                if(charClass == 'master') {
                    // +1 to hit for Masters
                    valorRate *= 2;
                }
            }
            
            valor += valorRate;
            var skills = getSkills(charId);
            
            if(skills && skills.length > 0) {
                var bounceBack = skills.find(function(s) {
                    return s.name == 'bounceBack';
                });
                if(bounceBack && valor < 0) {
                    valor++;
                }
            }
            
            token.set('bar3_value', valor);
            if(valor > maxValor) {
                token.set('bar3_value', maxValor);
            }
            
        }
    });
    
    log('Valor updated for new round.')
}

function alertCooldowns() {
	var turnOrder;
    if(Campaign().get('turnorder') == '') {
        turnOrder = [];
    } else {
        turnOrder = JSON.parse(Campaign().get('turnorder'));
    }
    
    var roundItem = turnOrder.find(function(t) {
		return t && t.custom && 
		t.custom.toLowerCase() == 'round';
	});
	var round = roundItem ? roundItem.pr : 0;
	if(!round) {
	    return;
	}
	
	if(!state.techData) {
	    state.techData = {};
	}
	
	for(var key in state.techData) {
	    if(state.techData.hasOwnProperty(key)) {
	        var techData = state.techData[key];
	        var tech = getTechByName(techData.techName, techData.userId);
	        
	        // Look for cooldown limit
	        if(tech.limits) {
    			var cooldownLimit = tech.limits.find(function(l) {
    				return l.toLowerCase().indexOf('cooldown') == 0;
    			});
    			
    			if(cooldownLimit) {
    				var cooldownLimitSplit = cooldownLimit.split(' ');
    				var cooldownLimitLevel = parseInt(cooldownLimitSplit[cooldownLimitSplit.length - 1]);
    				if(cooldownLimitLevel != cooldownLimitLevel) {
    					cooldownLimitLevel = 1;
    				}
    				
    				if(techData.timesUsed.length > 0) {
        				var lastTurnUsed = techData.timesUsed[techData.timesUsed.length - 1];
        				if(round == lastTurnUsed + cooldownLimitLevel + 1) {
    	    			    sendChat('Valor', '/w "' + techData.userName + '" Technique "' + techData.techName + '" is no longer on cooldown.');
        				}
    				}
    			}
	        }
	    }
	}
}

// !scan command
// Enter !scan in the chat to output each character's token image URL to the 
// logs.
// Also displays the speaking player's ID.
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!scan') == 0) {
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

// !tech command
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!t ') == 0 || 
    msg.type == 'api' && msg.content.indexOf('!tech') == 0) {
        // Get params
        var split = msg.content.match(/(".*?")|(\S+)/g);
        if(split.length < 2) {
            log('Not enough arguments.');
            return;
        }
		
        // Figure out who's using a tech
		var actor;
		
		// Check for --as parameter
		var asParam = split.indexOf('--as');
		if(asParam > -1 && split.length > asParam + 1) {
			var asInput = split[asParam + 1];
			if(asInput[0] == '"') {
				asInput = asInput.substring(1, asInput.length - 1);
			}
			
			// Find a character with this name			
			var characters = filterObjs(function(obj) {
				return obj.get('_type') === 'character' &&
					   obj.get('_id') === asInput;
			});
			
			if(characters.length > 0) {
				actor = characters[0];
				split.splice(asParam, 2);
			}
		}

		// Check for --override parameter
		var overrideLimits = split.indexOf('--override') > -1;
		
		// --as failed or wasn't used, find through other means
		if(!actor) {
			actor = getActor(msg);
		}
		if(!actor) {
			log('No usable character found for ' + msg.playerid);
			return;
		}
        var actorClass = getAttrByName(actor.get('_id'), 'type');
        
		// Get the initiative tracker, we may need it later
		var turnOrder;
        if(Campaign().get('turnorder') == '') {
            turnOrder = [];
        } else {
            turnOrder = JSON.parse(Campaign().get('turnorder'));
        }
        
	    var roundItem = turnOrder.find(function(t) {
			return t && t.custom && 
			t.custom.toLowerCase() == 'round';
		});
		var round = roundItem ? roundItem.pr : 0;
		
        // Use selected token or first token on active page that represents character
        var token;
        if(msg.selected && msg.selected.length > 0) {
            token = getObj('graphic', msg.selected[0]._id);
        } else {
            var tokens = findObjs({
                _pageid: Campaign().get("playerpageid"),                              
                _type: "graphic",
				represents: actor.get('_id')
            });
            if(tokens.length > 0) {
                token = tokens[0];
            }
        }
        
        // Identify the technique
        var techId = split[1];
		var nextParam = 2;
		while(nextParam < split.length && parseInt(split[nextParam]) != parseInt(split[nextParam])) {
			techId += ' ' + split[nextParam];
			nextParam++;
		}
		
        var tech = getTechByName(techId, actor.get('_id'));
		
        if(!tech) {
		    log('Tech does not exist.');
		    sendChat('Valor', '/w "' + msg.who + "\" I can't find that technique.");
		    return;
        }
        
        // Failed mimic check
        if(tech.core == 'mimic' && tech.coreLevel <= 0) {
		    sendChat('Valor', '/w "' + actor.get('name') + '" ' + 'Core Level is too low to mimic this technique.');
            return;
        }
        
        // Pull tech usage data from the state
        var techDataId = actor.get('_id') + '.' + tech.name;
        if(!state.techData) {
            state.techData = {};
        }
        if(!state.techData[techDataId]) {
            state.techData[techDataId] = {
                timesUsed: [],
                techName: tech.name,
                userId: actor.get('_id'),
                userName: actor.get('name')
            };
        }
        var techData = state.techData[techDataId];
        
        // Check for blocking limits
		if(tech.limits && !overrideLimits && 
		        (!state.ignoreStaminaOnMinions || 
                (actorClass != 'flunky' && actorClass != 'soldier'))) {
		    var blocked = false;
		    var errorMessage = '';
		    
            // Check stamina
		    var st = parseInt(token.get('bar1_value'));
		    
		    if(st == st && st < tech.cost) {
		        errorMessage += "You don't have enough Stamina to use this Technique.<br>";
		        blocked = true;
		    }
		    
		    // Check valor limit
			var valorLimit = tech.limits.find(function(l) {
			    var name = l.toLowerCase();
				return ((name.indexOf('valor') == 0 &&
				         name.indexOf('valor c') != 0) ||
				         name.indexOf('ultimate v') == 0);
			});
			
			if(valorLimit) {
				var valorLimitSplit = valorLimit.split(' ');
				var valorLimitLevel = parseInt(valorLimitSplit[valorLimitSplit.length - 1]);
				if(valorLimitLevel != valorLimitLevel) {
					valorLimitLevel = 1;
				}
				
				var currentValor = getAttrByName(actor.get('_id'), 'valor');
				if(currentValor < valorLimitLevel) {
				    errorMessage += 'You need at least ' + valorLimitLevel + ' Valor to use this Technique.<br>';
				    blocked = true;
				}
			}
			
			// Check Injury Limit
			var injuryLimit = tech.limits.find(function(l) {
				return l.toLowerCase().indexOf('injury') == 0;
			});
			
			if(injuryLimit) {
				var injuryLimitSplit = injuryLimit.split(' ');
				var injuryLimitLevel = parseInt(injuryLimitSplit[injuryLimitSplit.length - 1]);
				if(injuryLimitLevel != injuryLimitLevel) {
					injuryLimitLevel = 1;
				}
				
				var hp = parseInt(token.get('bar1_value'));
				var hpMax = parseInt(token.get('bar1_max'));
				var hpTarget = Math.ceil(hpMax / 5 * (5 - injuryLimitLevel));
				
				if(hp > hpTarget) {
				    errorMessage += 'Your Health must be ' + hpTarget + ' or lower to use this Technique.<br>';
				    blocked = true;
				}
			}
			
			// Check Initiative Limit
			var initiativeLimit = tech.limits.find(function(l) {
				return l.toLowerCase().indexOf('init') == 0;
			});
			
			if(initiativeLimit) {
				var initiativeLimitSplit = initiativeLimit.split(' ');
				var initiativeLimitLevel = parseInt(initiativeLimitSplit[initiativeLimitSplit.length - 1]);
				if(initiativeLimitLevel != initiativeLimitLevel) {
					initiativeLimitLevel = 1;
				}
				
                turnOrder.forEach(function(turn) {
                    if(turn && turn.id === token.get('_id')) {
                        if(turn.pr <= initiativeLimitLevel) {
                            errorMessage += 'Your Initiative is too low to use this Technique.<br>';
                            blocked = true;
                        }
                    }
                });
			}
			
			// Check Set-Up Limit
			var setUpLimit = tech.limits.find(function(l) {
				return l.toLowerCase().indexOf('set') == 0;
			});
			
			if(setUpLimit) {
				if(round) {
    				var setUpLimitSplit = setUpLimit.split(' ');
    				var setUpLimitLevel = parseInt(setUpLimitSplit[setUpLimitSplit.length - 1]);
    				if(setUpLimitLevel != setUpLimitLevel) {
    					setUpLimitLevel = 1;
    				}
    				
    				if(round <= setUpLimitLevel) {
    				    errorMessage += "You can't use this Technique until round " + (setUpLimitLevel + 1) + '.<br>';
    				    blocked = true;
    				}
				}
			}
			
			// Check Ammunition Limit
			var ammoLimit = tech.limits.find(function(l) {
				return l.toLowerCase().indexOf('amm') == 0;
			});
			
			if(ammoLimit) {
				var ammoLimitSplit = ammoLimit.split(' ');
				var ammoLimitLevel = parseInt(ammoLimitSplit[ammoLimitSplit.length - 1]);
				if(ammoLimitLevel != ammoLimitLevel) {
					ammoLimitLevel = 1;
				}
				
				if(techData.timesUsed.length > 3 - ammoLimitLevel) {
				    errorMessage += 'This Technique is out of ammunition.<br>';
				    blocked = true;
				}
			}
			
			// Check Cooldown Limit
			var cooldownLimit = tech.limits.find(function(l) {
				return l.toLowerCase().indexOf('cooldown') == 0;
			});
			
			if(cooldownLimit && round) {
				var cooldownLimitSplit = cooldownLimit.split(' ');
				var cooldownLimitLevel = parseInt(cooldownLimitSplit[cooldownLimitSplit.length - 1]);
				if(cooldownLimitLevel != cooldownLimitLevel) {
					cooldownLimitLevel = 1;
				}
				
				if(techData.timesUsed.length > 0) {
    				var lastTurnUsed = techData.timesUsed[techData.timesUsed.length - 1];
    				if(round <= lastTurnUsed + cooldownLimitLevel) {
    				    errorMessage += 'This Technique is still on cooldown.<br>'
    				    blocked = true;
    				}
				}
			}
			
			if(blocked) {
			    var cleanButton = msg.content.replace(/\"/g, '&#' + '34;'); // Concatenated to keep the editor from freaking out
			    errorMessage += '[Override](' + cleanButton + ' --override)';
			    sendChat('Valor', '/w "' + actor.get('name') + '" ' + errorMessage);
			    return;
			}
		}
        
        var rollText = '';
        
        if(tech.core == 'damage' ||
           tech.core == 'ultDamage' ||
           tech.core == 'weaken') {
            var targets = 1;
            var rollBonus = 0;
            while(split.length > nextParam) {
                if(split[nextParam].indexOf('+') == -1 && split[nextParam].indexOf('-') == -1) {
					var inputTargets = parseInt(split[nextParam]);
					if(inputTargets == inputTargets) {
						targets = inputTargets;
					}
					if(targets > 20) {
						targets = 20;
					}
				} else {
					var inputRollBonus = split[nextParam];
					if(inputRollBonus.indexOf('+') == 0) {
						inputRollBonus = inputRollBonus.substring(1);
						// Roll button can potentially add a second +, so check again
    					if(inputRollBonus.indexOf('+') == 0) {
    						inputRollBonus = inputRollBonus.substring(1);
    					}
					}
					var parsedBonus = parseInt(inputRollBonus);
					if(parsedBonus == parsedBonus) {
						rollBonus = parsedBonus;
					}
				}
				nextParam++;
            }
            
            if(actorClass == 'master') {
                // +1 to hit for Masters
                rollBonus++;
            }
            
            var roll = 0;
            
            switch(tech.stat) {
                case 'str':
                    rollText += 'Rolling Muscle';
                    roll = parseInt(getAttrByName(actor.get('_id'), 'mus')) + rollBonus;
                    break;
                case 'agi':
                    rollText += 'Rolling Dexterity';
                    roll = parseInt(getAttrByName(actor.get('_id'), 'dex')) + rollBonus;
                    break;
                case 'spr':
                    rollText += 'Rolling Aura';
                    roll = parseInt(getAttrByName(actor.get('_id'), 'aur')) + rollBonus;
                    break;
                case 'mnd':
                    rollText += 'Rolling Intuition';
                    roll = parseInt(getAttrByName(actor.get('_id'), 'int')) + rollBonus;
                    break;
                case 'gut':
                    rollText += 'Rolling Resolve';
                    roll = parseInt(getAttrByName(actor.get('_id'), 'res')) + rollBonus;
                    break;
            }
			
            var accurate = tech.mods.find(function(m) {
                return m.toLowerCase().indexOf('accurate') > -1;
            });
            
            if(accurate) {
                rollBonus += 2;
            }
            
            if(rollBonus > 0) {
                rollText += '+' + rollBonus;
            } else if(rollBonus < 0) {
                rollText += '-' + (-rollBonus);
            }
            
            if(targets > 1) {
                rollText += ', left to right';
            }
            
            rollText += ':';
            
            for(i = 0; i < targets; i++) {
                rollText += ' [[1d10+' + roll + ']]';
            }
        }
        
        // Pay costs
        if(token) {
            var hpCost = 0;
            var stCost = tech.cost;
            var valorCost = 0;
            
            var st = parseInt(token.get('bar2_value'));
            if(st != st) {
                st = 0;
            }
            
            st -= tech.cost;
            
            token.set('bar2_value', st);
            
			if(tech.limits) {
				var healthLimit = tech.limits.find(function(l) {
					return l.toLowerCase().indexOf('health') == 0;
				});
				if(healthLimit) {
					var healthLimitSplit = healthLimit.split(' ');
					var healthLimitLevel = parseInt(healthLimitSplit[healthLimitSplit.length - 1]);
					if(healthLimitLevel != healthLimitLevel) {
						healthLimitLevel = 1;
					}
					
					var hp = parseInt(token.get('bar1_value'));
					if(hp != hp) {
						hp = 0;
					}
					
					hpCost = healthLimitLevel * 5;
					hp -= hpCost;
					
					token.set('bar1_value', hp);
				}
				
				var valorLimit = tech.limits.find(function(l) {
					return l.toLowerCase().indexOf('valor c') == 0 ||
					l.toLowerCase().indexOf('ult valor') == 0 ||
					l.toLowerCase().indexOf('ultimate valor') == 0;
				});
				
				if(valorLimit) {
					var valorLimitSplit = valorLimit.split(' ');
					var valorLimitLevel = parseInt(valorLimitSplit[valorLimitSplit.length - 1]);
					if(valorLimitLevel != valorLimitLevel) {
						valorLimitLevel = 1;
					}
					
					var valor = parseInt(token.get('bar3_value'));
					if(valor != valor) {
						valor = 0;
					}
					
					valorCost = valorLimitLevel;
					valor -= valorCost;
					
					token.set('bar3_value', valor);
				}
				
				var initLimit = tech.limits.find(function(l) {
					return l.toLowerCase().indexOf('init') == 0;
				});
				
				if(initLimit) {
					var initLimitSplit = initLimit.split(' ');
					var initLimitLevel = parseInt(initLimitSplit[initLimitSplit.length - 1]);
					if(initLimitLevel != initLimitLevel) {
						initLimitLevel = 1;
					}
					
                    turnOrder.forEach(function(turn) {
                        if(turn && turn.id === token.get('_id')) {
                            turn.pr -= initLimitLevel;
                        }
                    });
                    
                    Campaign().set('turnorder', JSON.stringify(turnOrder));
				}
			}
            
            if(state.techHistory.length > 20) {
                // Don't let the tech history get too long
                state.techHistory = state.techHistory.slice(1);
            }
        }
        
        var message = '<table>';
        message += '<tr><td>Performing Technique: **' + tech.name + '**</td></tr>';
        if(rollText) {
            message += '<tr><td>' + rollText + '</td></tr>';
        }
        if(tech.summary) {
            message += '<tr><td>' + tech.summary + '</td></tr>';
        }
        message += '</table>';
        
        sendChat('character|' + actor.get('_id'), message);
        
        // Add used tech to the technique usage history
        if(!state.techHistory) {
            state.techHistory = [];
        }
        
        state.techHistory.push({
            id: token.get('_id'),
            techName: tech.name,
            hpCost: hpCost,
            stCost: stCost,
            valorCost: valorCost
        });
        state.techData[techDataId].timesUsed.push(round);
        
        // Inform if Ammo has run out
        if(tech.limits) {
    		var ammoLimit = tech.limits.find(function(l) {
    			return l.toLowerCase().indexOf('amm') == 0;
    		});
    		
    		if(ammoLimit) {
    			var ammoLimitSplit = ammoLimit.split(' ');
    			var ammoLimitLevel = parseInt(ammoLimitSplit[ammoLimitSplit.length - 1]);
    			if(ammoLimitLevel != ammoLimitLevel) {
    				ammoLimitLevel = 1;
    			}
                if(state.techData[techDataId].timesUsed.length == 4 - ammoLimitLevel) {
    			    sendChat('Valor', '/w "' + actor.get('name') + '" This Technique is now out of ammunition.');
                }
    		}
        }
		
        log('Technique ' + tech.name + ' performed by ' + actor.get('name') + '.');
    }
});

// !tech-undo command
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!t-undo') == 0 || 
    msg.type == 'api' && msg.content.indexOf('!tech-undo') == 0) {
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
        
        var techLog = state.techHistory[state.techHistory.length - 1];
        
        var token = getObj('graphic', techLog.id);
        
        // Refund lost resources
        var hp = parseInt(token.get('bar1_value'));
        var st = parseInt(token.get('bar2_value'));
        var valor = parseInt(token.get('bar3_value'));
        
        if(hp != hp) {
            hp = 0;
        }
        if(st != st) {
            st = 0;
        }
        if(valor != valor) {
            valor = 0;
        }
        
        hp += techLog.hpCost;
        st += techLog.stCost;
        valor += techLog.valorCost;
        
        token.set('bar1_value', hp);
        token.set('bar2_value', st);
        token.set('bar3_value', valor);
        
        // Remove tech from history
        state.techHistory = state.techHistory.slice(0, state.techHistory.length - 1);
        
        var techDataId = token.get('represents') + '.' + techLog.techName;
        if(state.techData[techDataId]) {
            state.techData[techDataId].timesUsed = state.techData[techDataId].timesUsed.slice(0, 
            state.techData[techDataId].timesUsed.length - 1);
        }
        
        log('Reverted technique ' + techLog.techName + ' used by ' + token.get('name') + '. ' + state.techHistory.length + ' techs remaining in history log.');
    }
});

// !effect command
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!e ') == 0 || 
    msg.type == 'api' && msg.content.indexOf('!effect') == 0) {
        // Get params
        var split = msg.content.match(/(".*?")|(\S+)/g);
        if(split.length < 2) {
            log('Not enough arguments.');
            return;
        }

		var turnOrder = JSON.parse(Campaign().get('turnorder'));
		if(!turnOrder || turnOrder.length == 0) {
			// Nothing to do
			log('Turn Tracker is not enabled.');
		}
		
        // Figure out who the actor is
        var actor = getActor(msg);
		if(!actor) {
			log('No usable character found for ' + msg.playerid);
			return;
		}
        
        var effectName = split[1];
		var nextParam = 2;
		while(nextParam < split.length && parseInt(split[nextParam]) != parseInt(split[nextParam])) {
			effectName += ' ' + split[nextParam];
			nextParam++;
		}
		
		if(effectName[0] == '"') {
			effectName = effectName.substring(1, effectName.length - 1);
		}
		var duration = 3;
		if(split.length > nextParam) {
			var inputDuration = parseInt(split[nextParam]);
			if(inputDuration == inputDuration) {
				duration = inputDuration;
			}
        }
		
		// Add a new item to the turn log
		for(i = 0; i < turnOrder.length; i++) {
			if(turnOrder[i].id != '-1') {
				var token = getObj('graphic', turnOrder[i].id);
				if(token.get('represents') == actor.get('_id')) {
					var effect = {
						id: '-1',
						custom: effectName,
						pr: duration,
						formula: '-1'
					};
					var newTurnOrder = turnOrder.slice(0, i + 1).concat([effect]).concat(turnOrder.slice(i + 1));
					Campaign().set('turnorder', JSON.stringify(newTurnOrder));
					log('Effect ' + effectName + ' added to Turn Tracker.');
					return;
				}
			}
		}
		log('Actor not found on Turn Tracker.');
    }
});

// !rest command
// Enter !rest in the chat to recover an Increment of HP/ST for each character.
// Also sets everyone's Valor to starting value.
// Does not consider Fast Healer skill.
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!rest') == 0
        && playerIsGM(msg.playerid)) {
        var tokens = filterObjs(function(obj) {
            return obj.get('_type') == 'graphic' &&
                   obj.get('represents');
        });
       
        tokens.forEach(function(token) {
            var charId = token.get('represents');
            
            var hp = parseInt(token.get('bar1_value'));
            var maxHp = parseInt(token.get('bar1_max'));
            var st = parseInt(token.get('bar2_value'));
            var maxSt = parseInt(token.get('bar2_max'));
            
            if(!hp) {
                hp = 0;
            }
            if(!st) {
                st = 0;
            }
            
            var skills = getSkills(charId);
            var flaws = getFlaws(charId);
            
            // Restore Health
            if(maxHp) {
                if(hp < 0) {
                    hp = 0;
                }
                
                var hpRestore = Math.ceil(maxHp / 5);
                
                // Check for Fast Healing
                if(skills.find(function(s) {
                    return s.name == 'fastHealing';
                })) {
                    var di = getAttrByName(charId, 'di');
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
                st += Math.ceil(maxSt / 5);
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
                if(state.charData && 
				   state.charData[token.get('represents')] &&
			       state.charData[token.get('represents')].bravado) {
                   startingValor = state.charData[token.get('represents')].bravado;
                }
            }
            token.set('bar3_value', startingValor);
        });
        
        state.techData = {};
        
        log('Partial rest complete.');
    }
});

// !fullrest command
// Enter !fullrest in the chat to recover all HP/ST for all characters.
// Also sets everyone's Valor to starting values.
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!fullrest') == 0
        && playerIsGM(msg.playerid)) {
        var tokens = filterObjs(function(obj) {
            return obj.get('_type') == 'graphic' &&
                   obj.get('represents');
        });
       
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
        
        state.techData = {};
        
        log('Full rest complete.');
    }
});

// !set-bravado command
// Enter !set-bravado X in the chat to assign the selected character a Bravado
// skill of level X.
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!set-bravado') == 0
        && playerIsGM(msg.playerid)) {
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
        && playerIsGM(msg.playerid)) {
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
    var turnOrder = JSON.parse(obj.get('turnorder'));
    if(!turnOrder || turnOrder.length === 0) {
        // Do nothing if the init tracker is empty
        return;
    }
    
    var topChar = turnOrder[0];
    
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
            trackStatuses(turnOrder);
            processOngoingEffects(obj);
            alertCooldowns();
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
 * - Bugfix: Valor gains at end of round would sometimes be calculated multiple
 * times.
 * 
 * v1.2:
 * - New command: !set-vrate
 * 
 * v1.2.1:
 * - Bugfix: Script would crash if you used Valor auto-tracking before ever
 * using !set-bravado.
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
 * - Bugfix: Max sync and associating values with character sheets could crash
 * the script.
 * 
 * v1.3.3:
 * - Allowed !rest and !fullrest to heal characters who aren't on the same page
 * as the players, or who are on the GM layer.
 * - Bounce Back skill now honored by valor updater.
 * 
 * v1.4.0:
 * - Added the !tech command.
 * 
 * v1.4.1:
 * - Bugfixes on !t.
 * - Tweaked algorithm for identifying which technique you wanted to use.
 * 
 * v1.4.2:
 * - Added more lenient text parsing on !t command.
 * - Added !t-undo command.
 * 
 * v1.4.3:
 * - Bugfix: !t only worked a tiny amount of the time.
 * 
 * v1.4.4:
 * - Even more !t bugfixes.
 * 
 * v1.5.0:
 * - Replaced the old Status Tracker with a new one.
 * - Got rid of the need for the gmID field.
 * - Added the !effect command.
 * 
 * v1.5.1:
 * - Bugfix: Techs with no limits block could crash the !t parser.
 * 
 * v1.5.2:
 * - Small bugfix to support the new roll tech buttons
 * - Added --as parameter for tech roll
 * 
 * v1.5.3:
 * - Roll techs from character sheet buttons by ID instead of name
 * 
 * v1.5.4:
 * - Add support for mimic tech rolling
 * - Cleaning up of tech roll output for some cores
 * 
 * v1.5.5:
 * - !rest once again rounds to the nearest integer
 * - Fixed a bug where !rest sometimes crashed the API
 * 
 * v1.5.6:
 * - Bugfix: !t wasn't properly parsing tech cores other than Damage for some reason.
 * - Bugfix: Mimic logic would occasionally crash the API.
 * - Removed excess logging.
 * 
 * v1.5.7:
 * - Various bugfixes.
 * - Masters automatically get bonus Valor and +1 to attack rolls.
 * 
 * v1.5.8:
 * - Initiative Limit automatically applied.
 * - Cleaned up tech rendering.
 * 
 * v1.6.0:
 * - !t command now honors a few limits: Valor, Ultimate Valor, Initiative, Injury, Set-Up.
 * 
 * v1.6.1:
 * - Fixed bug regarding techniques with no names.
 * - !t command now honors Ammunition Limit, Cooldown Limit and Stamina cost.
 * 
 * v1.6.2:
 * - Don't enforce Stamina costs on minions by default.
 * - Bugfix: Don't use resources when failing to mimic a technique.
 * - !t now honors Accurate Strike.
 * - Whispered alerts on Cooldown/Ammo Limits.
 * 
 **/