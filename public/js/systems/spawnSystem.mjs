// TODO: Move this to Game?
const indexComponents = (entities, compNames = []) =>
	compNames.forEach(compName =>
		entities.setIndex(compName, entity => entity.getComponent(compName))
	)

export default async (systemName, { system, entityFactory }) => system
	.addEventListener('mounted', ({ entities }) => {
		indexComponents(entities, ['spawner', 'spawned'])
	})
	.addEventListener('update', ({ entities, currentTarget }) => {

		// Get all "spawner" components
		const spawnerComponents = entities.getIndexed('spawner')

		// Get all "spawned" components
		const spawnedComponents = entities.getIndexed('spawned')

		// Filter down to only the spawners that are ready to spawn (have no entities left)
		const readySpawnerComponents = spawnerComponents.reject(spawnerComponent =>
			spawnedComponents.some(spawnedComponent =>
				spawnedComponent.spawnerSource === spawnerComponent.name
			)
		)

		// Create a new spawned entity for each "ready" spawner
		readySpawnerComponents.forEach(spawnerComp =>
			currentTarget.addEntity(entityFactory.create(spawnerComp.entityType, {
				x: spawnerComp.x,
				y: spawnerComp.y,
				width: 0,
				height: 0,
				spawnerSource: spawnerComp.name
			}))
		)
	})
