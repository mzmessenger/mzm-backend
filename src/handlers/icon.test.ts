jest.mock('axios')
jest.mock('image-size')
jest.mock('../lib/logger')
jest.mock('../lib/storage')

import { Readable } from 'stream'
import { ObjectID } from 'mongodb'
import axios from 'axios'
import sizeOf from 'image-size'
import { mongoSetup, createRequest, getMockType } from '../../jest/testUtil'
import * as db from '../lib/db'
import * as storage from '../lib/storage'
import { MAX_USER_ICON_SIZE } from '../config'
import { BadRequest } from '../lib/errors'
import * as icon from './icon'

let mongoServer = null

beforeAll(async () => {
  const mongo = await mongoSetup()
  mongoServer = mongo.mongoServer
  return await db.connect(mongo.uri)
})

beforeEach(() => {
  jest.resetAllMocks()
})

afterAll(async () => {
  await db.close()
  await mongoServer.stop()
})

test('getUserIcon from storage', async () => {
  const userId = new ObjectID()
  const account = 'aaa'
  const version = '12345'

  await db.collections.users.insertOne({
    _id: userId,
    account,
    icon: { key: 'iconkey', version }
  })

  const req = createRequest(null, { params: { account, version } })

  const headObjectMock = getMockType(storage.headObject)
  const headers = {
    ETag: 'etag',
    ContentType: 'image/png',
    ContentLength: 12345,
    LastModified: new Date(2020, 0, 1),
    CacheControl: 'max-age=604800'
  } as const
  headObjectMock.mockResolvedValueOnce(headers)
  const getObjectMock = getMockType(storage.getObject)
  const readableStream = new Readable()
  getObjectMock.mockReturnValueOnce({
    createReadStream: () => readableStream
  })

  const res = await icon.getUserIcon(req)

  expect(headObjectMock.mock.calls.length).toStrictEqual(1)
  expect(getObjectMock.mock.calls.length).toStrictEqual(1)
  expect(res.headers.ETag).toStrictEqual(headers.ETag)
  expect(res.headers['Content-Type']).toStrictEqual(headers.ContentType)
  expect(res.headers['Content-Length']).toStrictEqual(headers.ContentLength)
  expect((res.headers['Last-Modified'] as Date).getTime()).toStrictEqual(
    headers.LastModified.getTime()
  )
  expect(res.headers['Cache-Control']).toStrictEqual(headers.CacheControl)
  expect(res.stream).toStrictEqual(readableStream)
})

test.each([
  ['bbb', null, '1234'],
  ['ccc', '1234', '4321']
])(
  'getUserIcon from identicon (user: %s, icon version: %s, request icon version: %s)',
  async (account, iconVersion, requestVersion) => {
    const user: db.User = {
      _id: new ObjectID(),
      account
    }
    if (iconVersion) {
      user.icon = { key: 'iconkey', version: iconVersion }
    }
    await db.collections.users.insertOne(user)

    const headObjectMock = getMockType(storage.headObject)
    const getObjectMock = getMockType(storage.getObject)
    const axiosMock = getMockType(axios)
    const headers = {
      ETag: 'etag',
      'Content-Type': 'image/png',
      'Content-Length': 12345,
      'Last-Modified': new Date(2020, 0, 1),
      'Cache-Control': 'max-age=604800'
    } as const
    const readableStream = new Readable()
    axiosMock.mockResolvedValueOnce({ headers, data: readableStream })

    const req = createRequest(null, {
      params: { account, version: requestVersion }
    })

    const res = await icon.getUserIcon(req)

    expect(headObjectMock.mock.calls.length).toStrictEqual(0)
    expect(getObjectMock.mock.calls.length).toStrictEqual(0)
    expect(axiosMock.mock.calls.length).toStrictEqual(1)
    for (const [key, val] of Object.entries(headers)) {
      expect(res.headers[key]).toStrictEqual(val)
    }
    expect(res.stream).toStrictEqual(readableStream)
  }
)

test('uploadUserIcon', async () => {
  const userId = new ObjectID()

  await db.collections.users.insertOne({
    _id: userId,
    account: userId.toString()
  })

  const putObjectMock = getMockType(storage.putObject)
  putObjectMock.mockResolvedValueOnce({})

  const sizeOfMock = getMockType(sizeOf)
  sizeOfMock.mockImplementation((path, cb) => {
    cb(null, { width: 100, height: 100 })
  })
  const createBodyFromFilePath = getMockType(storage.createBodyFromFilePath)
  const readableStream = new Readable()
  createBodyFromFilePath.mockReturnValue(readableStream)

  const file = {
    key: 'filekey',
    mimetype: 'image/png',
    originalname: 'fileoriginalname.png',
    size: 1,
    filename: 'filename.png',
    path: '/path/to/file'
  }

  const req = createRequest(userId, { file })

  const res = await icon.uploadUserIcon(req as any)

  const user = await db.collections.users.findOne({ _id: userId })

  expect(typeof user.icon.version).toStrictEqual('string')
  expect(res.version).toStrictEqual(user.icon.version)
})

test.each([['image/png'], ['image/jpeg']])(
  'uploadUserIcon: success file type (%s)',
  async mimetype => {
    const userId = new ObjectID()

    await db.collections.users.insertOne({
      _id: userId,
      account: userId.toString()
    })

    const file = {
      key: 'filekey',
      mimetype: mimetype,
      originalname: 'fileoriginalname.png',
      size: 1,
      filename: 'filename.png',
      path: '/path/to/file'
    }

    const sizeOfMock = getMockType(sizeOf)
    sizeOfMock.mockImplementation((path, cb) => {
      cb(null, { width: 100, height: 100 })
    })

    const req = createRequest(userId, { file })

    const res = await icon.uploadUserIcon(req as any)

    const user = await db.collections.users.findOne({ _id: userId })
    expect(typeof user.icon.version).toStrictEqual('string')
    expect(res.version).toStrictEqual(user.icon.version)
  }
)

test.each([['image/gif', 'image/svg+xml']])(
  'uploadUserIcon: fail file type (%s)',
  async mimetype => {
    expect.assertions(1)
    const userId = new ObjectID()

    await db.collections.users.insertOne({
      _id: userId,
      account: userId.toString()
    })

    const file = {
      key: 'filekey',
      mimetype: mimetype,
      originalname: 'fileoriginalname.png',
      size: 1,
      filename: 'filename.png',
      path: '/path/to/file'
    }

    const req = createRequest(userId, { file })

    try {
      await icon.uploadUserIcon(req as any)
    } catch (e) {
      expect(e instanceof BadRequest).toStrictEqual(true)
    }
  }
)

test('uploadUserIcon validation: size over', async () => {
  expect.assertions(1)
  const userId = new ObjectID()

  await db.collections.users.insertOne({
    _id: userId,
    account: userId.toString()
  })

  const file = {
    key: 'filekey',
    mimetype: 'image/png',
    originalname: 'fileoriginalname.png',
    size: 1,
    filename: 'filename.png',
    path: '/path/to/file'
  }

  const sizeOfMock = getMockType(sizeOf)
  sizeOfMock.mockImplementation((path, cb) => {
    cb(null, { width: MAX_USER_ICON_SIZE + 1, height: 100 })
  })

  const req = createRequest(userId, { file })

  try {
    await icon.uploadUserIcon(req as any)
  } catch (e) {
    expect(e instanceof BadRequest).toStrictEqual(true)
  }
})

test('uploadUserIcon validation: not square', async () => {
  expect.assertions(1)
  const userId = new ObjectID()

  await db.collections.users.insertOne({
    _id: userId,
    account: userId.toString()
  })

  const file = {
    key: 'filekey',
    mimetype: 'image/png',
    originalname: 'fileoriginalname.png',
    size: 1,
    filename: 'filename.png',
    path: '/path/to/file'
  }

  const sizeOfMock = getMockType(sizeOf)
  sizeOfMock.mockImplementation((path, cb) => {
    cb(null, { width: 101, height: 100 })
  })

  const req = createRequest(userId, { file })

  try {
    await icon.uploadUserIcon(req as any)
  } catch (e) {
    expect(e instanceof BadRequest).toStrictEqual(true)
  }
})
