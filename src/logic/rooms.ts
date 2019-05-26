import { ObjectID } from 'mongodb'
import * as db from '../lib/db'

export async function enterRoom(userId: ObjectID, roomId: ObjectID) {
  const enter: db.Enter = {
    userId: userId,
    roomId: roomId
  }
  return await db.collections.enter.findOneAndUpdate(
    { userId: userId, roomId: roomId },
    { $set: enter },
    {
      upsert: true
    }
  )
}
