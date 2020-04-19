import { promisify } from 'util'
import crypto from 'crypto'
import { Request } from 'express'
import escape from 'validator/lib/escape'
import axios from 'axios'
import { ObjectID } from 'mongodb'
import { NotFound, BadRequest } from '../lib/errors'
import { getRequestUserId, popParam } from '../lib/utils'
import * as storage from '../lib/storage'
import * as db from '../lib/db'
import logger from '../lib/logger'
import * as config from '../config'
import { StreamWrapResponse } from '../types'

const sizeOf = promisify(require('image-size'))
const randomBytes = promisify(crypto.randomBytes)

const returnIconStream = async (key: string) => {
  const head = await storage.headObject({ Key: key })

  return {
    headers: {
      ETag: head.ETag,
      'Content-Type': head.ContentType,
      'Content-Length': head.ContentLength,
      'Last-Modified': head.LastModified,
      'Cache-Control': head.CacheControl || 'max-age=604800'
    },
    stream: storage.getObject({ Key: key }).createReadStream()
  }
}

export const getUserIcon = async (req: Request): StreamWrapResponse => {
  const account = escape(req.params.account)
  if (!account) {
    throw new NotFound('not found')
  }
  const version = popParam(req.params.version)
  const user = await db.collections.users.findOne({ account: account })

  if (user?.icon?.version === version) {
    return await returnIconStream(user.icon.key)
  }

  const res = await axios({
    method: 'GET',
    url: `https://identicon.mzm.dev/api/identicon/${account}`,
    responseType: 'stream'
  })
  return { headers: res.headers, stream: res.data }
}

export const getRoomIcon = async (req: Request): StreamWrapResponse => {
  const roomName = popParam(req.params.roomname)
  if (!roomName) {
    throw new BadRequest(`no room id`)
  }
  const version = popParam(req.params.version)
  const room = await db.collections.rooms.findOne({ name: roomName })

  if (room?.icon?.version !== version) {
    throw new NotFound('no image')
  }

  return await returnIconStream(room.icon.key)
}

type MulterFile = {
  key: string
  mimetype: string
  originalname: string
  size: number
  filename: string
  path: string
}

const isValidMimetype = (mimetype: string) => {
  return mimetype === 'image/png' || mimetype !== 'image/jpeg'
}

const createVersion = async () => {
  const version = (await randomBytes(12)).toString('hex')
  return version
}

export const uploadUserIcon = async (req: Request & { file: MulterFile }) => {
  const userId = getRequestUserId(req)
  if (!userId) {
    throw new NotFound('not found')
  }

  const file = req.file
  if (!isValidMimetype(file.mimetype)) {
    throw new BadRequest(`${file.mimetype} is not allowed`)
  }

  const dimensions = await sizeOf(file.path)

  if (
    dimensions.width > config.icon.MAX_USER_ICON_SIZE ||
    dimensions.height > config.icon.MAX_USER_ICON_SIZE
  ) {
    throw new BadRequest(`size over: ${config.icon.MAX_USER_ICON_SIZE}`)
  } else if (dimensions.width !== dimensions.height) {
    throw new BadRequest(`not square: ${JSON.stringify(dimensions)}`)
  }

  const ext = file.mimetype === 'image/png' ? '.png' : '.jpeg'
  const iconKey = config.icon.USER_ICON_PREFIX + userId + ext
  const version = await createVersion()

  await storage.putObject({
    Key: iconKey,
    Body: storage.createBodyFromFilePath(file.path),
    ContentType: file.mimetype,
    CacheControl: 'max-age=604800'
  })

  const update: Pick<db.User, 'icon'> = {
    icon: { key: iconKey, version }
  }

  await db.collections.users.findOneAndUpdate(
    { _id: new ObjectID(userId) },
    { $set: update },
    {
      upsert: true
    }
  )

  logger.info('[icon:user] upload', userId, version)

  return {
    version: version
  }
}

export const uploadRoomIcon = async (req: Request & { file: MulterFile }) => {
  const roomName = popParam(req.params.roomname)
  if (!roomName) {
    throw new BadRequest(`no room id`)
  }

  const file = req.file
  if (!isValidMimetype(file.mimetype)) {
    throw new BadRequest(`${file.mimetype} is not allowed`)
  }

  const dimensions = await sizeOf(file.path)

  if (
    dimensions.width > config.icon.ROOM_ICON_PREFIX ||
    dimensions.height > config.icon.ROOM_ICON_PREFIX
  ) {
    throw new BadRequest(`size over: ${config.icon.ROOM_ICON_PREFIX}`)
  } else if (dimensions.width !== dimensions.height) {
    throw new BadRequest(`not square: ${JSON.stringify(dimensions)}`)
  }

  const room = await db.collections.rooms.findOne({ name: roomName })
  if (!room) {
    throw new NotFound('not exist')
  }

  const ext = file.mimetype === 'image/png' ? '.png' : '.jpeg'
  const iconKey = config.icon.ROOM_ICON_PREFIX + room._id + ext
  const version = await createVersion()

  await storage.putObject({
    Key: iconKey,
    Body: storage.createBodyFromFilePath(file.path),
    ContentType: file.mimetype,
    CacheControl: 'max-age=604800'
  })

  const update: Pick<db.Room, 'icon'> = {
    icon: { key: iconKey, version }
  }

  await db.collections.rooms.findOneAndUpdate(
    { _id: room._id },
    { $set: update },
    {
      upsert: true
    }
  )

  logger.info('[icon:room] upload', roomName, version)

  return {
    id: room._id.toHexString(),
    version: version
  }
}
