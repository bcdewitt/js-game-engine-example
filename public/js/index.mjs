import Game from './js-game-engine/esm/index.mjs'
import createSceneFactory from './sceneFactory.mjs'

const sceneFactory = createSceneFactory()

;(async () => {
	window.game = Game.createGame()
		.setAssetFetcher(Game.createAssetFetcher())
		.setScene('level-1', await sceneFactory.create('level-1'))
		.run('level-1')
})()
