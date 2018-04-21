import Game from '../js-game-engine/esm/index.mjs'

class SpawnedComponent extends Game.Component {
	constructor(spawnerSource) {
		super()
		this.spawnerSource = spawnerSource
	}
}

export default (componentType, { data: { spawnerSource } } = {}) =>
	new SpawnedComponent(spawnerSource)
