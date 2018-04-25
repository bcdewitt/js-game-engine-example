// For animation and input handling

export default async (systemName, { system, inputManager }) => system
	.addEventListener('mounted', ({ entities }) => {
		entities.setIndex('player', (entity) => {
			const comp = entity.getComponent('being')
			return comp && comp.type === 'Player' ? entity : undefined
		})

		entities.setIndex('monster', (entity) => {
			const comp = entity.getComponent('being')
			return comp && comp.type === 'Monster' ? entity : undefined
		})
	})

	.addEventListener('update', ({ entities, timestamp }) => {
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

			if (inputManager.jumpButton.pressed && state.grounded) { c.spdY = -100 }

			// Animate tank
			if (state.state === 'driving') {
				// (When flipped, the wheels rotate the opposite direction)
				const rotation = parseInt(c.x / 6) % 4
				const frameNum = sprite.flipped ? 3 - rotation : rotation
				sprite.frame = frameNum + 3
			}
		})

		// Sawtooth algorithm
		const bounce = (n, max) => {
			max -= 1
			const upswing = n % (max * 2) >= max
			const mod = n % max
			return upswing ? max - mod : mod
		}

		// Animate monsters
		entities.getIndexed('monster').forEach((monsterEntity) => {
			const sprite = monsterEntity.getComponent('sprite')
			sprite.frame = bounce(parseInt(timestamp / 200), 3)
		})
	})
