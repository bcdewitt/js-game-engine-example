import Game from '../js-game-engine/esm/index.mjs'

const _state = Symbol('_state')
class StateComponent extends Game.Component {
	constructor(initialState) {
		super()
		Object.assign(this, {
			lastState: null,
			lastUpdate: null,
			grounded: false,
			groundHit: false,
		})
		this[_state] = initialState
	}

	get state() {
		return this[_state]
	}
	set state(val) {
		this.lastState = this[_state]
		this[_state] = val
		this.lastUpdate = window.performance.now()
	}
}

export default (componentType, { data: { initialState } } = {}) =>
	new StateComponent(initialState)
