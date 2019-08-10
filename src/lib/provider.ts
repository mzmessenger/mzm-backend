import redis from './redis'
import logger from './logger'
import { SendMessage, UnreadQueue } from '../types'
import { UNREAD_STREAM } from '../config'

async function addQueueToUser(user: string, data: SendMessage) {
  const message = JSON.stringify({ ...data, user })
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

export async function addQueueToUsers(users: string[], data: SendMessage) {
  // todo: too heavy
  const promises = users.map(user => addQueueToUser(user, data))
  await Promise.all(promises)
}

export async function addUnreadQueue(roomId: string) {
  const data = { roomId } as UnreadQueue
  redis.xadd(UNREAD_STREAM, 'MAXLEN', 1000, '*', 'unread', JSON.stringify(data))
}
