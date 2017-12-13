/**
 * VALOR API SCRIPTS
 * v0.17.0
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
state.showTechAlerts = true; // Send alerts for when ammo changes and when techs come off of cooldown.
state.showHealthAlerts = true; // Send alerts when characters enter or leave critical health.
state.houseRulesEnabled = true; // Enables various unsupported house rules.
state.autoResolveHealing = true; // Enables automatic adjustment of HP for Healing and Transformations.
state.hideNpcTechEffects = false; // For non-player characters, don't show players the tech effect when using !t.
state.rollBehindScreen = false; // Hide NPC rolls from the players.

// Status Tracker
// While this is active, the system will send an alert when an effect ends.
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
    
    var lastChar = newTurnOrder[newTurnOrder.length - 1];
    if(lastChar.id != '-1') {
        // Do nothing if the last actor was a character
        return;
    }
    
    if(lastChar.pr == 0 && lastChar.formula == '-1') {
        // A countdown effect ended
        sendChat('Valor', "Effect '" + lastChar.custom + "' has ended.");
        newTurnOrder = newTurnOrder.slice(0, newTurnOrder.length - 1);
        // Auto-reduce the next item if it's an effect too
        if(lastChar.formula == '-1') {
            lastChar.pr--;
        }
        Campaign().set('turnorder', JSON.stringify(newTurnOrder));
        log("Effect '" + lastChar.custom + "' ended");
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
                techs.push({ id: techId, charId: rawTech.get('_characterid'), name: rawTech.get('current')});
            }
        } else if(techName.indexOf('tech_core') > -1 && 
                  techName.indexOf('tech_core_') == -1) {
            if(oldTech) {
                oldTech.core = rawTech.get('current');
            } else {
                techs.push({ id: techId, charId: rawTech.get('_characterid'), core: rawTech.get('current')});
            }
        } else if(techName.indexOf('tech_stat') > -1) {
            if(oldTech) {
                oldTech.stat = rawTech.get('current');
            } else {
                techs.push({ id: techId, charId: rawTech.get('_characterid'), stat: rawTech.get('current')});
            }
        } else if(techName.indexOf('tech_cost') > -1) {
            var cost = parseInt(rawTech.get('current'));
            if(cost != cost) {
                cost = 0;
            }
            
            if(oldTech) {
                oldTech.cost = cost;
            } else {
                techs.push({ id: techId, charId: rawTech.get('_characterid'), cost: cost});
            }
        } else if(techName.indexOf('tech_limit_st') > -1) {
            var limitSt = parseInt(rawTech.get('current'));
            if(limitSt != limitSt) {
                limitSt = 0;
            }
            
            if(oldTech) {
                oldTech.limitSt = limitSt;
            } else {
                techs.push({ id: techId, charId: rawTech.get('_characterid'), limitSt: limitSt});
            }
        } else if(techName.indexOf('tech_limits') > -1) {
            var limits = rawTech.get('current').split('\n');
            
            if(oldTech) {
                oldTech.limits = limits;
            } else {
                techs.push({ id: techId, charId: rawTech.get('_characterid'), limits: limits});
            }
        } else if(techName.indexOf('tech_mods') > -1) {
            var mods = rawTech.get('current').split('\n');
            
            if(oldTech) {
                oldTech.mods = mods;
            } else {
                techs.push({ id: techId, charId: rawTech.get('_characterid'), mods: mods});
            }
        } else if(techName.indexOf('tech_micro_summary') > -1) {
            if(oldTech) {
                oldTech.summary = rawTech.get('current');
            } else {
                techs.push({ id: techId, charId: rawTech.get('_characterid'), summary: rawTech.get('current')});
            }
        } else if(techName.indexOf('tech_is_mimic') > -1) {
            if(oldTech) {
                oldTech.isMimic = rawTech.get('current');
            } else {
                techs.push({ id: techId, charId: rawTech.get('_characterid'), isMimic: rawTech.get('current')});
            }
        } else if(techName.indexOf('tech_mimic_target') > -1) {
            if(oldTech) {
                oldTech.mimicTarget = rawTech.get('current');
            } else {
                techs.push({ id: techId, charId: rawTech.get('_characterid'), mimicTarget: rawTech.get('current')});
            }
        } else if(techName.indexOf('tech_core_level') > -1) {
            var coreLevel = parseInt(rawTech.get('current'));
            if(coreLevel != coreLevel) {
                coreLevel = 0;
            }
            if(oldTech) {
                oldTech.coreLevel = coreLevel;
            } else {
                techs.push({ id: techId, charId: rawTech.get('_characterid'), coreLevel: coreLevel});
            }
        } else if(techName.indexOf('tech_level') > -1) {
            var techLevel = parseInt(rawTech.get('current'));
            if(techLevel != techLevel) {
                techLevel = 0;
            }
            if(oldTech) {
                oldTech.techLevel = techLevel;
            } else {
                techs.push({ id: techId, charId: rawTech.get('_characterid'), techLevel: techLevel});
            }
        } else if(techName.indexOf('tech_tech_stat') > -1) {
            if(oldTech) {
                oldTech.techStat = rawTech.get('current');
            } else {
                techs.push({ id: techId, charId: rawTech.get('_characterid'), techLevel: rawTech.get('current')});
            }
        } else if(techName.indexOf('tech_granted_skills') > -1) {
            if(oldTech) {
                oldTech.grantedSkills = rawTech.get('current');
            } else {
                techs.push({ id: techId, charId: rawTech.get('_characterid'), grantedSkills: rawTech.get('current')});
            }
        } else if(techName.indexOf('tech_has_skills') > -1) {
            var hasSkills = rawTech.get('current') == 'on';
            if(oldTech) {
                oldTech.hasSkills = hasSkills;
            } else {
                techs.push({ id: techId, charId: rawTech.get('_characterid'), hasSkills: hasSkills});
            }
        } else if(techName.indexOf('tech_inflicted_flaws') > -1) {
            if(oldTech) {
                oldTech.inflictedFlaws = rawTech.get('current');
            } else {
                techs.push({ id: techId, charId: rawTech.get('_characterid'), inflictedFlaws: rawTech.get('current')});
            }
        } else if(techName.indexOf('tech_has_flaws') > -1) {
            var hasFlaws = rawTech.get('current') == 'on';
            if(oldTech) {
                oldTech.hasFlaws = hasFlaws;
            } else {
                techs.push({ id: techId, charId: rawTech.get('_characterid'), hasFlaws: hasFlaws});
            }
        } else if(techName.indexOf('tech_digDeep') > -1) {
            var digDeep = rawTech.get('current') == 'on';
            if(oldTech) {
                oldTech.digDeep = digDeep;
            } else {
                techs.push({ id: techId, charId: rawTech.get('_characterid'), digDeep: digDeep});
            }
        } else if(techName.indexOf('tech_overloadLimits') > -1) {
            var overloadLimits = rawTech.get('current') == 'on';
            if(oldTech) {
                oldTech.overloadLimits = overloadLimits;
            } else {
                techs.push({ id: techId, charId: rawTech.get('_characterid'), overloadLimits: overloadLimits});
            }
        } else if(techName.indexOf('tech_empowerAttack') > -1) {
            var empowerAttack = rawTech.get('current') == 'on';
            if(oldTech) {
                oldTech.empowerAttack = empowerAttack;
            } else {
                techs.push({ id: techId, charId: rawTech.get('_characterid'), empowerAttack: empowerAttack});
            }
        } else if(techName.indexOf('tech_resoluteStrike') > -1) {
            var resoluteStrike = rawTech.get('current') == 'on';
            if(oldTech) {
                oldTech.resoluteStrike = resoluteStrike;
            } else {
                techs.push({ id: techId, charId: rawTech.get('_characterid'), resoluteStrike: resoluteStrike});
            }
        } else if(techName.indexOf('tech_persist') > -1) {
            var persist = rawTech.get('current') == 'on';
            if(oldTech) {
                oldTech.persist = persist;
            } else {
                techs.push({ id: techId, charId: rawTech.get('_characterid'), persist: persist});
            }
        }
    });
    
    return techs;
}

function resetValor(charId, skills, flaws) {
    if(!charId) {
        return;
    }
    
    if(!skills) {
        skills = getSkills(charId);
    }
    
    if(!flaws) {
        flaws = getFlaws(charId);
    }
    
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
        }
    }
    
    var level = getAttrByName(charId, 'level');
    var valorBySeason = Math.ceil(level / 5) - 1;
    if(getAttrByName(charId, 'type') == 'master') {
        valorBySeason *= 2;
    }
    startingValor += valorBySeason;
    
    updateValueForCharacter(charId, 'valor', startingValor, false, true);
    
    log('Character ' + charId + ' set to ' + startingValor + ' Valor.');
}

// Resets all bonus fields for all characterse
function resetBonuses() {
    var bonusList = ['rollbonus', 'atkrollbonus', 'defrollbonus',
                     'patkbonus', 'eatkbonus', 'defensebonus', 'resistancebonus'];
    bonusList.forEach(function(b) {
        var bonuses = filterObjs(function(obj) {
            return obj.get('_type') == 'attribute' &&
                   obj.get('name') == b;
        });
        
        bonuses.forEach(function(bonus) {
            bonus.set('current', 0);
        });
    });
}

function getTechDamage(tech, charId, crit) {
    if(tech.core != 'damage' && tech.core != 'ultDamage') {
        // This isn't a damaging tech
        return 0;
    }
    
    var special = tech.mods && tech.mods.find(function(m) {
        return m.toLowerCase().indexOf('piercing') > -1 ||
               m.toLowerCase().indexOf('sapping') > -1 ||
               m.toLowerCase().indexOf('persistent') > -1 ||
               m.toLowerCase().indexOf('drain') > -1 ||
               m.toLowerCase().indexOf('debilitating') > -1 ||
               m.toLowerCase().indexOf('boosting') > -1;
    });
    
    var stat = tech.newStat ? tech.newStat : tech.stat;
    var atk = getAttrByName(charId, stat + 'Atk');
    
    if(!atk || atk != atk) {
        atk = 0;
    }
    
    var baseAtk = atk;
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
    
    if(crit) {
        damage += baseAtk;
    }
    
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
    
    if(tech.stat == 'agi' || tech.stat == 'str') {
        var patk = parseInt(getAttrByName(charId, 'patkbonus'));
        if(patk == patk) {
            damage += patk;
        }
    } else {
        var eatk = parseInt(getAttrByName(charId, 'eatkbonus'));
        if(eatk == eatk) {
            damage += eatk;
        }
    }
    
    return damage;
}

function getTechDescription(tech, charId, suppressDamageDisplay) {
    if(!tech) {
        return '';
    }
    var summary = '';
    switch(tech.core) {
        case 'damage':
        case 'ultDamage':
            if(!suppressDamageDisplay) {
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
            }
            break;
        case 'healing':
            var healing;
            var power = getAttrByName(charId, tech.stat);
            if(state.houseRulesEnabled) {
                healing = (tech.coreLevel + 3) * 3 + Math.ceil(power / 2);
            } else {
                healing = (tech.coreLevel + 3) * 4 + power;
            }
            summary = 'Restores <span style="color:darkgreen">**' + healing + '**</span> HP'
            break;
        case 'barrier':
            summary = 'Barrier power ' + tech.coreLevel;
            break;
    }
    
    // Add certain mods to output
    var mods = [];
    if(tech.mods) {
        tech.mods.forEach(m => {
            var mod = m.toLowerCase();
            var split = mod.split(' ');
            var modLevel = parseInt(split[split.length - 1]);
            if(modLevel != modLevel) {
                // NaN, so there's no level listed - assume 1
                modLevel = 1;
            }
            if(mod.indexOf('drain') == 0) {
                mods.push('Drain');
            } else if(mod.indexOf('persistent') == 0) {
                mods.push('Persistent');
            } else if(mod.indexOf('sapping') == 0) {
                mods.push('Sapping');
            } else if(mod.indexOf('darkness') == 0) {
                mods.push('Darkness Zone');
            } else if(mod.indexOf('drop') == 0) {
                mods.push('Drop Attack');
            } else if(mod.indexOf('immobiliz') == 0) {
                mods.push('Immobilize');
            } else if(mod.indexOf('knock') == 0) {
                mods.push('Knock Down');
            } else if(mod.indexOf('light') == 0) {
                mods.push('Light Zone');
            } else if(mod.indexOf('ram') == 0) {
                mods.push('Ramming Attack');
            } else if(mod.indexOf('repo') == 0) {
                var distance = modLevel + 1;
                if(tech.stat == 'str') {
                    distance++;
                }
                mods.push('Reposition ' + distance);
            } else if(mod.indexOf('throw') == 0) {
                mods.push('Throw');
            } else if(mod.indexOf('launch') == 0) {
                mods.push('Launching');
            } else if(mod.indexOf('disrupt') >= 0) {
                mods.push('Terrain Disruption');
            } else if(mod.indexOf('repair') >= 0) {
                mods.push('Terrain Repair');
            }
        });
    }
    if(tech.limits) {
        tech.limits.forEach(l => {
            var limit = l.toLowerCase();
            var split = limit.split(' ');
            var limitLevel = parseInt(split[split.length - 1]);
            if(limitLevel != limitLevel) {
                // NaN, so there's no level listed - assume 1
                limitLevel = 1;
            }
            if(limit.indexOf('mercy') == 0) {
                mods.push('Mercy Limit');
            }
        });
    }
    if(mods.length > 0) {
        if(summary.length > 0) {
            summary += '<br />';
        }
        summary += '*' + mods.join(', ') + '*';
    }
    
    if(tech.hasSkills && tech.grantedSkills) {
        if(summary.length > 0) {
            summary += '<br />';
        }
        summary += 'Skills: ' +  tech.grantedSkills;
    }
    
    if(tech.hasFlaws && tech.inflictedFlaws) {
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

function getTechByName(techId, charId, suppressDamageDisplay) {
    if(!techId) {
        return undefined;
    }
    
    // Trim quotes
    if(techId[0] == '"') {
        techId = techId.substring(1, techId.length - 1);
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
            if(alphaTechId && alphaTechId.length > 0) {
                matchingTech = techs.find(function(t) {
                    return t && t.name &&
                    t.name.toLowerCase().replace(/\W/g, '').indexOf(alphaTechId.toLowerCase()) > -1;
                });
                if(matchingTech) {
                    tech = matchingTech;
                }
            }
        }
    }
    
    if(tech) {
        if(!charId) {
            charId = tech.charId;
        }
        
        if(!tech.core) {
            tech.core = 'damage';
        }
        
        if(!tech.coreLevel) {
            tech.coreLevel = 1;
        }
        
        tech.summary = getTechDescription(tech, charId, suppressDamageDisplay);
    
        if((tech.core == 'mimic' || tech.core == 'ultMimic') && tech.mimicTarget && charId) {
            log('Mimic target: ' + tech.mimicTarget);
            
            // Re-get the mimicked technique
            var oldCore = tech.core;
            var empowerAttack = tech.empowerAttack;
            var overloadLimits = tech.overloadLimits;
            var resoluteStrike = tech.resoluteStrike;
            var oldId = tech.id;
            var mimicTech = tech;
            tech = getTechByName(tech.mimicTarget, null, suppressDamageDisplay);
            if(tech) {
                tech.name = mimicTech.name + ' [' + tech.name + ']';
        
                // Revise core level
                tech.coreLevel = mimicTech.coreLevel - (tech.techLevel - tech.coreLevel);
                
                if(tech.coreLevel <= 0) {
                    // Set core type back to mimic so that invocation can see it
                    tech.core = oldCore;
                } else {
                    // Put the checkboxes back as they were
                    tech.empowerAttack = empowerAttack;
                    tech.overloadLimits = overloadLimits;
                    tech.resoluteStrike = resoluteStrike;
                    
                    // Rewrite tech summary
                    log('Reproducing tech at core level ' + tech.coreLevel);
                    tech.summary = getTechDescription(tech, charId, suppressDamageDisplay);
                }
                
                // Roll using the chosen stat
                tech.newStat = tech.stat;
                tech.stat = mimicTech.stat;
                
                // Put the original core type (mimic vs ult mimic) in the object
                tech.oldCore = oldCore;
                tech.id = oldId;
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
function updateValor(obj) {
    if(!state.valorUpdaterEnabled) {
        // Settings check
        return;
    }
    
    var turnOrder = JSON.parse(obj.get('turnorder'));
    if(!turnOrder || turnOrder.length === 0) {
        // Do nothing if initiative tracker is empty
        return;
    }
    
    var lastChar = turnOrder[turnOrder.length - 1];
    if(!lastChar || lastChar.custom.toLowerCase() != 'round') {
        // Only continue if the 'Round' counter is at the bottom of the init order
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
                if(getSkill(charId, 'limitlessPower')) {
                    // +1 valor rate for Valiant skill
                    valorRate++;
                }
                if(charClass == 'master') {
                    // +1 to hit for Masters
                    valorRate *= 2;
                }
            }
            
            log('Character ' + token.get('name') + ' gains ' + valorRate + ' for new round.');
            
            updateValue(token.get('_id'), 'valor', valorRate);
            
            if(getSkill(charId, 'bounceBack') && valor < 0) {
                updateValue(token.get('_id'), 'valor', 1);
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
    
    var lastChar = turnOrder[turnOrder.length - 1];
    if(!lastChar || lastChar.custom.toLowerCase() != 'round') {
        // Only continue if the 'Round' counter is at the bottom of the init order
        return;
    }

    var round = lastChar.pr;
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

function updateValue(tokenId, attribute, amount, ratio, absolute) {
    var token = getObj('graphic', tokenId);
    var bar = '1';
    switch(attribute) {
        case 'st':
            bar = '2';
            break;
        case 'valor':
            bar = '3';    
    }
    
    if(!token) {
        log("Couldn't find token for ID " + tokenId);
        return;
    }
    
    var attr = getObj('attribute', token.get('bar' + bar + '_link'));
    if(attr) {
        var oldValue = parseInt(attr.get('current'));
        var maxValue = parseInt(attr.get('max'));
        if(oldValue != oldValue) {
            oldValue = 0;
        }
        if(maxValue != maxValue) {
            maxValue = 0;
        }
        
        var valueChange = ratio ? Math.ceil(amount * maxValue) : amount;
        var newValue = absolute ? valueChange : oldValue + valueChange;
        
        if(newValue > maxValue) {
            newValue = maxValue;
        }
        
        attr.set('current', newValue);
        if(attribute == 'hp') {
            criticalHealthWarning(token, oldValue);
        }
    } else {
        var oldValue = parseInt(token.get('bar' + bar + '_value'));
        var maxValue = parseInt(token.get('bar' + bar + '_max'));
        if(oldValue != oldValue) {
            oldValue = 0;
        }
        if(maxValue != maxValue) {
            maxValue = 0;
        }
        
        var valueChange = ratio ? Math.ceil(amount * maxValue) : amount;
        var newValue = absolute ? valueChange : oldValue + valueChange;
        
        if(newValue > maxValue) {
            newValue = maxValue;
        }
        
        token.set('bar' + bar + '_value', newValue);
        if(attribute == 'hp') {
            criticalHealthWarning(token, oldValue);
        }
    }
}

function updateValueForCharacter(characterId, attribute, amount, ratio, absolute) {
    var actor = getObj('character', characterId);
    
    if(!actor) {
        log("Couldn't find character for ID " + characterId);
        return;
    }
    
    var attrs = filterObjs(function(obj) {
        return obj.get('_type') == 'attribute' &&
            obj.get('characterid') == characterId &&
            obj.get('name') == attribute;
    });
    
    if(attrs && attrs.length > 0) {
        var attr = attrs[0];
        var oldValue = parseInt(attr.get('current'));
        var maxValue = parseInt(attr.get('max'));
        if(oldValue != oldValue) {
            oldValue = 0;
        }
        if(maxValue != maxValue) {
            maxValue = 0;
        }
        
        var valueChange = ratio ? Math.ceil(amount * maxValue) : amount;
        var newValue = absolute ? valueChange : oldValue + valueChange;
        
        if(newValue > maxValue) {
            newValue = maxValue;
        }
        
        attr.set('current', newValue);
    }
}

function startEvent(eventName) {
    if(!state.timer) {
        state.timer = {};
    }
    
    state.timer[eventName] = new Date();
    log("Event '" + eventName + "' initiated.");
}

function checkEvent(eventName) {
    if(!state.timer) {
        state.timer = {};
    }
    
    if(state.timer[eventName]) {
        var date = new Date();
        var time = (date.getTime() - state.timer[eventName].getTime()) / 1000;
        log("Event '" + eventName + "' ongoing for " + time + ' seconds.');
    } else {
        log("Event '" + eventName + "' not found.");
    }
}

function endEvent(eventName) {
    if(!state.timer) {
        state.timer = {};
    }
    
    if(state.timer[eventName]) {
        var date = new Date();
        var time = (date.getTime() - state.timer[eventName].getTime()) / 1000;
        log("Event '" + eventName + "' took " + time + ' seconds.');
        state.timer[eventName] = null;
    } else {
        log("Event '" + eventName + "' not found.");
    }
}

// !reset command
// Enter !reset in the chat to purge the tech data history and reset valor without healing anyone.
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!reset') == 0
        && playerIsGM(msg.playerid)) {
            
        var tokens = filterObjs(function(obj) {
            return obj.get('_type') == 'graphic' &&
                   obj.get('represents');
        });

        tokens.forEach(function(token) {
            resetValor(token);
        });
        resetBonuses();
		
        log('Tech data:');
        log(state.techData);
        log('Tech history:');
        log(state.techHistory);
		
        state.techData = {};
        state.techHistory = [];
        log('Reset complete.');
    }
    
});

// !check command
// Identifies a given character by token ID.
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!check') == 0
        && playerIsGM(msg.playerid)) {
        // Get params
        var split = msg.content.match(/(".*?")|(\S+)/g);
        if(split.length == 1) {
            log('Please specify a token ID.');
        } else {
            var tokenId = split[1];
            var tokens = findObjs({                         
                _type: "graphic",
                _id: tokenId
            });
            if(tokens.length > 0) {
                token = tokens[0];
                var name = token.get('name');
                if(name) {
                    log('Token ID ' + tokenId + ' is ' + name + '.');
                } else {
                    var characters = filterObjs(function(obj) {
                        return obj.get('_type') === 'character' &&
                               obj.get('_id') === token.get('represents');
                    });
                    
                    if(characters.length > 0) {
                        var actor = characters[0];
                        name = actor.get('name');
                        log('Token ID ' + tokenId + ' is ' + name + '.');
                    } else {
                        log('Token ID ' + tokenId + ' has no name.');
                    }
                }
            } else {
                log('No such token found.');
            }
        }
    }
    
});

// !status command
on('chat:message', function(msg) {
    if(msg.type == 'api' && (msg.content.indexOf('!status') == 0)) {
        startEvent('!status');
        // Figure out who's using a tech
        var actor = getActor(msg);
        if(!actor) {
            log('No usable character found for ' + msg.playerid);
            endEvent('!tech');
            return;
        }
    
        // Use selected token or first token on active page that represents character
        var token;
        if(msg.selected && msg.selected.length > 0) {
            var selectedToken = getObj('graphic', msg.selected[0]._id);
            if(selectedToken.get('represents') == actor.get('_id')) {
                token = selectedToken;
            }
        }
        
        if(!token) {
            var tokens = findObjs({
                _pageid: Campaign().get("playerpageid"),                 
                _type: "graphic",
                represents: actor.get('_id')
            });
            if(tokens.length > 0) {
                token = tokens[0];
            }
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

        // Show a list of techs for this character
        if(actor) {
            var techs = getTechs(actor.get('_id'));
            var message = '<table>';
            techs.forEach(function(tech) {
                message += '<tr><td>**' + tech.name + '**: ';
                
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
                var techStatus = [];
                if(tech.limits) {
                    
                    if(token) {
                        // Check stamina
                        var st = parseInt(token.get('bar2_value'));
                        
                        if(st == st && st < tech.cost && !tech.digDeep) {
                            techStatus.push("Not enough ST");
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
                                        techStatus.push('Not enough Init');
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
                            techStatus.push('Not enough Valor');
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
                            techStatus.push('HP too high');
                        }
                    }
                    
                    // Check Vitality Limit
                    var vitalityLimit = tech.limits.find(function(l) {
                        return l.toLowerCase().indexOf('vitality') == 0;
                    });
                    
                    if(vitalityLimit && token) {
                        var hp = parseInt(token.get('bar1_value'));
                        var hpMax = parseInt(token.get('bar1_max'));
                        if(hp != hp) {
                            hp = 0;
                        }
                        if(hpMax != hpMax) {
                            hpMax = 0;
                        }
                        
                        var hpTarget = Math.ceil(hpMax * 0.6);
                        
                        if(hp < hpTarget) {
                            techStatus.push('HP too low');
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
                                techStatus.push('Not ready yet');
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
                            techStatus.push('Out of ammo');
                        } else {
                            var ammoLeft = 3 - ammoLimitLevel - techData.timesUsed.length;
                            techStatus.push(ammoLeft + ' ammo left');
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
                            if(round <= lastTurnUsed + cooldownLimitLevel) {
                                techStatus.push('On cooldown');
                            }
                        }
                    }
                }
                
                // Check for Ultimate usage
                if(tech.core == 'ultDamage' || tech.core == 'transform' ||
                    tech.core == 'ultMimic' || tech.core == 'domain') {
                    if(techData.timesUsed.length > 0) {
                        techStatus.push('Already used');
                    }
                }
                
                if(techStatus.length > 0) {
                    message += techStatus.join(', ');
                } else {
                    message += 'OK';
                }
                
                message +='</td></tr>';
            });
            message += '</table>';
            var cleanMessage = message.replace(/\"/g, '&#' + '34;'); // Concatenated to keep the editor from freaking out
            sendChat('Valor', '/w "' + msg.who + '" ' + cleanMessage);
        }
        endEvent('!status');
    }
});

// !tech command
on('chat:message', function(msg) {
    if(msg.type == 'api' && (msg.content.indexOf('!t ') == 0 || 
    msg.content.indexOf('!tech') == 0 ||
    msg.content == '!t')) {
        startEvent('!tech');
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
            endEvent('!tech');
            return;
        }
        var actorClass = getAttrByName(actor.get('_id'), 'type');
        
        // Check for --targets list
        var targetsList = [];
        var targetsParam = split.indexOf('--targets');
        if(targetsParam > -1) {
            for(var targetParam = targetsParam + 1; targetParam < split.length; targetParam++) {
                var target = getObj('graphic', split[targetParam]);
                if(target) {
                    targetsList.push(target);
                }
            }
            split.splice(targetsParam);
        }
        
        if(split.length < 2) {
            // Show a list of techs for this character
            if(actor) {
                var techs = getTechs(actor.get('_id'));
                var message = '<table><tr><td>Pick a Technique to use:</td></tr>';
                techs.forEach(function(tech) {
                    message += '<tr><td>[' + tech.name + '](!t "' + tech.name + '")</td></tr>';
                });
                message += '</table>';
                var cleanMessage = message.replace(/\"/g, '&#' + '34;'); // Concatenated to keep the editor from freaking out
                sendChat('Valor', '/w "' + msg.who + '" ' + cleanMessage);
            }
            endEvent('!tech');
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
        
        var tech = getTechByName(techId, actor.get('_id'), targetsList.length > 0);
        
        if(!tech) {
            log('Tech does not exist.');
            sendChat('Valor', '/w "' + msg.who + "\" I can't find that technique.");
            endEvent('!tech');
            return;
        }
        
        // Failed mimic check
        if((tech.core == 'mimic' || tech.core == 'ultMimic') && tech.coreLevel <= 0) {
            log('Mimic failed, effective tech level ' + tech.coreLevel + '.');
            sendChat('Valor', '/w "' + actor.get('name') + '" ' + 'Core Level is too low to mimic this technique.');
            endEvent('!tech');
            return;
        }
        
        // Check if they're trying to mimic an ult with a non-ult mimic tech
        if(tech.oldCore == 'mimic' && (tech.core == 'ultDamage' || 
            tech.core == 'transform' || tech.core == 'domain')) {
            log('Mimic failed, target core type ' + tech.oldCore + '.');
            sendChat('Valor', '/w "' + actor.get('name') + '" ' + "You can't mimic an Ultimate Technique with a normal Mimic Core.");
            endEvent('!tech');
            return;
        }
        
        // Check for Overload Limits
        if(tech.overloadLimits) {
            overrideLimits = true;
            log('Overloading limits.');
        }
        
        // Check for Overload Limits
        if(tech.persist) {
            overrideLimits = true;
            log('Rerolling persistent tech.');
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
        var blocked = false;
        var errorMessage = '';
        if(tech.limits && !overrideLimits && 
                (!state.ignoreLimitsOnMinions || 
                (actorClass != 'flunky' && actorClass != 'soldier'))) {
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
            
            // Check Vitality Limit
            var vitalityLimit = tech.limits.find(function(l) {
                return l.toLowerCase().indexOf('vitality') == 0;
            });
            
            if(vitalityLimit && token) {
                var hp = parseInt(token.get('bar1_value'));
                var hpMax = parseInt(token.get('bar1_max'));
                if(hp != hp) {
                    hp = 0;
                }
                if(hpMax != hpMax) {
                    hpMax = 0;
                }
                
                var hpTarget = Math.ceil(hpMax * 0.6);
                
                if(hp < hpTarget) {
                    log('Tech blocked - Vitality Limit');
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
                    if(round <= lastTurnUsed + cooldownLimitLevel) {
                        log('Tech blocked - Cooldown Limit');
                        errorMessage += 'This Technique is still on cooldown.<br>'
                        blocked = true;
                    }
                }
            }
        }
        
        // Check for Ultimate usage
        if(tech.core == 'ultDamage' || tech.core == 'transform' ||
            tech.core == 'ultMimic' || tech.core == 'domain') {
            var unerring = tech.mods.find(function(m) {
                return m.toLowerCase().indexOf('unerring') == 0;
            });
            
            if(!unerring && techData.timesUsed.length > 0) {
                log('Tech blocked - Ultimate already used');
                errorMessage += 'You already used this Ultimate Technique.<br>'
                blocked = true;
            }
        }
            
        if(blocked) {
            var cleanButton = msg.content.replace(/\"/g, '&#' + '34;'); // Concatenated to keep the editor from freaking out
            errorMessage += '[Override](' + cleanButton + ' --override)';
            sendChat('Valor', '/w "' + actor.get('name') + '" ' + errorMessage);
            log('Tech failed on turn ' + round);
            endEvent('!tech');
            return;
        }
        
        var rollText = '';
        var hiddenRollText = '';
        
        if(tech.core == 'damage' ||
           tech.core == 'ultDamage' ||
           tech.core == 'weaken' ||
           tech.core == 'custom') {
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
            
            var accurate = tech.mods && tech.mods.find(function(m) {
                return m.toLowerCase().indexOf('accurate') > -1;
            });
            
            if(accurate) {
                rollBonus += 2;
            }
            
            var universalBonus = parseInt(getAttrByName(actor.get('_id'), 'rollbonus'));
            if(universalBonus == universalBonus) {
                rollBonus += universalBonus;
            }
            
            var atkBonus = parseInt(getAttrByName(actor.get('_id'), 'atkrollbonus'));
            if(atkBonus == atkBonus) {
                rollBonus += atkBonus;
            }
            
            var iatkBonus = parseInt(getAttrByName(actor.get('_id'), 'iatkrollbonus'));
            if(iatkBonus == iatkBonus) {
                rollBonus += iatkBonus;
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
                    rollStat = 'mnd';
                }
            }
            
            if(tech.resoluteStrike) {
                rollStat = 'gut';
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
        }
        
        if(targetsList.length > 0) {
            var fullList = (!state.hideNpcTechEffects || !state.rollBehindScreen || actor.get('controlledby')) &&
                (tech.core == 'damage' || tech.core == 'ultDamage' || tech.core == 'weaken' || tech.core == 'custom') && rollStat != 'none';
            var hiddenFullList = ((state.hideNpcTechEffects || state.rollBehindScreen) && !actor.get('controlledby')) &&
                (tech.core == 'damage' || tech.core == 'ultDamage' || tech.core == 'weaken' || tech.core == 'custom') && rollStat != 'none';
            
            if(fullList) {
                rollText += ':';
            } else {
                if(tech.core == 'boost' || tech.core == 'ultTransform' || tech.core == 'healing') {
                    rollText += targetsList.length == 1 ? 'Target' : 'Targets';
                } else {
                    rollText += ' VS';
                }
            }
            
            var firstTarget = true;
            
            targetsList.forEach(function(target) {
                var targetCharId = target.get('represents');
                var targetChar = getObj('character', targetCharId);
                var targetName = target.get('name');
                if(!targetName && targetChar) {
                    targetName = targetChar.get('name');
                }
                if(!targetName) {
                    targetName = 'Target';
                }
                
                // Get damage
                var damage = getTechDamage(tech, actor.get('_id'));
                
                // Get def/res
                var defRes = 0;
                var defResStat = tech.newStat ? tech.newStat : tech.stat;
                
                if(targetChar && (!tech.mods || !tech.mods.find(function(m) {
                    return m.toLowerCase().indexOf('piercing') > -1
                }))) {
                    var physical = defResStat == 'str' || defResStat == 'agi';
                    if(tech.mods && tech.mods.find(function(m) {
                        return m.toLowerCase().indexOf('shift') > -1
                    })) {
                        physical = !physical;
                    }
                    if(physical) {
                        defRes = getAttrByName(targetCharId, 'defense');
                        var bonus = parseInt(getAttrByName(targetCharId, 'defensebonus'));
                        if(bonus == bonus) {
                            defRes += bonus;
                        }
                    } else {
                        defRes = getAttrByName(targetCharId, 'resistance');
                        var bonus = parseInt(getAttrByName(targetCharId, 'resistancebonus'));
                        if(bonus == bonus) {
                            defRes += bonus;
                        }
                    }
                }
                
                if(fullList) {
                    rollText += '<br />VS ' + targetName + ': ';
                    
                    if(!state.rollBehindScreen || actor.get('controlledby')) {
                        rollText += '[[1d10+' + roll + ']]';
                    }
                    
                    if((!state.hideNpcTechEffects || actor.get('controlledby')) && tech.core != 'weaken' && tech.core != 'custom') {
                        if(!state.rollBehindScreen || actor.get('controlledby')) {
                            rollText += ', ';
                        }
                        rollText += 'Damage [[{' + damage + ' - ' + defRes + ', 0}kh1]]';
                    }
                    
                } else {
                    rollText += (firstTarget ? ' ' : ', ') + targetName;
                    firstTarget = false;
                }
                
                if(hiddenFullList) {
                    // Add hidden info
                    hiddenRollText += '<br />VS ' + targetName + ': ';
                    if(state.rollBehindScreen) {
                        hiddenRollText += '[[1d10+' + roll + ']]';
                    }
                    
                    if(state.hideNpcTechEffects && tech.core != 'weaken' && tech.core != 'custom') {
                        if(state.rollBehindScreen) {
                            hiddenRollText += ', ';
                        }
                        hiddenRollText += 'Damage [[' + damage + ' - ' + defRes + ']]';
                    }
                }
            });
        } else if(rollStat && rollStat != 'none') {
            if(state.rollBehindScreen && !actor.get('controlledby')) {
                hiddenRollText = 'Hidden roll';
                if(targets > 1) {
                    hiddenRollText += 's, left to right';
                }
                
                if(tech.core == 'damage' || tech.core == 'ultDamage' || tech.core == 'weaken' || tech.core == 'custom') {
                    hiddenRollText += ':';
                }
                
                for(i = 0; i < targets; i++) {
                    hiddenRollText += ' [[1d10+' + roll + ']]';
                }
                
            } else {
                if(targets > 1) {
                    rollText += ', left to right';
                }
                
                if(tech.core == 'damage' || tech.core == 'ultDamate' || tech.core == 'weaken' || tech.core == 'custom') {
                    rollText += ':';
                }
                
                for(i = 0; i < targets; i++) {
                    rollText += ' [[1d10+' + roll + ']]';
                }
            }
        }
        
        // Pay costs
        if(token && !tech.persist) {
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
            
            updateValue(token.get('_id'), 'st', -stCost);
            if(stCost > 0) {
                log('Consumed ' + stCost + ' ST');
            }
            
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
                    updateValue(token.get('_id'), 'valor', -valorCost);
                    log('Consumed ' + valorCost + ' Valor');
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
            
            updateValue(token.get('_id'), 'hp', -hpCost);
            if(hpCost > 0) {
                log('Consumed ' + hpCost + ' HP');
            }
            
            if(!state.techHistory) {
                state.techHistory = [];
            }
            if(state.techHistory.length > 20) {
                // Don't let the tech history get too long
                state.techHistory = state.techHistory.slice(1);
            }
        }
        
        // Update HP for Transformations and Heals
        if(state.autoResolveHealing) {
            if(tech.core == 'ultTransform' || tech.core == 'healing') {
                var charIds = [];
                
                if(targetsList.length > 0) {
                    targetsList.forEach(function(target) {
                        charIds.push(target.get('represents'));
                    });
                } else {
                    charIds.push(actor.get('_id'));
                }
                
                var hpGain = 0;
                if(tech.core == 'ultTransform') {
                    var level = parseInt(getAttrByName(actor.get('_id'), 'level'));
                    if(level != level) {
                        level = 1;
                    }
                    
                    hpGain = level * 10;
                    if(getAttrByName(actor.get('_id'), 'type') == 'master') {
                        hpGain *= 2;
                    }
                } else {
                    var power = getAttrByName(actor.get('_id'), tech.stat);
                    if(state.houseRulesEnabled) {
                        hpGain = (tech.coreLevel + 3) * 3 + Math.ceil(power / 2);
                    } else {
                        hpGain = (tech.coreLevel + 3) * 4 + power;
                    }
                }
                
                charIds.forEach(function(charId) {
                    var aggravatedWounds = getFlaw(charId, 'aggravatedWounds');
                    if(aggravatedWounds && tech.core == 'healing') {
                        updateValueForCharacter(charId, 'hp', Math.ceil(hpGain / 2));
                    } else {
                        updateValueForCharacter(charId, 'hp', hpGain);
                    }
                });
                
            }
        }
        
        var techQualifiers = [];
        if(tech.empowerAttack) {
            techQualifiers.push('Empowered');
        }
        
        var hp = 1;
        var hpMax = 1;
        
        if(token) {
            hp = parseInt(token.get('bar1_value'));
            hpMax = parseInt(token.get('bar1_max'));
        } else {
            hp = getAttrByName(actor.get('_id'), 'hp');
            hpMax = getAttrByName(actor.get('_id'), 'hp', 'max');
        }
        if(hp / hpMax <= 0.4) {
            var crisis = getSkill(actor.get('_id'), 'crisis');
            if(crisis && crisis.level) {
                techQualifiers.push('Crisis');
            }
            var berserker = getFlaw(actor.get('_id'), 'berserker')
            if(berserker) {
                techQualifiers.push('Berserker');
            }
        }
        
        var message = '<table>';
        if(tech.persist) {
            message += '<tr><td>Persisting Technique: **' + tech.name;
            if(techQualifiers.length > 0) {
                message += ' (' + techQualifiers.join(', ') + ')';
            }
            message += '**</td></tr>';
        } else {
            message += '<tr><td>Performing Technique: **' + tech.name;
            if(techQualifiers.length > 0) {
                message += ' (' + techQualifiers.join(', ') + ')';
            }
            message += '**</td></tr>';
        }
        
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
                valorCost: valorCost,
                targets: targetsList.map(t => t.get('_id'))
            });
            state.techData[techDataId].timesUsed.push(round);
            log('Updated tech data:');
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
        
        if(hiddenRollText && hiddenRollText.length > 0) {
            sendChat('Valor', '/w gm ' + hiddenRollText);
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
        
        if(tech.resoluteStrike) {
            log('Resolute Strike was enabled.');
            var techAttrs = filterObjs(function(obj) {
                if(obj.get('_type') == 'attribute' &&
                   obj.get('name').indexOf(tech.id) > -1 &&
                   obj.get('name').indexOf('resoluteStrike') > -1) {
                       return true;
                }
                return false;
            });
            if(techAttrs && techAttrs.length > 0) {
                var resoluteStrike = techAttrs[0];
                resoluteStrike.set('current', '0');
            }
        }
        
        if(tech.persist) {
            log('Persistent Reroll was enabled.');
            var techAttrs = filterObjs(function(obj) {
                if(obj.get('_type') == 'attribute' &&
                   obj.get('name').indexOf(tech.id) > -1 &&
                   obj.get('name').indexOf('persist') > -1 &&
                   obj.get('name').indexOf('can_persist') == -1) {
                       return true;
                }
                return false;
            });
            if(techAttrs && techAttrs.length > 0) {
                var persist = techAttrs[0];
                persist.set('current', '0');
            }
        }
        
        // Reset number of targets and roll modifier on tech
        var techTargetAttrs = filterObjs(function(obj) {
            if(obj.get('_type') == 'attribute' &&
               obj.get('name').indexOf(tech.id) > -1 &&
               obj.get('name').indexOf('targets') > -1) {
                   return true;
            }
            return false;
        });
        if(techTargetAttrs && techTargetAttrs.length > 0) {
            var targets = techTargetAttrs[0];
            targets.setWithWorker({current: '1'});
        }
        
        var techBonusAttrs = filterObjs(function(obj) {
            if(obj.get('_type') == 'attribute' &&
               obj.get('name').indexOf(tech.id) > -1 &&
               obj.get('name').indexOf('bonus') > -1) {
                   return true;
            }
            return false;
        });
        if(techBonusAttrs && techBonusAttrs.length > 0) {
            var bonus = techBonusAttrs[0];
            bonus.setWithWorker({current: '0'});
        }
        
        log('Technique ' + tech.name + ' performed by ' + actor.get('name') + ' on Round ' + round + '.');
        endEvent('!tech');
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
        
        // Refund lost resources
        updateValue(techLog.id, 'hp', techLog.hpCost);
        updateValue(techLog.id, 'st', techLog.stCost);
        updateValue(techLog.id, 'valor', techLog.valorCost);
        
        // Remove tech from history
        state.techHistory = state.techHistory.slice(0, state.techHistory.length - 1);
        
        var token = getObj('graphic', techLog.id);
        
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
            for(i = 0; i < turnOrder.length; i++) {
                if(turnOrder[i].id != '-1') {
                    var token = getObj('graphic', turnOrder[i].id);
                    actor = getObj('character', token.get('represents'));
                    break;
                }
            }
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
        startEvent('!rest');
        
        // Find all characters with Fast Healing
        var fastHealingSkills = filterObjs(function(obj) {
            if(obj.get('_type') == 'attribute' &&
               obj.get('name').indexOf('repeating_skills') > -1 &&
               obj.get('current') == 'fastHealing') {
                   return true;
            }
            return false;
        });
        var fastHealingCharacters = {};
        fastHealingSkills.forEach(function(skill) {
            var charId = skill.get('_characterid');
            var di = parseInt(getAttrByName(charId, 'di'));
            if(di == di) {
                fastHealingCharacters[charId] = di;
            }
        })
        
        var startingValor = {};
        
        // Determine starting Valor for every charId
        if(state.houseRulesEnabled) {
            var levelAttrs = filterObjs(function(obj) {
                return obj.get('_type') == 'attribute' &&
                    obj.get('name') == 'level';
            });
            
            levelAttrs.forEach(function(levelAttr) {
                var level = parseInt(levelAttr.get('current'));
                var charId = levelAttr.get('_characterid');
                if(level == level) {
                    var valorBySeason = Math.ceil(level / 5) - 1;
                    if(getAttrByName(charId, 'type') == 'master') {
                        valorBySeason *= 2;
                    }
                    startingValor[charId] = valorBySeason;
                }
            });
        }
        
        // Find all characters with Bravado
        var bravadoSkills = filterObjs(function(obj) {
            if(obj.get('_type') == 'attribute' &&
               obj.get('name').indexOf('repeating_skills') > -1 &&
               obj.get('current') == 'bravado') {
                   return true;
            }
            return false;
        });
        
        bravadoSkills.forEach(function(skill) {
            var valor = 1;
            if(!state.houseRulesEnabled) {
                // Get the corresponding skill level
                var skillId = skillName.split('_')[2];
                var skillLevelAttr = filterObjs(function(obj) {
                    if(obj.get('_type') == 'attribute' &&
                       obj.get('name').indexOf('skilllevel') > -1 &&
                       obj.get('name').indexOf(skillId) > -1) {
                           return true;
                    }
                    return false;
                });
                if(skillLevelAttr) {
                    skillLevelAttrValue = parseInt(skillLevelAttr.get('current'));
                    if(skillLevelAttrValue == skillLevelAttrValue) {
                        valor = skillLevelAttrValue;
                    }
                }
            }
            
            var charId = skill.get('_characterid');
            if(startingValor[charId]) {
                startingValor[charId] += valor;
            } else {
                startingValor[charId] = valor;
            }
        });
        
        // Update every HP attribute
        var hpAttrs = filterObjs(function(obj) {
            return obj.get('_type') == 'attribute' &&
                obj.get('name') == 'hp';
        });
        
        hpAttrs.forEach(function(hpAttr) {
            var oldValue = parseInt(hpAttr.get('current'));
            var maxValue = parseInt(hpAttr.get('max'));
            if(oldValue != oldValue) {
                oldValue = 0;
            }
            if(maxValue != maxValue) {
                maxValue = 0;
            }
            
            var newValue = oldValue + Math.ceil(maxValue / 5);
            
            var charId = hpAttr.get('_characterid');
            if(fastHealingCharacters[charId]) {
                // Apply Fast Healing skill
                newValue += fastHealingCharacters[charId];
            }
            
            if(newValue > maxValue) {
                newValue = maxValue;
            }
            
            hpAttr.set('current', newValue);
        });
        
        // Update every ST attribute
        var stAttrs = filterObjs(function(obj) {
            return obj.get('_type') == 'attribute' &&
                obj.get('name') == 'st';
        });
        
        stAttrs.forEach(function(stAttr) {
            var oldValue = parseInt(stAttr.get('current'));
            var maxValue = parseInt(stAttr.get('max'));
            if(oldValue != oldValue) {
                oldValue = 0;
            }
            if(maxValue != maxValue) {
                maxValue = 0;
            }
            
            var newValue = oldValue + Math.ceil(maxValue / 5);
            
            if(newValue > maxValue) {
                newValue = maxValue;
            }
            
            stAttr.set('current', newValue);
        });
        
        // Update every Valor attribute
        var vAttrs = filterObjs(function(obj) {
            return obj.get('_type') == 'attribute' &&
                obj.get('name') == 'valor';
        });
        
        vAttrs.forEach(function(vAttr) {
            var charId = vAttr.get('_characterid');
            
            if(startingValor[charId]) {
                vAttr.set('current', startingValor[charId]);
            } else {
                vAttr.set('current', 0);
            }
        });
        
        resetBonuses();
        
        checkEvent('!rest');
        
        // Handle values as best we can for current-page, Object layer unaffiliated tokens
        var page = Campaign().get('playerpageid');
        var tokens = filterObjs(function(obj) {
            return obj.get('_type') == 'graphic' &&
                obj.get('layer') == 'objects' &&
                !obj.get('isdrawing') &&
                !obj.get('represents');
        });
        tokens.forEach(function(token) {
            var tokenId = token.get('_id');
            updateValue(tokenId, 'hp', 0.2, true);
            updateValue(tokenId, 'st', 0.2, true);
            updateValue(tokenId, 'valor', 0, false, true);
        });
        
        state.techData = {};
        state.techHistory = [];
        
        endEvent('!rest');
    }
});

// !fullrest command
// Enter !fullrest in the chat to recover all HP/ST for all characters.
// Also sets everyone's Valor to starting values.
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!fullrest') == 0
        && playerIsGM(msg.playerid)) {
        startEvent('!fullrest');
        
        var startingValor = {};
        
        // Determine starting Valor for every charId
        if(state.houseRulesEnabled) {
            var levelAttrs = filterObjs(function(obj) {
                return obj.get('_type') == 'attribute' &&
                    obj.get('name') == 'level';
            });
            
            levelAttrs.forEach(function(levelAttr) {
                var level = parseInt(levelAttr.get('current'));
                var charId = levelAttr.get('_characterid');
                if(level == level) {
                    var valorBySeason = Math.ceil(level / 5) - 1;
                    if(getAttrByName(charId, 'type') == 'master') {
                        valorBySeason *= 2;
                    }
                    startingValor[charId] = valorBySeason;
                }
            });
        }
        
        // Find all characters with Bravado
        var bravadoSkills = filterObjs(function(obj) {
            if(obj.get('_type') == 'attribute' &&
               obj.get('name').indexOf('repeating_skills') > -1 &&
               obj.get('current') == 'bravado') {
                   return true;
            }
            return false;
        });
        
        bravadoSkills.forEach(function(skill) {
            var valor = 1;
            if(!state.houseRulesEnabled) {
                // Get the corresponding skill level
                var skillId = skillName.split('_')[2];
                var skillLevelAttr = filterObjs(function(obj) {
                    if(obj.get('_type') == 'attribute' &&
                       obj.get('name').indexOf('skilllevel') > -1 &&
                       obj.get('name').indexOf(skillId) > -1) {
                           return true;
                    }
                    return false;
                });
                if(skillLevelAttr) {
                    skillLevelAttrValue = parseInt(skillLevelAttr.get('current'));
                    if(skillLevelAttrValue == skillLevelAttrValue) {
                        valor = skillLevelAttrValue;
                    }
                }
            }
            
            var charId = skill.get('_characterid');
            if(startingValor[charId]) {
                startingValor[charId] += valor;
            } else {
                startingValor[charId] = valor;
            }
        });
        
        // Update every HP attribute
        var hpAttrs = filterObjs(function(obj) {
            return obj.get('_type') == 'attribute' &&
                obj.get('name') == 'hp';
        });
        
        hpAttrs.forEach(function(hpAttr) {
            var maxValue = parseInt(hpAttr.get('max'));
            if(maxValue != maxValue) {
                maxValue = 0;
            }
            
            hpAttr.set('current', maxValue);
        });
        
        // Update every ST attribute
        var stAttrs = filterObjs(function(obj) {
            return obj.get('_type') == 'attribute' &&
                obj.get('name') == 'st';
        });
        
        stAttrs.forEach(function(stAttr) {
            var maxValue = parseInt(stAttr.get('max'));
            if(maxValue != maxValue) {
                maxValue = 0;
            }
            
            stAttr.set('current', maxValue);
        });
        
        // Update every Valor attribute
        var vAttrs = filterObjs(function(obj) {
            return obj.get('_type') == 'attribute' &&
                obj.get('name') == 'valor';
        });
        
        vAttrs.forEach(function(vAttr) {
            var charId = vAttr.get('_characterid');
            
            if(startingValor[charId]) {
                vAttr.set('current', startingValor[charId]);
            } else {
                vAttr.set('current', 0);
            }
        });
        
        resetBonuses();
        
        checkEvent('!fullrest');
        
        // Handle values as best we can for current-page, Object layer unaffiliated tokens
        var page = Campaign().get('playerpageid');
        var tokens = filterObjs(function(obj) {
            return obj.get('_type') == 'graphic' &&
                obj.get('layer') == 'objects' &&
                !obj.get('isdrawing') &&
                !obj.get('represents');
        });
        tokens.forEach(function(token) {
            var tokenId = token.get('_id');
            updateValue(tokenId, 'hp', 1.0, true, true);
            updateValue(tokenId, 'st', 1.0, true, true);
            updateValue(tokenId, 'valor', 0, false, true);
        });
        
        state.techData = {};
        state.techHistory = [];
        
        endEvent('!fullrest');
    }
});

// !init command
// Purge everything on the turn tracker, roll initiative for all characters on current page,
// set everything up at once
// Also sets everyone's Valor to starting values.
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!init') == 0
        && playerIsGM(msg.playerid)) {
        startEvent('!init');
        var split = msg.content.match(/(".*?")|(\S+)/g);
        var turnOrder = JSON.parse(Campaign().get('turnorder'));
        
        if((split.length < 2 || split[1] != '--confirm') && turnOrder && turnOrder.length > 0) {
            // No --confirm, ask for verification
            sendChat('Valor', '/w gm You will lose all information currently on the Turn Tracker.<br>' +
            '[Continue](!init --confirm)');
            return;
        }
        
        log('Initiative roll commencing');
        
        // Get list of tokens
        var page = Campaign().get('playerpageid');
        var allTokens = findObjs({_type: 'graphic', layer:'objects', _pageid: page});
        var actorIds = [];
        var tokens = [];
        var duplicateIds = [];
        
        // Destroy existing Init Tokens
        for(i = 0; i < allTokens.length; i++) {
            if(allTokens[i].get('left') == -1000 && allTokens[i].get('top') == -1000) {
                log('Deleting old Init Token for ' + allTokens[i].get('name'));
                allTokens[i].remove();
                allTokens.splice(i, 1);
                i--;
            }
        }
        
        allTokens.forEach(function(token) {
            var actorId = token.get('represents');
            if(actorIds.indexOf(actorId) == -1) {
                log('Adding ' + token.get('name') + ' to init token list');
                actorIds.push(actorId);
                tokens.push(token);
            } else {
                if(duplicateIds.indexOf(actorId) == -1) {
                    log('Adding ' + token.get('name') + ' to duplicate token list');
                    duplicateIds.push(actorId);
                    var oldToken = tokens.find(function(t) { return t.get('represents') == actorId });
                    tokens.splice(tokens.indexOf(oldToken), 1);
                } else {
                    log('No action taken on ' + token.get('name'));
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

        var message = '<table><tr><td>**ROLLING INITIATIVE**</td></tr>';
        var turnOrder = [];
        tokens.forEach(function(token) {
            if(token) {
                var actorId = token.get('represents');
                var actor = getObj('character', actorId);
                
                if(actor) {
                    var initMod = getAttrByName(actorId, 'init')
                    var init = initMod + randomInteger(10);
                    var actorName = actor.get('name');
                    turnOrder.push({
                        id: token.get('_id'),
                        pr: init,
                        custom: ''
                    });
                    message += '<tr><td>' + actorName + ' - **' + init + '**</td></tr>';
                }
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
        state.lastActor = null;
        
        // Init roll = new scene, so reset valor
        allTokens.forEach(function(token) {
            resetValor(token.get('represents'));
        });
        resetBonuses();
        
        sendChat('Valor', message);
        endEvent('!init');
    }
});

// !def command
// Displays defense and resistance for all active characters.
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!def') == 0
        && playerIsGM(msg.playerid)) {
        startEvent('!def');
        
        // Get list of tokens
        var page = Campaign().get('playerpageid');
        var allTokens = findObjs({_type: 'graphic', layer:'objects', _pageid: page});
        var actorIds = [];
        var tokens = [];
        var duplicateIds = [];
        
        allTokens.forEach(function(token) {
            var actorId = token.get('represents');
            if(actorId && actorIds.indexOf(actorId) == -1) {
                log('Adding ' + token.get('name') + ' to defense token list');
                actorIds.push(actorId);
                tokens.push(token);
            }
        });

        var message = '';
        var turnOrder = [];
        tokens.forEach(function(token) {
            var actorId = token.get('represents');
            var actor = getObj('character', actorId);
            
            if(actor) {
                var def = getAttrByName(actorId, 'defense')
                var res = getAttrByName(actorId, 'resistance')
                var actorName = actor.get('name');
                if(message.length > 0) {
                    message += '<br />';
                }
                message += actorName + ': ' + 
                    'Def **' + def + '**, ' + 
                    'Res **' + res + '**';
            }
        });
        
        sendChat('Valor', '/w gm <div>' + message + '</div>');
        endEvent('!def');
    }
});

// !di command
// Displays damage increments for all active characters.
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!di') == 0
        && playerIsGM(msg.playerid)) {
        startEvent('!di');
        
        // Get list of tokens
        var page = Campaign().get('playerpageid');
        var allTokens = findObjs({_type: 'graphic', layer:'objects', _pageid: page});
        var actorIds = [];
        var tokens = [];
        var duplicateIds = [];
        
        allTokens.forEach(function(token) {
            var actorId = token.get('represents');
            if(actorId && actorIds.indexOf(actorId) == -1) {
                log('Adding ' + token.get('name') + ' to defense token list');
                actorIds.push(actorId);
                tokens.push(token);
            }
        });

        var message = '';
        var turnOrder = [];
        tokens.forEach(function(token) {
            var actorId = token.get('represents');
            var actor = getObj('character', actorId);
            
            if(actor) {
                var di = getAttrByName(actorId, 'di')
                var actorName = actor.get('name');
                if(message.length > 0) {
                    message += '<br />';
                }
                message += actorName + ': ' + 
                    'DI **' + di + '**';
            }
        });
        
        sendChat('Valor', '/w gm <div>' + message + '</div>');
        endEvent('!di');
    }
});

// !crit command
// Shows critical hit damage for previously-used technique.
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!crit') == 0
        && playerIsGM(msg.playerid)) {
        startEvent('!crit');
        
        if(!state.techHistory) {
            state.techHistory = [];
        }
        
        // Get params
        var split = msg.content.match(/(".*?")|(\S+)/g);
        var lookback = 1;
        if(split.length > 1) {
            lookback = parseInt(split[1]);
        }
        
        if(lookback > state.techHistory.length) {
            sendChat('Valor', '/w gm Not enough techniques found in tech history.');
            return;
        }
        
        // Get tech data
        var techData = state.techHistory[state.techHistory.length - lookback];
        var tech = getTechByName(techData.techName, techData.userId);
        var actorToken = getObj('graphic', techData.id);
        
        if(tech.core != 'damage' && tech.core != 'ultDamage') {
            sendChat('Valor', '/w gm ' + techData.techName + ' is not a damage technique.');
            return;
        }
        
        var targetsList = techData.targets ? techData.targets : [];
        
        var output = 'Critical hit for **' + techData.techName + '**:';
        
        if(targetsList.length > 0) {
            var firstTarget = true;
            
            targetsList.forEach(function(targetId) {
                var target = getObj('graphic', targetId);
                var targetChar = getObj('character', target.get('represents'));
                
                var targetName = target.get('name');
                if(!targetName && targetChar) {
                    targetName = targetChar.get('name');
                }
                if(!targetName) {
                    targetName = 'Target';
                }
                
                // Get crit damage
                var damage = getTechDamage(tech, actorToken.get('represents'), true);
                
                // Get def/res
                var defRes = 0;
                var defResStat = tech.newStat ? tech.newStat : tech.stat;
                
                if(targetChar && (!tech.mods || !tech.mods.find(function(m) {
                    return m.toLowerCase().indexOf('piercing') > -1
                }))) {
                    var physical = defResStat == 'str' || defResStat == 'agi';
                    if(tech.mods && tech.mods.find(function(m) {
                        return m.toLowerCase().indexOf('shift') > -1
                    })) {
                        physical = !physical;
                    }
                    if(physical) {
                        defRes = getAttrByName(targetChar.get('_id'), 'defense');
                        var bonus = parseInt(getAttrByName(targetChar.get('_id'), 'defensebonus'));
                        if(bonus == bonus) {
                            defRes += bonus;
                        }
                    } else {
                        defRes = getAttrByName(targetChar.get('_id'), 'resistance');
                        var bonus = parseInt(getAttrByName(targetChar.get('_id'), 'resistancebonus'));
                        if(bonus == bonus) {
                            defRes += bonus;
                        }
                    }
                }
                
                output += '<br />VS ' + targetName + ': Damage [[{' + damage + ' - ' + defRes + ', 0}kh1]]';
            });
        } else {
            // Get crit damage
            var damage = getTechDamage(tech, actorToken.get('represents'), true);
            
            if(tech.mods && tech.mods.find(function(m) {
                return m.toLowerCase().indexOf('shift') > -1
            })) {
                physical = !physical;
            }
            output += ' Damage: <span style="color: darkred">**' + 
                           damage +
                       '**</span>';
        }
        
        sendChat('Valor', '/w gm ' + output);
        
        endEvent('!crit');
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
        
        startEvent('!duplicate');
        
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
        
        log('Character ' + actor.get('name') + ' created a new level up sheet.');
        endEvent('!duplicate');
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
        
        startEvent('!d-finalize');
        
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
        
        // Get list of skills/flaws/techs from old sheet
        var oldFlaws = [];
        var oldSkills = [];
        var oldTechs = [];
        var oldAttributes = filterObjs(function(obj) {
            return obj.get('_type') == 'attribute' &&
                   obj.get('_characterid') == oldActorId;
        });
        oldAttributes.forEach(function(attr) {
            var attrName = attr.get('name');
            if(attrName && attrName.indexOf('repeating_flaws_') > -1) {
                var flawId = attrName.substring(16, 36);
                if(oldFlaws.indexOf(flawId) == -1) {
                    oldFlaws.push(flawId);
                }
            }
            if(attrName && attrName.indexOf('repeating_skills_') > -1) {
                var skillId = attrName.substring(17, 37);
                if(oldSkills.indexOf(skillId) == -1) {
                    oldSkills.push(skillId);
                }
            }
            if(attrName && attrName.indexOf('repeating_techs_') > -1) {
                var techId = attrName.substring(16, 36);
                if(oldTechs.indexOf(techId) == -1) {
                    oldTechs.push(techId);
                }
            }
        });
        
        // Paste over attributes
        var newFlaws = [];
        var newSkills = [];
        var newTechs = [];
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
                
                if(attrName && attrName.indexOf('repeating_flaws_') > -1) {
                    var flawId = attrName.substring(16, 36);
                    if(newFlaws.indexOf(flawId) == -1) {
                        newFlaws.push(flawId);
                    }
                }
                if(attrName && attrName.indexOf('repeating_skills_') > -1) {
                    var skillId = attrName.substring(17, 37);
                    if(newSkills.indexOf(skillId) == -1) {
                        newSkills.push(skillId);
                    }
                }
                if(attrName && attrName.indexOf('repeating_techs_') > -1) {
                    var techId = attrName.substring(16, 36);
                    if(newTechs.indexOf(techId) == -1) {
                        newTechs.push(techId);
                    }
                }
            }
        });
        
        // Identify deleted flaws/skills/techs
        oldFlaws.forEach(function(flaw) {
            if(newFlaws.indexOf(flaw) == -1) {
                log('Deleting Flaw ID ' + flaw);
                
                oldAttributes.forEach(function(attr) {
                    var attrName = attr.get('name');
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
                    var attrName = attr.get('name');
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
                    var attrName = attr.get('name');
                    if(attrName && attrName.indexOf(tech) > -1) {
                        attr.remove();
                    }
                });
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
        endEvent('!d-finalize');
    }
});

// !mook command
// Used by character sheet - create a temporary level-up sheet for a given character.
// Also sets everyone's Valor to starting values.
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!mook') == 0) {
        startEvent('!mook');
        var split = msg.content.match(/(".*?")|(\S+)/g);
        
        // Get parameters
        var level = 1;
        var highStatsParam = [];
        var type = 'flunky';
        for(var i = 0; i < split.length - 1; i++) {
            if(split[i] == '--level' || split[i] == '-l') {
                level = parseInt(split[i+1]);
                if(level != level) {
                    level = 1;
                }
            }
            
            if(split[i] == '--type' || split[i] == '-t') {
                type = split[i+1];
                if(type != 'flunky' && type != 'soldier') {
                    log('Unsupported mook type: ' + type);
                    type = 'flunky';
                }
            }
            if(split[i] == '--stats' || split[i] == '-s') {
                highStatsString = split[i+1];
                if(highStatsString[0] == '"') {
                    highStatsString = highStatsString.substring(1, highStatsString.length - 1);
                }
                highStatsParam = highStatsString.split(',');
                if(split.length > i + 2 && split[i+2][0] != '-') {
                    highStatsParam.push(split[i+2]);
                }
                if(split.length > i + 3 && split[i+3][0] != '-') {
                    highStatsParam.push(split[i+3]);
                }
            }
        }
        
        var highStats = [];
        highStatsParam.forEach(function(s) {
            s = s.trim();
            if(s.indexOf('str') == 0 || s.indexOf('mus') == 0) {
                highStats.push(0);
            }
            if(s.indexOf('agi') == 0 || s.indexOf('dex') == 0) {
                highStats.push(1);
            }
            if(s.indexOf('spr') == 0 || s.indexOf('aur') == 0 || s.indexOf('spirit') == 0) {
                highStats.push(2);
            }
            if(s.indexOf('mnd') == 0 || s.indexOf('int') == 0 || s.indexOf('mind') == 0) {
                highStats.push(3);
            }
            if(s.indexOf('gut') == 0 || s.indexOf('res') == 0) {
                highStats.push(4);
            }
        });
        
        // Don't allow guts-only builds
        if(highStats.length == 1 && highStats[0] == 4) {
            highStats.push(randomInteger(4) - 1);
        }
        
        // Determine character attributes
        var attributes = [0,0,0,0,0];
        
        if(highStats.length == 0) {
            var stats = 2;
            var roll = randomInteger(10);
            if(roll == 1) {
                stats = 1;
            }
            else if(roll == 2 || roll == 3) {
                stats == 3;
            }
            
            var attrs = [0,1,2,3,4];
            for(var i = 0; i < stats; i++) {
                var aId = randomInteger(attrs.length) - 1;
                highStats.push(attrs[aId]);
                attrs.splice(aId, 1);
            }
        }
        
        var ap = level * 3 + 22;
        var attributesLeft = 5;
        
        if(highStats.length == 1) {
            attributes[highStats[0]] = level + 7;
            ap -= level + 7;
            attributesLeft = 4;
        }
        else if(highStats.length == 2) {
            attributes[highStats[0]] = level + 7;
            attributes[highStats[1]] = level + 7;
            ap -= 2 * level + 14;
            attributesLeft = 3;
        }
        else if(highStats.length == 3) {
            attributes[highStats[0]] = level + 7;
            attributes[highStats[1]] = level + 5;
            attributes[highStats[2]] = level + 5;
            ap -= 3 * level + 17;
            attributesLeft = 2;
        }
        
        for(var i = 0; i < 5; i++) {
            if(attributes[i] == 0) {
                if(attributesLeft == 1) {
                    attributes[i] = ap;
                    attributesLeft = 0;
                } else {
                    var value = randomInteger(ap - attributesLeft);
                    attributes[i] = value;
                    ap -= value;
                    attributesLeft--;
                }
            }
        }
        
        // Determine set of viable skills
        var skillLibrary = [];
        highStats.forEach(function(s) {
            switch(s) {
                case 0:
                    // Strength skills
                    skillLibrary = skillLibrary.concat([
                        { name: 'physicalAttacker', progression: 1 },
                        { name: 'counterattack', progression: 0 },
                        { name: 'cover', progression: 1 },
                        { name: 'teamTactics', progression: 0 }
                        ]);
                    if(level >= 6) {
                        skillLibrary = skillLibrary.concat([
                            { name: 'increasedSize', progression: 0 },
                            { name: 'damageFeedback', progression: 1 }
                            ]);
                    }
                    break;
                    
                case 1:
                    // Agility skills
                    skillLibrary = skillLibrary.concat([
                        { name: 'physicalAttacker', progression: 1 },
                        { name: 'sprinter', progression: 1 },
                        { name: 'counterattack', progression: 0 },
                        { name: 'quickToAct', progression: 0 }
                        ]);
                    if(level >= 6) {
                        skillLibrary = skillLibrary.concat([
                            { name: 'mobileDodge', progression: 0 },
                            { name: 'interruptAttack', progression: 0 },
                            { name: 'splitMove', progression: 0 }
                            ]);
                    }
                    break;
                    
                case 2:
                    // Spirit skills
                    skillLibrary = skillLibrary.concat([
                        { name: 'energyAttacker', progression: 1 },
                        { name: 'tireless', progression: 1 },
                        { name: 'discretion', progression: 0 }
                        ]);
                    if(level >= 6) {
                        skillLibrary = skillLibrary.concat([
                            { name: 'lineDeflect', progression: 0 },
                            { name: 'areaShield', progression: 0 },
                            { name: 'finalAttack', progression: 0 }
                            ]);
                    }
                    break;
                    
                case 3:
                    // Mind skills
                    skillLibrary = skillLibrary.concat([
                        { name: 'energyAttacker', progression: 1 },
                        { name: 'tireless', progression: 1 },
                        { name: 'nullify', progression: 0 },
                        { name: 'versatileFighter', progression: 0 }
                        ]);
                    if(level >= 11) {
                        skillLibrary = skillLibrary.concat([
                            { name: 'battleAnalysis', progression: 0 },
                            { name: 'exploitWeakness', progression: 0 }
                            ]);
                    }
                    break;
                    
                case 4:
                    // Guts skills
                    skillLibrary = skillLibrary.concat([
                        { name: 'toss', progression: 1 }
                        ]);
                    break;
            }
        });
        if(type == 'soldier') {
            skillLibrary = skillLibrary.concat([
                { name: 'tough', progression: 2 },
                { name: 'crisis', progression: 1 },
                { name: 'unmovable', progression: 1 },
                { name: 'empowerAttack', progression: 0 },
                { name: 'resistant', progression: 1 },
                { name: 'ironDefense', progression: 1 }
                ]);
        }
        
        var skills = [];
        var skillCount = 1;
        if(level >= 6) {
            skillCount++;
        }
        if(level >= 11) {
            skillCount++;
        }
        if(highStats.length == 3) {
            skills.push({ name: 'balancedFighter' });
            skillCount--;
        }
        
        for(var i = 0; i < skillCount; i++) {
            var skill = skillLibrary[randomInteger(skillLibrary.length) - 1];
            var skillLevel = 1;
            if(skill.progression == 1) {
                skillLevel = Math.ceil(level / 5);
            }
            else if(skill.progression == 2) {
                skillLevel = Math.ceil(level / 3);
            }
            
            if(!skills.find(function(s) {
                return s.name == skill.name;
            })) {
                skills.push({
                    name: skill.name,
                    level: skillLevel
                });
            }
        }
        
        var tp = 1;
        if(type == 'flunky') {
            tp = 2 + level;
            if(level > 5)
                tp += level - 5;
        } else {
            tp = 4 + 2 * level;
            if(level > 5)
                tp += level - 5;
            if(level > 15)
                tp += level - 15;
        }
        
        var techLevels = [Math.min(level + 3, tp)];
        tp -= techLevels[0];
        if(tp > 0 && level > 5) {
            techLevels.push(Math.min(level, tp));
        }
        
        var techStats = highStats.filter(function(s) {
            return s != 4
        });
        
        var techs = [];
        techLevels.forEach(function(techLevel) {
            var techStatId = techStats[randomInteger(techStats.length) - 1];
            var techStat = '';
            var modLibrary = [];
            switch(techStatId) {
                case 0:
                    techStat = 'str';
                    // Strength mods
                    modLibrary = modLibrary.concat([
                        { name: 'Reposition 1', tp: 1 },
                        { name: 'Whirlwind', tp: 1 }
                        ]);
                    if(level > 10) {
                        modLibrary = modLibrary.concat([
                            { name: 'Reposition 2', tp: 2 },
                            { name: 'Knock Down', tp: 3 },
                            { name: 'Ramming', tp: 1 },
                            { name: 'Rush Attack', tp: 2 }
                            ]);
                    }
                    break;
                case 1:
                    techStat = 'agi';
                    // Agility mods
                    modLibrary = modLibrary.concat([
                        { name: 'Dash 1', tp: 1 },
                        { name: 'Ranged Technique 1', tp: 1 },
                        { name: 'Whirlwind', tp: 1 }
                        ]);
                    if(level > 10) {
                        modLibrary = modLibrary.concat([
                            { name: 'Ranged Technique 2', tp: 2 },
                            { name: 'Dash 2', tp: 2 },
                            { name: 'Ranged Technique 1\nMultiple Targets 1', tp: 2 },
                            { name: 'Rush Attack', tp: 2 }
                            ]);
                    }
                    break;
                case 2:
                    // Spirit mods
                    techStat = 'spr';
                    modLibrary = modLibrary.concat([
                        { name: 'Line Attack 1', tp: 1 },
                        { name: 'Ranged Technique 1', tp: 1 },
                        { name: 'Blast Radius 1', tp: 1 }
                        ]);
                    if(level > 10) {
                        modLibrary = modLibrary.concat([
                            { name: 'Ranged Technique 2', tp: 2 },
                            { name: 'Line Attack 2', tp: 2 },
                            { name: 'Ranged Technique 1\nBlast Radius 1', tp: 2 }
                            ]);
                    }
                    break;
                case 3:
                    // Mind mods
                    techStat = 'mnd';
                    modLibrary = modLibrary.concat([
                        { name: 'Line Attack 1', tp: 1 },
                        { name: 'Ranged Technique 1', tp: 1 },
                        { name: 'Debilitating Strike', tp: 1 }
                        ]);
                    if(level > 10) {
                        modLibrary = modLibrary.concat([
                            { name: 'Ranged Technique 2', tp: 2 },
                            { name: 'Ranged Technique 2\nMultiple Targets 1', tp: 3 },
                            { name: 'Line Attack 2\nLine Variation 1', tp: 3 },
                            { name: 'Indirect Attack', tp: 3 }
                            ]);
                    }
                    break;
            }
            if(level > 5) {
                modLibrary = modLibrary.concat([
                    { name: 'Piercing Strike', tp: 0 },
                    { name: 'Sapping Strike', tp: 0 },
                    { name: 'Accurate Strike', tp: techStat == 'agi' ? 2 : 3 }
                    ]);
            }
            
            var mods = null;
            var coreLevel = techLevel;
            if(randomInteger(10) > 3) {
                mods = modLibrary[randomInteger(modLibrary.length) - 1];
                coreLevel -= mods.tp;
            }
            if(coreLevel > 0) {
                techs.push( {
                    stat: techStat,
                    core: coreLevel,
                    mods: mods ? mods.name : ''
                });
            }
        });
        
        // Create new character, copy over basic stats
        var newActor = createObj('character', {
            name: 'New Mook',
            type: type,
            level: level
        });
        var newActorId = newActor.get('_id');
        
        createObj('attribute', {
            characterid: newActorId, name: 'type', current: type
        });
        createObj('attribute', {
            characterid: newActorId, name: 'level', current: level
        });
        createObj('attribute', {
            characterid: newActorId, name: 'str', current: attributes[0]
        });
        createObj('attribute', {
            characterid: newActorId, name: 'agi', current: attributes[1]
        });
        createObj('attribute', {
            characterid: newActorId, name: 'spr', current: attributes[2]
        });
        createObj('attribute', {
            characterid: newActorId, name: 'mnd', current: attributes[3]
        });
        createObj('attribute', {
            characterid: newActorId, name: 'gut', current: attributes[4]
        });
        
        skills.forEach(function(skill) {
            var rowId = generateRowID();
            
            createObj('attribute', {
                characterid: newActorId, name: 'repeating_skills_' + rowId + '_skillname', current: skill.name
            });
            createObj('attribute', {
                characterid: newActorId, name: 'repeating_skills_' + rowId + '_skilllevel', current: skill.level
            });
        });
        
        techs.forEach(function(tech) {
            var rowId = generateRowID();
            
            createObj('attribute', {
                characterid: newActorId, name: 'repeating_techs_' + rowId + '_tech_name', current: 'Unnamed Technique'
            });
            createObj('attribute', {
                characterid: newActorId, name: 'repeating_techs_' + rowId + '_tech_stat', current: tech.stat
            });
            createObj('attribute', {
                characterid: newActorId, name: 'repeating_techs_' + rowId + '_tech_core', current: 'damage'
            });
            createObj('attribute', {
                characterid: newActorId, name: 'repeating_techs_' + rowId + '_tech_core_level', current: tech.core
            });
            createObj('attribute', {
                characterid: newActorId, name: 'repeating_techs_' + rowId + '_tech_mods', current: tech.mods
            });
        });
        
        endEvent('!mook');
    }
});

// Generates a unique ID that roll20 can parse. I didn't write this.
function generateUUID() {
    var a = 0, b = [];
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

function generateRowID() {
    return generateUUID().replace(/_/g, "Z");
};

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

// !roll-as command
// Performs a specific roll as a specific character.
// Meant to be used by the character sheet, not the user.
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!roll-as') == 0) {
        var split = msg.content.match(/(".*?")|(\S+)/g);
        
        if(split.length < 3) {
            log('!roll-as: Not enough arguments.');
        }
        
        var as = split[1];
        var roll = split[2];
        var label = split.length > 3 ? split[3] : null;
        
        // Trim quotes
        if(roll[0] == '"') {
            roll = roll.substring(1, roll.length - 1);
        }
        
        if(label[0] == '"') {
            label = label.substring(1, label.length - 1);
        }
        
        sendChat('character|' + as, '[[' + roll + ']] ' + label);
    }
});

// Max Value sync function
// Makes HP and ST move in sync with their max values.
on('change:attribute', function(obj, prev) {
    if(obj.get('name') == 'hp' || 
        obj.get('name') == 'st') {
        if(prev.max && obj.get('max') && prev.max != obj.get('max')) {
            var oldMax = parseInt(prev.max);
            var newMax = parseInt(obj.get('max'));
            if(oldMax == oldMax && newMax == newMax) {
                var maxChange = newMax - oldMax;
                var charId = obj.get('_characterid');
                updateValueForCharacter(charId, obj.get('name'), maxChange);
            }
        }
    }
});

function criticalHealthWarning(obj, oldHp) {
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
            var controlledBy;
            var name;
            
            var charId = obj.get('represents');
            if(charId) {
                var actor = getObj('character',charId);
                controlledBy = actor.get('controlledby');
                name = actor.get('name');
            } else {
                name = obj.get('name');
            }
            
            var whisperTo = 'gm';
            
            if(controlledBy && controlledBy != '') {
                whisperTo = name;
            }
            
            if(name) {
                sendChat('Valor', '/w "' + whisperTo + '" ' + name + message);
            }
            log('Alerted ' + whisperTo + ' about critical HP for token ID ' + obj.get('_id') + '.');
        }
    }
}

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
    criticalHealthWarning(obj, oldHp);
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
    
    var turnOrder = JSON.parse(obj.get('turnorder'));
    if(!turnOrder || turnOrder.length === 0) {
        // Do nothing if the init tracker is empty
        return;
    }
    
    var effectChar = turnOrder[turnOrder.length - 1];
    if(!effectChar || (effectChar.custom.indexOf('Ongoing') == -1 && 
        effectChar.custom.indexOf('Regen') == -1 &&
        effectChar.custom.indexOf('SRegen') == -1)) {
        // Do nothing if the top label isn't Ongoing, Regen or SRegen
        return;
    }
    
    // Scan backwards for the character this condition applies to
    var i = turnOrder.length - 2;
    var lastCharId = turnOrder[i] ? turnOrder[i].id : null;
    var lastChar = lastCharId ? getObj('graphic', lastCharId) : null;
    while(!lastChar) {
        i--;
        if(i == 0) {
            // We didn't find anyone - abort
            return;
        }
        var lastCharId = turnOrder[i] ? turnOrder[i].id : null;
        if(lastCharId) {
            lastChar = getObj('graphic', lastCharId);
        }
    }
    
    // Update HP or ST
    var parts = effectChar.custom.split(' ');
    var value = parseInt(parts[1]);
    var actor = getObj('character', lastChar.get('represents'));
    var name = lastChar.get('name');
    if(actor) {
        name = actor.get('name');
    }
    var oldHp = parseInt(lastChar.get('bar1_value'));
    if(oldHp != oldHp) {
        oldHp = 0;
    }
    
    if(value == value) {
        if(parts[0] === 'Ongoing') {
            updateValue(lastCharId, 'hp', -value);
            sendChat('Valor', name + ' took ' + value + ' ongoing damage.');
            log('Dealt ' + value + ' ongoing damage to ' + lastChar.get('name') + '.');
        } else if(parts[0] === 'Regen') {
            updateValue(lastCharId, 'hp', value);
            sendChat('Valor', name + ' recovered ' + value + ' Health.');
            log('Regenerated ' + value + ' HP for ' + lastChar.get('name') + '.');
        } else if(parts[0] === 'SRegen') {
            updateValue(lastCharId, 'st', value);
            sendChat('Valor', name + ' recovered ' + value + ' Stamina.');
            log('Regenerated ' + value + ' ST for ' + lastChar.get('name') + '.');
        }
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
            processOngoingEffects(obj);
            trackStatuses(turnOrder);
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
 * 
 * v0.11.2:
 * - GM can now set enemy rolls to be hidden from the players.
 * - More logging to look into the bug where !init skips one character.
 * 
 * v0.11.3:
 * - All turn order effects now process after you move past the effect.
 * 
 * v0.12.0:
 * - Critical health warning now triggers on ongoing damage, regen, and health limits.
 * - Ongoing damage and regen are now reported in the chat.
 * - Intuitive Strike now works.
 * - !init finally works consistently.
 * 
 * v0.12.1:
 * - !reset command now resets character valor.
 * - !rest and !fullRest now use the same logic for resetting valor.
 * - !init command no longer messes up valor scores.
 * - API no longer crashes when there's an ongoing effect called "Ongoing X" where X isn't a number.
 * 
 * v0.13.0:
 * - Support for using Resolute Strike skill.
 * - Targets and Roll Bonus fields on techs now reset after use.
 * - Techs now display some info on important mods when used.
 * - !def command added.
 * - Refactored how attack/defense rolls are set up.
 * 
 * v0.13.1:
 * - Bugfix: Techs with no mods crashed the new mod display system.
 * - Added Mercy Limit to mod display.
 * 
 * v0.14.0:
 * - New command !mook generates basic stats for new soldier/flunky character sheets at random.
 * - Bugfix: Finalizing level-up sheets now deletes removed skills/flaws/techs.
 * - Bugfix: Empowered Attack, etc. now honored on mimic techs.
 * - Bugfix: Attacks would sometimes erroneously show skills/flaws after changing the Core type.
 * 
 * v0.14.1:
 * - Implemented attack bonuses.
 * - !reset, !rest and !fullrest now all reset the bonuses block.
 * 
 * v0.14.2:
 * - Massive refactor of all logic to increase/decrease HP/ST/Valor.
 * - !set-bravado no longer supported.
 * - !check debug command added.
 * - Various bugfixes.
 * 
 * v0.14.3:
 * - Added timing information to logs on various events.
 * - Non-alphanumeric technique names would confuse the !t command.
 * - Various bugfixes.
 * 
 * v0.14.4:
 * - Optimized !rest and !fullrest to make them run faster and prevent infinite-loop errors.
 * 
 * v0.14.5:
 * - Stat rolls and defense rolls are automatically rolled as the character the sheet belongs to.
 * 
 * v0.14.6:
 * - Updated for Healing test errata (gated behind enableHouseRules).
 * - Fixed the bonus reset on !reset, !rest, !fullrest and !init.
 * 
 * v0.15.0:
 * - Support for auto-targetting Use Tech button.
 * 
 * v0.15.1:
 * - Bugfix: Use Tech button now honors Piercing properly.
 * - Bugfix: Characters with no skills wouldn't gain house rule Valor bonuses.
 * - House rules Valor bonuses are now doubled for Masters.
 * 
 * v0.15.2:
 * - Healing now automatically processes its HP recovery.
 * 
 * v0.15.3:
 * - Displayed damage never goes below 0.
 * - Def/Res bonuses honored by damage calculations.
 * 
 * v0.15.4:
 * - Added Custom core support.
 * - Use Tech doesn't try to roll attacks if no stat is selected.
 * 
 * v0.15.5:
 * - Mimic Tech now uses right attack stat and targets right defense.
 * - Mimic-related bugs resolved.
 * - Valiant skill now honored.
 * - Scripts no longer crash when targeting a non-character token.
 * - Empowered, etc. now appear regardless of tech display mode.
 * 
 * v0.16.0:
 * - New command !di to display damage increments for all active characters.
 * - New command !crit to display crit damage for most recent tech.
 * 
 * v0.17.0:
 * - Vitality Limit now respected by Use Technique button.
 * - Ultimate Technique usage now tracked for Use Technique button.
 * - New command !status to check usability of all techniques.
 * - Bugfix: 'Ignore limits for Flunkies/Soldiers' works now.
 * - Bugfix: Custom cores no longer try to roll if they have no stat specified.
 **/