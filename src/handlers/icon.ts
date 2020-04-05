import { promisify } from 'util'
import crypto from 'crypto'
import { Request } from 'express'
import escape from 'validator/lib/escape'
import axios from 'axios'
import { ObjectID } from 'mongodb'
import { NotFound, BadRequest } from '../lib/errors'
import { getRequestUserId } from '../lib/utils'
import * as storage from '../lib/storage'
import * as db from '../lib/db'
import logger from '../lib/logger'
import { USER_ICON_PREFIX, MAX_USER_ICON_SIZE } from '../config'

const sizeOf = promisify(require('image-size'))
const randomBytes = promisify(crypto.randomBytes)

export const getUserIcon = async (
  req: Request
): Promise<{
  headers: { [key: string]: string | number | Date }
  stream: NodeJS.ReadableStream
}> => {
  const account = escape(req.params.account)
  if (!account) {
    throw new NotFound('not found')
  }
  const version = req.params.version ? escape(req.params.version) : null
  const user = await db.collections.users.findOne({ account: account })

  if (user?.icon?.version === version) {
    const head = await storage.headObject({ Key: user.icon.key })

    return {
      headers: {
        ETag: head.ETag,
        'Content-Type': head.ContentType,
        'Content-Length': head.ContentLength,
        'Last-Modified': head.LastModified,
        'Cache-Control': head.CacheControl || 'max-age=604800'
      },
      stream: storage.getObject({ Key: user.icon.key }).createReadStream()
    }
  }

  const res = await axios({
    method: 'GET',
    url: `https://identicon.mzm.dev/api/identicon/${account}`,
    responseType: 'stream'
  })
  return { headers: res.headers, stream: res.data }
}

type MulterFile = {
  key: string
  mimetype: string
  originalname: string
  size: number
  filename: string
  path: string
}

export const uploadUserIcon = async (req: Request & { file: MulterFile }) => {
  const userId = getRequestUserId(req)
  if (!userId) {
    throw new NotFound('not found')
  }

  const file = req.file
  if (file.mimetype !== 'image/png' && file.mimetype !== 'image/jpeg') {
    throw new BadRequest(`${file.mimetype} is not allowed`)
  }

  const dimensions = await sizeOf(file.path)

  if (
    dimensions.width > MAX_USER_ICON_SIZE ||
    dimensions.height > MAX_USER_ICON_SIZE
  ) {
    throw new BadRequest(`size over: ${MAX_USER_ICON_SIZE}`)
  } else if (dimensions.width !== dimensions.height) {
    throw new BadRequest(`not square: ${JSON.stringify(dimensions)}`)
  }

  const ext = file.mimetype === 'image/png' ? '.png' : '.jpeg'
  const iconKey = USER_ICON_PREFIX + userId + ext
  const version = (await randomBytes(12)).toString('hex')

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

  logger.info('[icon] upload', userId, version)

  return {
    version: version
  }
}
