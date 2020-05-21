import redis from './redis'
import logger from './logger'
import { SendMessage, UnreadQueue, ReplyQueue } from '../types'
import * as config from '../config'

export const addMessageQueue = async (data: SendMessage) => {
  const message = JSON.stringify(data)
  await redis.xadd(
    'stream:socket:message',
    'MAXLEN',
    100000,
    '*',
    'message',
    message
  )
  logger.info('[queue:add:user]', message)
}

export const addQueueToUsers = async (users: string[], data: SendMessage) => {
  // todo: too heavy
  const promises = users.map((user) => addMessageQueue({ ...data, user }))
  await Promise.all(promises)
}

export const addUnreadQueue = async (roomId: string, messageId: string) => {
  const data: UnreadQueue = { roomId, messageId }
  redis.xadd(
    config.stream.UNREAD_STREAM,
    'MAXLEN',
    1000,
    '*',
    'unread',
    JSON.stringify(data)
  )
}

export const addRepliedQueue = async (roomId: string, userId: string) => {
  const data: ReplyQueue = { roomId, userId }
  redis.xadd(
    config.stream.REPLY_STREAM,
    'MAXLEN',
    1000,
    '*',
    'unread',
    JSON.stringify(data)
  )
}
