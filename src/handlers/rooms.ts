import { Request } from 'express'
import { ObjectID } from 'mongodb'
import { escape, trim, isEmpty } from 'validator'
import { BadRequest } from '../lib/errors'
import { getUserId } from '../lib/utils'
import * as db from '../lib/db'
import logger from '../lib/logger'
import { enterRoom as enterRoomLogic } from '../logic/rooms'

export async function createRoom(
  req: Request
): Promise<{ id: string; name: string }> {
  const user = getUserId(req)
  const name = escape(trim(req.body.name))
  if (isEmpty(name)) {
    throw new BadRequest({ reason: 'name is empty' })
  }

  const found = await db.collections.rooms.findOne({ name: name })
  // @todo throw error if room is rocked
  if (found) {
    await enterRoomLogic(new ObjectID(user), new ObjectID(found._id))
    return { id: found._id.toHexString(), name: found.name }
  }

  const room: db.Room = { name, createdBy: user }
  const inserted = await db.collections.rooms.insertOne(room)
  await enterRoomLogic(new ObjectID(user), inserted.insertedId)
  const id = inserted.insertedId.toHexString()
  logger.info(`[room:create] ${name} (${id}) created by ${user}`)
  return { id, name }
}

export async function enterRoom(req: Request) {
  const user = getUserId(req)
  const roomId = escape(trim(req.body.room))
  if (isEmpty(roomId)) {
    throw new BadRequest({ reason: 'room is empty' })
  }

  await enterRoomLogic(new ObjectID(user), new ObjectID(roomId))
}

export async function exitRoom(req: Request) {
  const user = getUserId(req)
  const roomId = escape(trim(req.body.room))
  if (isEmpty(roomId)) {
    throw new BadRequest({ reason: 'room is empty' })
  }
  // @todo generalはだめ
  await db.collections.enter.deleteMany({
    userId: new ObjectID(user),
    roomId: new ObjectID(roomId)
  })
}
