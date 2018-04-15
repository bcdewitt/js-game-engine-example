export default (entityType, { entity, componentFactory, data }) => {
	data.type = 'Monster'
	return entity.setComponent('spawner', componentFactory.create('spawner', data))
}
