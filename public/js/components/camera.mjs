export default (componentType, { component, data } = {}) =>
	component.decorate({
		x: data.x,
		y: data.y,
		width: data.width,
		height: data.height,
		mapX: data.mapX,
		mapY: data.mapY,
		mapWidth: data.mapWidth,
		mapHeight: data.mapHeight,
		get mapHalfWidth() { return this.mapWidth / 2 },
		get mapHalfHeight() { return this.mapHeight / 2 },
		get mapCenterX() { return this.mapX + this.mapHalfWidth },
		get mapCenterY() { return this.mapY + this.mapHalfHeight },
		following: data.following
	})
