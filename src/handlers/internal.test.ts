jest.mock('../lib/logger')
jest.mock('../lib/logger')
jest.mock('./internal/socket')

import { ObjectID } from 'mongodb'
import { getMockType, createRequest } from '../../jest/testUtil'
import { socket } from './internal'
import * as internalSocket from './internal/socket'

test.each([
  ['message:send', internalSocket.sendMessage],
  ['message:modify', internalSocket.modifyMessage],
  ['messages:room', internalSocket.getMessagesFromRoom],
  ['rooms:enter', internalSocket.enterRoom],
  ['rooms:read', internalSocket.readMessage],
  ['message:iine', internalSocket.iine]
])('socket %s', async (cmd, called: any) => {
  const userId = new ObjectID()
  const body = { cmd }
  const req = createRequest(userId, { body })

  const calledMock = getMockType(called)
  calledMock.mockClear()

  await socket(req)

  expect(calledMock.mock.calls.length).toStrictEqual(1)
})
