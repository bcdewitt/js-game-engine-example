import Game from './js-game-engine/esm/index.mjs'
import createSceneFactory from './sceneFactory.mjs'

window.game = Game.createGame()
	.setSceneFactory(createSceneFactory())
	.setAssetFetcher(Game.createAssetFetcher())
	.run('level-1')
