jest.mock('../lib/logger')
jest.mock('../lib/consumer/remove', () => {
  return {
    initRemoveConsumerGroup: jest.fn(),
    consumeRemove: jest.fn()
  }
})
jest.mock('../lib/consumer/unread', () => {
  return {
    initUnreadConsumerGroup: jest.fn(),
    consumeUnread: jest.fn()
  }
})
jest.mock('../lib/consumer/reply', () => {
  return {
    initReplyConsumerGroup: jest.fn(),
    consumeReply: jest.fn()
  }
})

import { Request, Response } from 'express'
import { mongoSetup, getMockType } from '../../jest/testUtil'
import { errorHandler, checkLogin, init } from './server'
import * as HttpErrors from '../lib/errors'
import * as db from '../lib/db'
import { GENERAL_ROOM_NAME } from '../config'
import * as consumerRemove from '../lib/consumer/remove'
import * as consumerUnread from '../lib/consumer/unread'
import * as consumeReply from '../lib/consumer/reply'

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

test('errorHandler (Internal Server Error)', (cb) => {
  expect.assertions(4)

  const error = new Error('error!')

  const send = jest.fn(function (arg) {
    expect(this.status.mock.calls.length).toBe(1)
    expect(this.send.mock.calls.length).toBe(1)

    expect(this.status.mock.calls[0][0]).toEqual(500)
    expect(arg).toEqual('Internal Server Error')

    cb()
  })

  const res = { status: jest.fn().mockReturnThis(), send }

  errorHandler(error, {}, (res as any) as Response, jest.fn())
})

test.each([
  [{ error: new HttpErrors.BadRequest('BadRequest') }],
  [{ error: new HttpErrors.Forbidden('Forbidden') }]
])('errorHandler (%s)', ({ error }) => {
  expect.assertions(4)

  const send = jest.fn(function (arg) {
    expect(this.status.mock.calls.length).toBe(1)
    expect(this.send.mock.calls.length).toBe(1)

    expect(this.status.mock.calls[0][0]).toEqual(error.status)
    expect(arg).toEqual(error.toResponse())
  })

  const res = { status: jest.fn().mockReturnThis(), send }

  errorHandler(error, {}, (res as any) as Response, jest.fn())
})

test('checkLogin (success)', (cb) => {
  expect.assertions(1)

  const req = { headers: { 'x-user-id': 'aaa' } }

  const next = jest.fn(() => {
    expect('called').toEqual('called')
    cb()
  })

  checkLogin((req as any) as Request, {} as Response, next)
})

test.each([[null], [undefined], ['']])('checkLogin send 401 (%s)', (userId) => {
  expect.assertions(4)

  const req = { headers: { 'x-user-id': userId } }

  const send = jest.fn(function (arg) {
    expect(this.status.mock.calls.length).toBe(1)
    expect(this.send.mock.calls.length).toBe(1)

    expect(this.status.mock.calls[0][0]).toEqual(401)
    expect(arg).toEqual('not login')
  })

  const res = { status: jest.fn().mockReturnThis(), send }

  checkLogin((req as any) as Request, (res as any) as Response, jest.fn())
})

test('init', async () => {
  const initRemoveMock = getMockType(consumerRemove.initRemoveConsumerGroup)
  initRemoveMock.mockClear()
  initRemoveMock.mockResolvedValue('resolve')
  const removeMock = getMockType(consumerRemove.consumeRemove)
  removeMock.mockClear()
  removeMock.mockResolvedValue('resolve')

  const initUnreadMock = getMockType(consumerUnread.initUnreadConsumerGroup)
  initUnreadMock.mockClear()
  initUnreadMock.mockResolvedValue('resolve')
  const unreadMock = getMockType(consumerUnread.consumeUnread)
  unreadMock.mockClear()
  unreadMock.mockResolvedValue('resolve')

  const initReplyMock = getMockType(consumeReply.initReplyConsumerGroup)
  initReplyMock.mockClear()
  initReplyMock.mockResolvedValue('resolve')
  const replyMock = getMockType(consumeReply.consumeReply)
  replyMock.mockClear()
  replyMock.mockResolvedValue('resolve')

  await init()

  const general = await db.collections.rooms
    .find({ name: GENERAL_ROOM_NAME })
    .toArray()

  expect(general.length).toStrictEqual(1)
  expect(general[0].name).toStrictEqual(GENERAL_ROOM_NAME)

  expect(initRemoveMock.call.length).toStrictEqual(1)
  expect(removeMock.call.length).toStrictEqual(1)
  expect(initUnreadMock.call.length).toStrictEqual(1)
  expect(unreadMock.call.length).toStrictEqual(1)
  expect(initReplyMock.call.length).toStrictEqual(1)
  expect(replyMock.call.length).toStrictEqual(1)
})

test('init twice', async () => {
  await init()
  await init()

  const general = await db.collections.rooms
    .find({ name: GENERAL_ROOM_NAME })
    .toArray()

  expect(general.length).toStrictEqual(1)
})
