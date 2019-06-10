jest.mock('../lib/logger')

import { ObjectID } from 'mongodb'
import { initDb, dropCollection } from '../testUtil'
import * as db from '../lib/db'
import { saveMessage, getMessages } from './messages'
import { MESSAGE_LIMIT } from '../config'

beforeAll(async () => {
  await db.connect()
  return await initDb()
})

beforeEach(() => {
  return dropCollection(db.COLLECTION_NAMES.MESSAGES)
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
  await db.collections.users.insertOne({ _id: userId, account })
  const roomId = new ObjectID()

  const insert: db.Message[] = []
  for (let i = 0; i < MESSAGE_LIMIT + overNum; i++) {
    const message: db.Message = {
      message: `${i}-message`,
      roomId,
      userId,
      createdAt: new Date()
    }
    insert.push(message)
  }

  await db.collections.messages.insertMany(insert)

  let messages = await getMessages(roomId.toHexString())

  const idList = messages.messages.map(message => new ObjectID(message.id))
  const messageMap = (await db.collections.messages
    .find({
      _id: { $in: idList }
    })
    .toArray()).reduce((map, current) => {
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
  }

  messages = await getMessages(roomId.toHexString(), messages.messages[0].id)

  expect(messages.existHistory).toStrictEqual(false)
  expect(messages.messages.length).toStrictEqual(overNum)
})
