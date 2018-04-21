import Game from '../js-game-engine/esm/index.mjs'

class StaticPhysicsBody extends Game.Component {
	constructor(data) {
		super()
		Object.assign(this, {
			x: 0,
			y: 0,
			width: 0,
			height: 0
		}, data)

		Object.assign(this, {
			halfWidth: this.width / 2,
			halfHeight: this.height / 2,
			midPointX: this.x + (this.width / 2),
			midPointY: this.y + (this.height / 2)
		})
	}
}

export default (componentType, { data } = {}) =>
	new StaticPhysicsBody(data)
