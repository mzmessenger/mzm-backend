jest.mock('../../lib/logger')
jest.mock('../../logic/messages')

import { ObjectID } from 'mongodb'
import { mongoSetup, getMockType } from '../../../jest/testUtil'
import * as db from '../../lib/db'
import * as socket from './socket'
import * as logicMessages from '../../logic/messages'

let mongoServer = null

beforeAll(async () => {
  const mongo = await mongoSetup()
  mongoServer = mongo.mongoServer
  return await db.connect(mongo.uri)
})

afterAll(async () => {
  await db.close()
  await mongoServer.stop()
})

test('sendMessage', async () => {
  const roomId = new ObjectID()
  const userId = new ObjectID()

  await db.collections.users.insertOne({ _id: userId, account: 'test' })

  const message = 'post'

  const insertedIdMock = new ObjectID()
  const saveMessageMock = getMockType(logicMessages.saveMessage)
  saveMessageMock.mockResolvedValueOnce({ insertedId: insertedIdMock })

  await socket.sendMessage(userId.toHexString(), {
    cmd: 'message:send',
    message: message,
    room: roomId.toHexString()
  })

  expect(saveMessageMock.mock.calls.length).toStrictEqual(1)
  const args = saveMessageMock.mock.calls[0]

  expect(args[0]).toStrictEqual(message)
  expect(args[1]).toStrictEqual(roomId.toHexString())
  expect(args[2]).toStrictEqual(userId.toHexString())
})

test('modifyMessage', async () => {
  const roomId = new ObjectID()
  const userId = new ObjectID()
  const createdAt = new Date()

  await db.collections.users.insertOne({ _id: userId, account: 'test' })

  const created = await db.collections.messages.insertOne({
    roomId,
    userId,
    updated: false,
    message: 'insert',
    createdAt,
    updatedAt: null
  })

  await socket.modifyMessage(userId.toHexString(), {
    cmd: 'message:modify',
    id: created.insertedId.toHexString(),
    message: 'modify'
  })

  const updated = await db.collections.messages.findOne({
    _id: created.insertedId
  })

  expect(updated.message).toStrictEqual('modify')
  expect(updated.roomId.toHexString()).toStrictEqual(roomId.toHexString())
  expect(updated.userId.toHexString()).toStrictEqual(userId.toHexString())
  expect(updated.createdAt.getTime()).toStrictEqual(createdAt.getTime())
  expect(updated.updated).toStrictEqual(true)
  expect(updated.updatedAt).not.toBeNull()
})
