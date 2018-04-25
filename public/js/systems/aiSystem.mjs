// For animation and input handling

export default async (systemName, { system }) => system
	.addEventListener('mounted', ({ indexComponents }) => {
		indexComponents(['ai', 'sprite', 'physicsBody', 'state'])
	})

	.addEventListener('update', ({ entities }) => {
		entities.getIndexed('ai').forEach((aiComponent) => {
			if (aiComponent.type === 'Basic' && aiComponent.state === 'Roaming') {
				const entity = aiComponent.getParentEntity()
				const sprite = entity.getComponent('sprite')
				const spritePhysics = entity.getComponent('physicsBody')
				const state = entity.getComponent('state')

				// Turn around at an edge
				if (state.wallCollided || state.atEdge) {
					sprite.flipped = !sprite.flipped

					// Move far enough away from edge to no longer be "atEdge"
					sprite.x += (sprite.flipped ? 2 : -2)
				}

				// Move forward (opposite direction when the sprite is flipped)
				spritePhysics.spdX = (sprite.flipped ? .75 : -.75)
			}
		})
	})
