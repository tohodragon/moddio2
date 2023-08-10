var EntitiesToRender = /** @class */ (function () {
    function EntitiesToRender() {
        this.trackEntityById = {};
        taro.client.on('tick', this.frameTick, this);
    }
    EntitiesToRender.prototype.updateAllEntities = function ( /*timeStamp*/) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        for (var entityId in this.trackEntityById) {
            // var timeStart = performance.now();
            // var entity = taro.$(entityId);	
            var entity = this.trackEntityById[entityId];
            // taro.profiler.logTimeElapsed('findEntity', timeStart);
            if (entity) {
                // handle entity behaviour and transformation offsets
                // var timeStart = performance.now();
                if (taro.gameLoopTickHasExecuted) {
                    if (entity._deathTime !== undefined && entity._deathTime <= taro._tickStart) {
                        // Check if the deathCallBack was set
                        if (entity._deathCallBack) {
                            entity._deathCallBack.apply(entity);
                            delete entity._deathCallBack;
                        }
                        entity.destroy();
                    }
                    if (entity._behaviour && !entity.isHidden()) {
                        entity._behaviour();
                    }
                    // handle streamUpdateData
                    if (taro.client.myPlayer) {
                        var updateQueue = taro.client.entityUpdateQueue[entityId];
                        var processedUpdates = [];
                        while (updateQueue && updateQueue.length > 0) {
                            var nextUpdate = updateQueue[0];
                            if (
                            // Don't run if we're updating item's state/owner unit, but its owner doesn't exist yet
                            entity._category == 'item' &&
                                ( // updating item's owner unit, but the owner hasn't been created yet
                                (nextUpdate.ownerUnitId && taro.$(nextUpdate.ownerUnitId) == undefined) ||
                                    ( // changing item's state to selected/unselected, but owner doesn't exist yet
                                    (nextUpdate.stateId == 'selected' || nextUpdate.stateId == 'unselected') &&
                                        entity.getOwnerUnit() == undefined))) {
                                break;
                            }
                            else {
                                processedUpdates.push(taro.client.entityUpdateQueue[entityId].shift());
                            }
                        }
                        if (processedUpdates.length > 0) {
                            entity.streamUpdateData(processedUpdates);
                            // processedUpdates.forEach((value) => {
                            // 	console.log(value);
                            // });
                        }
                    }
                }
                // taro.profiler.logTimeElapsed('entity._behaviour()', timeStart);
                // update transformation using incoming network stream
                if (((_b = (_a = entity.phaserEntity) === null || _a === void 0 ? void 0 : _a.gameObject) === null || _b === void 0 ? void 0 : _b.visible) && (entity.isTransforming() || ((_c = entity.tween) === null || _c === void 0 ? void 0 : _c.isTweening))) {
                    // var timeStart = performance.now();
                    entity._processTransform();
                    // taro.profiler.logTimeElapsed('first _processTransform', timeStart);
                    if (entity._translate && !entity.isHidden()) {
                        var x = entity._translate.x;
                        var y = entity._translate.y;
                        var rotate = entity._rotate.z;
                        if (entity._category == 'item') {
                            var ownerUnit = entity.getOwnerUnit();
                            if (ownerUnit) {
                                // var timeStart = performance.now();
                                // if ownerUnit's transformation hasn't been processed yet, then it'll cause item to drag behind. so we're running it now
                                ownerUnit._processTransform();
                                // rotate weldjoint items to the owner unit's rotation
                                if (entity._stats.currentBody && entity._stats.currentBody.jointType == 'weldJoint') {
                                    rotate = ownerUnit._rotate.z;
                                    // immediately rotate my unit's items to the angleToTarget
                                }
                                else if (ownerUnit == taro.client.selectedUnit && ((_e = (_d = entity._stats.controls) === null || _d === void 0 ? void 0 : _d.mouseBehaviour) === null || _e === void 0 ? void 0 : _e.rotateToFaceMouseCursor)) {
                                    rotate = ownerUnit.angleToTarget; // angleToTarget is updated at 60fps								
                                }
                                entity._rotate.z = rotate; // update the item's rotation immediately for more accurate aiming (instead of 20fps)
                                entity.anchoredOffset = entity.getAnchoredOffset(rotate);
                                if (entity.anchoredOffset) {
                                    x = ownerUnit._translate.x + entity.anchoredOffset.x;
                                    y = ownerUnit._translate.y + entity.anchoredOffset.y;
                                    rotate = entity.anchoredOffset.rotate;
                                }
                                // taro.profiler.logTimeElapsed('second _processTransform', timeStart);
                            }
                        }
                    }
                    if ((_f = entity.tween) === null || _f === void 0 ? void 0 : _f.isTweening) {
                        entity.tween.update();
                        x += entity.tween.offset.x;
                        y += entity.tween.offset.y;
                        rotate += entity.tween.offset.rotate;
                    }
                    // var timeStart = performance.now();
                    entity.transformTexture(x, y, rotate);
                    // taro.profiler.logTimeElapsed('transformTexture', timeStart);
                }
                else if (!((_h = (_g = entity.phaserEntity) === null || _g === void 0 ? void 0 : _g.gameObject) === null || _h === void 0 ? void 0 : _h.visible) && (entity.isTransforming() || ((_j = entity.tween) === null || _j === void 0 ? void 0 : _j.isTweening))) {
                    entity.emit('transform', {
                        x: entity.nextKeyFrame[1][0],
                        y: entity.nextKeyFrame[1][1],
                        rotation: entity.nextKeyFrame[1][2],
                    });
                    if (entity._category === 'item') {
                        var ownerUnit = entity.getOwnerUnit();
                        if (ownerUnit) {
                            entity.emit('transform', {
                                x: ownerUnit.nextKeyFrame[1][0],
                                y: ownerUnit.nextKeyFrame[1][1],
                                rotation: ownerUnit.nextKeyFrame[1][2],
                            });
                        }
                    }
                }
                (_l = (_k = entity.phaserEntity) === null || _k === void 0 ? void 0 : _k.gameObject) === null || _l === void 0 ? void 0 : _l.setVisible(false);
            }
        }
        // taro.triggersQueued = [];
        if (taro.gameLoopTickHasExecuted) {
            taro.gameLoopTickHasExecuted = false;
        }
    };
    EntitiesToRender.prototype.frameTick = function () {
        taro.engineStep(Date.now(), 1000 / 60);
        taro.input.processInputOnEveryFps();
        taro._renderFrames++;
        this.updateAllEntities();
    };
    return EntitiesToRender;
}());
//# sourceMappingURL=EntitiesToRender.js.map