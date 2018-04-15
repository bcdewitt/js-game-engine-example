import buildComponentFactory from './componentFactory.mjs'
import createCamera from './entities/camera.mjs'
import createCollision from './entities/collision.mjs'
import createPlayerSpawner from './entities/playerSpawner.mjs'
import createEntitySpawner from './entities/entitySpawner.mjs'
import createPlayerOrMonster from './entities/playerOrMonster.mjs'

export default (entityFactory) => entityFactory
	.use((entityName, obj) => {
		buildComponentFactory(obj.componentFactory)
		return obj
	})
	.set('Camera', createCamera)
	.set('Collision', createCollision)
	.set('PlayerSpawner', createPlayerSpawner)
	.set('EntitySpawner', createEntitySpawner)
	.set('Player', createPlayerOrMonster)
	.set('Monster', createPlayerOrMonster)
