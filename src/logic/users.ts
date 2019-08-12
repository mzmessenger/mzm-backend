import { ObjectID } from 'mongodb'
import { isEmpty } from 'validator'
import { GENERAL_ROOM_NAME } from '../config'
import { Room as SendRoom } from '../types'
import logger from '../lib/logger'
import * as db from '../lib/db'
import { enterRoom } from './rooms'

export function isValidAccount(account: string): boolean {
  if (
    isEmpty(account, { ignore_whitespace: true }) ||
    /.*(insert|update|find|remove).*/.test(account) ||
    /^(X|x)-/.test(account)
  ) {
    return false
  }
  return /^[a-zA-Z\d_-]+$/.test(account)
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
    await enterRoom(userId, general._id)
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
    rooms.push({
      id: room._id.toHexString(),
      name: room.name,
      unread: doc.unreadCounter ? doc.unreadCounter : 0
    })
  }
  return rooms
}

export async function getAllUserIdsInRoom(roomId: string) {
  const cursor = await db.collections.enter.find({
    roomId: new ObjectID(roomId)
  })

  const userIds: string[] = []
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    userIds.push(doc.userId.toHexString())
  }
  return userIds
}
