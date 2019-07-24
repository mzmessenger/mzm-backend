jest.mock('../lib/logger')
jest.mock('../lib/logger')
jest.mock('./internal/socket')

import { Request } from 'express'
import { ObjectID } from 'mongodb'
import { mongoSetup, getMockType } from '../../jest/testUtil'
import * as db from '../lib/db'
import { socket } from './internal'
import * as internalSocket from './internal/socket'

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

test.each([
  ['message:send', internalSocket.sendMessage],
  ['message:modify', internalSocket.modifyMessage],
  ['messages:room', internalSocket.getMessagesFromRoom],
  ['rooms:enter', internalSocket.enterRoom]
])('socket %s', async (cmd, called: any) => {
  const userId = new ObjectID()

  const req = ({
    headers: {
      'x-user-id': userId.toHexString()
    },
    body: { cmd }
  } as any) as Request

  const calledMock = getMockType(called)
  calledMock.mockClear()

  await socket(req)

  expect(calledMock.mock.calls.length).toStrictEqual(1)
})
