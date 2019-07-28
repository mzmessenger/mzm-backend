import { ObjectID } from 'mongodb'
import { escape, unescape, trim, isEmpty } from 'validator'
import { SendMessage } from '../../types'
import * as db from '../../lib/db'
import { addQueueToUser } from '../../lib/provider'
import { saveMessage, getMessages } from '../../logic/messages'
import { getAllUsersInRoom } from '../../logic/users'
import { creatRoom } from '../../logic/rooms'
import { enterRoom as logicEnterRoom } from '../../logic/rooms'

export type ReceiveMessage =
  | {
      cmd: 'socket:connection'
      payload: { user: string }
    }
  | {
      cmd: 'rooms:get'
    }
  | Send
  | ModifyMessage
  | GetMessages
  | EnterRoom

type Send = {
  cmd: 'message:send'
  message: string
  room: string
}

export async function sendMessage(user: string, data: Send) {
  const message = escape(trim(data.message))
  const room = escape(trim(data.room))
  // todo: send bad request
  if (isEmpty(message) || isEmpty(room)) {
    return
  }
  const saved = await saveMessage(message, room, user)
  const u = await db.collections.users.findOne({
    _id: new ObjectID(user)
  })
  const send: SendMessage = {
    user: user,
    cmd: 'message:receive',
    message: {
      id: saved.insertedId.toHexString(),
      userId: user,
      userAccount: u.account,
      message: unescape(message),
      updated: false,
      createdAt: new Date(Date.now()),
      updatedAt: null
    },
    room: room
  }

  // todo: too heavy
  const users = await getAllUsersInRoom(room)
  for (const [id] of Object.entries(users)) {
    const user = users[id]
    send.user = user
    addQueueToUser(user, send)
  }

  return
}

type ModifyMessage = {
  cmd: 'message:modify'
  id: string
  message: string
}

export async function modifyMessage(user: string, data: ModifyMessage) {
  const message = escape(trim(data.message))
  const id = escape(trim(data.id))
  // todo: send bad request
  if (isEmpty(message) || isEmpty(id)) {
    return
  }
  const targetId = new ObjectID(id)

  const from = await db.collections.messages.findOne({
    _id: targetId
  })

  // todo: send bad request
  if (from.userId.toHexString() !== user) {
    return
  }

  const updatedAt = new Date()
  await db.collections.messages.updateOne(
    { _id: targetId },
    { $set: { message: message, updated: true, updatedAt } }
  )

  const u = await db.collections.users.findOne({
    _id: new ObjectID(user)
  })
  const send: SendMessage = {
    user: user,
    cmd: 'message:modify',
    message: {
      id: from._id.toHexString(),
      message: unescape(message),
      userId: from.userId.toHexString(),
      userAccount: u.account,
      updated: true,
      createdAt: from.createdAt,
      updatedAt: updatedAt
    },
    room: from.roomId.toHexString()
  }
  // todo: too heavy
  const users = await getAllUsersInRoom(from.roomId.toHexString())
  for (const [id] of Object.entries(users)) {
    const user = users[id]
    send.user = user
    addQueueToUser(user, send)
  }
}

type GetMessages = {
  cmd: 'messages:room'
  room: string
  id?: string
}

export async function getMessagesFromRoom(
  user: string,
  socketId: string,
  data: GetMessages
) {
  const room = escape(trim(data.room))
  // todo: send bad request
  if (isEmpty(room)) {
    return
  }
  const filter: db.Enter = {
    userId: new ObjectID(user),
    roomId: new ObjectID(room)
  }
  const exist = await db.collections.enter.findOne(filter)
  // todo: send bad request
  if (!exist) {
    return
  }
  let id = null
  if (data.id) {
    id = escape(trim(data.id))
  }
  const { existHistory, messages } = await getMessages(room, id)
  const send: SendMessage = {
    user: user,
    cmd: 'messages:room',
    room,
    messages: messages,
    existHistory
  }
  return send
}

type EnterRoom = {
  cmd: 'rooms:enter'
  id?: string
  name?: string
}

export async function enterRoom(
  user: string,
  socketId: string,
  data: EnterRoom
) {
  let room: db.Room = null
  if (data.id) {
    const id = escape(trim(data.id))
    room = await db.collections.rooms.findOne({ _id: new ObjectID(id) })
  } else if (data.name) {
    const name = escape(trim(data.name))
    const found = await db.collections.rooms.findOne({ name: name })

    if (found) {
      room = found
    } else {
      room = await creatRoom(new ObjectID(user), name)
    }
  }

  // @todo send bad request
  if (!room) {
    return
  }

  await logicEnterRoom(new ObjectID(user), room._id)

  return {
    user,
    cmd: 'rooms:enter:success',
    id: room._id.toHexString(),
    name: room.name
  }
}
