/**
 * VALOR API SCRIPTS
 * v1.3.0
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
state.ongoingEffectProcessor = true;    // Parse regen and ongoing damage as they happen.
state.ignoreLimitsOnMinions = true;     // Disables limit blocking for Flunkies and Soldiers.
state.showTechAlerts = true;            // Send alerts for when ammo changes and when techs come off of cooldown.
state.showHealthAlerts = true;          // Send alerts when characters enter or leave critical health.
state.houseRulesEnabled = true;         // Enables various unsupported house rules.
state.autoResolveTechBenefits = true;   // Enables automatic adjustment of HP for Healing and Transformations.
state.hideNpcTechEffects = false;       // For non-player characters, don't show players the tech effect when using !t.
state.rollBehindScreen = false;         // Hide NPC rolls from the players.
state.autoInitiativeUpdate = true;      // If a character's initiative changes during play, move them accordingly.
state.autoInitiativeReport = true;      // If a character's initiative changes during play, send a whisper to the GM.
state.confirmAutoInitiative = true;     // Confirm whether or not to auto-update initiative before each scene.

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

// Internal function - get the current and max health for a character
// If a token ID is provided, it prioritizes the values on the token; otherwise,
// it uses the charId to get the attribute
function getHp(tokenId, charId) {
    let hp = null;
    let hpMax = null;
    let token = tokenId ? getObj('graphic', tokenId) : null;
    
    if(token) {
        // Get HP by token
        hp = parseInt(token.get('bar1_value'));
        hpMax = parseInt(token.get('bar1_max'));
        if(hp != hp || hpMax != hpMax) {
            hp = null;
            hpMax = null;
        }
    }
    
    if(!hp || !hpMax) {
        // Get HP by character
        hp = parseInt(getAttrByName(charId, 'hp'));
        hpMax = parseInt(getAttrByName(charId, 'hp', 'max'));
        if(hp != hp || hpMax != hpMax) {
            hp = null;
            hpMax = null;
        }
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
        // Get HP by token
        st = parseInt(token.get('bar2_value'));
        stMax = parseInt(token.get('bar2_max'));
        if(st != st || stMax != stMax) {
            st = null;
            stMax = null;
        }
    }
    
    if(!st || !stMax) {
        // Get HP by character
        st = parseInt(getAttrByName(charId, 'hp'));
        stMax = parseInt(getAttrByName(charId, 'hp', 'max'));
        log('B');
        log(st);
        log(stMax);
        if(st != st || stMax != stMax) {
            st = null;
            stMax = null;
        }
    }
    
    if(st && stMax) {
        return { val: st, max: stMax };
    } else {
        return { val: 1, max: 1 };
    }
}

// Internal function - gets a list of skills and their levels for a character ID.
// Uses the Valor Character Sheet structure.
function getSkills(charId) {
    let rawSkills = filterObjs(function(obj) {
        if(obj.get('_type') == 'attribute' &&
           obj.get('_characterid') == charId &&
           obj.get('name').indexOf('repeating_skills') > -1) {
               return true;
        }
        return false;
    });
    
    let skills = [];
    
    rawSkills.forEach(function(rawSkill) {
        let skillName = rawSkill.get('name');
        let skillId = skillName.split('_')[2];
        
        let oldSkill = skills.find(function(s) {
            return s.id == skillId
        });
        
        if(skillName.indexOf('skillname') > -1) {
            if(oldSkill) {
                oldSkill.name = rawSkill.get('current');
            } else {
                skills.push({ id: skillId, name: rawSkill.get('current'), level: 1 });
            }
        } else if(skillName.indexOf('skilllevel') > -1) {
            let level = parseInt(rawSkill.get('current'));
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
    let skills = getSkills(charId);
    
    if(skills && skills.length > 0) {
        return skills.find(s => s.name && s.name.toLowerCase() == skillName.toLowerCase());
    }
    
    return null;
}

function getFlaw(charId, flawName) {
    let flaws = getFlaws(charId);
    
    if(flaws && flaws.length > 0) {
        return flaws.find(f => f.name && f.name.toLowerCase() == flawName.toLowerCase());
    }
    
    return null;
}

// Internal function - gets a list of flaws and their levels for a character ID.
// Uses the Valor Character Sheet structure.
function getFlaws(charId) {
    let rawFlaws = filterObjs(function(obj) {
        if(obj.get('_type') == 'attribute' &&
           obj.get('_characterid') == charId &&
           obj.get('name').indexOf('repeating_flaws') > -1) {
               return true;
        }
        return false;
    });
    
    let flaws = [];
    
    rawFlaws.forEach(function(rawFlaw) {
        let flawName = rawFlaw.get('name');
        let flawId = flawName.split('_')[2];
        
        let oldFlaw = flaws.find(function(s) {
            return s.id == flawId
        });
        
        if(flawName.indexOf('flawname') > -1) {
            if(oldFlaw) {
                oldFlaw.name = rawFlaw.get('current');
            } else {
                flaws.push({ id: flawId, name: rawFlaw.get('current'), level: 1 });
            }
        } else if(flawName.indexOf('flawlevel') > -1) {
            let level = parseInt(rawFlaw.get('current'));
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
    let rawTechs = filterObjs(function(obj) {
        if(obj.get('_type') == 'attribute' &&
           (!charId || obj.get('_characterid') == charId) &&
           obj.get('name').indexOf('repeating_techs') > -1) {
               return true;
        }
        return false;
    });
    
    let techs = [];
    rawTechs.forEach(function(rawTech) {
        let techName = rawTech.get('name');
        let techId = techName.split('_')[2];
        
        let oldTech = techs.find(function(s) {
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
            let cost = parseInt(rawTech.get('current'));
            if(cost != cost) {
                cost = 0;
            }
            
            if(oldTech) {
                oldTech.cost = cost;
            } else {
                techs.push({ id: techId, charId: rawTech.get('_characterid'), cost: cost});
            }
        } else if(techName.indexOf('tech_limit_st') > -1) {
            let limitSt = parseInt(rawTech.get('current'));
            if(limitSt != limitSt) {
                limitSt = 0;
            }
            
            if(oldTech) {
                oldTech.limitSt = limitSt;
            } else {
                techs.push({ id: techId, charId: rawTech.get('_characterid'), limitSt: limitSt});
            }
        } else if(techName.indexOf('tech_limits') > -1) {
            let limits = rawTech.get('current').split('\n');
            
            if(oldTech) {
                oldTech.limits = limits;
            } else {
                techs.push({ id: techId, charId: rawTech.get('_characterid'), limits: limits});
            }
        } else if(techName.indexOf('tech_mods') > -1) {
            let mods = rawTech.get('current').split('\n');
            
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
            let coreLevel = parseInt(rawTech.get('current'));
            if(coreLevel != coreLevel) {
                coreLevel = 0;
            }
            if(oldTech) {
                oldTech.coreLevel = coreLevel;
            } else {
                techs.push({ id: techId, charId: rawTech.get('_characterid'), coreLevel: coreLevel});
            }
        } else if(techName.indexOf('tech_level') > -1) {
            let techLevel = parseInt(rawTech.get('current'));
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
            let hasSkills = rawTech.get('current') == 'on';
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
            let hasFlaws = rawTech.get('current') == 'on';
            if(oldTech) {
                oldTech.hasFlaws = hasFlaws;
            } else {
                techs.push({ id: techId, charId: rawTech.get('_characterid'), hasFlaws: hasFlaws});
            }
        } else if(techName.indexOf('tech_digDeep') > -1) {
            let digDeep = rawTech.get('current') == 'on';
            if(oldTech) {
                oldTech.digDeep = digDeep;
            } else {
                techs.push({ id: techId, charId: rawTech.get('_characterid'), digDeep: digDeep});
            }
        } else if(techName.indexOf('tech_overloadLimits') > -1) {
            let overloadLimits = rawTech.get('current') == 'on';
            if(oldTech) {
                oldTech.overloadLimits = overloadLimits;
            } else {
                techs.push({ id: techId, charId: rawTech.get('_characterid'), overloadLimits: overloadLimits});
            }
        } else if(techName.indexOf('tech_empowerAttack') > -1) {
            let empowerAttack = rawTech.get('current') == 'on';
            if(oldTech) {
                oldTech.empowerAttack = empowerAttack;
            } else {
                techs.push({ id: techId, charId: rawTech.get('_characterid'), empowerAttack: empowerAttack});
            }
        } else if(techName.indexOf('tech_resoluteStrike') > -1) {
            let resoluteStrike = rawTech.get('current') == 'on';
            if(oldTech) {
                oldTech.resoluteStrike = resoluteStrike;
            } else {
                techs.push({ id: techId, charId: rawTech.get('_characterid'), resoluteStrike: resoluteStrike});
            }
        } else if(techName.indexOf('tech_persist') > -1) {
            let persist = rawTech.get('current') == 'on';
            if(oldTech) {
                oldTech.persist = persist;
            } else {
                techs.push({ id: techId, charId: rawTech.get('_characterid'), persist: persist});
            }
        } else if(techName.indexOf('custom_cost') > -1) {
            let customCost = parseInt(rawTech.get('current'));
            if(customCost != customCost) {
                customCost = 0;
            }
            if(oldTech) {
                oldTech.customCost = customCost;
            } else {
                techs.push({ id: techId, charId: rawTech.get('_characterid'), customCost: customCost});
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
    
    let startingValor = 0;
    if(skills && skills.length > 0) {
        let bravado = skills.find(function(s) {
            return s.name == 'bravado';
        });
        if(bravado && bravado.level) {
            startingValor = bravado.level;
        }
        
        if(flaws) {
            let weakWilled = flaws.find(function(f) {
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
    
    let level = getAttrByName(charId, 'level');
    let valorBySeason = Math.ceil(level / 5) - 1;
    if(getAttrByName(charId, 'type') == 'master') {
        valorBySeason *= 2;
    }
    startingValor += valorBySeason;
    
    updateValueForCharacter(charId, 'valor', startingValor, false, true);
    
    log('Character ' + charId + ' set to ' + startingValor + ' Valor.');
}

// Resets all bonus fields for all characterse
function resetBonuses() {
    let bonusList = ['rollbonus', 'atkrollbonus', 'defrollbonus',
                     'patkbonus', 'eatkbonus', 'defensebonus', 'resistancebonus'];
    bonusList.forEach(function(b) {
        let bonuses = filterObjs(function(obj) {
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
    
    let special = tech.mods && tech.mods.find(function(m) {
        return m.toLowerCase().indexOf('piercing') > -1 ||
               m.toLowerCase().indexOf('sapping') > -1 ||
               m.toLowerCase().indexOf('persistent') > -1 ||
               m.toLowerCase().indexOf('drain') > -1 ||
               m.toLowerCase().indexOf('debilitating') > -1 ||
               m.toLowerCase().indexOf('boosting') > -1;
    });
    
    let stat = tech.newStat ? tech.newStat : tech.stat;
    let atk = getAttrByName(charId, stat + 'Atk');
    
    if(!atk || atk != atk) {
        atk = 0;
    }
    
    let baseAtk = atk;
    let damage = 0;
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
    
    const hp = getHp(null, charId);
    if(hp.val / hp.max <= 0.4) {
        // HP is critical!
        let crisis = getSkill(charId, 'crisis');
        if(crisis && crisis.level) {
            let crisisLevel = parseInt(crisis.level);
            if(crisisLevel != crisisLevel) {
                crisisLevel = 1;
            }
            damage += 3 + crisisLevel * 3;
        }
        let berserker = getFlaw(charId, 'berserker')
        if(berserker) {
            damage += 10;
        }
    }
    
    if(tech.empowerAttack) {
        let empowerAttack = getSkill(charId, 'empowerAttack');
        if(empowerAttack && empowerAttack.level) {
            let empowerAttackLevel = parseInt(empowerAttack.level);
            if(empowerAttackLevel != empowerAttackLevel) {
                empowerAttackLevel = 1;
            }
            damage += 3 + empowerAttackLevel * 3;
        }
    }
    
    if(tech.stat == 'agi' || tech.stat == 'str') {
        let patk = parseInt(getAttrByName(charId, 'patkbonus'));
        if(patk == patk) {
            damage += patk;
        }
    } else {
        let eatk = parseInt(getAttrByName(charId, 'eatkbonus'));
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
    let summary = '';
    switch(tech.core) {
        case 'damage':
        case 'ultDamage':
            if(!suppressDamageDisplay) {
                summary = 'Damage: <span style="color: darkred">**' + 
                               getTechDamage(tech, charId) +
                               '**</span>';
                               
                let piercing = tech.mods && tech.mods.find(function(m) {
                    return m.toLowerCase().indexOf('piercing') > -1
                });
                if(!piercing) {
                    let physical = tech.stat == 'str' || tech.stat == 'agi';
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
            let healing;
            let power = tech.stat ? getAttrByName(charId, tech.stat) : 0;

            let regen = tech.mods && tech.mods.find(function(m) {
                return m.toLowerCase().indexOf('continuous r') > -1
            });
            
            const healer = getSkill(charId, 'healer');
            let healerLevel = 0;
            if(healer && healer.level) {
                healerLevel = parseInt(healer.level);
                if(healerLevel != healerLevel) {
                    healerLevel = 1;
                }
            }
            
            const actorClass = getAttrByName(charId, 'type');
            if(regen) {
                healing = (tech.coreLevel + 3) * 2 + Math.ceil(power / 2);
                if(healerLevel) healing += (healerLevel + 1) * 2;
                if(actorClass == 'flunky' || actorClass == 'soldier') healing = Math.ceil(healing / 2);
                summary = 'Restores <span style="color:darkgreen">**' + healing + '**</span> HP per turn';
            } else {
                healing = (tech.coreLevel + 3) * 3 + Math.ceil(power / 2);
                if(healerLevel) healing += (healerLevel + 1) * 2;
                if(actorClass == 'flunky' || actorClass == 'soldier') healing = Math.ceil(healing / 2);
                summary = 'Restores <span style="color:darkgreen">**' + healing + '**</span> HP';
            }
            break;
        case 'barrier':
            summary = 'Barrier power ' + tech.coreLevel;
            break;
    }
    
    // Add certain mods to output
    let mods = [];
    if(tech.mods) {
        tech.mods.forEach(m => {
            let mod = m.toLowerCase();
            let split = mod.split(' ');
            let modLevel = parseInt(split[split.length - 1]);
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
            let limit = l.toLowerCase();
            let split = limit.split(' ');
            let limitLevel = parseInt(split[split.length - 1]);
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
        let level = parseInt(getAttrByName(charId, 'level'));
        if(!level || level != level) {
            level = 0;
        }
        let bonusHp = level * 10;
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
    
    let techs = getTechs(charId);
    let tech;
    // They put a string, pull up tech by name
    let matchingTech = techs.find(function(t) {
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
            let alphaTechId = techId.replace(/\W/g, '');
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
            let oldCore = tech.core;
            let empowerAttack = tech.empowerAttack;
            let overloadLimits = tech.overloadLimits;
            let resoluteStrike = tech.resoluteStrike;
            let oldId = tech.id;
            let mimicTech = tech;
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
    
    let page = Campaign().get('playerpageid');
    let tokens = findObjs({_type: 'graphic', layer:'objects', _pageid: page});
    tokens.forEach(function(token) {
        let charId = token.get('represents');
        let maxValor = parseInt(token.get('bar3_max'));
        if(maxValor) {
            const hp = getHp(token.get('_id'), charId);
            log(hp)
            if(!hp.val || hp.val <= 0) {
                // They're KO'd - don't add Valor
                return;
            }
            
            // If it has a max Valor, it's tracking Valor - raise it
            let valor = parseInt(token.get('bar3_value'));
            if(valor != valor) {
                valor = 0;
            }
            let valorRate = 1;
            
            if(state.charData[charId] &&
                state.charData[charId].valorRate &&
                parseInt(state.charData[charId].valorRate) != 1) {
                valorRate = parseInt(state.charData[charId].valorRate);
            } else {
                let charClass = getAttrByName(charId, 'type');
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
    
    let turnOrder;
    if(Campaign().get('turnorder') == '') {
        turnOrder = [];
    } else {
        turnOrder = JSON.parse(Campaign().get('turnorder'));
    }
    
    let lastChar = turnOrder[turnOrder.length - 1];
    if(!lastChar || lastChar.custom.toLowerCase() != 'round') {
        // Only continue if the 'Round' counter is at the bottom of the init order
        return;
    }

    let round = lastChar.pr;
    if(!round) {
        return;
    }
    
    if(!state.techData) {
        state.techData = {};
    }
    
    for(let key in state.techData) {
        if(state.techData.hasOwnProperty(key)) {
            let techData = state.techData[key];
            let tech = getTechByName(techData.techName, techData.userId);
            
            // Look for cooldown limit
            if(tech && tech.limits) {
                let cooldownLimit = tech.limits.find(function(l) {
                    return l.toLowerCase().indexOf('cooldown') == 0;
                });
                
                if(cooldownLimit) {
                    let cooldownLimitSplit = cooldownLimit.split(' ');
                    let cooldownLimitLevel = parseInt(cooldownLimitSplit[cooldownLimitSplit.length - 1]);
                    if(cooldownLimitLevel != cooldownLimitLevel) {
                        cooldownLimitLevel = 1;
                    }
                    
                    if(techData.timesUsed.length > 0) {
                        let lastTurnUsed = techData.timesUsed[techData.timesUsed.length - 1];
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
    let token = getObj('graphic', tokenId);
    let bar = '1';
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
        if(attribute == 'hp') {
            criticalHealthWarning(token, oldValue);
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
        if(attribute == 'hp') {
            criticalHealthWarning(token, oldValue);
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
        let date = new Date();
        let time = (date.getTime() - state.timer[eventName].getTime()) / 1000;
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
        let date = new Date();
        let time = (date.getTime() - state.timer[eventName].getTime()) / 1000;
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
            
        let tokens = filterObjs(function(obj) {
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
        let split = msg.content.match(/(".*?")|(\S+)/g);
        if(split.length == 1) {
            log('Please specify a token ID.');
        } else {
            let tokenId = split[1];
            let tokens = findObjs({                         
                _type: "graphic",
                _id: tokenId
            });
            if(tokens.length > 0) {
                token = tokens[0];
                let name = token.get('name');
                if(name) {
                    log('Token ID ' + tokenId + ' is ' + name + '.');
                } else {
                    let characters = filterObjs(function(obj) {
                        return obj.get('_type') === 'character' &&
                               obj.get('_id') === token.get('represents');
                    });
                    
                    if(characters.length > 0) {
                        let actor = characters[0];
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

// !sizeup command
on('chat:message', function(msg) {
    if(msg.type == 'api' && (msg.content.indexOf('!sizeup') == 0
        && playerIsGM(msg.playerid))) {
        startEvent('!sizeup');
        // Use selected token or first token on active page that represents character
        let token;
        if(msg.selected && msg.selected.length > 0) {
            let selectedToken = getObj('graphic', msg.selected[0]._id);
            if(selectedToken.get('represents')) {
                token = selectedToken;
            }
        }
        
        if(!token) {
            sendChat('Valor', '/w gm No selected token is linked to a character sheet.');
        }
        
        let charId = token.get('represents');
        
        let name = token.get('name');
        if(!name) {
            let characters = filterObjs(function(obj) {
                return obj.get('_type') === 'character' &&
                       obj.get('_id') === charId;
            });
            
            if(characters.length > 0) {
                let actor = characters[0];
                name = actor.get('name');
            }
        }
        let attributes = filterObjs(function(obj) {
            return obj.get('_type') == 'attribute' &&
                   obj.get('_characterid') == charId;
        });
        
        let summary = name + '<br/>';
        let hp = getHp(token.get('_id'), charId);
        let st = getSt(token.get('_id'), charId);
        summary += `HP: ${hp.val}/${hp.max}<br/>`;
        summary += `ST: ${st.val}/${st.max}<br/>`;
        
        let mus = getAttrByName(charId, 'mus');
        let dex = getAttrByName(charId, 'dex');
        let aur = getAttrByName(charId, 'aur');
        let int = getAttrByName(charId, 'int');
        let res = getAttrByName(charId, 'res');
        summary += 'Mus ' + mus + ', Dex ' + dex + ', Aur ' + aur + ', Int ' + int + ', Res ' + res + '<br/>';
        
        let flaws = getFlaws(charId);
        if(flaws && flaws.length > 0) {
            let flawNames = Array.from(flaws, function(f) {
                let flawName = f.name.replace( /([A-Z])/g, " $1" );
                return flawName.charAt(0).toUpperCase() + flawName.slice(1);
            });
            summary += 'Flaws: ' + flawNames.join(', ') + '<br/>';
        } else {
            summary += 'No Flaws<br/>';
            
        }
        sendChat('Valor', '/w gm <div>' + summary + '</div>');
        endEvent('!sizeup');
    }
});

// !addhp/addst/subhp/subst commands
on('chat:message', function(msg) {
    if(msg.type == 'api' && ((msg.content.indexOf('!addhp') == 0 ||
            msg.content.indexOf('!addst') == 0 ||
            msg.content.indexOf('!subhp') == 0 ||
            msg.content.indexOf('!subst') == 0)
            && playerIsGM(msg.playerid))) {
        startEvent(msg.content.substring(0, 6));
        
        const direction = msg.content.startsWith('!add') ? 1 : -1;
        const stat = msg.content.indexOf('st') > -1 ? 'st' : 'hp';
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
        
        endEvent(msg.content.substring(0, 6));
    }
});

// !status command
on('chat:message', function(msg) {
    if(msg.type == 'api' && (msg.content.indexOf('!status') == 0)) {
        startEvent('!status');
        // Figure out who's using a tech
        let actor = getActor(msg);
        if(!actor) {
            log('No usable character found for ' + msg.playerid);
            endEvent('!status');
            return;
        }
    
        // Use selected token or first token on active page that represents character
        let token;
        if(msg.selected && msg.selected.length > 0) {
            let selectedToken = getObj('graphic', msg.selected[0]._id);
            if(selectedToken.get('represents') == actor.get('_id')) {
                token = selectedToken;
            }
        }
        
        if(!token) {
            let tokens = findObjs({
                _pageid: Campaign().get("playerpageid"),                 
                _type: "graphic",
                represents: actor.get('_id')
            });
            if(tokens.length > 0) {
                token = tokens[0];
            }
        }
        
        // Get the initiative tracker, we may need it later
        let turnOrder;
        if(Campaign().get('turnorder') == '') {
            turnOrder = [];
        } else {
            turnOrder = JSON.parse(Campaign().get('turnorder'));
        }
        
        let roundItem = turnOrder.find(function(t) {
            return t && t.custom && 
            t.custom.toLowerCase() == 'round';
        });
        let round = roundItem ? roundItem.pr : 1;

        // Show a list of techs for this character
        if(actor) {
            let techs = getTechs(actor.get('_id'));
            let message = '<table>';
            techs.forEach(function(tech) {
                message += '<tr><td>**' + tech.name + '**: ';
                
                // Pull tech usage data from the state
                let techDataId = actor.get('_id') + '.' + tech.name;
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
                let techData = state.techData[techDataId];
                
                // Check for blocking limits
                let techStatus = [];
                if(tech.limits) {
                    
                    if(token) {
                        // Check stamina
                        let st = getSt(token.get('_id'), actor.get('_id'));
                        
                        if(st && st.val < tech.cost && !tech.digDeep) {
                            techStatus.push("Not enough ST");
                        }
                        
                        // Check Initiative Limit
                        let initiativeLimit = tech.limits.find(function(l) {
                            return l.toLowerCase().indexOf('init') == 0;
                        });
                        
                        if(initiativeLimit) {
                            let initiativeLimitSplit = initiativeLimit.split(' ');
                            let initiativeLimitLevel = parseInt(initiativeLimitSplit[initiativeLimitSplit.length - 1]);
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
                    let valorLimit = tech.limits.find(function(l) {
                        let name = l.toLowerCase();
                        return ((name.indexOf('valor') == 0 &&
                                 name.indexOf('valor c') != 0) ||
                                 name.indexOf('ultimate v') == 0);
                    });
                    
                    if(valorLimit) {
                        let valorLimitSplit = valorLimit.split(' ');
                        let valorLimitLevel = parseInt(valorLimitSplit[valorLimitSplit.length - 1]);
                        if(valorLimitLevel != valorLimitLevel) {
                            valorLimitLevel = 1;
                        }
                        
                        let currentValor = getAttrByName(actor.get('_id'), 'valor');
                        if(currentValor < valorLimitLevel) {
                            techStatus.push('Not enough Valor');
                        }
                    }
                    
                    // Check Injury Limit
                    let injuryLimit = tech.limits.find(function(l) {
                        return l.toLowerCase().indexOf('injury') == 0;
                    });
                    
                    if(injuryLimit && token) {
                        let injuryLimitSplit = injuryLimit.split(' ');
                        let injuryLimitLevel = parseInt(injuryLimitSplit[injuryLimitSplit.length - 1]);
                        if(injuryLimitLevel != injuryLimitLevel) {
                            injuryLimitLevel = 1;
                        }
                        
                        const hp = getHp(token.get('_id'), actor.get('_id'));
                        
                        const hpTarget = Math.ceil(hp.max / 5 * (5 - injuryLimitLevel));
                        
                        if(hp.val > hpTarget) {
                            techStatus.push('HP too high');
                        }
                    }
                    
                    // Check Vitality Limit
                    let vitalityLimit = tech.limits.find(function(l) {
                        return l.toLowerCase().indexOf('vitality') == 0;
                    });
                    
                    if(vitalityLimit && token) {
                        const hp = getHp(token.get('_id'), actor.get('_id'));
                        
                        const hpTarget = Math.ceil(hp.max * 0.4);
                        
                        if(hp.val < hpTarget) {
                            techStatus.push('HP too low');
                        }
                    }
                    
                    // Check Set-Up Limit
                    let setUpLimit = tech.limits.find(function(l) {
                        return l.toLowerCase().indexOf('set') == 0;
                    });
                    
                    if(setUpLimit) {
                        if(round) {
                            let setUpLimitSplit = setUpLimit.split(' ');
                            let setUpLimitLevel = parseInt(setUpLimitSplit[setUpLimitSplit.length - 1]);
                            if(setUpLimitLevel != setUpLimitLevel) {
                                setUpLimitLevel = 1;
                            }
                            
                            if(round <= setUpLimitLevel) {
                                techStatus.push('Not ready yet');
                            }
                        }
                    }
                    
                    // Check Ammunition Limit
                    let ammoLimit = tech.limits.find(function(l) {
                        return l.toLowerCase().indexOf('amm') == 0;
                    });
                    
                    if(ammoLimit) {
                        let ammoLimitSplit = ammoLimit.split(' ');
                        let ammoLimitLevel = parseInt(ammoLimitSplit[ammoLimitSplit.length - 1]);
                        if(ammoLimitLevel != ammoLimitLevel) {
                            ammoLimitLevel = 1;
                        }
                        
                        if(techData.timesUsed.length > 3 - ammoLimitLevel) {
                            techStatus.push('Out of ammo');
                        } else {
                            let ammoLeft = 4 - ammoLimitLevel - techData.timesUsed.length;
                            techStatus.push(ammoLeft + ' ammo left');
                        }
                    }
                    
                    // Check Cooldown Limit
                    let cooldownLimit = tech.limits.find(function(l) {
                        return l.toLowerCase().indexOf('cooldown') == 0;
                    });
                    
                    if(cooldownLimit && round) {
                        let cooldownLimitSplit = cooldownLimit.split(' ');
                        let cooldownLimitLevel = parseInt(cooldownLimitSplit[cooldownLimitSplit.length - 1]);
                        if(cooldownLimitLevel != cooldownLimitLevel) {
                            cooldownLimitLevel = 1;
                        }
                        
                        if(techData.timesUsed.length > 0) {
                            let lastTurnUsed = parseInt(techData.timesUsed[techData.timesUsed.length - 1]);
                            if(round <= lastTurnUsed + cooldownLimitLevel) {
                                techStatus.push('On cooldown');
                            }
                        }
                    }
                }
                
                // Check for Ultimate usage
                if(tech.core == 'ultDamage' || tech.core == 'ultTransform' ||
                    tech.core == 'ultMimic' || tech.core == 'domain') {
                    let unerring = tech.mods && tech.mods.find(function(m) {
                        return m.toLowerCase().indexOf('unerring') == 0;
                    });
                    
                    if(!unerring && techData.timesUsed.length > 0) {
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
            let cleanMessage = message.replace(/\"/g, '&#' + '34;'); // Concatenated to keep the editor from freaking out
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
        let split = msg.content.match(/(".*?")|(\S+)/g);
        // Figure out who's using a tech
        let actor;
        
        // Check for --as parameter
        let asParam = split.indexOf('--as');
        if(asParam > -1 && split.length > asParam + 1) {
            let asInput = split[asParam + 1];
            if(asInput[0] == '"') {
                asInput = asInput.substring(1, asInput.length - 1);
            }
            
            // Find a character with this name          
            let characters = filterObjs(function(obj) {
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
        let actorClass = getAttrByName(actor.get('_id'), 'type');
        
        // Check for --targets list
        let targetsList = [];
        let targetsParam = split.indexOf('--targets');
        if(targetsParam > -1) {
            for(let targetParam = targetsParam + 1; targetParam < split.length; targetParam++) {
                let target = getObj('graphic', split[targetParam]);
                if(target) {
                    targetsList.push(target);
                }
            }
            split.splice(targetsParam);
        }
        
        if(split.length < 2) {
            // Show a list of techs for this character
            let techs = getTechs(actor.get('_id'));
            let message = '<table><tr><td>Pick a Technique to use:</td></tr>';
            techs.forEach(function(tech) {
                message += '<tr><td>[' + tech.name + '](!t "' + tech.name + '")</td></tr>';
            });
            message += '</table>';
            let cleanMessage = message.replace(/\"/g, '&#' + '34;'); // Concatenated to keep the editor from freaking out
            sendChat('Valor', '/w "' + msg.who + '" ' + cleanMessage);
            endEvent('!tech');
            return;
        }
        
        // Check for --override parameter
        let overrideLimits = split.indexOf('--override') > -1;
        if(overrideLimits) {
            split.splice(split.indexOf('--override'), 1);
            log('Performing tech without Limits.');
        }
        
        // Get the initiative tracker, we may need it later
        let turnOrder;
        if(Campaign().get('turnorder') == '') {
            turnOrder = [];
        } else {
            turnOrder = JSON.parse(Campaign().get('turnorder'));
        }
        
        let roundItem = turnOrder.find(function(t) {
            return t && t.custom && 
            t.custom.toLowerCase() == 'round';
        });
        let round = roundItem ? roundItem.pr : 1;

        // Use selected token or first token on active page that represents character
        let token;
        if(msg.selected && msg.selected.length > 0) {
            token = getObj('graphic', msg.selected[0]._id);
        } else {
            let tokens = findObjs({
                _pageid: Campaign().get("playerpageid"),                              
                _type: "graphic",
                represents: actor.get('_id')
            });
            if(tokens.length > 0) {
                token = tokens[0];
            }
        }
        
        // Identify the technique
        let techId = split[1];
        let nextParam = 2;
        while(nextParam < split.length && parseInt(split[nextParam]) != parseInt(split[nextParam])) {
            techId += ' ' + split[nextParam];
            nextParam++;
        }
        
        let tech = getTechByName(techId, actor.get('_id'), targetsList.length > 0);
        
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
            tech.core == 'ultTransform' || tech.core == 'domain')) {
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
        
        // Check for Persist
        if(tech.persist) {
            overrideLimits = true;
            log('Rerolling persistent tech.');
        }
        
        // Pull Skill list
        let skills = getSkills(actor.get('_id'));
        
        // Pull tech usage data from the state
        let techDataId = actor.get('_id') + '.' + tech.name;
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
        let techData = state.techData[techDataId];
        if(techData.timesUsed && techData.timesUsed.length > 0) {
            log('Technique used previously on turns: ' + techData.timesUsed);
        }
        
        // Check for blocking limits
        let blocked = false;
        let errorMessage = '';
        if(tech.limits && !overrideLimits && 
                (!state.ignoreLimitsOnMinions || 
                (actorClass != 'flunky' && actorClass != 'soldier'))) {
            if(token) {
                // Check stamina
                let st = getSt(token.get('_id'), actor.get('_id'));
                
                if(st && st.val < tech.cost && !tech.digDeep) {
                    log('Tech blocked - insufficient Stamina');
                    errorMessage += "You don't have enough Stamina to use this Technique.<br>";
                    blocked = true;
                }
                
                // Check Initiative Limit
                let initiativeLimit = tech.limits.find(function(l) {
                    return l.toLowerCase().indexOf('init') == 0;
                });
                
                if(initiativeLimit) {
                    let initiativeLimitSplit = initiativeLimit.split(' ');
                    let initiativeLimitLevel = parseInt(initiativeLimitSplit[initiativeLimitSplit.length - 1]);
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
            let valorLimit = tech.limits.find(function(l) {
                let name = l.toLowerCase();
                return ((name.indexOf('valor') == 0 &&
                         name.indexOf('valor c') != 0) ||
                         name.indexOf('ultimate v') == 0);
            });
            
            if(valorLimit) {
                let valorLimitSplit = valorLimit.split(' ');
                let valorLimitLevel = parseInt(valorLimitSplit[valorLimitSplit.length - 1]);
                if(valorLimitLevel != valorLimitLevel) {
                    valorLimitLevel = 1;
                }
                
                let currentValor = getAttrByName(actor.get('_id'), 'valor');
                if(currentValor < valorLimitLevel) {
                    log('Tech blocked - Valor Limit');
                    errorMessage += 'You need at least ' + valorLimitLevel + ' Valor to use this Technique.<br>';
                    blocked = true;
                }
            }
            
            // Check Injury Limit
            let injuryLimit = tech.limits.find(function(l) {
                return l.toLowerCase().indexOf('injury') == 0;
            });
            
            // Check Vitality Limit
            let vitalityLimit = tech.limits.find(function(l) {
                return l.toLowerCase().indexOf('vitality') == 0;
            });
            
            if((injuryLimit || vitalityLimit) && token) {
                const hp = getHp(token.get('_id'), actor.get('_id'));
                if(injuryLimit) {
                    let injuryLimitSplit = injuryLimit.split(' ');
                    let injuryLimitLevel = parseInt(injuryLimitSplit[injuryLimitSplit.length - 1]);
                    if(injuryLimitLevel != injuryLimitLevel) {
                        injuryLimitLevel = 1;
                    }
                    
                    
                    const hpTarget = Math.ceil(hp.max / 5 * (5 - injuryLimitLevel));
                    
                    if(hp.val > hpTarget) {
                        log('Tech blocked - Injury Limit');
                        errorMessage += `Your Health must be ${hpTarget} or lower to use this Technique.<br>`;
                        blocked = true;
                    }
                }
                
                if(vitalityLimit) {
                    let hpTarget = Math.ceil(hp.max * 0.4);
                    
                    if(hp.val < hpTarget) {
                        log('Tech blocked - Vitality Limit');
                        errorMessage += 'Your Health must be ' + hpTarget + ' or lower to use this Technique.<br>';
                        blocked = true;
                    }
                }
                
            }
            
            // Check Set-Up Limit
            let setUpLimit = tech.limits.find(function(l) {
                return l.toLowerCase().indexOf('set') == 0;
            });
            
            if(setUpLimit) {
                if(round) {
                    let setUpLimitSplit = setUpLimit.split(' ');
                    let setUpLimitLevel = parseInt(setUpLimitSplit[setUpLimitSplit.length - 1]);
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
            let ammoLimit = tech.limits.find(function(l) {
                return l.toLowerCase().indexOf('amm') == 0;
            });
            
            if(ammoLimit) {
                let ammoLimitSplit = ammoLimit.split(' ');
                let ammoLimitLevel = parseInt(ammoLimitSplit[ammoLimitSplit.length - 1]);
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
            let cooldownLimit = tech.limits.find(function(l) {
                return l.toLowerCase().indexOf('cooldown') == 0;
            });
            
            if(cooldownLimit && round) {
                let cooldownLimitSplit = cooldownLimit.split(' ');
                let cooldownLimitLevel = parseInt(cooldownLimitSplit[cooldownLimitSplit.length - 1]);
                if(cooldownLimitLevel != cooldownLimitLevel) {
                    cooldownLimitLevel = 1;
                }
                
                if(techData.timesUsed.length > 0) {
                    let lastTurnUsed = parseInt(techData.timesUsed[techData.timesUsed.length - 1]);
                    if(round <= lastTurnUsed + cooldownLimitLevel) {
                        log('Tech blocked - Cooldown Limit');
                        errorMessage += 'This Technique is still on cooldown.<br>'
                        blocked = true;
                    }
                }
            }
        }
        
        // Check for Ultimate usage
        if((tech.core == 'ultDamage' || tech.core == 'ultTransform' ||
            tech.core == 'ultMimic' || tech.core == 'domain') && !overrideLimits) {
            let unerring = tech.mods && tech.mods.find(function(m) {
                return m.toLowerCase().indexOf('unerring') == 0;
            });
            
            if(!unerring && techData.timesUsed.length > 0) {
                log('Tech blocked - Ultimate already used');
                errorMessage += 'You already used this Ultimate Technique.<br>'
                blocked = true;
            }
        }
            
        if(blocked) {
            // Make sure --override comes after --targets
            let overrideButton = '';
            let targetIndex = msg.content.indexOf('--targets');
            if(targetIndex > -1) {
                overrideButton = msg.content.substring(0, targetIndex) + '--override ' + 
                    msg.content.substring(targetIndex, msg.content.length);
            } else {
                overrideButton = msg.content + ' --override';
            }
            let cleanButton = overrideButton.replace(/\"/g, '&#' + '34;'); // Concatenated to keep the editor from freaking out
            errorMessage += '[Override](' + cleanButton + ')';
            sendChat('Valor', '/w "' + actor.get('name') + '" ' + errorMessage);
            log('Tech failed on turn ' + round);
            endEvent('!tech');
            return;
        }
        
        let roll = 0;
        let rollBonus = 0;
        let rollStat = tech.stat;
        let rollText = '';
        let hiddenRollText = '';
        let targets = 1;
        
        if(tech.core == 'damage' ||
           tech.core == 'ultDamage' ||
           tech.core == 'weaken' ||
           tech.core == 'custom') {
            while(split.length > nextParam) {
                if(split[nextParam].indexOf('+') == -1 && split[nextParam].indexOf('-') == -1) {
                    let inputTargets = parseInt(split[nextParam]);
                    if(inputTargets == inputTargets) {
                        targets = inputTargets;
                    }
                    if(targets > 20) {
                        log('Too many targets, capped at 20');
                        targets = 20;
                    }
                } else {
                    let inputRollBonus = split[nextParam];
                    if(inputRollBonus.indexOf('+') == 0) {
                        inputRollBonus = inputRollBonus.substring(1);
                        // Roll button can potentially add a second +, so check again
                        if(inputRollBonus.indexOf('+') == 0) {
                            inputRollBonus = inputRollBonus.substring(1);
                        }
                    }
                    let parsedBonus = parseInt(inputRollBonus);
                    if(parsedBonus == parsedBonus) {
                        rollBonus = parsedBonus;
                    }
                }
                nextParam++;
            }
            
            let accurate = tech.mods && tech.mods.find(function(m) {
                return m.toLowerCase().indexOf('accurate') > -1;
            });
            
            if(accurate) {
                rollBonus += 2;
            }
            
            let universalBonus = parseInt(getAttrByName(actor.get('_id'), 'rollbonus'));
            if(universalBonus == universalBonus) {
                rollBonus += universalBonus;
            }
            
            let atkBonus = parseInt(getAttrByName(actor.get('_id'), 'atkrollbonus'));
            if(atkBonus == atkBonus) {
                rollBonus += atkBonus;
            }
            
            let iatkBonus = parseInt(getAttrByName(actor.get('_id'), 'iatkrollbonus'));
            if(iatkBonus == iatkBonus) {
                rollBonus += iatkBonus;
            }
            
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
            
            if(rollText) {
                if(rollBonus > 0) {
                    rollText += '+' + rollBonus;
                } else if(rollBonus < 0) {
                    rollText += '-' + (-rollBonus);
                }
            }
        }
        
        if(targetsList.length > 0) {
            let fullList = (!state.hideNpcTechEffects || !state.rollBehindScreen || actor.get('controlledby')) &&
                (tech.core == 'damage' || tech.core == 'ultDamage' || tech.core == 'weaken' || tech.core == 'custom') && rollStat != 'none';
            let hiddenFullList = ((state.hideNpcTechEffects || state.rollBehindScreen) && !actor.get('controlledby')) &&
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
            
            let firstTarget = true;
            
            targetsList.forEach(function(target) {
                let targetCharId = target.get('represents');
                let targetChar = getObj('character', targetCharId);
                let targetName = target.get('name');
                if(!targetName && targetChar) {
                    targetName = targetChar.get('name');
                }
                if(!targetName) {
                    targetName = 'Target';
                }
                
                // Get damage
                let damage = getTechDamage(tech, actor.get('_id'));
                
                // Get def/res
                let defRes = 0;
                let defResStat = tech.newStat ? tech.newStat : tech.stat;
                
                if(targetChar && (!tech.mods || !tech.mods.find(function(m) {
                    return m.toLowerCase().indexOf('piercing') > -1
                }))) {
                    let physical = defResStat == 'str' || defResStat == 'agi';
                    if(tech.mods && tech.mods.find(function(m) {
                        return m.toLowerCase().indexOf('shift') > -1
                    })) {
                        physical = !physical;
                    }
                    if(physical) {
                        defRes = getAttrByName(targetCharId, 'defense');
                        let bonus = parseInt(getAttrByName(targetCharId, 'defensebonus'));
                        if(bonus == bonus) {
                            defRes += bonus;
                        }
                    } else {
                        defRes = getAttrByName(targetCharId, 'resistance');
                        let bonus = parseInt(getAttrByName(targetCharId, 'resistancebonus'));
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
                        
                        // Display reposition distance
                        let reposition = tech.mods && tech.mods.find(function(m) {
                            return m.toLowerCase().indexOf('repo') > -1;
                        });
                        if(reposition) {
                            let repositionSplit = reposition.split(' ');
                            let repositionLevel = parseInt(repositionSplit[repositionSplit.length - 1]);
                            if(repositionLevel != repositionLevel) repositionLevel = 1;
                            
                            let distance = repositionLevel + 1;
                            if(tech.stat == 'str') {
                                distance++;
                            }
                            let unmovable = getSkill(targetCharId, 'unmovable');
                            if(unmovable) {
                                distance = Math.max(0, distance - unmovable.level * 2);
                            }
                            
                            rollText += ', Reposition ' + distance;
                        }
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
                    for(i = 0; i < targets; i++) {
                        rollText += ' [[1d10+' + roll + ']]';
                    }
                }
                
            }
        }
        
        let hp = getHp(token ? token.get('_id') : null, actor ? actor.get('_id') : null);
        
        // Pay costs
        let hpCost = 0;
        let stCost = tech.core == 'custom' ? tech.customCost : tech.cost;
        let valorCost = 0;
        let initCost = 0;
        if(token && !tech.persist) {
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
                let healthLimit = tech.limits.find(function(l) {
                    return l.toLowerCase().indexOf('health') == 0;
                });
                if(healthLimit) {
                    let healthLimitSplit = healthLimit.split(' ');
                    let healthLimitLevel = parseInt(healthLimitSplit[healthLimitSplit.length - 1]);
                    if(healthLimitLevel != healthLimitLevel) {
                        healthLimitLevel = 1;
                    }
                    
                    hpCost += healthLimitLevel * 5;
                }
                
                let ultimateHealthLimit = tech.limits.find(function(l) {
                    return l.toLowerCase().indexOf('ultimate health') == 0;
                });
                if(ultimateHealthLimit) {
                    let ultimateHealthLimitSplit = ultimateHealthLimit.split(' ');
                    let ultimateHealthLimitLevel = parseInt(ultimateHealthLimitSplit[ultimateHealthLimitSplit.length - 1]);
                    if(ultimateHealthLimitLevel != ultimateHealthLimitLevel) {
                        ultimateHealthLimitLevel = 1;
                    }
                    
                    hpCost += Math.ceil(hp.max / 5);
                }
                
                let valorLimit = tech.limits.find(function(l) {
                    return l.toLowerCase().indexOf('valor c') == 0 ||
                    l.toLowerCase().indexOf('ult valor') == 0 ||
                    l.toLowerCase().indexOf('ultimate valor') == 0;
                });
                
                if(valorLimit) {
                    let valorLimitSplit = valorLimit.split(' ');
                    let valorLimitLevel = parseInt(valorLimitSplit[valorLimitSplit.length - 1]);
                    if(valorLimitLevel != valorLimitLevel) {
                        valorLimitLevel = 1;
                    }
                    
                    let valor = parseInt(token.get('bar3_value'));
                    if(valor != valor) {
                        valor = 0;
                    }
                    
                    valorCost = valorLimitLevel;
                    updateValue(token.get('_id'), 'valor', -valorCost);
                    log('Consumed ' + valorCost + ' Valor');
                }
                
                let initLimit = tech.limits.find(function(l) {
                    return l.toLowerCase().indexOf('init') == 0;
                });
                
                if(initLimit) {
                    let initLimitSplit = initLimit.split(' ');
                    let initLimitLevel = parseInt(initLimitSplit[initLimitSplit.length - 1]);
                    if(initLimitLevel != initLimitLevel) {
                        initLimitLevel = 1;
                    }
                    initCost = initLimitLevel;
                    
                    turnOrder.forEach(function(turn) {
                        if(turn && turn.id === token.get('_id')) {
                            turn.pr -= initCost;
                        }
                    });
                    log('Consumed ' + initCost + ' initiative');
                    
                    Campaign().set('turnorder', JSON.stringify(turnOrder));
                }
            }
            
            updateValue(token.get('_id'), 'hp', -hpCost);
            if(hpCost > 0) {
                log('Consumed ' + hpCost + ' HP');
            }
        }
        
        // Update HP and bonuses for Transformations and Heals
        if(state.autoResolveTechBenefits) {
            if(tech.core == 'ultTransform' || tech.core == 'healing') {
                let charIds = [];
                
                if(targetsList.length > 0) {
                    targetsList.forEach(function(target) {
                        charIds.push(target.get('represents'));
                    });
                } else {
                    charIds.push(actor.get('_id'));
                }
                
                let hpGain = 0;
                if(tech.core == 'ultTransform') {
                    let level = parseInt(getAttrByName(actor.get('_id'), 'level'));
                    if(level != level) {
                        level = 1;
                    }
                    
                    hpGain = level * 10;
                    if(getAttrByName(actor.get('_id'), 'type') == 'master') {
                        hpGain *= 2;
                    }
                    // Directly restore HP
                    charIds.forEach(function(charId) {
                        updateValueForCharacter(charId, 'hp', hpGain);
                    });
                    // Also raise the roll bonus
                    let rollBonus = parseInt(getAttrByName(actor.get('_id'), 'rollbonus'));
                    if(rollBonus != rollBonus) {
                        rollBonus = 0;
                    }
                    let rollBonusAttrs = filterObjs(function(obj) {
                        return obj.get('_type') == 'attribute' &&
                            obj.get('characterid') == actor.get('_id') &&
                            obj.get('name') == 'rollbonus';
                    });
                    
                    if(rollBonusAttrs && rollBonusAttrs.length > 0) {
                        let rollBonus = rollBonusAttrs[0];
                        let oldValue = parseInt(rollBonus.get('current'));
                        if(oldValue != oldValue) {
                            oldValue = 0;
                        }
                		let newValue = oldValue + 1;
                		rollBonus.set('current', newValue);
                	}
                } else {
                    let regen = tech.mods && tech.mods.find(function(m) {
                        return m.toLowerCase().indexOf('continuous r') > -1;
                    });
                    let power = tech.stat ? getAttrByName(actor.get('_id'), tech.stat) : 0;
                    if(regen) {
                        hpGain = (tech.coreLevel + 3) * 2 + Math.ceil(power / 2);
                    } else {
                        if(state.houseRulesEnabled) {
                            hpGain = (tech.coreLevel + 3) * 3 + Math.ceil(power / 2);
                        } else {
                            hpGain = (tech.coreLevel + 3) * 4 + power;
                        }
                    }
                    let healer = getSkill(actor.get('_id'), 'healer');
                    if(healer && healer.level) {
                        let healerLevel = parseInt(healer.level);
                        if(healerLevel != healerLevel) {
                            healerLevel = 1;
                        }
                        hpGain += (healerLevel + 1) * 2;
                    }
                    if(regen) {
                        // Add regen effect to character
                        charIds.forEach(function(charId) {
                            let effectName = 'Regen ';
                            let aggravatedWounds = getFlaw(charId, 'aggravatedWounds');
                            if(aggravatedWounds && tech.core == 'healing') {
                                effectName += Math.ceil(hpGain / 2);
                            } else {
                                effectName += hpGain;
                            }
                            
                            // Do they already have this effect?
                            let checkingEffects = false;
                            let hasEffect = false;
                            for(let turnId = 0; turnId < turnOrder.length; turnId++) {
                                if(checkingEffects) {
                                    if(turnOrder[turnId].id == '-1') {
                                        if(turnOrder[turnId].custom == effectName) {
                                            // They already have it, reset its duration
                                            turnOrder[turnId].pr = 3;
                                            hasEffect = true;
                                            Campaign().set('turnorder', JSON.stringify(turnOrder));
                                            break;
                                        }
                                    } else {
                                        // That's the end of the effects
                                        break;
                                    }
                                } else {
                                    if(turnOrder[turnId].id != '-1') {
                                        let token = getObj('graphic', turnOrder[turnId].id);
                                        if(token && token.get('represents') == charId) {
                                            // We found the user, continue reading to get their effect list
                                            checkingEffects = true;
                                        }
                                    }
                                }
                            }
                            if(!hasEffect) {
                                // Add the regen effect and re-get the turn order object
                                addEffect(turnOrder, charId, effectName, 3);
                                turnOrder = JSON.parse(Campaign().get('turnorder'));
                            }
                        });
                    } else {
                        // Directly restore HP
                        charIds.forEach(function(charId) {
                            let aggravatedWounds = getFlaw(charId, 'aggravatedWounds');
                            if(aggravatedWounds && tech.core == 'healing') {
                                updateValueForCharacter(charId, 'hp', Math.ceil(hpGain));
                            } else {
                                updateValueForCharacter(charId, 'hp', hpGain);
                            }
                        });
                    }
                }
                
            }
        }
        
        let techQualifiers = [];
        if(tech.empowerAttack) {
            techQualifiers.push('Empowered');
        }
        
        if(hp.val / hp.max <= 0.4 && tech.core == 'damage' || tech.core == 'ultDamage') {
            let crisis = getSkill(actor.get('_id'), 'crisis');
            if(crisis && crisis.level) {
                techQualifiers.push('Crisis');
            }
            let berserker = getFlaw(actor.get('_id'), 'berserker')
            if(berserker) {
                techQualifiers.push('Berserker');
            }
        }
        if(tech.persist) {
            techQualifiers.push('Persisting');
        }
        
        let messageName = tech.name;
        
        if(techQualifiers.length > 0) {
            messageName += ' (' + techQualifiers.join(', ') + ')';
        }
        
        const showSummary = tech.summary && (!state.hideNpcTechEffects || actor.get('controlledby'));
        const messageSummary = showSummary ? tech.summary : '';
        
        sendChat('character|' + actor.get('_id'), `&{template:valor} {{name=${messageName}}} {{roll=${rollText}}} {{summary=${messageSummary}}}`);
        
        if(token && !overrideLimits) {
            // Add used tech to the technique usage history
            if(!state.techHistory) {
                state.techHistory = [];
            }
            
            state.techHistory.push({
                tokenId: token.get('_id'),
                actorId: actor.get('_id'),
                techName: tech.name,
                hpCost: hpCost,
                stCost: stCost,
                valorCost: valorCost,
                initCost: initCost,
                targets: targetsList.map(t => t.get('_id'))
            });
            if(state.techHistory.length > 20) {
                // Don't let the tech history get too long
                state.techHistory = state.techHistory.slice(1);
            }
            state.techData[techDataId].timesUsed.push(round);
        }
        
        // Alert with remaining ammo
        if(tech.limits) {
            let ammoLimit = tech.limits.find(function(l) {
                return l.toLowerCase().indexOf('amm') == 0;
            });
            
            if(ammoLimit) {
                let ammoLimitSplit = ammoLimit.split(' ');
                let ammoLimitLevel = parseInt(ammoLimitSplit[ammoLimitSplit.length - 1]);
                if(ammoLimitLevel != ammoLimitLevel) {
                    ammoLimitLevel = 1;
                }
                let ammo = 4 - ammoLimitLevel - state.techData[techDataId].timesUsed.length;
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
            let techAttrs = filterObjs(function(obj) {
                if(obj.get('_type') == 'attribute' &&
                   obj.get('name').indexOf(tech.id) > -1 &&
                   obj.get('name').indexOf('digDeep') > -1) {
                       return true;
                }
                return false;
            });
            if(techAttrs && techAttrs.length > 0) {
                let digDeep = techAttrs[0];
                digDeep.set('current', '0');
            }
        }
        
        if(tech.overloadLimits) {
            log('Overload Limits was enabled.');
            let techAttrs = filterObjs(function(obj) {
                if(obj.get('_type') == 'attribute' &&
                   obj.get('name').indexOf(tech.id) > -1 &&
                   obj.get('name').indexOf('overloadLimits') > -1) {
                       return true;
                }
                return false;
            });
            if(techAttrs && techAttrs.length > 0) {
                let digDeep = techAttrs[0];
                digDeep.set('current', '0');
            }
        }
        
        if(tech.empowerAttack) {
            log('Empower Attack was enabled.');
            let techAttrs = filterObjs(function(obj) {
                if(obj.get('_type') == 'attribute' &&
                   obj.get('name').indexOf(tech.id) > -1 &&
                   obj.get('name').indexOf('empowerAttack') > -1) {
                       return true;
                }
                return false;
            });
            if(techAttrs && techAttrs.length > 0) {
                let empowerAttack = techAttrs[0];
                empowerAttack.set('current', '0');
            }
        }
        
        if(tech.resoluteStrike) {
            log('Resolute Strike was enabled.');
            let techAttrs = filterObjs(function(obj) {
                if(obj.get('_type') == 'attribute' &&
                   obj.get('name').indexOf(tech.id) > -1 &&
                   obj.get('name').indexOf('resoluteStrike') > -1) {
                       return true;
                }
                return false;
            });
            if(techAttrs && techAttrs.length > 0) {
                let resoluteStrike = techAttrs[0];
                resoluteStrike.set('current', '0');
            }
        }
        
        if(tech.persist) {
            log('Persistent Reroll was enabled.');
            let techAttrs = filterObjs(function(obj) {
                if(obj.get('_type') == 'attribute' &&
                   obj.get('name').indexOf(tech.id) > -1 &&
                   obj.get('name').indexOf('persist') > -1 &&
                   obj.get('name').indexOf('can_persist') == -1) {
                       return true;
                }
                return false;
            });
            if(techAttrs && techAttrs.length > 0) {
                let persist = techAttrs[0];
                persist.set('current', '0');
            }
        }
        
        // Reset number of targets and roll modifier on tech
        let techTargetAttrs = filterObjs(function(obj) {
            if(obj.get('_type') == 'attribute' &&
               obj.get('name').indexOf(tech.id) > -1 &&
               obj.get('name').indexOf('targets') > -1) {
                   return true;
            }
            return false;
        });
        if(techTargetAttrs && techTargetAttrs.length > 0) {
            let targets = techTargetAttrs[0];
            targets.setWithWorker({current: '1'});
        }
        
        let techBonusAttrs = filterObjs(function(obj) {
            if(obj.get('_type') == 'attribute' &&
               obj.get('name').indexOf(tech.id) > -1 &&
               obj.get('name').indexOf('bonus') > -1) {
                   return true;
            }
            return false;
        });
        if(techBonusAttrs && techBonusAttrs.length > 0) {
            let bonus = techBonusAttrs[0];
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
        
        let techLog = state.techHistory[state.techHistory.length - 1];
        let turnOrder = JSON.parse(Campaign().get('turnorder'));
        
        // Refund lost resources
        updateValue(techLog.tokenId, 'hp', techLog.hpCost);
        updateValue(techLog.tokenId, 'st', techLog.stCost);
        updateValue(techLog.tokenId, 'valor', techLog.valorCost);
        if(turnOrder && techLog.initCost) {
            turnOrder.forEach(function(turn) {
                if(turn && turn.id === techLog.tokenId) {
                    turn.pr += techLog.initCost;
                }
            });
    
            Campaign().set('turnorder', JSON.stringify(turnOrder));
        }
        
        // Remove tech from history
        state.techHistory = state.techHistory.slice(0, state.techHistory.length - 1);
        
        let token = getObj('graphic', techLog.tokenId);
        
        let techDataId = token.get('represents') + '.' + techLog.techName;
        if(state.techData[techDataId]) {
            state.techData[techDataId].timesUsed = state.techData[techDataId].timesUsed.slice(0, 
            state.techData[techDataId].timesUsed.length - 1);
        }
        
        let name = token.get('name');
        if(!name) {
            let characters = filterObjs(function(obj) {
                return obj.get('_type') === 'character' &&
                       obj.get('_id') === token.get('represents');
            });
            
            if(characters.length > 0) {
                let actor = characters[0];
                name = actor.get('name');
            }
        }
        let message = name ? 'Reverted use of technique ' + techLog.techName + ' used by ' + name + '. ' :
            'Reverted use of technique' + techLog.techName + '. ';
        sendChat('Valor', message);
        log(message + state.techHistory.length + ' techs remaining in history log.');
    }
});

// !effect command
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!e ') == 0 || 
    msg.type == 'api' && msg.content.indexOf('!effect') == 0) {
        startEvent('!effect');
        // Get params
        let split = msg.content.match(/(".*?")|(\S+)/g);
        if(split.length < 2) {
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
        
        let effectName = split[1];
        let nextParam = 2;
        while(nextParam < split.length && parseInt(split[nextParam]) != parseInt(split[nextParam])) {
            effectName += ' ' + split[nextParam];
            nextParam++;
        }
        
        if(effectName[0] == '"') {
            effectName = effectName.substring(1, effectName.length - 1);
        }
        let duration = 3;
        if(split.length > nextParam) {
            let inputDuration = parseInt(split[nextParam]);
            if(inputDuration == inputDuration) {
                duration = inputDuration;
            }
        }
        
        addEffect(turnOrder, actor.get('_id'), effectName, duration);
        endEvent('!effect');
    }
});

function addEffect(turnOrder, actorId, effectName, duration) {
    // Add a new item to the turn log
    for(i = 0; i < turnOrder.length; i++) {
        if(turnOrder[i].id != '-1') {
            let token = getObj('graphic', turnOrder[i].id);
            if(token && token.get('represents') == actorId) {
                let effect = {
                    id: '-1',
                    custom: effectName,
                    pr: duration,
                    formula: '-1'
                };
                let newTurnOrder = turnOrder.slice(0, i + 1).concat([effect]).concat(turnOrder.slice(i + 1));
                Campaign().set('turnorder', JSON.stringify(newTurnOrder));
                log('Effect ' + effectName + ' added to Turn Tracker.');
                return;
            }
        }
    }
    log('Actor not found on Turn Tracker.');
}

// !rest command
// Enter !rest in the chat to recover an Increment of HP/ST for each character.
// Also sets everyone's Valor to starting value.
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!rest') == 0
        && playerIsGM(msg.playerid)) {
        startEvent('!rest');
        
        // Find all characters with Fast Healing
        let fastHealingSkills = filterObjs(function(obj) {
            if(obj.get('_type') == 'attribute' &&
               obj.get('name').indexOf('repeating_skills') > -1 &&
               obj.get('current') == 'fastHealing') {
                   return true;
            }
            return false;
        });
        let fastHealingCharacters = {};
        fastHealingSkills.forEach(function(skill) {
            let charId = skill.get('_characterid');
            let di = parseInt(getAttrByName(charId, 'di'));
            if(di == di) {
                fastHealingCharacters[charId] = di;
            }
        })
        
        let startingValor = {};
        
        // Determine starting Valor for every charId
        if(state.houseRulesEnabled) {
            let levelAttrs = filterObjs(function(obj) {
                return obj.get('_type') == 'attribute' &&
                    obj.get('name') == 'level';
            });
            
            levelAttrs.forEach(function(levelAttr) {
                let level = parseInt(levelAttr.get('current'));
                let charId = levelAttr.get('_characterid');
                if(level == level) {
                    let valorBySeason = Math.ceil(level / 5) - 1;
                    if(getAttrByName(charId, 'type') == 'master') {
                        valorBySeason *= 2;
                    }
                    startingValor[charId] = valorBySeason;
                }
            });
        }
        
        // Find all characters with Bravado
        let bravadoSkills = filterObjs(function(obj) {
            if(obj.get('_type') == 'attribute' &&
               obj.get('name').indexOf('repeating_skills') > -1 &&
               obj.get('current') == 'bravado') {
                   return true;
            }
            return false;
        });
        
        bravadoSkills.forEach(function(skill) {
            let valor = 1;
            if(!state.houseRulesEnabled) {
                // Get the corresponding skill level
                let skillId = skillName.split('_')[2];
                let skillLevelAttr = filterObjs(function(obj) {
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
            
            let charId = skill.get('_characterid');
            if(startingValor[charId]) {
                startingValor[charId] += valor;
            } else {
                startingValor[charId] = valor;
            }
        });
        
        // Update every HP attribute
        let hpAttrs = filterObjs(function(obj) {
            return obj.get('_type') == 'attribute' &&
                obj.get('name') == 'hp';
        });
        
        hpAttrs.forEach(function(hpAttr) {
            let oldValue = parseInt(hpAttr.get('current'));
            let maxValue = parseInt(hpAttr.get('max'));
            if(oldValue != oldValue) {
                oldValue = 0;
            }
            if(maxValue != maxValue) {
                maxValue = 0;
            }
            
            let newValue = oldValue + Math.ceil(maxValue / 5);
            
            let charId = hpAttr.get('_characterid');
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
        let stAttrs = filterObjs(function(obj) {
            return obj.get('_type') == 'attribute' &&
                obj.get('name') == 'st';
        });
        
        stAttrs.forEach(function(stAttr) {
            let oldValue = parseInt(stAttr.get('current'));
            let maxValue = parseInt(stAttr.get('max'));
            if(oldValue != oldValue) {
                oldValue = 0;
            }
            if(maxValue != maxValue) {
                maxValue = 0;
            }
            
            let newValue = oldValue + Math.ceil(maxValue / 5);
            
            if(newValue > maxValue) {
                newValue = maxValue;
            }
            
            stAttr.set('current', newValue);
        });
        
        // Update every Valor attribute
        let vAttrs = filterObjs(function(obj) {
            return obj.get('_type') == 'attribute' &&
                obj.get('name') == 'valor';
        });
        
        vAttrs.forEach(function(vAttr) {
            let charId = vAttr.get('_characterid');
            
            if(startingValor[charId]) {
                vAttr.set('current', startingValor[charId]);
            } else {
                vAttr.set('current', 0);
            }
        });
        
        resetBonuses();
        
        checkEvent('!rest');
        
        // Handle values as best we can for current-page, Object layer unaffiliated tokens
        let page = Campaign().get('playerpageid');
        let tokens = filterObjs(function(obj) {
            return obj.get('_type') == 'graphic' &&
                obj.get('layer') == 'objects' &&
                !obj.get('isdrawing') &&
                !obj.get('represents');
        });
        tokens.forEach(function(token) {
            let tokenId = token.get('_id');
            updateValue(tokenId, 'hp', 0.2, true);
            updateValue(tokenId, 'st', 0.2, true);
            updateValue(tokenId, 'valor', 0, false, true);
        });
        
        state.techData = {};
        state.techHistory = [];
        state.autoInitiativeForScene = false;
        
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
        
        let startingValor = {};
        
        // Determine starting Valor for every charId
        if(state.houseRulesEnabled) {
            let levelAttrs = filterObjs(function(obj) {
                return obj.get('_type') == 'attribute' &&
                    obj.get('name') == 'level';
            });
            
            levelAttrs.forEach(function(levelAttr) {
                let level = parseInt(levelAttr.get('current'));
                let charId = levelAttr.get('_characterid');
                if(level == level) {
                    let valorBySeason = Math.ceil(level / 5) - 1;
                    if(getAttrByName(charId, 'type') == 'master') {
                        valorBySeason *= 2;
                    }
                    startingValor[charId] = valorBySeason;
                }
            });
        }
        
        // Find all characters with Bravado
        let bravadoSkills = filterObjs(function(obj) {
            if(obj.get('_type') == 'attribute' &&
               obj.get('name').indexOf('repeating_skills') > -1 &&
               obj.get('current') == 'bravado') {
                   return true;
            }
            return false;
        });
        
        bravadoSkills.forEach(function(skill) {
            let valor = 1;
            if(!state.houseRulesEnabled) {
                // Get the corresponding skill level
                let skillId = skillName.split('_')[2];
                let skillLevelAttr = filterObjs(function(obj) {
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
            
            let charId = skill.get('_characterid');
            if(startingValor[charId]) {
                startingValor[charId] += valor;
            } else {
                startingValor[charId] = valor;
            }
        });
        
        // Update every HP attribute
        let hpAttrs = filterObjs(function(obj) {
            return obj.get('_type') == 'attribute' &&
                obj.get('name') == 'hp';
        });
        
        hpAttrs.forEach(function(hpAttr) {
            let maxValue = parseInt(hpAttr.get('max'));
            if(maxValue != maxValue) {
                maxValue = 0;
            }
            
            hpAttr.set('current', maxValue);
        });
        
        // Update every ST attribute
        let stAttrs = filterObjs(function(obj) {
            return obj.get('_type') == 'attribute' &&
                obj.get('name') == 'st';
        });
        
        stAttrs.forEach(function(stAttr) {
            let maxValue = parseInt(stAttr.get('max'));
            if(maxValue != maxValue) {
                maxValue = 0;
            }
            
            stAttr.set('current', maxValue);
        });
        
        // Update every Valor attribute
        let vAttrs = filterObjs(function(obj) {
            return obj.get('_type') == 'attribute' &&
                obj.get('name') == 'valor';
        });
        
        vAttrs.forEach(function(vAttr) {
            let charId = vAttr.get('_characterid');
            
            if(startingValor[charId]) {
                vAttr.set('current', startingValor[charId]);
            } else {
                vAttr.set('current', 0);
            }
        });
        
        resetBonuses();
        
        checkEvent('!fullrest');
        
        // Handle values as best we can for current-page, Object layer unaffiliated tokens
        let page = Campaign().get('playerpageid');
        let tokens = filterObjs(function(obj) {
            return obj.get('_type') == 'graphic' &&
                obj.get('layer') == 'objects' &&
                !obj.get('isdrawing') &&
                !obj.get('represents');
        });
        tokens.forEach(function(token) {
            let tokenId = token.get('_id');
            updateValue(tokenId, 'hp', 1.0, true, true);
            updateValue(tokenId, 'st', 1.0, true, true);
            updateValue(tokenId, 'valor', 0, false, true);
        });
        
        state.techData = {};
        state.techHistory = [];
        state.autoInitiativeForScene = false;
        
        endEvent('!fullrest');
    }
});

on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!autoinit') == 0
        && state.confirmAutoInitiative
        && playerIsGM(msg.playerid)) {
        let split = msg.content.match(/(".*?")|(\S+)/g);
        if(split.length == 2 && split[1] == '--off') {
            sendChat('Valor', '/w gm Auto-initiative disabled for this scene.');
            state.autoInitiativeForScene = false;
        } else {
            sendChat('Valor', '/w gm Auto-initiative enabled for this scene.');
            state.autoInitiativeForScene = true;
        }
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
        let split = msg.content.match(/(".*?")|(\S+)/g);
        let turnOrder = JSON.parse(Campaign().get('turnorder'));
        if(!turnOrder) {
            turnOrder = [];
        }
        
        if((split.length < 2 || split[1] != '--confirm') && turnOrder && turnOrder.length > 0) {
            // No --confirm, ask for verification
            sendChat('Valor', '/w gm You will lose all information currently on the Turn Tracker.<br>' +
            '[Continue](!init --confirm)');
            return;
        }
        
        log('Initiative roll commencing');
        
        turnOrder = [];
        
        // Get list of tokens
        let page = Campaign().get('playerpageid');
        let allTokens = findObjs({_type: 'graphic', layer:'objects', _pageid: page});
        let actorIds = [];
        let tokens = [];
        let duplicateIds = [];
        
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
            let actorId = token.get('represents');
            if(actorIds.indexOf(actorId) == -1) {
                log('Adding ' + token.get('name') + ' to init token list');
                actorIds.push(actorId);
                tokens.push(token);
            } else {
                if(duplicateIds.indexOf(actorId) == -1) {
                    log('Adding ' + token.get('name') + ' to duplicate token list');
                    duplicateIds.push(actorId);
                    let oldToken = tokens.find(function(t) { return t.get('represents') == actorId });
                    tokens.splice(tokens.indexOf(oldToken), 1);
                } else {
                    log('No action taken on ' + token.get('name'));
                }
            }
        });
        
        // For duplicate character tokens, create an init-tracker token that the players can't see
        duplicateIds.forEach(function(id) {
            let oldToken = allTokens.find(function(t) { return t.get('represents') == id});
            let newToken = createObj('graphic', {
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

        let message = '<table><tr><td>**ROLLING INITIATIVE**</td></tr>';
        tokens.forEach(function(token) {
            if(token) {
                let actorId = token.get('represents');
                let actor = getObj('character', actorId);
                
                if(actor) {
                    let initMod = getAttrByName(actorId, 'init')
                    let init = initMod + randomInteger(10);
                    let actorName = actor.get('name');
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
        
        if(state.confirmAutoInitiative) {
            sendChat('Valor', '/w gm Enable automatic initiative updating?' +
                '[Yes](!autoinit --on)' +
                '[No](!autoinit --off)');
        }
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
        let page = Campaign().get('playerpageid');
        let allTokens = findObjs({_type: 'graphic', layer:'objects', _pageid: page});
        let actorIds = [];
        let tokens = [];
        let duplicateIds = [];
        
        allTokens.forEach(function(token) {
            let actorId = token.get('represents');
            if(actorId && actorIds.indexOf(actorId) == -1) {
                log('Adding ' + token.get('name') + ' to defense token list');
                actorIds.push(actorId);
                tokens.push(token);
            }
        });

        let message = '';
        let turnOrder = [];
        tokens.forEach(function(token) {
            let actorId = token.get('represents');
            let actor = getObj('character', actorId);
            
            if(actor) {
                let def = getAttrByName(actorId, 'defense')
                let res = getAttrByName(actorId, 'resistance')
                let actorName = actor.get('name');
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
        let page = Campaign().get('playerpageid');
        let allTokens = findObjs({_type: 'graphic', layer:'objects', _pageid: page});
        let actorIds = [];
        let tokens = [];
        let duplicateIds = [];
        
        allTokens.forEach(function(token) {
            let actorId = token.get('represents');
            if(actorId && actorIds.indexOf(actorId) == -1) {
                log('Adding ' + token.get('name') + ' to defense token list');
                actorIds.push(actorId);
                tokens.push(token);
            }
        });

        let message = '';
        let turnOrder = [];
        tokens.forEach(function(token) {
            let actorId = token.get('represents');
            let actor = getObj('character', actorId);
            
            if(actor) {
                let di = getAttrByName(actorId, 'di')
                let actorName = actor.get('name');
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
        let split = msg.content.match(/(".*?")|(\S+)/g);
        let lookback = 1;
        if(split.length > 1) {
            lookback = parseInt(split[1]);
        }
        
        if(lookback > state.techHistory.length) {
            sendChat('Valor', '/w gm Not enough techniques found in tech history.');
            return;
        }
        
        // Get tech data
        let techHistory = state.techHistory[state.techHistory.length - lookback];
        let actorToken = getObj('graphic', techHistory.tokenId);
        let tech = getTechByName(techHistory.techName, actorToken ? actorToken.get('represents') : techHistory.actorId);
        
        if(tech.core != 'damage' && tech.core != 'ultDamage') {
            sendChat('Valor', '/w gm ' + techHistory.techName + ' is not a damage technique.');
            return;
        }
        
        let targetsList = techHistory.targets ? techHistory.targets : [];
        
        let output = 'Critical hit for **' + techHistory.techName + '**:';
        
        if(targetsList.length > 0) {
            let firstTarget = true;
            
            targetsList.forEach(function(targetId) {
                let target = getObj('graphic', targetId);
                let targetChar = getObj('character', target.get('represents'));
                
                let targetName = target.get('name');
                if(!targetName && targetChar) {
                    targetName = targetChar.get('name');
                }
                if(!targetName) {
                    targetName = 'Target';
                }
                
                // Get crit damage
                let damage = getTechDamage(tech, actorToken ? actorToken.get('represents') : techHistory.actorId, true);
                
                // Get def/res
                let defRes = 0;
                let defResStat = tech.newStat ? tech.newStat : tech.stat;
                
                if(targetChar && (!tech.mods || !tech.mods.find(function(m) {
                    return m.toLowerCase().indexOf('piercing') > -1
                }))) {
                    let physical = defResStat == 'str' || defResStat == 'agi';
                    if(tech.mods && tech.mods.find(function(m) {
                        return m.toLowerCase().indexOf('shift') > -1
                    })) {
                        physical = !physical;
                    }
                    if(physical) {
                        defRes = getAttrByName(targetChar.get('_id'), 'defense');
                        let bonus = parseInt(getAttrByName(targetChar.get('_id'), 'defensebonus'));
                        if(bonus == bonus) {
                            defRes += bonus;
                        }
                    } else {
                        defRes = getAttrByName(targetChar.get('_id'), 'resistance');
                        let bonus = parseInt(getAttrByName(targetChar.get('_id'), 'resistancebonus'));
                        if(bonus == bonus) {
                            defRes += bonus;
                        }
                    }
                }
                
                output += '<br />VS ' + targetName + ': Damage [[{' + damage + ' - ' + defRes + ', 0}kh1]]';
            });
        } else {
            // Get crit damage
            let damage = getTechDamage(tech, actorToken ? actorToken.get('represents') : techHistory.actorId, true);
            
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
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!duplicate') == 0) {
        let split = msg.content.match(/(".*?")|(\S+)/g);
        if(split.length < 2) {
            log('Not enough arguments.');
            return;
        }
        
        startEvent('!duplicate');
        
        if(!state.linkedSheets) {
            state.linkedSheets = {};
        }
        
        // Figure out who to duplicate
        let actor = getObj('character', split[1]);
        let actorId = actor.get('_id');
        
        // Check to see if they already have a level up sheet
        if(state.linkedSheets[actorId]) {
            let oldActor = getObj('character', state.linkedSheets[actorId]);
            if(oldActor) {
                sendChat('Valor', '/w "' + actor.get('name') + "\" You already have an open level-up sheet.");
                return;
            } else {
                // The character was deleted, erase them from the link library
                state.linkedSheets[actorId] = undefined;
            }
        }
        
        // Create new character, copy over basic traits
        let newActor = createObj('character', {
            name: 'Level up - ' + actor.get('name'),
            inplayerjournals: actor.get('inplayerjournals'),
            controlledby: actor.get('controlledby'),
            avatar: actor.get('avatar')
        });
        let newActorId = newActor.get('_id');
        
        // Copy over attributes
        let attributes = filterObjs(function(obj) {
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
// Used by character sheet - fold the level up character sheet back into the original.
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!d-finalize') == 0) {
        let split = msg.content.match(/(".*?")|(\S+)/g);
        if(split.length < 2) {
            log('Not enough arguments.');
            return;
        }
        
        startEvent('!d-finalize');
        
        if(!state.linkedSheets) {
            state.linkedSheets = {};
        }
        
        // Fetch the level-up sheet
        let actor = getObj('character', split[1]);
        let actorId = actor.get('_id');
        
        // Fetch the original sheet
        let oldActor;
        let oldActorId;
        if(split.length > 2 && split[2] == '--use-current') {
            let oldActorSearch = findObjs({
                type: 'character',
                name: msg.who
            });
            if(oldActorSearch.length > 0) {
                oldActor = oldActorSearch[0];
                oldActorId = oldActor.get('_id');
                if('Level up - ' + oldActor.get('name') != actor.get('name') &&
                    (split.length < 4 || split[3] != '--confirm')) {
                    
                    sendChat('Valor', '/w "' + actor.get('name') + "\" WARNING: The name for this character doesn't match the level up sheet.<br>" +
                    '[Continue](!d-finalize ' + actorId + ' --use-current --confirm)');
                    log("Couldn't find linked sheet for sheet " + actor.get('name') + '.');
                    return;
                }
            }
        } else {
            oldActorId = state.linkedSheets[actorId];
            oldActor = getObj('character', oldActorId);
        }
        
        // Check to see if they already have a level up sheet
        if(!oldActorId || !getObj('character', oldActorId)) {
            sendChat('Valor', '/w "' + actor.get('name') + "\" Can't find the original character sheet.<br>" +
            '[Link current character](!d-finalize ' + actorId + ' --use-current)');
            log("Couldn't find linked sheet for sheet " + actor.get('name') + '.');
            return;
        }
        
        let oldAttributes = filterObjs(function(obj) {
            return obj.get('_type') == 'attribute' &&
                   obj.get('_characterid') == oldActorId;
        });
        let attributes = filterObjs(function(obj) {
            return obj.get('_type') == 'attribute' &&
                   obj.get('_characterid') == actorId;
        });
        
        let oldHp = oldAttributes.find(function(obj) {
            return obj.get('name') == 'hp';
        });
        let newHp = attributes.find(function(obj) {
            return obj.get('name') == 'hp';
        });
        let oldHpMax = parseInt(oldHp.get('max'));
        let newHpMax = parseInt(newHp.get('max'));
        
        let oldSt = oldAttributes.find(function(obj) {
            return obj.get('name') == 'st';
        });
        let newSt = attributes.find(function(obj) {
            return obj.get('name') == 'st';
        });
        let oldStMax = parseInt(oldSt.get('max'));
        let newStMax = parseInt(newSt.get('max'));
        
        let oldLevel = oldAttributes.find(function(obj) {
            return obj.get('name') == 'level';
        });
        let newLevel = attributes.find(function(obj) {
            return obj.get('name') == 'level';
        });
        let oldLevelValue = parseInt(oldLevel.get('current'));
        let newLevelValue = parseInt(newLevel.get('current'));
        
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
        attributes.forEach(function(attr) {
            let attrName = attr.get('name');
            if(attrName != 'is_duplicate') {
                let oldAttribute = oldAttributes.find(function(obj) {
                    return obj.get('name') == attrName;
                });
                
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
        });
        
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
        state.linkedSheets[actorId] = undefined;
        state.linkedSheets[oldActorId] = undefined;
        
        
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
        endEvent('!d-finalize');
    }
});

// !mook command
// Used by character sheet - create a temporary level-up sheet for a given character.
// Also sets everyone's Valor to starting values.
on('chat:message', function(msg) {
    if(msg.type == 'api' && msg.content.indexOf('!mook') == 0) {
        startEvent('!mook');
        let split = msg.content.match(/(".*?")|(\S+)/g);
        
        // Get parameters
        let level = 1;
        let highStatsParam = [];
        let type = 'flunky';
        for(let i = 0; i < split.length - 1; i++) {
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
        
        let highStats = [];
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
        let attributes = [0,0,0,0,0];
        
        if(highStats.length == 0) {
            let stats = 2;
            let roll = randomInteger(10);
            if(roll == 1) {
                stats = 1;
            }
            else if(roll == 2 || roll == 3) {
                stats == 3;
            }
            
            let attrs = [0,1,2,3,4];
            for(let i = 0; i < stats; i++) {
                let aId = randomInteger(attrs.length) - 1;
                highStats.push(attrs[aId]);
                attrs.splice(aId, 1);
            }
        }
        
        let ap = level * 3 + 22;
        let attributesLeft = 5;
        
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
        
        for(let i = 0; i < 5; i++) {
            if(attributes[i] == 0) {
                if(attributesLeft == 1) {
                    attributes[i] = ap;
                    attributesLeft = 0;
                } else {
                    let value = randomInteger(ap - attributesLeft);
                    attributes[i] = value;
                    ap -= value;
                    attributesLeft--;
                }
            }
        }
        
        // Determine set of viable skills
        let skillLibrary = [];
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
        
        let skills = [];
        let skillCount = 1;
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
        
        for(let i = 0; i < skillCount; i++) {
            let skill = skillLibrary[randomInteger(skillLibrary.length) - 1];
            let skillLevel = 1;
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
        
        let tp = 1;
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
        
        let techLevels = [Math.min(level + 3, tp)];
        tp -= techLevels[0];
        if(tp > 0 && level > 5) {
            techLevels.push(Math.min(level, tp));
        }
        
        let techStats = highStats.filter(function(s) {
            return s != 4
        });
        
        let techs = [];
        techLevels.forEach(function(techLevel) {
            let techStatId = techStats[randomInteger(techStats.length) - 1];
            let techStat = '';
            let modLibrary = [];
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
            
            let mods = null;
            let coreLevel = techLevel;
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
        let newActor = createObj('character', {
            name: 'New Mook',
            type: type,
            level: level
        });
        let newActorId = newActor.get('_id');
        
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
            let rowId = generateRowID();
            
            createObj('attribute', {
                characterid: newActorId, name: 'repeating_skills_' + rowId + '_skillname', current: skill.name
            });
            createObj('attribute', {
                characterid: newActorId, name: 'repeating_skills_' + rowId + '_skilllevel', current: skill.level
            });
        });
        
        techs.forEach(function(tech) {
            let rowId = generateRowID();
            
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
    let a = 0, b = [];
    let c = (new Date()).getTime() + 0, d = c === a;
    a = c;
    for (let e = new Array(8), f = 7; 0 <= f; f--) {
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
        let args = msg.content.split(/\s+/);
        if(args.length < 2) {
            log('Format: !set-vrate 2');
            return;
        }
        
        let setRate = parseInt(args[1]);
        if(!state.charData) {
            state.charData = {};
        }
        
        msg.selected.forEach(function(s) {
            let token = getObj('graphic', s._id);
            if(token.get('represents') != '') {
                let id = token.get('represents');
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
        let split = msg.content.match(/(".*?")|(\S+)/g);
        
        if(split.length < 3) {
            log('!roll-as: Not enough arguments.');
        }
        
        let as = split[1];
        let roll = split[2];
        let label = split.length > 3 ? split[3] : null;
        
        // Trim quotes
        if(roll[0] == '"') {
            roll = roll.substring(1, roll.length - 1);
        }
        
        if(label[0] == '"') {
            label = label.substring(1, label.length - 1);
        }
        
        log(`Sending message as ${'character|' + as}: [[${roll}]]`);
        sendChat('character|' + as, '[[' + roll + ']] ' + label);
    }
});

// Max Value sync function
// Makes HP and ST move in sync with their max values.
on('change:attribute', function(obj, prev) {
    if(obj.get('name') == 'hp' || 
        obj.get('name') == 'st') {
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
                sendChat('Valor', '/w "' + whisperTo + '" ' + name + message);
            }
            log(`Alerted ${whisperTo} about critical HP for token ID ${obj.get('_id')}.`);
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
    
    let page = Campaign().get('playerpageid');
    if(obj.get('_pageid') != page) {
        // Do nothing if it was a token on another page
        return;
    }
    
    let oldHp = parseInt(prev.bar1_value);
    criticalHealthWarning(obj, oldHp);
});

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
        
        log(`Swapping ${last.custom} and ${nextToLast.custom}`);
        log(`First slice: 0-${nextToLastIndex}`);
        log(`Second slice: ${lastIndex}-${lastIndex + lastEffects}`);
        log(`Third slice: ${nextToLastIndex}-${nextToLastIndex + nextToLastEffects}`);
        
        turnOrder = turnOrder.slice(0, nextToLastIndex)
            .concat(turnOrder.slice(lastIndex, lastIndex + lastEffects + 1))
            .concat(turnOrder.slice(nextToLastIndex, nextToLastIndex + nextToLastEffects + 1))
            .concat(turnOrder.slice(lastIndex + lastEffects + 1));
        nextToLast = getNextUp(turnOrder, last);
    }
    //if((!state.autoInitiativeUpdate && !state.autoInitiativeReport) ||
    
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