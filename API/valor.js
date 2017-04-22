/**
 * VALOR API SCRIPTS
 * v0.11.1
 * 
 * INSTALLATION INSTRUCTIONS
 * 1. From campaign, go to API Scripts.
 * 2. Create a new script, and paste the contents of this file into it.
 * 3. Click Save Script.
 * 
 * For usage instructions, consult the readme file.
 **/

// Settings for optional functions - 'true' for on, 'false' for off.
state.statusTrackerEnabled = true; // Erase statuses on the turn order when they reach 0.
state.valorUpdaterEnabled = true; // Add Valor for all Elites and Masters when a new round starts.
state.maxValueSyncEnabled = true; // Move HP and ST to match when max HP and max ST change.
state.ongoingEffectProcessor = true; // Parse regen and ongoing damage as they happen.
state.ignoreLimitsOnMinions = true; // Disables limit blocking for Flunkies and Soldiers.
state.hideNpcTechEffects = false; // For non-player characters, don't show players the tech effect when using !t.
state.showTechAlerts = true; // Send alerts for when ammo changes and when techs come off of cooldown.
state.showHealthAlerts = true; // Send alerts when characters enter or leave critical health.
state.houseRulesEnabled = false; // Enables various unsupported house rules.

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
        log("Effect '" + newTurnOrder[0].custom + "' ended");
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

function getSkill(charId, skillName) {
	var skills = getSkills(charId);
	
	if(skills && skills.length > 0) {
		return skills.find(s => s.name && s.name.toLowerCase() == skillName.toLowerCase());
	}
	
	return null;
}

function getFlaw(charId, flawName) {
	var flaws = getFlaws(charId);
	
	if(flaws && flaws.length > 0) {
		return flaws.find(f => f.name && f.name.toLowerCase() == flawName.toLowerCase());
	}
	
	return null;
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
        } else if(techName.indexOf('tech_limit_st') > -1) {
            var limitSt = parseInt(rawTech.get('current'));
            if(limitSt != limitSt) {
                limitSt = 0;
            }
            
            if(oldTech) {
                oldTech.limitSt = limitSt;
            } else {
                techs.push({ id: techId, limitSt: limitSt});
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
        } else if(techName.indexOf('tech_granted_skills') > -1) {
            if(oldTech) {
                oldTech.grantedSkills = rawTech.get('current');
            } else {
                techs.push({ id: techId, grantedSkills: rawTech.get('current')});
            }
        } else if(techName.indexOf('tech_inflicted_flaws') > -1) {
            if(oldTech) {
                oldTech.inflictedFlaws = rawTech.get('current');
            } else {
                techs.push({ id: techId, inflictedFlaws: rawTech.get('current')});
            }
        } else if(techName.indexOf('tech_digDeep') > -1) {
            var digDeep = rawTech.get('current') == 'on';
            if(oldTech) {
                oldTech.digDeep = digDeep;
            } else {
                techs.push({ id: techId, digDeep: digDeep});
            }
        } else if(techName.indexOf('tech_overloadLimits') > -1) {
            var overloadLimits = rawTech.get('current') == 'on';
            if(oldTech) {
                oldTech.overloadLimits = overloadLimits;
            } else {
                techs.push({ id: techId, overloadLimits: overloadLimits});
            }
        } else if(techName.indexOf('tech_empowerAttack') > -1) {
            var empowerAttack = rawTech.get('current') == 'on';
            if(oldTech) {
                oldTech.empowerAttack = empowerAttack;
            } else {
                techs.push({ id: techId, empowerAttack: empowerAttack});
            }
        }
    });
    
    return techs;
}

function getTechDamage(tech, charId) {
	var special = tech.mods && tech.mods.find(function(m) {
		return m.toLowerCase().indexOf('piercing') > -1 ||
			   m.toLowerCase().indexOf('sapping') > -1 ||
			   m.toLowerCase().indexOf('persistent') > -1 ||
			   m.toLowerCase().indexOf('drain') > -1 ||
			   m.toLowerCase().indexOf('debilitating') > -1 ||
			   m.toLowerCase().indexOf('boosting') > -1;
	});
	var atk = getAttrByName(charId, tech.stat + 'Atk');
	
	if(!atk || atk != atk) {
	    atk = 0;
	}
	
	var damage = 0;
	if(tech.core == 'damage' && special) {
		damage = (tech.coreLevel + 3) * 4;
		atk = Math.ceil(atk / 2);
	} else if(tech.core == 'ultDamage' && !special) {
	    damage = (tech.coreLevel + 3) * 8;
	} else {
	    damage = (tech.coreLevel + 3) * 5;
	}
	
	damage += atk;
	
	var hp = getAttrByName(charId, 'hp');
	var hpMax = getAttrByName(charId, 'hp', 'max');
	if(hp / hpMax <= 0.4) {
	    // HP is critical!
    	var crisis = getSkill(charId, 'crisis');
    	if(crisis && crisis.level) {
    	    var crisisLevel = parseInt(crisis.level);
    	    if(crisisLevel != crisisLevel) {
    	        crisisLevel = 1;
    	    }
    	    damage += 3 + crisisLevel * 3;
    	}
    	var berserker = getFlaw(charId, 'berserker')
    	if(berserker) {
    	    damage += 10;
    	}
	}
	
	if(tech.empowerAttack) {
    	var empowerAttack = getSkill(charId, 'empowerAttack');
    	if(empowerAttack && empowerAttack.level) {
    	    var empowerAttackLevel = parseInt(empowerAttack.level);
    	    if(empowerAttackLevel != empowerAttackLevel) {
    	        empowerAttackLevel = 1;
    	    }
    	    damage += 3 + empowerAttackLevel * 3;
    	}
	}
	
	return damage;
}

function getTechDescription(tech, charId) {
    if(!tech) {
        return '';
    }
	var summary = '';
	switch(tech.core) {
		case 'damage':
		case 'ultDamage':
			summary = 'Damage: <span style="color: darkred">**' + 
						   getTechDamage(tech, charId) +
						   '**</span>';
						   
			var piercing = tech.mods && tech.mods.find(function(m) {
				return m.toLowerCase().indexOf('piercing') > -1
			});
		    if(!piercing) {
				var physical = tech.stat == 'str' || tech.stat == 'agi';
				if(tech.mods && tech.mods.find(function(m) {
					return m.toLowerCase().indexOf('shift') > -1
				})) {
					physical = !physical;
				}
				summary += physical ? ' - Defense' : ' - Resistance';
			}
			
			var bonuses = [];
    		var hp = getAttrByName(charId, 'hp');
    		var hpMax = getAttrByName(charId, 'hp', 'max');
    		if(hp / hpMax <= 0.4) {
            	var crisis = getSkill(charId, 'crisis');
            	if(crisis && crisis.level) {
    		        bonuses.push('Crisis');
            	}
            	var berserker = getFlaw(charId, 'berserker')
            	if(berserker) {
            	    bonuses.push('Berserker');
            	}
    		}
        	
        	if(tech.empowerAttack) {
        	    bonuses.push('Empowered');
        	}
        	
        	if(bonuses.length > 0) {
        	    summary += ' **(' + bonuses.join(', ') + ')**';
        	}
        	
			break;
		case 'healing':
			var healing = (tech.coreLevel + 3) * 4;
			var power = getAttrByName(charId, tech.stat);
			healing += power;
			summary = 'Restores <span style="color:darkgreen">**' + healing + '**</span> HP'
			break;
		case 'barrier':
			summary = 'Barrier power ' + tech.coreLevel;
			break;
	}
	
	if(tech.grantedSkills) {
		if(summary.length > 0) {
			summary += '<br />';
		}
		summary += 'Skills: ' +  tech.grantedSkills;
	}
	
	if(tech.inflictedFlaws) {
		if(summary.length > 0) {
			summary += '<br />';
		}
		summary += 'Flaws: ' +  tech.inflictedFlaws;
	}
	
	if(tech.core == 'ultTransform') {
		var level = parseInt(getAttrByName(charId, 'level'));
		if(!level || level != level) {
			level = 0;
		}
		var bonusHp = level * 10;
		if(getAttrByName(charId, 'type') == 'master') {
			bonusHp *= 2;
		}
		if(summary.length > 0) {
			summary += '<br />';
		}
		summary += 'HP +<span style="color:darkgreen">**' + bonusHp + '**</span>';
	}
	
	return summary;
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
			return t && t.name && t.name.toLowerCase().indexOf(techId.toLowerCase()) > -1;
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
	
	if(tech) {
        if(!tech.core) {
            tech.core = 'damage';
        }
        
        if(!tech.coreLevel) {
            tech.coreLevel = 1;
        }
        
	    tech.summary = getTechDescription(tech, charId);
    
        if((tech.core == 'mimic' || tech.core == 'ultMimic') && tech.mimicTarget && charId) {
            log('Mimic target: ' + tech.mimicTarget);
            
            // Re-get the mimicked technique
            var oldCore = tech.core;
            var mimicTech = tech;
            tech = getTechByName(tech.mimicTarget);
            if(tech) {
                tech.name = mimicTech.name + ' [' + tech.name + ']';
        
                // Revise core level
                tech.coreLevel = mimicTech.coreLevel - (tech.techLevel - tech.coreLevel);
                
                if(tech.coreLevel <= 0) {
                    // Set core type back to mimic so that invocation can see it
                    tech.core = oldCore;
                } else {
                    // Rewrite tech summary
                    log('Reproducing tech at core level ' + tech.coreLevel);
        			tech.summary = getTechDescription(tech, charId);
                }
                
                // Roll using the chosen stat
                tech.stat = mimicTech.stat;
                
                // Put the original core type (mimic vs ult mimic) in the object
                tech.oldCore = oldCore;
            } else {
                log("Mimic failed - couldn't find the target tech");
                tech = mimicTech;
            }
        }
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
    if(!topChar || topChar.custom.toLowerCase() != 'round') {
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
            var hp = parseInt(token.get('bar1_value'));
            if(hp == hp && hp <= 0) {
                // They're KO'd - don't add Valor
                return;
            }
            
            // If it has a max Valor, it's tracking Valor - raise it
            var valor = parseInt(token.get('bar3_value'));
            if(valor != valor) {
                valor = 0;
            }
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
            
            log('Character ' + token.get('name') + ' gains ' + valorRate + ' for new round.');
            
            valor += valorRate;
			
			if(getSkill(charId, 'bounceBack') && valor < 0) {
				valor++;
			}
            
            token.set('bar3_value', valor);
            if(valor > maxValor) {
                token.set('bar3_value', maxValor);
            }
            
        }
    });
    
    log('Valor update complete.')
}

function alertCooldowns() {
    if(!state.showTechAlerts) {
        return;
    }
    
	var turnOrder;
    if(Campaign().get('turnorder') == '') {
        turnOrder = [];
    } else {
        turnOrder = JSON.parse(Campaign().get('turnorder'));
    }
    
    var topChar = turnOrder[0];
    if(!topChar || topChar.custom.toLowerCase() != 'round') {
        // Only continue if the 'Round' counter is at the top of the init order
        return;
    }

	var round = topChar.pr;
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
	        if(tech && tech.limits) {
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
    	    			    log('Technique ' + techData.techName + ' left cooldown on turn ' + round);
        				}
    				}
    			}
	        }
	    }
	}
}

// !reset command
// Enter !reset in the chat to purge the tech data history.
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!reset') == 0
        && playerIsGM(msg.playerid)) {
        log('Tech data: ' + state.techData);
        log('Tech history: ' + state.techHistory);
        state.techData = {};
        state.techHistory = [];
        log('Reset complete.');
    }
    
});

// !tech command
on('chat:message', function(msg) {
    if(msg.type == 'api' && (msg.content.indexOf('!t ') == 0 || 
    msg.content.indexOf('!tech') == 0 ||
    msg.content == '!t')) {
        // Get params
        var split = msg.content.match(/(".*?")|(\S+)/g);
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
				log('Performing tech as character ' + actor.get('name'));
			}
		}

		// --as failed or wasn't used, find through other means
		if(!actor) {
			actor = getActor(msg);
		}
		if(!actor) {
			log('No usable character found for ' + msg.playerid);
			return;
		}
        var actorClass = getAttrByName(actor.get('_id'), 'type');
        
        if(split.length < 2) {
            // Show a list of techs for this character
            if(actor) {
                var techs = getTechs(actor.get('_id'));
                var message = '<table><tr><td>Pick a Technique to use:</td></tr>';
                techs.forEach(function(tech) {
                    log(tech);
                    log(tech.name);
                    message += '<tr><td>[' + tech.name + '](!t "' + tech.name + '")</td></tr>';
                });
                message += '</table>';
			    var cleanMessage = message.replace(/\"/g, '&#' + '34;'); // Concatenated to keep the editor from freaking out
		        sendChat('Valor', '/w "' + msg.who + '" ' + cleanMessage);
            }
            return;
        }
        
		// Check for --override parameter
		var overrideLimits = split.indexOf('--override') > -1;
		if(overrideLimits) {
		    split.splice(split.indexOf('--override'), 1);
		    log('Performing tech without Limits.');
		}
		
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
		var round = roundItem ? roundItem.pr : 1;

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
        if((tech.core == 'mimic' || tech.core == 'ultMimic') && tech.coreLevel <= 0) {
            log('Mimic failed, effective tech level ' + tech.coreLevel + '.');
		    sendChat('Valor', '/w "' + actor.get('name') + '" ' + 'Core Level is too low to mimic this technique.');
            return;
        }
        
        // Check if they're trying to mimic an ult with a non-ult mimic tech
        if(tech.oldCore == 'mimic' && (tech.core == 'ultDamage' || 
            tech.core == 'transform' || tech.core == 'domain')) {
            log('Mimic failed, target core type ' + tech.oldCore + '.');
		    sendChat('Valor', '/w "' + actor.get('name') + '" ' + "You can't mimic an Ultimate Technique with a normal Mimic Core.");
            return;
        }
        
        
        // Check for Overload Limits
        if(tech.overloadLimits) {
            overrideLimits = true;
            log('Overloading limits.');
        }
        
        // Pull Skill list
        var skills = getSkills(actor.get('_id'));
        
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
        if(techData.timesUsed && techData.timesUsed.length > 0) {
            log('Technique used previously on turns: ' + techData.timesUsed);
        }
        
        // Check for blocking limits
		if(tech.limits && !overrideLimits && 
		        (!state.ignoreStaminaOnMinions || 
                (actorClass != 'flunky' && actorClass != 'soldier'))) {
		    var blocked = false;
		    var errorMessage = '';
		    
		    if(token) {
                // Check stamina
    		    var st = parseInt(token.get('bar2_value'));
    		    
    		    if(st == st && st < tech.cost && !tech.digDeep) {
    		        log('Tech blocked - insufficient Stamina');
    		        errorMessage += "You don't have enough Stamina to use this Technique.<br>";
    		        blocked = true;
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
                                log('Tech blocked - Initiative Limit');
                                errorMessage += 'Your Initiative is too low to use this Technique.<br>';
                                blocked = true;
                            }
                        }
                    });
    			}
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
				    log('Tech blocked - Valor Limit');
				    errorMessage += 'You need at least ' + valorLimitLevel + ' Valor to use this Technique.<br>';
				    blocked = true;
				}
			}
			
			// Check Injury Limit
			var injuryLimit = tech.limits.find(function(l) {
				return l.toLowerCase().indexOf('injury') == 0;
			});
			
			if(injuryLimit && token) {
				var injuryLimitSplit = injuryLimit.split(' ');
				var injuryLimitLevel = parseInt(injuryLimitSplit[injuryLimitSplit.length - 1]);
				if(injuryLimitLevel != injuryLimitLevel) {
					injuryLimitLevel = 1;
				}
				
				var hp = parseInt(token.get('bar1_value'));
				var hpMax = parseInt(token.get('bar1_max'));
				if(hp != hp) {
				    hp = 0;
				}
				if(hpMax != hpMax) {
				    hpMax = 0;
				}
				
				var hpTarget = Math.ceil(hpMax / 5 * (5 - injuryLimitLevel));
				
				if(hp > hpTarget) {
				    log('Tech blocked - Injury Limit');
				    errorMessage += 'Your Health must be ' + hpTarget + ' or lower to use this Technique.<br>';
				    blocked = true;
				}
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
    				    log('Tech blocked - Setup Limit');
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
				    log('Tech blocked - Ammo Limit');
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
    				var lastTurnUsed = parseInt(techData.timesUsed[techData.timesUsed.length - 1]);
    				log(techData);
    				if(round <= lastTurnUsed + cooldownLimitLevel) {
    				    log('Tech blocked - Cooldown Limit');
    				    errorMessage += 'This Technique is still on cooldown.<br>'
    				    blocked = true;
    				}
				}
			}
			
			if(blocked) {
			    var cleanButton = msg.content.replace(/\"/g, '&#' + '34;'); // Concatenated to keep the editor from freaking out
			    errorMessage += '[Override](' + cleanButton + ' --override)';
			    sendChat('Valor', '/w "' + actor.get('name') + '" ' + errorMessage);
			    log('Tech failed on turn ' + round);
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
					    log('Too many targets, capped at 20');
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
            
            var accurate = tech.mods && tech.mods.find(function(m) {
                return m.toLowerCase().indexOf('accurate') > -1;
            });
            
            if(accurate) {
                rollBonus += 2;
            }
            
			if(skills.find(function(s) {
				return s && s.name && s.name.indexOf('increasedSize') == 0;
			})) {
			    rollBonus++;
			}
            
            
			if(skills.find(function(s) {
				return s && s.name && s.name.indexOf('diminuitive') == 0;
			})) {
			    rollBonus--;
			}
			

            var sheetBonus = parseInt(getAttrByName(actor.get('_id'), 'rollbonus'));
            if(sheetBonus == sheetBonus) {
                rollBonus += sheetBonus;
            }
            
            var roll = 0;
            
            var rollStat = tech.stat;
            if(tech.mods) {
                if(tech.mods.find(function(m) {
                    return m.toLowerCase().indexOf('musc') > -1;
                })) {
                    rollStat = 'str';
                }
                if(tech.mods.find(function(m) {
                    return m.toLowerCase().indexOf('dext') > -1;
                })) {
                    rollStat = 'agi';
                }
                if(tech.mods.find(function(m) {
                    return m.toLowerCase().indexOf('aura') > -1;
                })) {
                    rollStat = 'spr';
                }
                if(tech.mods.find(function(m) {
                    return m.toLowerCase().indexOf('intuit') > -1;
                })) {
                    rollStat = 'int';
                }
            }
            
            switch(rollStat) {
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
            
			var hp = parseInt(token.get('bar1_value'));
			var hpMax = parseInt(token.get('bar1_max'));
            var st = parseInt(token.get('bar2_value'));
            if(hp != hp) {
                hp = 0;
            }
            
            if(st != st) {
                st = 0;
            }
            
            if(tech.overloadLimits && tech.limitSt) {
                stCost += tech.limitSt;
            }
            if(tech.digDeep) {
                hpCost += stCost * 5;
                stCost = 0;
            }
            
            st -= stCost;
            if(stCost > 0) {
                log('Consumed ' + stCost + ' ST');
            }
            
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
					
					hpCost += healthLimitLevel * 5;
				}
				
				var ultimateHealthLimit = tech.limits.find(function(l) {
					return l.toLowerCase().indexOf('ultimate health') == 0;
				});
				if(ultimateHealthLimit) {
					var ultimateHealthLimitSplit = ultimateHealthLimit.split(' ');
					var ultimateHealthLimitLevel = parseInt(ultimateHealthLimitSplit[ultimateHealthLimitSplit.length - 1]);
					if(ultimateHealthLimitLevel != ultimateHealthLimitLevel) {
						ultimateHealthLimitLevel = 1;
					}
					
					hpCost += Math.ceil(hpMax / 5);
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
                    log('Consumed ' + valorCost + ' Valor');
					
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
                    log('Consumed ' + initLimitLevel + ' initiative');
                    
                    Campaign().set('turnorder', JSON.stringify(turnOrder));
				}
			}
			
			hp -= hpCost;
			if(hpCost > 0) {
                log('Consumed ' + hpCost + ' HP');
			}
			
			token.set('bar1_value', hp);
            
			if(!state.techHistory) {
				state.techHistory = [];
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
		
		var showSummary = tech.summary && (!state.hideNpcTechEffects || actor.get('controlledby'));
		
        if(showSummary) {
            message += '<tr><td>' + tech.summary + '</td></tr>';
        }
        message += '</table>';
        
        sendChat('character|' + actor.get('_id'), message);
        
        if(token && !overrideLimits) {
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
            log('Updated tech data: ');
            log(state.techData[techDataId]);
        }
        
        // Alert with remaining ammo
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
    			var ammo = 4 - ammoLimitLevel - state.techData[techDataId].timesUsed.length;
    			sendChat('Valor', '/w "' + actor.get('name') + '" Ammunition remaining: ' + ammo);
    		}
        }
        
        if(!showSummary && tech.summary) {
			sendChat('Valor', '/w gm ' + tech.summary);
        }
        
        // Disable temporary switches on this tech
        if(tech.digDeep) {
            log('Dig Deep was enabled.');
            var techAttrs = filterObjs(function(obj) {
                if(obj.get('_type') == 'attribute' &&
                   obj.get('name').indexOf(tech.id) > -1 &&
                   obj.get('name').indexOf('digDeep') > -1) {
                       return true;
                }
                return false;
            });
            if(techAttrs && techAttrs.length > 0) {
                var digDeep = techAttrs[0];
                digDeep.set('current', '0');
            }
        }
        
        if(!tech.overloadLimits) {
            log('Overload Limits was enabled.');
            var techAttrs = filterObjs(function(obj) {
                if(obj.get('_type') == 'attribute' &&
                   obj.get('name').indexOf(tech.id) > -1 &&
                   obj.get('name').indexOf('overloadLimits') > -1) {
                       return true;
                }
                return false;
            });
            if(techAttrs && techAttrs.length > 0) {
                var digDeep = techAttrs[0];
                digDeep.set('current', '0');
            }
        }
        
        if(tech.empowerAttack) {
            log('Empower Attack was enabled.');
            var techAttrs = filterObjs(function(obj) {
                if(obj.get('_type') == 'attribute' &&
                   obj.get('name').indexOf(tech.id) > -1 &&
                   obj.get('name').indexOf('empowerAttack') > -1) {
                       return true;
                }
                return false;
            });
            if(techAttrs && techAttrs.length > 0) {
                var empowerAttack = techAttrs[0];
                empowerAttack.set('current', '0');
            }
        }
		
        log('Technique ' + tech.name + ' performed by ' + actor.get('name') + ' on Round ' + round + '.');
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
				if(token && actor && token.get('represents') == actor.get('_id')) {
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
            
            if(hp != hp) {
                hp = 0;
            }
            if(st != st) {
                st = 0;
            }
            
            var skills = getSkills(charId);
            var flaws = getFlaws(charId);
            
            // Restore Health
            if(maxHp) {
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
                log('Character ' + token.get('name') + ' recovered ' + hpRestore + ' HP.');
            }
            
            // Restore Stamina
            if(maxSt) {
                st += Math.ceil(maxSt / 5);
                if(st > maxSt) {
                    st = maxSt;
                }
                token.set('bar2_value', st);
                log('Character ' + token.get('name') + ' recovered ' + st + ' ST.');
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
                
                if(state.houseRulesEnabled) {
                    // Bravado is fixed-level, gain starting valor by Season
                    if(startingValor > 1) {
                        startingValor = 1;
                    }
                    var level = getAttrByName(charId, 'level');
                    startingValor += Math.ceil(level / 5) - 1;
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
            log('Character ' + token.get('name') + ' set to ' + startingValor + ' Valor.');
        });
        
        state.techData = {};
        state.techHistory = [];
        
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
            var charId = token.get('represents');
            
            // Reset Valor
            var startingValor = 0;
            var bravado = getSkill(charId, 'bravado');
			if(bravado && bravado.level) {
				startingValor = bravado.level;
            } else {
                // No skillset found - use set-bravado value instead
                if(state.charData[charId] &&
                    state.charData[charId].bravado) {
                    startingValor = state.charData[charId].bravado;
                }
            }
            
            if(state.houseRulesEnabled) {
                // Bravado is fixed-level, gain starting valor by Season
                if(startingValor > 1) {
                    startingValor = 1;
                }
                var level = getAttrByName(charId, 'level');
                startingValor += Math.ceil(level / 5) - 1;
            }
            
            token.set('bar3_value', startingValor);
            log('Character ' + token.get('name') + ' set to ' + startingValor + ' Valor.');
        });
        
        state.techData = {};
        state.techHistory = [];
        
        log('Full rest complete.');
    }
});

// !init command
// Purge everything on the turn tracker, roll initiative for all characters on current page,
// set everything up at once
// Also sets everyone's Valor to starting values.
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!init') == 0
        && playerIsGM(msg.playerid)) {
        var split = msg.content.match(/(".*?")|(\S+)/g);
        if(split.length < 2 || split[1] != '--confirm') {
            // No --confirm, ask for verification
			sendChat('Valor', '/w gm You will lose all information currently on the Turn Tracker.<br>' +
			'[Continue](!init --confirm)');
            return;
        }
        
        // Get list of tokens
        var page = Campaign().get('playerpageid');
        var allTokens = findObjs({_type: 'graphic', layer:'objects', _pageid: page});
        var actorIds = [];
        var tokens = [];
        var duplicateIds = [];
        
        // Destroy existing Init Tokens
        for(i = 0; i < allTokens.length; i++) {
            if(allTokens[i].get('left') == -1000 && allTokens[i].get('top') == -1000) {
                allTokens[i].remove();
                allTokens.splice(1, 1);
                i--;
            }
        }
        
        allTokens.forEach(function(token) {
            var actorId = token.get('represents');
            if(actorIds.indexOf(actorId) == -1) {
                actorIds.push(actorId);
                tokens.push(token);
            } else {
                if(duplicateIds.indexOf(actorId) == -1) {
                    duplicateIds.push(actorId);
                    var oldToken = tokens.find(function(t) { return t.get('represents') == actorId });
                    tokens.splice(tokens.indexOf(oldToken));
                }
            }
        });
        
        // For duplicate character tokens, create an init-tracker token that the players can't see
        duplicateIds.forEach(function(id) {
            var oldToken = allTokens.find(function(t) { return t.get('represents') == id});
    		var newToken = createObj('graphic', {
    		    _pageid: oldToken.get('_pageid'),
    		    left: -1000,
    		    top: -1000,
    		    width: 70,
    		    height: 70,
    		    layer: "objects",
    		    imgsrc: oldToken.get('imgsrc').replace('med.', 'thumb.'),
    		    name: oldToken.get('name'),
    		    showname: true,
    		    represents: oldToken.get('represents')
    		});
    		tokens.push(newToken);
        });
        log(tokens);

        var message = '<table><tr><td>**ROLLING INITIATIVE**</td></tr>';
        var turnOrder = [];
        tokens.forEach(function(token) {
            var actorId = token.get('represents');
    		var actor = getObj('character', actorId);
    		var initMod = getAttrByName(actorId, 'init')
    		var init = initMod + randomInteger(10);
    		
    		var actorName;
    		if(actor) {
    		    actorName = actor.get('name');
        		turnOrder.push({
        		    id: token.get('_id'),
        		    pr: init,
        		    custom: ''
        		});
        		message += '<tr><td>' + actorName + ' - **' + init + '**</td></tr>';
    		}
        });
        turnOrder = turnOrder.sort(function(a, b) {
            return b.pr - a.pr;
        });
        message += '</table>';
        turnOrder.push({
            id: "-1",
            pr: 1,
            custom: 'Round',
            formula: "1"
        });
        Campaign().set('turnorder', JSON.stringify(turnOrder));
        
        state.techData = {};
        state.techHistory = [];
        
        sendChat('Valor', message);
    }
});

// !duplicate command
// Used by character sheet - create a temporary level-up sheet for a given character.
// Also sets everyone's Valor to starting values.
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!duplicate') == 0) {
        var split = msg.content.match(/(".*?")|(\S+)/g);
        if(split.length < 2) {
            log('Not enough arguments.');
            return;
        }
		
		if(!state.linkedSheets) {
		    state.linkedSheets = {};
		}
		
        // Figure out who to duplicate
		var actor = getObj('character', split[1]);
		var actorId = actor.get('_id');
		
		// Check to see if they already have a level up sheet
		if(state.linkedSheets[actorId]) {
		    var oldActor = getObj('character', state.linkedSheets[actorId]);
		    if(oldActor) {
    		    sendChat('Valor', '/w "' + actor.get('name') + "\" You already have an open level-up sheet.");
    		    return;
		    } else {
		        // The character was deleted, erase them from the link library
		        state.linkedSheets[actorId] = undefined;
		    }
		}
		
		// Create new character, copy over basic traits
		var newActor = createObj('character', {
		    name: 'Level up - ' + actor.get('name'),
		    inplayerjournals: actor.get('inplayerjournals'),
		    controlledby: actor.get('controlledby'),
		    avatar: actor.get('avatar')
		});
		var newActorId = newActor.get('_id');
		
		// Copy over attributes
		var attributes = filterObjs(function(obj) {
            return obj.get('_type') == 'attribute' &&
                   obj.get('_characterid') == actorId;
		});
		
		attributes.forEach(function(attr) {
		    createObj('attribute', {
		        name: attr.get('name'),
		        current: attr.get('current'),
		        max: attr.get('max'),
		        characterid: newActorId
		    });
		});
		
		// Mark the new one as a duplicate
	    createObj('attribute', {
	        name: 'is_duplicate',
	        current: 'on',
	        characterid: newActorId
	    });
		
		// Save link between sheets
		state.linkedSheets[actorId] = newActorId;
		state.linkedSheets[newActorId] = actorId;
		
		if(oldActor)
		log('Character ' + actor.get('name') + ' created a new level up sheet.');
    }
});

// !d-finalize command
// Used by character sheet - create a temporary level-up sheet for a given character.
// Also sets everyone's Valor to starting values.
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!d-finalize') == 0) {
        var split = msg.content.match(/(".*?")|(\S+)/g);
        if(split.length < 2) {
            log('Not enough arguments.');
            return;
        }
		
		if(!state.linkedSheets) {
		    state.linkedSheets = {};
		}
		
        // Fetch the level-up sheet
		var actor = getObj('character', split[1]);
		var actorId = actor.get('_id');
		var oldActorId = state.linkedSheets[actorId];
		var oldactor = getObj('character', oldActorId);
		
		// Check to see if they already have a level up sheet
		if(!oldActorId) {
	        sendChat('Valor', '/w "' + actor.get('name') + "\" The original character sheet no longer exists.");
	        log("Couldn't find linked sheet for sheet " + actor.get('name') + '.');
	        return;
		}
		
		var oldHp = filterObjs(function(obj) {
            return obj.get('_type') == 'attribute' &&
                   obj.get('_characterid') == oldActorId &&
                   obj.get('name') == 'hp';
		})[0];
		var newHp = filterObjs(function(obj) {
            return obj.get('_type') == 'attribute' &&
                   obj.get('_characterid') == actorId &&
                   obj.get('name') == 'hp';
		})[0];
		var oldHpMax = parseInt(oldHp.get('max'));
		var newHpMax = parseInt(newHp.get('max'));
		
		var oldSt = filterObjs(function(obj) {
            return obj.get('_type') == 'attribute' &&
                   obj.get('_characterid') == oldActorId &&
                   obj.get('name') == 'st';
		})[0];
		var newSt = filterObjs(function(obj) {
            return obj.get('_type') == 'attribute' &&
                   obj.get('_characterid') == actorId &&
                   obj.get('name') == 'st';
		})[0];
		var oldStMax = parseInt(oldSt.get('max'));
		var newStMax = parseInt(newSt.get('max'));
		
		// Paste over attributes
		var attributes = filterObjs(function(obj) {
            return obj.get('_type') == 'attribute' &&
                   obj.get('_characterid') == actorId;
		});
		attributes.forEach(function(attr) {
            var attrName = attr.get('name');
		    if(attrName != 'is_duplicate') {
		        var oldAttribute = filterObjs(function(obj) {
                    return obj.get('_type') == 'attribute' &&
                           obj.get('_characterid') == oldActorId &&
                           obj.get('name') == attrName;
        		})[0];
		        
		        if(oldAttribute) {
		            oldAttribute.set('max', attr.get('max'));
		            
		            // Keep current HP/ST/Valor values
		            if(attrName != 'hp' && attrName != 'st' && attrName != 'valor') {
		                oldAttribute.set('current', attr.get('current'));
		            }
		        } else {
        		    createObj('attribute', {
        		        name: attrName,
        		        current: attr.get('current'),
        		        max: attr.get('max'),
        		        characterid: oldActorId
        		    });
		        }
		    }
		});
		
		// Update current HP and ST
		if(oldHpMax == oldHpMax && newHpMax == newHpMax) {
		    var hpChange = newHpMax - oldHpMax;
		    
		    var oldHpValue = parseInt(oldHp.get('current'));
		    if(oldHpValue == oldHpValue) {
    		    oldHp.set('current', oldHpValue + hpChange);
		    }
		}
		
		if(oldStMax == oldStMax && newStMax == newStMax) {
		    var stChange = newStMax - oldStMax;
		    
		    var oldStValue = parseInt(oldSt.get('current'));
		    if(oldStValue == oldStValue) {
    		    oldSt.set('current', oldStValue + stChange);
		    }
		}
		
		// Delete the level-up sheet
		actor.remove();
		state.linkedSheets[actorId] = undefined;
		state.linkedSheets[oldActorId] = undefined;
		
		sendChat('Valor', 'Character sheet for ' + oldactor.get('name') + ' has been updated.');
		log('Character sheet for ' + oldactor.get('name') + ' has been updated.');
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
        
        if(bar1Value != bar1Value) {
            bar1Value = 0;
        }
        if(bar1Change != bar1Change) {
            bar1Change = 0;
        }
        
        if(bar1Value) {
            obj.set('bar1_value', bar1Value + bar1Change);
        }
    }
    
    if(obj.get('bar2_max') && prev.bar2_max) {
        var bar2Value = parseInt(obj.get('bar2_value'));
        var bar2Change = parseInt(obj.get('bar2_max')) - prev.bar2_max;
        
        if(bar2Value != bar2Value) {
            bar2Value = 0;
        }
        if(bar2Change != bar2Change) {
            bar2Change = 0;
        }
        
        if(bar2Value) {
            obj.set('bar2_value', bar2Value + bar2Change);
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
    
    var page = Campaign().get('playerpageid');
    if(obj.get('_pageid') != page) {
        // Do nothing if it was a token on another page
        return;
    }
    
    var oldHp = parseInt(prev.bar1_value);
    var newHp = parseInt(obj.get('bar1_value'));
    var maxHp = parseInt(obj.get('bar1_max'));
    
    if(oldHp == oldHp && newHp == newHp && maxHp == maxHp && oldHp != newHp) {
        var critical = Math.ceil(maxHp * 0.4);
        var message;
        if(oldHp > critical && newHp <= critical) {
            message = ' is now at critical health.';
        } else if (oldHp <= critical && newHp >= critical) {
            message = ' is no longer at critical health.';
        }
        if(message) {
            // Message character
            var charId = obj.get('represents');
		    var actor = getObj('character',charId);
		    var controlledBy = actor.get('controlledby');
		    
		    var whisperTo = 'gm';
		    
		    if(controlledBy && controlledBy != '') {
		        whisperTo = actor.get('name');
		    }
		    
		    sendChat('Valor', '/w "' + whisperTo + '" ' + actor.get('name') + message);
		    log('Alerted ' + whisperTo + ' about critical HP for token ID ' + obj.get('_id') + '.');
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
    var lastCharId = turnorder[i] ? turnorder[i].id : null;
    var lastChar = lastCharId ? getObj('graphic', lastCharId) : null;
    while(!lastChar) {
        i--;
        if(i == 0) {
            // We didn't find anyone - abort
            return;
        }
        var lastCharId = turnorder[i] ? turnorder[i].id : null;
        if(lastCharId) {
            lastChar = getObj('graphic', lastCharId);
        }
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
 * v1.6.3:
 * - Various mimic-related bugfixes.
 * - Bugfix: Cooldowns no longer alert multiple times when coming off cooldown.
 * - Ammo Limit now always shows the remaining ammunition.
 * - Added option to hide tech effects for NPCs.
 * - Axed the Token Syncer.
 * 
 * v1.7.0:
 * - Various bugfixes.
 * - Added checkboxes for using Dig Deep and Overload Limits.
 * 
 * v1.8.0:
 * - Added support for level-up sheets.
 * - Added critical HP warning.
 * - Lots of bugfixes.
 * 
 * v1.9.0:
 * - Various bugfixes.
 * - Current HP and ST now go up when you level up via level-up sheet.
 * - Attack roll now factors in Increased Size.
 * - Attack roll now factors in Roll Bonus.
 * - Added support for mechanics from Villains, Creatures and Foes.
 * 
 * v1.9.1:
 * - !rest no longer heals up from zero all at once.
 * - Characters at 0 or less HP no longer gain Valor automatically.
 * - Hopefully stopped the multiple notifs for critical HP.
 * 
 * v1.9.2:
 * - Fixed the critical HP notifs again.
 * - Added support for Fixed Bravado house rules.
 * 
 * v1.10.0:
 * - Moved tech micro-summary logic into this file.
 * - Added support for Crisis in presented damage for techs.
 * - Added support for Berserker in presented damage for techs.
 * - Added support for Empower Attack in presented damage for techs.
 * - Bugfixes.
 * 
 * v1.10.1:
 * - Lots of bugfixes.
 * 
 * v1.10.2:
 * - More bugfixes.
 * - More debug logging added everywhere.
 * 
 * v1.10.3:
 * - Fixed the NaN Damage bug.
 * - Logging was causing the Create Level-up Sheet button to crash the API.
 * - Added more logging for the mimic core.
 * 
 * v0.11.0:
 * - Changed version numbering system.
 * - Bugfixes.
 * - New command: !init.
 * - !t without any parameters now lets you pick a tech from a list.
 * 
 * v0.11.1:
 * - !init wasn't setting up the round counter to increment properly. 
 * - Round now defaults to 1 instead of 0.
 * - Stat sub mods are now honored by the tech roller.
 * - Ultimate Mimic Core now honored by system.
 * - Ultimate Health Limit now honored by system.
 * - Mimic Core now refuses to mimic Ultimate Techniques.
 **/