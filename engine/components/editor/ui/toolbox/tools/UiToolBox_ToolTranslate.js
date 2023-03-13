var UiToolBox_ToolTranslate = TaroEventingClass.extend({
	classId: 'UiToolBox_ToolTranslate',

	init: function () {

	},

	enabled: function (val) {
		if (val !== undefined) {
			if (taro.editor._selectedObject) {
				this._enabled = val;

				if (val) {
					taro.editor.interceptMouse(true);
					var self = this;

					this._targetEntity = taro.editor._selectedObject;

					// Hook the engine's input system and take over mouse interaction
					this._mouseUpHandle = taro.editor.on('mouseUp', function (event) {
						self._mouseUp(event);
					});

					this._mouseDownHandle = taro.editor.on('mouseDown', function (event) {
						self._mouseDown(event);
					});

					this._mouseMoveHandle = taro.editor.on('mouseMove', function (event) {
						self._mouseMove(event);
					});

					// Reset pan values.
					this._opPreStart = false;
					this._opStarted = false;
					this._startThreshold = 1; // The number of pixels the mouse should move to activate
				} else {
					taro.editor.interceptMouse(false);
					taro.editor.off('mouseUp', this._mouseUpHandle);
					taro.editor.off('mouseDown', this._mouseDownHandle);
					taro.editor.off('mouseMove', this._mouseMoveHandle);
				}
			}
		}
	},

	/**
	 * Handles the mouseDown event. Records the starting position of the
	 * operation and the current operation translation.
	 * @param event
	 * @private
	 */
	_mouseDown: function (event) {
		if (!this._opStarted) {
			// Record the mouse down position - pre-start
			var mx = (event.taroX - taro._bounds2d.x2);
			var my = (event.taroY - taro._bounds2d.y2);
			var curMousePos = new TaroPoint3d(mx, my, 0);

			this._opStartMouse = curMousePos.clone();

			this._opStartTranslate = {
				x: this._targetEntity._translate.x,
				y: this._targetEntity._translate.y
			};

			this._opPreStart = true;
			this._opStarted = false;
			// document.getElementById('taroSgEditorStatus').innerHTML = 'X: ' + taro._translate.x + ' Y:' + taro._translate.y;
		}
	},

	/**
	 * Handles the mouse move event. Translates the entity as the mouse
	 * moves across the screen.
	 * @param event
	 * @private
	 */
	_mouseMove: function (event) {
		if (this._enabled && this._targetEntity) {
			// Pan the camera if the mouse is down
			if (this._opStartMouse) {
				var mx = (event.taroX - taro._bounds2d.x2);
				var my = (event.taroY - taro._bounds2d.y2);
				var curMousePos = { x: mx, y: my };
				var panCords = {
					x: this._opStartMouse.x - curMousePos.x,
					y: this._opStartMouse.y - curMousePos.y
				}; var distX = Math.abs(panCords.x); var distY = Math.abs(panCords.y);
				var panFinalX = this._opStartTranslate.x - (panCords.x / taro._currentViewport.camera._scale.x);
				var panFinalY = this._opStartTranslate.y - (panCords.y / taro._currentViewport.camera._scale.y);

				if (this._opPreStart) {
					// Check if we've reached the start threshold
					if (distX > this._startThreshold || distY > this._startThreshold) {
						this._targetEntity.translateTo(
							panFinalX,
							panFinalY,
							0
						);

						this.emit('panStart');
						this._opPreStart = false;
						this._opStarted = true;

						this.emit('panMove');
					}
				} else {
					// Pan has already started
					this._targetEntity.translateTo(
						panFinalX,
						panFinalY,
						0
					);

					this.emit('panMove');
				}

				// document.getElementById('taroSgEditorStatus').innerHTML = 'X: ' + panFinalX + ' Y:' + panFinalY;
			}
		}
	},

	/**
	 * Handles the mouse up event. Finishes the entity translate and
	 * removes the starting operation data.
	 * @param event
	 * @private
	 */
	_mouseUp: function (event) {
		if (this._enabled && this._targetEntity) {
			// End the pan
			if (this._opStarted) {
				if (this._opStartMouse) {
					var mx = (event.taroX - taro._bounds2d.x2);
					var my = (event.taroY - taro._bounds2d.y2);
					var curMousePos = { x: mx, y: my };
					var panCords = {
						x: this._opStartMouse.x - curMousePos.x,
						y: this._opStartMouse.y - curMousePos.y
					};
					var panFinalX = this._opStartTranslate.x - (panCords.x / taro._currentViewport.camera._scale.x);
					var panFinalY = this._opStartTranslate.y - (panCords.y / taro._currentViewport.camera._scale.y);

					// Check if we have a limiter on the rectangle area
					// that we should allow panning inside.
					if (this._limit) {
						// Check the pan co-ordinates against
						// the limiter rectangle
						if (panFinalX < this._limit.x) {
							panFinalX = this._limit.x;
						}

						if (panFinalX > this._limit.x + this._limit.width) {
							panFinalX = this._limit.x + this._limit.width;
						}

						if (panFinalY < this._limit.y) {
							panFinalY = this._limit.y;
						}

						if (panFinalY > this._limit.y + this._limit.height) {
							panFinalY = this._limit.y + this._limit.height;
						}
					}

					this._targetEntity.translateTo(
						panFinalX,
						panFinalY,
						0
					);

					// document.getElementById('taroSgEditorStatus').innerHTML = 'X: ' + panFinalX + ' Y:' + panFinalY;

					// Remove the pan start data to end the pan operation
					delete this._opStartMouse;
					delete this._opStartTranslate;

					this.emit('panEnd');
					this._opStarted = false;
				}
			} else {
				delete this._opStartMouse;
				delete this._opStartTranslate;
				this._opStarted = false;
			}
		}
	},

	destroy: function () {
		this.enabled(false);
	}
});