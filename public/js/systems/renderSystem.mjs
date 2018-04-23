export default async (systemName, { system, tiledMap, entityFactory }) => {
	const canvas = document.getElementById('game')
	const context = canvas && canvas.getContext('2d')

	const frames = [
		{
			img: 'img/monster.png',
			x: 0,
			y: 0,
			width: 14,
			height: 26
		}, {
			img: 'img/tankSheet.png',
			x: 0,
			y: 0,
			width: 26,
			height: 18
		}, {
			img: 'img/tankSheet.png',
			x: 26,
			y: 0,
			width: 26,
			height: 18
		}, {
			img: 'img/tankSheet.png',
			x: 52,
			y: 0,
			width: 26,
			height: 18
		}, {
			img: 'img/tankSheet.png',
			x: 78,
			y: 0,
			width: 26,
			height: 18
		}
	]
	let images = {}
	let flippedImages = {}

	context.mozImageSmoothingEnabled = false
	context.msImageSmoothingEnabled = false
	context.imageSmoothingEnabled = false

	return system

		// Queue assets
		.addEventListener('load', async ({ assetFetcher }) => {
			assetFetcher.queueAssets([ 'img/monster.png', 'img/tankSheet.png', 'img/healthMeter.png' ])
		})

		// Gather downloaded assets
		.addEventListener('loaded', async ({ assets, currentTarget }) => {
			images = {
				'img/monster.png': assets.get('img/monster.png'),
				'img/tankSheet.png': assets.get('img/tankSheet.png'),
				'img/healthMeter.png': assets.get('img/healthMeter.png'),
			}

			// Images must be flipped and stored in flippedImages under same key
			for (let key in images) {
				let canvas = document.createElement('canvas')
				let ctx = canvas.getContext('2d')
				let image = images[key]

				canvas.width = image.width
				canvas.height = image.height

				ctx.scale(-1, 1) // flip
				ctx.drawImage(image, (-1 * canvas.width), 0) // draw flipped

				flippedImages[key] = canvas
			}

			currentTarget.addEntity(entityFactory.create('Camera', {
				x: 0,
				y: 0,
				width: canvas.width,
				height: canvas.height,
				mapX: 300,
				mapY: 820,
				mapWidth: parseInt(canvas.width / 8),
				mapHeight: parseInt(canvas.height / 8),
				followPlayer: true
			}))

			/*
			// Uncomment this to add a smaller camera at the top
			currentTarget.addEntity(entityFactory.create('Camera', {
				x: canvas.width - canvas.width / 4, // Matching width
				y: 0,
				width: canvas.width / 4,
				height: canvas.height / 4,
				mapX: 100,
				mapY: 920,
				mapWidth: canvas.width / 2,
				mapHeight: canvas.height / 2,
				followPlayer: false
			}))
			*/
		})

		// Set up indexes
		.addEventListener('mounted', ({ indexComponents, entities }) => {
			indexComponents([ 'camera', 'sprite' ])
			entities.setIndex('player', (entity) => {
				const comp = entity.getComponent('being')
				return comp.type !== 'Player' ? undefined : entity
			})
		})

		// Handle each update
		.addEventListener('update', ({ entities, timestamp }) => {
			context.clearRect(0, 0, canvas.width, canvas.height)

			const [ defaultPlayerEntity ] = entities.getIndexed('player').values()

			// Get each camera
			entities.getIndexed('camera').forEach((c) => {

				// Set up drawing layers
				const layers = {
					Background: { sprites: [] },
					Platforms:  { sprites: [] },
					Player:     { sprites: [] }
				}

				// Force camera to match followed entity
				if (c.followPlayer && !c.following) {
					c.following = defaultPlayerEntity
				}

				if (c.following) {
					const sprite = c.following.getComponent('sprite')
					const frame = frames[sprite.frame]
					c.mapX = sprite.x + (frame.width / 2) - (c.mapWidth / 2)

					const threshold = (c.mapHeight / 4)
					if (sprite.y < c.mapY + threshold) {
						c.mapY = sprite.y - threshold
					} else if ((sprite.y + sprite.height) > c.mapY + c.mapHeight - threshold) {
						c.mapY = sprite.y + sprite.height - (c.mapHeight - threshold)
					}
				}

				// Get entities with a sprite component and add to the appropriate layer for rendering
				entities.getIndexed('sprite').forEach((sprite) => {
					const frame = frames[sprite.frame]
					const img = !sprite.flipped ? images[frame.img] : flippedImages[frame.img]

					sprite.width = frame.width
					sprite.height = frame.height

					const obj = {
						img: img,
						x: sprite.x - c.mapX,
						y: sprite.y - c.mapY,
						width: frame.width,
						height: frame.height,
						sx: frame.x,
						sy: frame.y
					}

					if (
						obj.x + obj.width > 0 && obj.x < c.mapWidth &&
						obj.y + obj.height > 0 && obj.y < c.mapHeight
					) {
						layers[sprite.layer].sprites.push(obj)
					}
				})

				// Draw each map layer (include all sprites for that layer)
				for (const layerKey in layers) {
					const layer = layers[layerKey]

					const mapX = Math.round(c.mapX)
					const mapY = Math.round(c.mapY)
					const mapWidth = parseInt(c.mapWidth)
					const mapHeight = parseInt(c.mapHeight)
					const x = parseInt(c.x)
					const y = parseInt(c.y)
					const width = parseInt(c.width)
					const height = parseInt(c.height)

					tiledMap.render(context, layerKey, timestamp, mapX, mapY, mapWidth, mapHeight, x, y, width, height)

					// Draw each sprite to a temporary canvas
					if (layer.sprites.length > 0) {
						const tempCanvas = document.createElement('canvas')
						tempCanvas.width = mapWidth
						tempCanvas.height = mapHeight
						const tempCtx = tempCanvas.getContext('2d')
						for(let sprite of layer.sprites) {
							tempCtx.drawImage(sprite.img, parseInt(sprite.sx), parseInt(sprite.sy), parseInt(sprite.width), parseInt(sprite.height), Math.round(sprite.x), Math.round(sprite.y), parseInt(sprite.width), parseInt(sprite.height))
						}

						// Health bar
						const health = defaultPlayerEntity.getComponent('health')
						const hp = Math.max(health.hp, 0)
						const barHeight = 32
						const barTop = mapHeight - 48 - 20
						const barBottom = barTop + barHeight + 1
						const barY = barBottom - (hp / health.maxHP * barHeight)
						tempCtx.fillStyle = 'white'
						tempCtx.fillRect(10, barY, 8, barBottom - barY)
						tempCtx.drawImage(images['img/healthMeter.png'], 10, barTop)

						// Draw the temporary canvas to the main canvas (position and fit to camera bounds)
						context.drawImage(tempCanvas, 0, 0, mapWidth, mapHeight, x, y, width, height)
					}
				}
			})
		})
}
