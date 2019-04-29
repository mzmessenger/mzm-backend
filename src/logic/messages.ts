import { ObjectID } from 'mongodb'
import { MESSAGE_LIMIT } from '../config'
import * as db from '../lib/db'
import { Message } from '../lib/types'

export async function saveMessage(
  message: string,
  roomId: string,
  userId: string
) {
  const insert: db.Message = {
    message: message,
    roomId: new ObjectID(roomId),
    userId: new ObjectID(userId),
    createdAt: new Date(Date.now())
  }
  return await db.collections.messages.insertOne(insert)
}

export async function getMessages(roomId: string) {
  const cursor = await db.collections.messages
    .aggregate<db.Message & { user: db.User }>([
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
    ])
    .limit(MESSAGE_LIMIT)

  const messages: Message[] = []
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    messages.push({
      id: doc._id.toHexString(),
      message: doc.message,
      userId: doc.userId.toHexString(),
      createdAt: doc.createdAt,
      userAccount: doc.user[0] ? doc.user[0].account : null
    })
  }
  return messages
}
