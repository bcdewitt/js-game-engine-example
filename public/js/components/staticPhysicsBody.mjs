export default (componentType, { component, data: {
	x, y, width, height
} } = {}) =>
	component.decorate({
		x, y, width, height,
		halfWidth: width / 2,
		halfHeight: height / 2,
		midPointX: x + (width / 2),
		midPointY: y + (height / 2)
	})
