import { ObjectID } from 'mongodb'
import * as db from '../lib/db'
import { logger } from '../lib/logger'
import { lock, release } from '../lib/redis'
import * as config from '../config'

export const initGeneral = async () => {
  const lockKey = config.lock.INIT_GENERAL_ROOM
  const lockVal = new ObjectID().toHexString()
  const locked = await lock(lockKey, lockVal, 1000)

  if (!locked) {
    logger.info('[locked] initGeneral')
    return
  }

  await db.collections.rooms.updateOne(
    {
      name: config.room.GENERAL_ROOM_NAME
    },
    { $set: { name: config.room.GENERAL_ROOM_NAME, createdBy: 'system' } },
    { upsert: true }
  )

  await release(lockKey, lockVal)
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
  const room: Pick<db.Room, 'name' | 'createdBy' | 'status'> = {
    name,
    createdBy,
    status: db.RoomStatusEnum.CLOSE
  }
  const inserted = await db.collections.rooms.insertOne(room)
  await enterRoom(userId, inserted.insertedId)
  const id = inserted.insertedId.toHexString()
  logger.info(`[room:create] ${name} (${id}) created by ${createdBy}`)
  return {
    _id: inserted.insertedId,
    name,
    createdBy,
    updatedBy: null,
    status: db.RoomStatusEnum.CLOSE
  }
}
