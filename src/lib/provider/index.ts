import { ObjectID } from 'mongodb'
import { client, lock, release } from '../redis'
import { logger } from '../logger'
import { SendMessage, UnreadQueue, ReplyQueue } from '../../types'
import * as config from '../../config'

export const addMessageQueue = async (data: SendMessage) => {
  const message = JSON.stringify(data)
  await client.xadd(
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
  client.xadd(
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
  client.xadd(
    config.stream.REPLY_STREAM,
    'MAXLEN',
    1000,
    '*',
    'reply',
    JSON.stringify(data)
  )
}

export const addInitializeSearchRoomQueue = async () => {
  const lockKey = config.lock.INIT_SEARCH_ROOM_QUEUE
  const lockVal = new ObjectID().toHexString()
  const locked = await lock(lockKey, lockVal, 1000 * 2)

  if (!locked) {
    logger.info('[locked] addInitializeSearchRoomQueue')
    return
  }

  await client.xadd(
    config.stream.ELASTICSEARCH_ROOMS,
    'MAXLEN',
    1000,
    '*',
    'init',
    ''
  )

  await release(lockKey, lockVal)
}

export const addUpdateSearchRoomQueue = async (roomIds: string[]) => {
  await client.xadd(
    config.stream.ELASTICSEARCH_ROOMS,
    'MAXLEN',
    1000,
    '*',
    'rooms',
    JSON.stringify(roomIds)
  )
}
