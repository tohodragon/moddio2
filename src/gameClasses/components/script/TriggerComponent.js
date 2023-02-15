var TriggerComponent = TaroEntity.extend({
	classId: 'TriggerComponent',
	componentId: 'trigger',

	init: function () {
		var self = this;
		if (taro.isServer || (taro.isClient && taro.physics)) {
			self._enableContactListener();
		}

		this._registerTriggeredScripts();

		this.triggerProfiler = {}
	},

	// map trigger events, so we don't have to iterate through all scripts to find corresponding scripts
	_registerTriggeredScripts: function () {
		this.triggeredScripts = {};
		for (scriptId in taro.game.data.scripts) {
			var script = taro.game.data.scripts[scriptId];

			// look for matching trigger within the script's triggers

			if (script && script.triggers) {
				for (j = 0; j < script.triggers.length; j++) {
					var trigger = script.triggers[j];
					if (this.triggeredScripts[trigger.type] == undefined) {
						this.triggeredScripts[trigger.type] = [scriptId]
					} else {
						this.triggeredScripts[trigger.type].push(scriptId)
					}
				}
			}
		}
		// console.log("registered triggered scripts: ", this.triggeredScripts)
	},

	// Listen for when contact's begin
	_beginContactCallback: function (contact) {
		var entityA = contact.m_fixtureA.m_body._entity;
		var entityB = contact.m_fixtureB.m_body._entity;
		if (!entityA || !entityB)
			return;

		if (entityA._stats && entityB._stats) {
			// a unit's sensor detected another unit

			if (entityB._category == 'sensor') {
				var tempEntity = entityA;
				entityA = entityB;
				entityB = tempEntity;
			}
			if (entityA._category == 'sensor') {
				var ownerUnit = entityA.getOwnerUnit();
				if (ownerUnit) {
					if (entityB._category == 'unit') {
						if (ownerUnit && ownerUnit != entityB) {
							ownerUnit.ai.registerSensorDetection(entityB);
						}
					} else if (entityB._category == 'item') {
						taro.trigger.fire('whenItemEntersSensor', {
							unitId: ownerUnit.id(),
							sensorId: entityA.id(),
							itemId: entityB.id()
						});
					}
				}
				return;
			}

			// ensure entityA is prioritized by this order: region, unit, item, projectile, wall
			// this is to ensure that contact event is fired once when two entities touch each other. instead of this event being called twice.
			if (
				entityB._category == 'region' || (
					entityA._category != 'region' && (
						entityB._category == 'unit' || (
							entityA._category != 'unit' && (
								entityB._category == 'item' || (
									entityA._category != 'item' && (
										entityB._category == 'projectile' ||
										entityB._category == undefined
									)
								)
							)
						)
					)
				)
			) {
				var entityA = contact.m_fixtureB.m_body._entity;
				var entityB = contact.m_fixtureA.m_body._entity;
			}

			switch (entityA._category) {
				case 'region':
					var region = taro.variable.getValue({
						function: 'getVariable',
						variableName: entityA._stats.id
					});

					switch (entityB._category) {
						case 'unit':
							taro.trigger.fire('unitEntersRegion', {
								unitId: entityB.id(),
								region: region
							});
							break;

						case 'item':
							taro.trigger.fire('itemEntersRegion', {
								itemId: entityB.id(),
								region: region
							});
							break;

					}
					break;

				case 'unit':
					var triggeredBy = {
						unitId: entityA.id()
					};
					taro.game.lastTouchingUnitId = entityA.id();
					taro.game.lastTouchedUnitId = entityB.id();

					switch (entityB._category) {
						case 'unit':
							taro.trigger.fire('unitTouchesUnit', triggeredBy); // handle unitA touching unitB
							triggeredBy.unitId = entityB.id();
							taro.game.lastTouchingUnitId = entityB.id();
							taro.game.lastTouchedUnitId = entityA.id();
							taro.trigger.fire('unitTouchesUnit', triggeredBy); // handle unitB touching unitA
							break;

						case 'item':
							triggeredBy.itemId = entityB.id();
							taro.game.lastTouchedItemId = entityB.id();
							// don't trigger if item is owned by the unit
							if (entityB._stats.ownerUnitId == entityA.id())
								return;

							taro.trigger.fire('unitTouchesItem', triggeredBy);

							break;

						case 'projectile':
							// console.log(entityA._category, entityA._stats.name, entityA.id())
							triggeredBy.projectileId = entityB.id();
							triggeredBy.collidingEntity = entityA.id();
							taro.game.lastTouchedProjectileId = entityB.id();
							triggeredBy.projectileId = entityB.id();
							taro.game.lastAttackingUnitId = entityB._stats.sourceUnitId;
							taro.game.lastAttackedUnitId = entityA.id();
							taro.trigger.fire('unitTouchesProjectile', triggeredBy);

							break;

						case undefined:
						case 'wall':
							taro.game.lastTouchingUnitId = entityA.id();
							var triggeredBy = { unitId: entityA.id() };
							taro.trigger.fire('unitTouchesWall', triggeredBy);
							break;
					}
					break;

				case 'item':
					switch (entityB._category) {
						case 'projectile':
							var triggeredBy = {
								projectileId: entityB.id(),
								itemId: entityA.id(),
								collidingEntity: entityA.id()
							};
							taro.trigger.fire('projectileTouchesItem', triggeredBy);
							break;
					}
					break;

				case 'projectile':
					switch (entityB._category) {
						case undefined:
						case 'wall':
							var triggeredBy = {
								projectileId: entityA.id(),
								collidingEntity: entityB.id()
							};
							taro.trigger.fire('projectileTouchesWall', triggeredBy);
							break;
					}
					break;
				case undefined: // something touched wall
				case 'wall':
					switch (entityB._category) {
						case 'projectile':
							var triggeredBy = {
								projectileId: entityB.id(),
								collidingEntity: entityA.id()
							};
							taro.trigger.fire('projectileTouchesWall', triggeredBy);
							break;

						case 'item':
							var triggeredBy = { itemId: entityB.id() };
							taro.trigger.fire('itemTouchesWall', triggeredBy);
							break;
					}
					break;
			}
		}
	},

	_endContactCallback: function (contact) {

	},

	_enableContactListener: function () {
		// Set the contact listener methods to detect when
		// contacts (collisions) begin and end
		taro.physics.contactListener(this._beginContactCallback, this.endContactCallback);
	},

	/*
		fire trigger and run all of the corresponding script(s)
	*/
	fire: function (triggerName, triggeredBy) {
		// if (triggerName === 'projectileTouchesWall') console.log("trigger fire", triggerName, triggeredBy)

		if (taro.isServer || (taro.isClient && taro.physics)) {
			
			if (taro.isServer) {
				var now = Date.now();		
				var lastTriggerRunTime = now - this.lastTriggerRanAt;
				
				if (this.lastTrigger) {
					if (this.triggerProfiler[this.lastTrigger]) {
						var count = this.triggerProfiler[this.lastTrigger].count;					
						this.triggerProfiler[this.lastTrigger].count++;					
						this.triggerProfiler[this.lastTrigger].avgTime = ((this.triggerProfiler[this.lastTrigger].avgTime * count) + lastTriggerRunTime ) / (count + 1)
						this.triggerProfiler[this.lastTrigger].totalTime += lastTriggerRunTime					 
					} else {
						this.triggerProfiler[this.lastTrigger] = {count: 1, avgTime: lastTriggerRunTime, totalTime: lastTriggerRunTime}
					}
				}
	
				this.lastTrigger = triggerName;
				this.lastTriggerRanAt = now;
			}

			let scriptIds = this.triggeredScripts[triggerName]
			for (i in scriptIds) {
				let scriptId = scriptIds[i]
				taro.script.scriptLog(`\ntrigger: ${triggerName}`);

				var localVariables = {
					triggeredBy: triggeredBy
				};
				taro.script.runScript(scriptId, localVariables);
			}
		}

		if (triggeredBy && triggeredBy.projectileId) {
			var projectile = taro.$(triggeredBy.projectileId);
			if (projectile) {
				switch (triggerName) {
					case 'unitTouchesProjectile':
						var attackedUnit = taro.$(taro.game.lastTouchingUnitId);
						if (attackedUnit) {
							var damageHasBeenInflicted = attackedUnit.inflictDamage(projectile._stats.damageData);

							if (projectile._stats.destroyOnContactWith && projectile._stats.destroyOnContactWith.units && damageHasBeenInflicted) {
								projectile.destroy();
							}
						}
						break;
					case 'projectileTouchesItem':
						if (projectile._stats.destroyOnContactWith && projectile._stats.destroyOnContactWith.items) {
							projectile.destroy();
						}
						break;
					case 'projectileTouchesWall':
						if (projectile._stats.destroyOnContactWith && projectile._stats.destroyOnContactWith.walls) {
							projectile.destroy();
						}
						break;
				}
			}
		}
	}
});

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') { module.exports = TriggerComponent; }
