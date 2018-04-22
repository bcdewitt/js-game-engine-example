const MAX_SPEED_X = 2.2
const MAX_SPEED_Y = 4.1
const GRAVITY = 0.3
const FRICTION = 0.08

// TODO: Move this to Game?
const indexComponents = (entities, compNames = []) =>
	compNames.forEach(compName =>
		entities.setIndex(compName, entity => entity.getComponent(compName))
	)

export default async (systemName, { system }) => system
	.addEventListener('mounted', ({ entities }) => {
		indexComponents(entities, ['staticPhysicsBody', 'physicsBody'])
	})

	.addEventListener('update', ({ entities, deltaTime }) => {
		const staticComponents = entities.getIndexed('staticPhysicsBody')
		const nonstaticComponents = entities.getIndexed('physicsBody')

		// For every nonstatic physics body, check for static physics body collision
		nonstaticComponents.forEach((c) => {
			const state = c.getParentEntity().getComponent('state')
			const wasGrounded = state.grounded
			state.grounded = false // Only set to true after a collision is detected

			c.accY = GRAVITY // Add gravity (limit to 10)

			// Add acceleration to "speed"
			const time = deltaTime / 10
			if (time !== 0) {
				c.spdX = c.spdX + (c.accX / time)
				c.spdY = c.spdY + (c.accY / time)
			}

			// Limit speed
			c.spdX = c.spdX >= 0 ? Math.min(c.spdX, MAX_SPEED_X) : Math.max(c.spdX, MAX_SPEED_X * -1)
			c.spdY = c.spdY >= 0 ? Math.min(c.spdY, MAX_SPEED_Y) : Math.max(c.spdY, MAX_SPEED_Y * -1)

			// Use speed to change position
			c.x += c.spdX
			c.y += c.spdY

			staticComponents.forEach((c2) => {
				const halfWidthSum = c.halfWidth + c2.halfWidth
				const halfHeightSum = c.halfHeight + c2.halfHeight
				const deltaX = c2.midPointX - c.midPointX
				const deltaY = c2.midPointY - c.midPointY
				const absDeltaX = Math.abs(deltaX)
				const absDeltaY = Math.abs(deltaY)

				// Collision Detection
				if (
					(halfWidthSum > absDeltaX) &&
					(halfHeightSum > absDeltaY)
				) {
					let projectionY = halfHeightSum - absDeltaY // Value used to correct positioning
					let projectionX = halfWidthSum - absDeltaX  // Value used to correct positioning

					// Use the lesser of the two projection values
					if (projectionY < projectionX) {
						if (deltaY > 0) projectionY *= -1

						c.y += projectionY // Apply "projection vector" to rect1
						if (c.spdY > 0 && deltaY > 0) c.spdY = 0
						if (c.spdY < 0 && deltaY < 0) c.spdY = 0

						if (projectionY < 0) {
							if (!wasGrounded) { state.groundHit = true } else { state.groundHit = false }
							state.grounded = true
							if (c.spdX > 0) {
								c.spdX = Math.max(c.spdX - (FRICTION / time), 0)
							} else {
								c.spdX = Math.min(c.spdX + (FRICTION / time), 0)
							}
						}
					} else {
						if (deltaX > 0) projectionX *= -1

						c.x += projectionX // Apply "projection vector" to rect1
						if (c.spdX > 0 && deltaX > 0) c.spdX = 0
						if (c.spdX < 0 && deltaX < 0) c.spdX = 0
					}
				}
			})
		})
	})
