export default (entityType, { componentFactory, entity, data } = {}) =>
	entity.setComponent('staticPhysicsBody', componentFactory.create('staticPhysicsBody', data))
