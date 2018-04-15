export default (componentType, { component, data: { type = 'Monster', name, x, y } } = {}) =>
	component.decorate({ entityType: type, name, x, y, })
