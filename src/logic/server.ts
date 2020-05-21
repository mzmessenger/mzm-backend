import { Request, Response, NextFunction } from 'express'
import { logger } from '../lib/logger'
import * as HttpErrors from '../lib/errors'
import { initRemoveConsumerGroup, consumeRemove } from '../lib/consumer/remove'
import { initUnreadConsumerGroup, consumeUnread } from '../lib/consumer/unread'
import { initReplyConsumerGroup, consumeReply } from '../lib/consumer/reply'
import { initGeneral } from './rooms'

const allHttpErrors = Object.keys(HttpErrors).map((err) => HttpErrors[err])

export const errorHandler = (err, _req, res: Response, _next) => {
  if (allHttpErrors.some((type) => err instanceof type)) {
    return res.status(err.status).send(err.toResponse())
  }
  res.status(500).send('Internal Server Error')
  logger.error('[Internal Server Error]', err)
}

export const checkLogin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.headers['x-user-id']) {
    return res.status(401).send('not login')
  }
  next()
}

export const init = async () => {
  await initGeneral()
  await initRemoveConsumerGroup()
  await initUnreadConsumerGroup()
  await initReplyConsumerGroup()
  consumeRemove()
  consumeUnread()
  consumeReply()
}
