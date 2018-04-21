import Game from '../js-game-engine/esm/index.mjs'

class BeingComponent extends Game.Component {
	constructor(type = 'Monster') {
		super()
		this.type = type
	}
}

export default (componentType, { data: { type } } = {}) =>
	new BeingComponent(type)
