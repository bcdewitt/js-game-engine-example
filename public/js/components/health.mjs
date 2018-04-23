import Game from '../js-game-engine/esm/index.mjs'

class HealthComponent extends Game.Component {
	constructor({ maxHP }) {
		super()
		Object.assign(this, {
			maxHP,
			hp: maxHP,
			damagedTimestamp: performance.now(),
		})
	}
}

export default (componentType, { data } = {}) =>
	new HealthComponent(data)
