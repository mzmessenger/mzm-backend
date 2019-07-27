import { ObjectID } from 'mongodb'
import { isEmpty } from 'validator'
import { GENERAL_ROOM_NAME } from '../config'
import { Room as SendRoom } from '../types'
import logger from '../lib/logger'
import * as db from '../lib/db'

export function isValidAccount(account: string): boolean {
  if (isEmpty(account, { ignore_whitespace: true })) {
    return false
  }
  return /^[a-zA-Z\d]+$/.test(account)
}

async function enterGeneral(userId: ObjectID) {
  const general: db.Room = await db.collections.rooms.findOne({
    name: GENERAL_ROOM_NAME
  })
  const existGeneral = await db.collections.enter.findOne({
    userId: userId,
    roomId: general._id
  })
  if (!existGeneral) {
    const enter: db.Enter = {
      userId: userId,
      roomId: general._id
    }
    await db.collections.enter.insertOne(enter)
  }
}

export async function initUser(userId: ObjectID, account: string) {
  const [user] = await Promise.all([
    db.collections.users.insertOne({ _id: userId, account: account }),
    enterGeneral(userId)
  ])
  logger.info('[logic/user] initUser', userId, account)
  return user
}

export async function getRooms(userId: string): Promise<SendRoom[]> {
  const cursor = await db.collections.enter.aggregate<
    db.Enter & { room: db.Room[] }
  >([
    { $match: { userId: new ObjectID(userId) } },
    {
      $lookup: {
        from: db.COLLECTION_NAMES.ROOMS,
        localField: 'roomId',
        foreignField: '_id',
        as: 'room'
      }
    }
  ])
  const rooms: SendRoom[] = []
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    const room = doc.room[0]
    rooms.push({ id: room._id.toHexString(), name: room.name })
  }
  return rooms
}

export async function getAllUsersInRoom(roomId: string) {
  const cursor = await db.collections.enter.find({
    roomId: new ObjectID(roomId)
  })

  const users: { [key: string]: string } = {}
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    const enter: db.Enter = doc
    const id = enter.userId.toHexString()
    users[id] = id
  }
  return users
}
