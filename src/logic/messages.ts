import { ObjectID } from 'mongodb'
import { unescape } from 'validator'
import { MESSAGE_LIMIT } from '../config'
import * as db from '../lib/db'
import { Message } from '../types'

export async function saveMessage(
  message: string,
  roomId: string,
  userId: string
) {
  const insert: db.Message = {
    message: message,
    roomId: new ObjectID(roomId),
    userId: new ObjectID(userId),
    createdAt: new Date()
  }
  return await db.collections.messages.insertOne(insert)
}

export async function getMessages(
  roomId: string,
  thresholdId?: string
): Promise<{ existHistory: boolean; messages: Message[] }> {
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
    .limit(MESSAGE_LIMIT)

  const messages: Message[] = []
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    messages.unshift({
      id: doc._id.toHexString(),
      message: unescape(doc.message),
      userId: doc.userId.toHexString(),
      createdAt: doc.createdAt,
      userAccount: doc.user[0] ? doc.user[0].account : null
    })
  }
  return { existHistory: messages.length >= MESSAGE_LIMIT, messages }
}
