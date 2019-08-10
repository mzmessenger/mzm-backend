import { ObjectID } from 'mongodb'
import * as db from '../db'
import redis from '../redis'
import logger from '../logger'
import { createParser, consumeGroup } from './common'

const REMOVE_STREAM = 'stream:remove:user:chat'
const REMOVE_GROUP = 'group:remove:user'

export async function initRemoveConsumerGroup() {
  // create consumer group
  try {
    await redis.xgroup('setid', REMOVE_STREAM, REMOVE_GROUP, '0')
  } catch (e) {
    try {
      await redis.xgroup('create', REMOVE_STREAM, REMOVE_GROUP, '0')
    } catch (e) {
      logger.error('failed creating xgroup:', e)
    }
  }
}

async function remove(ackid: string, messages: string[]) {
  const user = messages[1]
  const userId = new ObjectID(user)
  const target = await db.collections.users.findOne({ _id: userId })
  if (!target) {
    return
  }
  const remove = { ...target, originId: target._id }
  delete remove['_id']
  await db.collections.removed.findOneAndUpdate(
    { originId: userId },
    { $set: remove },
    { upsert: true }
  )
  await db.collections.users.deleteOne({ _id: target._id })
  await redis.xack(REMOVE_STREAM, REMOVE_GROUP, ackid)
  logger.info('[remove:user]', user)
}

export async function consume() {
  const parser = createParser(remove)
  await consumeGroup(REMOVE_GROUP, 'consume-backend', REMOVE_STREAM, parser)
}
