import createCamera from './components/camera.mjs'
import createStaticPhysicsBody from './components/staticPhysicsBody.mjs'
import createSpawner from './components/spawner.mjs'
import createSpawned from './components/spawned.mjs'
import createSprite from './components/sprite.mjs'
import createSpritePhysics from './components/spritePhysics.mjs'
import createSpriteSound from './components/spriteSound.mjs'
import createBeing from './components/being.mjs'
import createState from './components/state.mjs'
import createHealth from './components/health.mjs'

export default (componentFactory) => componentFactory
	.set('camera', createCamera)
	.set('staticPhysicsBody', createStaticPhysicsBody)
	.set('spawner', createSpawner)
	.set('spawned', createSpawned)
	.set('sprite', createSprite)
	.set('spritePhysics', createSpritePhysics)
	.set('spriteSound', createSpriteSound)
	.set('being', createBeing)
	.set('state', createState)
	.set('health', createHealth)
