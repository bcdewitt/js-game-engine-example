import Game from './js-game-engine/esm/index.mjs'
import createSceneFactory from './sceneFactory.mjs'

const sceneFactory = createSceneFactory()

;(async () => {
	const game = Game.createGame()
		.setScene('level-1', await sceneFactory.create('level-1'))
		.changeScene('level-1')
	
	await game.load(Game.createAssetFetcher())
	game.run()
})()

window.game = game
