import { ObjectID } from 'mongodb'
import * as db from '../lib/db'
import { logger } from '../lib/logger'
import { GENERAL_ROOM_NAME } from '../config'

export const initGeneral = async () => {
  await db.collections.rooms.updateOne(
    {
      name: GENERAL_ROOM_NAME
    },
    { $set: { name: GENERAL_ROOM_NAME, createdBy: 'system' } },
    { upsert: true }
  )
}

export const enterRoom = async (userId: ObjectID, roomId: ObjectID) => {
  const enter: Omit<db.Enter, '_id'> = {
    userId: userId,
    roomId: roomId,
    unreadCounter: 0,
    replied: 0
  }

  await Promise.all([
    db.collections.enter.findOneAndUpdate(
      { userId: userId, roomId: roomId },
      { $set: enter },
      {
        upsert: true
      }
    ),
    db.collections.users.findOneAndUpdate(
      { _id: userId },
      { $addToSet: { roomOrder: roomId.toHexString() } }
    )
  ])
}

export const createRoom = async (
  userId: ObjectID,
  name: string
): Promise<db.Room> => {
  const createdBy = userId.toHexString()
  const room: Pick<db.Room, 'name' | 'createdBy'> = { name, createdBy }
  const inserted = await db.collections.rooms.insertOne(room)
  await enterRoom(userId, inserted.insertedId)
  const id = inserted.insertedId.toHexString()
  logger.info(`[room:create] ${name} (${id}) created by ${createdBy}`)
  return { _id: inserted.insertedId, name, createdBy }
}
