export default (entityType, { componentFactory, entity, data } = {}) =>
	entity.setComponent('camera', componentFactory.create('camera', data))
