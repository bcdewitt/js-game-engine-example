/* eslint-env node */
/* eslint no-console: "off" */
import express from 'express'
import packageData from './package.json'

const app = express()

app.use('/js/js-game-engine', express.static('/js-game-engine'))
app.use(express.static('public'))

app.listen(packageData.port, function () {
	console.log(`\n\nHTML/resource server listening on port ${packageData.port}\n\n`)
})
