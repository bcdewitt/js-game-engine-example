import Game from './js-game-engine/esm/index.mjs'
import buildSystemFactory from './systemFactory.mjs'
import buildEntityFactory from './entityFactory.mjs'
import createLevel1 from './scenes/level1Scene.mjs'

const assetFetcher = Game.createAssetFetcher()

export default () => Game.createSceneFactory()
	.use(async (sceneName, sceneData) => {
		const tiledData = await assetFetcher.fetch(`json/${sceneName}.json`)

		// Create TiledMap instance
		const tiledMap = Game.createTiledMap()
			.setBasePath((new URL('/', window.location.href)).href)
			.decorate(tiledData)

		buildEntityFactory(sceneData.entityFactory)

		sceneData.systemFactory.use(async (systemName, systemData) => {
			systemData.inputManager = Game.createInputManager()
			systemData.tiledMap = tiledMap
			systemData.entityFactory = sceneData.entityFactory
			return systemData
		})

		buildSystemFactory(sceneData.systemFactory)

		sceneData.tiledMap = tiledMap

		return sceneData
	})
	.set('level-1', createLevel1)
