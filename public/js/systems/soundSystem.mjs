// TimeOffset class
const _time = Symbol('_time')
class TimeOffset {
	constructor(timeStr, millisecondsMode = false) {
		this[_time] = timeStr
		this.msMode = millisecondsMode
	}
	valueOf() {
		let val = 0
		let arr = this[_time].split(':')
		arr.reverse()

		if(arr[3]) { throw Error('Bad TimeOffset string') }
		if(arr[2]) { val += (+arr[2] * 3600000) }
		if(arr[1]) { val += (+arr[1] * 60000) }
		if(arr[0]) { val += (+arr[0] * 1000) }

		if(!this.msMode) return val / 1000

		return val
	}
	toBoolean() {
		return !!this.valueOf()
	}
}

export default async (systemName, { system, tiledMap }) => {
	const context = new AudioContext()
	const tracks = {}
	const bgmLoopTarget = new TimeOffset(tiledMap.bgmLoopTarget)
	let bgmPlay = !!tiledMap.bgm

	const playSound = (src, startAt, loopAt, callback) => {
		const sound = tracks[src]
		const source = context.createBufferSource()

		source.buffer = sound
		if (callback) source.onended = callback
		let gainNode = context.createGain()
		gainNode.gain.setValueAtTime(1, 0)
		//gainNode.gain.value = 1

		source.connect(gainNode)
		gainNode.connect(context.destination)

		if (loopAt) {
			source.loopStart = loopAt % sound.duration
			source.loopEnd = sound.duration
			source.loop = !!loopAt
		}

		source.start(context.currentTime + 0.05, startAt || 0) // first param is "time before playing" (in seconds)

		return {
			gainNode: gainNode
		}
	}

	return system

		.addEventListener('load', async ({ assetFetcher }) => {
			assetFetcher.queueAsset(tiledMap.bgm)
			assetFetcher.queueAsset('sfx/sfx1.wav')
		})

		.addEventListener('loaded', async ({ assets }) => {
			const bgm = assets.get(tiledMap.bgm)
			const asset = assets.get('sfx/sfx1.wav')
			tracks['sfx/sfx1.wav'] = await context.decodeAudioData(asset)
			tracks['bgm'] = await context.decodeAudioData(bgm)
		})

		.addEventListener('mounted', ({ indexComponents }) => {
			indexComponents(['camera', 'sound'])
		})

		.addEventListener('update', ({ entities }) => {

			// Start the background music
			if (bgmPlay) {
				bgmPlay = false
				playSound('bgm', 0, bgmLoopTarget)
			}

			entities.getIndexed('sound').forEach((c) => {
				const soundEntity = c.getParentEntity()
				const state = soundEntity.getComponent('state')

				// Sound conditions
				if (soundEntity.hasComponent('being')) {
					const type = soundEntity.getComponent('being').type
					if (type === 'Player' && state.groundHit) {
						c.src = 'sfx/sfx1.wav'
						c.play = true
					}
				}

				// Determine distance from soundEntity to cameraCenter
				let distanceToCamCenter = 0
				let radius = 0
				entities.getIndexed('camera').forEach((cam) => {
					const a = (c.x - cam.mapCenterX)
					const b = (c.y - cam.mapCenterY)
					const currentDist = Math.sqrt((a*a) + (b*b))
					const currentRad = Math.min(cam.mapHalfWidth, cam.mapHalfHeight)

					distanceToCamCenter = !distanceToCamCenter ?
						currentDist :
						Math.min(distanceToCamCenter, currentDist)

					radius = !radius ?
						currentRad :
						Math.min(radius, currentRad)
				})

				// Play
				if (c.play && c.src) {
					c.gainNode = playSound(c.src, 0, 0).gainNode
					c.play = false
				}

				// Adjust the sound gain depending on the volume setting and the sound distance...
				if (c.gainNode) {
					if (distanceToCamCenter <= radius) {
						c.gainNode.gain.setValueAtTime(c.volume, 0)
					} else if (distanceToCamCenter - radius >= radius * 2) {
						c.gainNode.gain.setValueAtTime(0, 0)
					} else {
						const calc = ((distanceToCamCenter - radius) / (radius * 2)) * c.volume
						c.gainNode.gain.setValueAtTime(calc, 0)
					}
				}
			})
		})
}
