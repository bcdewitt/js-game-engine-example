const _state = Symbol('_state')

export default (componentType, { component, data: { initialState } } = {}) =>
	component.decorate({
		[_state]: initialState,
		lastState: null,
		lastUpdate: null,
		grounded: false,
		groundHit: false,
		get state() {
			return this[_state]
		},
		set state(val) {
			this.lastState = this[_state]
			this[_state] = val
			this.lastUpdate = window.performance.now()
		}
	})
