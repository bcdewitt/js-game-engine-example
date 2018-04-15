export default (entityType, { entity, componentFactory, data }) => {
	data.type = 'Player'
	return entity.setComponent('spawner', componentFactory.create('spawner', data))
}
