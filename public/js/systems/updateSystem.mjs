export default async (systemName, { system, inputManager }) => system
	.addEventListener('mounted', ({ entities }) => {
		entities.setIndex('player', (entity) => {
			const comp = entity.getComponent('being')
			return comp && comp.type === 'Player' ? entity : undefined
		})
	})

	.addEventListener('update', ({ entities }) => {
		entities.getIndexed('player').forEach((playerEntity) => {
			const c = playerEntity.getComponent('physicsBody')
			const state = playerEntity.getComponent('state')
			const sprite = playerEntity.getComponent('sprite')

			if (inputManager.leftButton.held && !inputManager.rightButton.held) {
				c.accX = -0.2
				state.state = 'driving'
				sprite.flipped = true
			} else if (inputManager.rightButton.held && !inputManager.leftButton.held) {
				c.accX = 0.2
				state.state = 'driving'
				sprite.flipped = false
			} else {
				c.accX = 0
				if (c.spdX === 0) state.state = 'idle'
			}

			if (state.state === 'driving') {
				sprite.frame = (parseInt(c.x / 6) % 4) + 1
			}

			if (inputManager.jumpButton.pressed && state.grounded) { c.spdY = -100 }
		})
	})
