import Game from '../js-game-engine/esm/index.mjs'

class SpawnerComponent extends Game.Component {
	constructor({ type: entityType = 'Monster', name = '', x = 0, y = 0 }) {
		super()
		Object.assign(this, { entityType, name, x, y })
	}
}

export default (componentType, { data } = {}) =>
	new SpawnerComponent(data)
