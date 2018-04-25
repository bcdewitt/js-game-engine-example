export default (entityType, { entity, componentFactory, data: { spawnerSource, x, y, width, height } } = {}) => {
	entity
		.setComponent('health', componentFactory.create('health', { maxHP: 80 }))
		.setComponent('spawned', componentFactory.create('spawned', { spawnerSource }))
		.setComponent('state', componentFactory.create('state', { initialState: 'idle' }))
		.setComponent('being', componentFactory.create('being', { type: entityType }))
		.setComponent('sprite', componentFactory.create('sprite', {
			x, y, width, height,
			frame: (entityType === 'Player' ? 3 : 0),
			layer: (entityType === 'Player' ? 'Player' : 'Platforms'),
			flipped: entityType !== 'Player'
		}))
		.setComponent('physicsBody', componentFactory.create('spritePhysics', { entity }))
		.setComponent('sound', componentFactory.create('spriteSound', { src: null, entity }))

	if (entityType !== 'Player') entity.setComponent('ai', componentFactory.create('ai'))

	return entity
}
