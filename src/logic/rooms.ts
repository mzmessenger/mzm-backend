import { ObjectID } from 'mongodb'
import * as db from '../lib/db'
import logger from '../lib/logger'
import { GENERAL_ROOM_NAME } from '../config'

export async function initGeneral() {
  await db.collections.rooms.updateOne(
    {
      name: GENERAL_ROOM_NAME
    },
    { $set: { name: GENERAL_ROOM_NAME, createdBy: 'system' } },
    { upsert: true }
  )
}

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

export async function creatRoom(
  userId: ObjectID,
  name: string
): Promise<db.Room> {
  const createdBy = userId.toHexString()
  const room: db.Room = { name, createdBy }
  const inserted = await db.collections.rooms.insertOne(room)
  await enterRoom(userId, inserted.insertedId)
  const id = inserted.insertedId.toHexString()
  logger.info(`[room:create] ${name} (${id}) created by ${createdBy}`)
  return { _id: inserted.insertedId, name, createdBy }
}
