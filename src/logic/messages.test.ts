jest.mock('../lib/logger')

import { ObjectID } from 'mongodb'
import { mongoSetup, dropCollection } from '../../jest/testUtil'
import * as db from '../lib/db'
import { saveMessage, getMessages } from './messages'
import { MESSAGE_LIMIT } from '../config'

let mongoServer = null
let mongoUri = null

beforeAll(async () => {
  const mongo = await mongoSetup()
  mongoServer = mongo.mongoServer
  mongoUri = mongo.uri
  return await db.connect(mongo.uri)
})

afterAll(async () => {
  await db.close()
  await mongoServer.stop()
})

beforeEach(() => {
  return dropCollection(mongoUri, db.COLLECTION_NAMES.MESSAGES)
})

test('saveMessage', async () => {
  const message = 'test'
  const roomId = new ObjectID()
  const userId = new ObjectID()

  const save = await saveMessage(
    message,
    roomId.toHexString(),
    userId.toHexString()
  )

  const found = await db.collections.messages.findOne({ _id: save.insertedId })

  expect(found._id).toStrictEqual(save.insertedId)
  expect(found.message).toStrictEqual(message)
  expect(found.roomId.toHexString()).toStrictEqual(roomId.toHexString())
  expect(found.userId.toHexString()).toStrictEqual(userId.toHexString())
})

test('getMessages', async () => {
  const overNum = 2
  const userId = new ObjectID()
  const account = 'test'
  await db.collections.users.insertOne({ _id: userId, account, roomOrder: [] })
  const roomId = new ObjectID()

  const insert: Omit<db.Message, '_id'>[] = []
  for (let i = 0; i < MESSAGE_LIMIT + overNum; i++) {
    const message: Omit<db.Message, '_id'> = {
      message: `${i}-message`,
      roomId,
      userId,
      iine: i,
      updated: false,
      createdAt: new Date(),
      updatedAt: null
    }
    insert.push(message)
  }

  await db.collections.messages.insertMany(insert)

  let messages = await getMessages(roomId.toHexString())

  const idList = messages.messages.map((message) => new ObjectID(message.id))
  const messageMap = (
    await db.collections.messages
      .find({
        _id: { $in: idList }
      })
      .toArray()
  ).reduce((map, current) => {
    map.set(current._id.toHexString(), current)
    return map
  }, new Map<string, db.Message>())

  expect(messages.existHistory).toStrictEqual(true)
  expect(messages.messages.length).toStrictEqual(MESSAGE_LIMIT)

  for (const message of messages.messages) {
    expect(message.userId).toStrictEqual(userId.toHexString())
    expect(message.userAccount).toStrictEqual(account)
    expect(messageMap.get(message.id).roomId.toHexString()).toStrictEqual(
      roomId.toHexString()
    )
    expect(message.iine).toStrictEqual(messageMap.get(message.id).iine)
  }

  messages = await getMessages(roomId.toHexString(), messages.messages[0].id)

  expect(messages.existHistory).toStrictEqual(false)
  expect(messages.messages.length).toStrictEqual(overNum)
})

test('getMessages just', async () => {
  const userId = new ObjectID()
  const account = 'test'
  await db.collections.users.insertOne({ _id: userId, account, roomOrder: [] })
  const roomId = new ObjectID()

  const insert: Omit<db.Message, '_id'>[] = []
  for (let i = 0; i < MESSAGE_LIMIT * 2; i++) {
    const message: Omit<db.Message, '_id'> = {
      message: `${i}-message`,
      roomId,
      userId,
      iine: 0,
      updated: false,
      createdAt: new Date(),
      updatedAt: null
    }
    insert.push(message)
  }

  await db.collections.messages.insertMany(insert)

  let messages = await getMessages(roomId.toHexString())

  expect(messages.existHistory).toStrictEqual(true)
  expect(messages.messages.length).toStrictEqual(MESSAGE_LIMIT)

  messages = await getMessages(roomId.toHexString(), messages.messages[0].id)

  expect(messages.existHistory).toStrictEqual(true)
  expect(messages.messages.length).toStrictEqual(MESSAGE_LIMIT)

  messages = await getMessages(roomId.toHexString(), messages.messages[0].id)

  expect(messages.existHistory).toStrictEqual(false)
  expect(messages.messages.length).toStrictEqual(0)
})
