import { ObjectID } from 'mongodb'
import { GENERAL_ROOM_NAME } from '../config'
import { Room as SendRoom } from '../types'
import * as db from '../lib/db'

async function createUser(userId: ObjectID, twitterUserName?: string) {
  const update: { _id: ObjectID; account?: string } = { _id: userId }
  const find = await db.collections.users.findOne({ _id: userId })
  // account初期化処理
  if (find && !find.account) {
    update.account = twitterUserName ? twitterUserName : null
  }
  await db.collections.users.findOneAndUpdate(
    { _id: userId },
    { $set: update },
    { upsert: true }
  )
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

export async function initUser(
  userId: string,
  { twitterUserName }: { twitterUserName?: string }
) {
  const id = new ObjectID(userId)
  await Promise.all([createUser(id, twitterUserName), enterGeneral(id)])
}

export async function getRooms(userId: string): Promise<SendRoom[]> {
  const cursor = await db.collections.enter.aggregate<
    db.Enter & { room: db.Room }
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
    const room: db.Room = doc.room[0]
    rooms.push({ id: room._id.toHexString(), name: room.name })
  }
  return rooms
}

export async function getUsersInRoom(roomId: string) {
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
