const _state = Symbol('_state')
class StateComponent {
	constructor(initialState) {
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

export default (componentType, { component, data: { initialState } } = {}) =>
	component.decorate(new StateComponent(initialState))
