import Game from '../js-game-engine/esm/index.mjs'

class CameraComponent extends Game.Component {
	constructor(data) {
		super()
		Object.assign(this, {
			x: 0,
			y: 0,
			width: 0,
			height: 0,
			mapX: 0,
			mapY: 0,
			mapWidth: 0,
			mapHeight: 0,
			following: null
		}, data)
	}
	get mapHalfWidth() { return this.mapWidth / 2 }
	get mapHalfHeight() { return this.mapHeight / 2 }
	get mapCenterX() { return this.mapX + this.mapHalfWidth }
	get mapCenterY() { return this.mapY + this.mapHalfHeight }
}

export default (componentType, { data } = {}) =>
	new CameraComponent(data)
