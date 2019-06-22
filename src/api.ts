import cluster from 'cluster'
import http from 'http'
import express from 'express'
import bodyParser from 'body-parser'
import { WORKER_NUM, API_LISTEN } from './config'
import logger from './lib/logger'
import redis from './lib/redis'
import * as db from './lib/db'
import wrap from './lib/wrap'
import * as rooms from './handlers/rooms'
import * as user from './handlers/users'
import * as internal from './handlers/internal'
import { checkLogin, errorHandler, init } from './logic/server'
import { consume } from './lib/consumer'

const app = express()

const jsonParser = bodyParser.json()

app.post('/api/rooms', checkLogin, jsonParser, wrap(rooms.createRoom))
app.post('/api/rooms/enter', checkLogin, jsonParser, wrap(rooms.enterRoom))
app.delete('/api/rooms/enter', checkLogin, jsonParser, wrap(rooms.exitRoom))
app.get('/api/user/@me', checkLogin, jsonParser, wrap(user.getUserInfo))
app.post('/api/user/signup', checkLogin, jsonParser, wrap(user.signUp))
app.post(
  '/api/user/@me/account',
  checkLogin,
  jsonParser,
  wrap(user.updateAccount)
)

app.post('/api/internal/socket', jsonParser, wrap(internal.socket))

// 必ず最後に use する
app.use(errorHandler)

const server = http.createServer(app)

if (cluster.isMaster) {
  for (let i = 0; i < WORKER_NUM; i++) {
    cluster.fork()
  }

  cluster.on('exit', (worker, code, signal) => {
    const s = signal || code
    logger.info(`exit worker #${worker.process.pid} (${s})`)
    cluster.fork()
  })
} else {
  redis.once('connect', async function connect() {
    logger.info('[redis] connected')
    try {
      await db.connect()

      await init()

      server.listen(API_LISTEN, () => {
        logger.info('Listening on', server.address())
      })
      consume()
    } catch (e) {
      redis.emit('error', e)
    }
  })

  redis.on('error', function error(e) {
    logger.error(e)
    process.exit(1)
  })
}
