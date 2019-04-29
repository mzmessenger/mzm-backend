import { Request } from 'express'
import { ObjectID } from 'mongodb'
import { escape, trim, isEmpty } from 'validator'
import { BadRequest, Forbidden } from '../lib/errors'
import { getUserId } from '../lib/utils'
import * as db from '../lib/db'
import logger from '../lib/logger'

export async function createRoom(req: Request) {
  const user = getUserId(req)
  const name = escape(trim(req.body.name))
  if (isEmpty(name)) {
    throw new BadRequest({ reason: 'name is empty' })
  }

  const found = await db.collections.rooms.findOne({ name: name })
  if (found) {
    logger.info(
      `[room:create] ${name} (${found._id.toHexString()}) is exist ${user}`
    )
    throw new Forbidden('Forbidden')
  }

  const room: db.Room = { name, createdBy: user }
  const inserted = await db.collections.rooms.insertOne(room)
  await db.collections.enter.insertOne({
    userId: new ObjectID(user),
    roomId: inserted.insertedId
  })
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

  const enter: db.Enter = {
    userId: new ObjectID(user),
    roomId: new ObjectID(roomId)
  }
  await db.collections.enter.insertOne(enter)
}

export async function exitRoom(req: Request) {
  const user = getUserId(req)
  const roomId = escape(trim(req.body.room))
  if (isEmpty(roomId)) {
    throw new BadRequest({ reason: 'room is empty' })
  }
  await db.collections.enter.deleteOne({
    userId: new ObjectID(user),
    roomId: new ObjectID(roomId)
  })
}
