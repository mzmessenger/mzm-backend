import { Request } from 'express'
import { ObjectID } from 'mongodb'
import { escape, unescape, trim, isEmpty } from 'validator'
import * as db from '../lib/db'
import { addQueueToUser, addQueueToSocket } from '../lib/provider'
import { getRooms, getUsersInRoom } from '../logic/users'
import { saveMessage, getMessages } from '../logic/messages'
import { enterRoom, creatRoom } from '../logic/rooms'
import { SendMessage } from '../types'

type ReceiveMessage =
  | {
      cmd: 'socket:connection'
      payload: { user: string }
    }
  | {
      cmd: 'messages:room'
      room: string
      id?: string
    }
  | {
      cmd: 'message:send'
      message: string
      room: string
    }
  | {
      cmd: 'rooms:get'
    }
  | {
      cmd: 'rooms:enter'
      id?: string
      name?: string
    }

export async function socket(req: Request) {
  const user: string = req.headers['x-user-id'] as string
  const socket: string = req.headers['x-socket-id'] as string
  const data = req.body as ReceiveMessage
  if (data.cmd === 'message:send') {
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
        createdAt: new Date(Date.now())
      },
      room: room
    }

    // todo: too heavy
    const users = await getUsersInRoom(room)
    for (const [id] of Object.entries(users)) {
      const user = users[id]
      send.user = user
      addQueueToUser(user, send)
    }

    return
  } else if (data.cmd === 'messages:room') {
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
    return await addQueueToSocket(socket, send)
  } else if (data.cmd === 'rooms:get') {
    const rooms = await getRooms(user)
    const room: SendMessage = { user: user, cmd: 'rooms', rooms }
    return await addQueueToSocket(socket, room)
  } else if (data.cmd === 'rooms:enter') {
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

    await enterRoom(new ObjectID(user), room._id)

    await addQueueToSocket(socket, {
      user,
      cmd: 'rooms:enter:success',
      id: room._id.toHexString(),
      name: room.name
    })
    return
  }
  return
}
