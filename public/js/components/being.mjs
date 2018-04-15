export default (componentType, { component, data: { type } } = {}) =>
	component.decorate({ type })
