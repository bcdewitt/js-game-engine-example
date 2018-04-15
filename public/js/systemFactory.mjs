import createPhysicsSystem from './systems/physicsSystem.mjs'
import createRenderSystem from './systems/renderSystem.mjs'
import createSoundSystem from './systems/soundSystem.mjs'
import createSpawnSystem from './systems/spawnSystem.mjs'
import createUpdateSystem from './systems/updateSystem.mjs'

export default (systemFactory) => systemFactory
	.set('physics', createPhysicsSystem)
	.set('render', createRenderSystem)
	.set('sound', createSoundSystem)
	.set('spawn', createSpawnSystem)
	.set('update', createUpdateSystem)
