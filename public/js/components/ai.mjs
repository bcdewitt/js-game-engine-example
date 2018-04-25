import Game from '../js-game-engine/esm/index.mjs'

class AiComponent extends Game.Component {
	constructor(type = 'Basic') {
		super()
		this.type = type
		this.state = 'Roaming'
	}
}

export default (componentType, { data: { type } } = {}) =>
	new AiComponent(type)
