import { ObjectID } from 'mongodb'
import unescape from 'validator/lib/unescape'
import * as config from '../config'
import * as db from '../lib/db'
import { createUserIconPath } from '../lib/utils'
import { Message } from '../types'

export const saveMessage = async (
  message: string,
  roomId: string,
  userId: string
) => {
  if (
    message.length > config.message.MAX_MESSAGE_LENGTH ||
    message.length < config.message.MIN_MESSAGE_LENGTH
  ) {
    return false
  }

  const insert: Omit<db.Message, '_id'> = {
    message: message,
    roomId: new ObjectID(roomId),
    userId: new ObjectID(userId),
    iine: 0,
    updated: false,
    createdAt: new Date(),
    updatedAt: null
  }
  return await db.collections.messages.insertOne(insert)
}

export const getMessages = async (
  roomId: string,
  thresholdId?: string
): Promise<{ existHistory: boolean; messages: Message[] }> => {
  const query: Object[] = [
    {
      $match: { roomId: new ObjectID(roomId) }
    },
    {
      $lookup: {
        from: db.COLLECTION_NAMES.USERS,
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    }
  ]

  if (thresholdId) {
    query.push({
      $match: { _id: { $lt: new ObjectID(thresholdId) } }
    })
  }

  const cursor = await db.collections.messages
    .aggregate<db.Message & { user: db.User[] }>(query)
    .sort({ _id: -1 })
    .limit(config.room.MESSAGE_LIMIT)

  const messages: Message[] = []
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    const [user] = doc.user

    messages.unshift({
      id: doc._id.toHexString(),
      message: unescape(doc.message),
      iine: doc.iine ? doc.iine : 0,
      userId: doc.userId.toHexString(),
      updated: doc.updated ? doc.updated : false,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt ? doc.updatedAt : null,
      userAccount: user ? user.account : null,
      icon: createUserIconPath(user?.account, user?.icon?.version)
    })
  }
  return {
    existHistory: messages.length >= config.room.MESSAGE_LIMIT,
    messages
  }
}
