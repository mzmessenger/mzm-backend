import cluster from 'cluster'
import http from 'http'
import express from 'express'
import bodyParser from 'body-parser'
import { WORKER_NUM, API_LISTEN, GENERAL_ROOM_NAME } from './config'
import * as HttpErrors from './lib/errors'
import logger from './lib/logger'
import redis from './lib/redis'
import * as db from './lib/db'
import wrap from './lib/wrap'
import * as rooms from './handlers/rooms'
import * as user from './handlers/users'
import * as internal from './handlers/internal'

const app = express()

const jsonParser = bodyParser.json()

function checkLogin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (!req.headers['x-user-id']) {
    return res.status(401).send('not login')
  }
  next()
}

app.post('/api/rooms', checkLogin, jsonParser, wrap(rooms.createRoom))
app.post('/api/rooms/enter', checkLogin, jsonParser, wrap(rooms.enterRoom))
app.delete('/api/rooms/enter', checkLogin, jsonParser, wrap(rooms.exitRoom))
app.get('/api/user/@me', checkLogin, jsonParser, wrap(user.getUserInfo))
app.post(
  '/api/user/@me/account',
  checkLogin,
  jsonParser,
  wrap(user.updateAccount)
)

app.post('/api/internal/socket', jsonParser, wrap(internal.socket))

const allHttpErrors = Object.keys(HttpErrors).map(err => HttpErrors[err])
// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
app.use((err, req, res, next) => {
  if (allHttpErrors.some(type => err instanceof type)) {
    return res.status(err.status).send(err.toResponse())
  }
  res.status(500).send('Internal Server Error')
  logger.error('[Internal Server Error]', err)
})

const server = http.createServer(app)

async function main() {
  redis.once('connect', async function connect() {
    logger.info('[redis] connected')
    try {
      await db.connect()

      await db.collections.rooms.updateOne(
        {
          name: GENERAL_ROOM_NAME
        },
        { $set: { name: GENERAL_ROOM_NAME, createdBy: 'system' } },
        { upsert: true }
      )

      server.listen(API_LISTEN, () => {
        logger.info('Listening on', server.address())
      })
    } catch (e) {
      redis.emit('error', e)
    }
  })

  redis.on('error', function error(e) {
    logger.error(e)
    process.exit(1)
  })
}

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
  main().catch(e => {
    logger.error(e)
    process.exit(1)
  })
}
