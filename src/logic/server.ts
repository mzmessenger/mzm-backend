import { Request, Response, NextFunction } from 'express'
import logger from '../lib/logger'
import * as HttpErrors from '../lib/errors'
import * as db from '../lib/db'
import { initRemoveConsumerGroup } from '../lib/consumer/remove'
import { GENERAL_ROOM_NAME } from '../config'

const allHttpErrors = Object.keys(HttpErrors).map(err => HttpErrors[err])

export function errorHandler(err, _req, res: Response, _next) {
  if (allHttpErrors.some(type => err instanceof type)) {
    return res.status(err.status).send(err.toResponse())
  }
  res.status(500).send('Internal Server Error')
  logger.error('[Internal Server Error]', err)
}

export function checkLogin(req: Request, res: Response, next: NextFunction) {
  if (!req.headers['x-user-id']) {
    return res.status(401).send('not login')
  }
  next()
}

export async function init() {
  await db.collections.rooms.updateOne(
    {
      name: GENERAL_ROOM_NAME
    },
    { $set: { name: GENERAL_ROOM_NAME, createdBy: 'system' } },
    { upsert: true }
  )

  await initRemoveConsumerGroup()
}
