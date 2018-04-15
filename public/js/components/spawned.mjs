export default (componentType, { component, data: { spawnerSource } } = {}) =>
	component.decorate({ spawnerSource })
