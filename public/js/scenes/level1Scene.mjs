export default async (sceneName, { scene, systemFactory, entityFactory, tiledMap }) => scene
	.setSystem('spawn', await systemFactory.create('spawn'))
	.setSystem('ai', await systemFactory.create('ai'))
	.setSystem('update', await systemFactory.create('update'))
	.setSystem('physics', await systemFactory.create('physics'))
	.setSystem('render', await systemFactory.create('render'))
	.setSystem('sound', await systemFactory.create('sound'))

	.addEventListener('load', async ({ assetFetcher }) => {

		// Load the necessary resources for the TiledMap instance
		assetFetcher.queueAssets(tiledMap.getResourcePaths())

	})
	.addEventListener('loaded', async ({ currentTarget, assets }) => {

		// Add the resources to the TiledMap instance
		tiledMap.setResources(assets)

		// Filter out the objects that we don't have a constructor for
		const tiledObjects = tiledMap.getObjects().filter(
			object => entityFactory.has(object.type)
		)

		// Add entities from tiledMap instance
		currentTarget.addEntities(tiledObjects.map(
			object => entityFactory.create(object.type, object)
		))
	})
