import createPhysicsSystem from './systems/physicsSystem.mjs'
import createRenderSystem from './systems/renderSystem.mjs'
import createSoundSystem from './systems/soundSystem.mjs'
import createSpawnSystem from './systems/spawnSystem.mjs'
import createUpdateSystem from './systems/updateSystem.mjs'
import createAiSystem from './systems/aiSystem.mjs'

export default (systemFactory) => systemFactory
	.set('spawn', createSpawnSystem)
	.set('ai', createAiSystem)
	.set('update', createUpdateSystem)
	.set('physics', createPhysicsSystem)
	.set('render', createRenderSystem)
	.set('sound', createSoundSystem)
