import WebSocket from 'ws'
import { ObjectID } from 'mongodb'
import { escape, trim, isEmpty } from 'validator'
import * as db from '../lib/db'
import { Room } from '../types'
import logger from '../lib/logger'
import { initUser, getRooms, getUsersInRoom } from './users'
import { saveMessage, getMessages } from './messages'
import { Message } from '../lib/types'

type ReceiveMessage =
  | {
      cmd: 'message:send'
      message: string
      room: string
    }
  | {
      cmd: 'messages:room'
      room: string
    }
  | {
      cmd: 'rooms:get'
    }

type SendMessage =
  | {
      cmd: 'rooms'
      rooms: Room[]
    }
  | {
      cmd: 'message:receive'
      message: Message
      room: string
    }
  | {
      cmd: 'messages:room'
      messages: Message[]
    }

const connectedUsers: { [key: string]: WebSocket } = {}

export async function onConnection(
  ws: WebSocket,
  user: string,
  { twitterUserName }: { twitterUserName?: string }
) {
  connectedUsers[user] = ws
  await initUser(user, { twitterUserName })
  const rooms = await getRooms(user)
  const room: SendMessage = { cmd: 'rooms', rooms }
  ws.send(JSON.stringify(room))
}

export async function onMessage(
  ws: WebSocket,
  user: string,
  message: WebSocket.Data
) {
  try {
    const parsed: ReceiveMessage = JSON.parse(message as string)
    if (parsed.cmd === 'message:send') {
      const message = escape(trim(parsed.message))
      const room = escape(trim(parsed.room))
      // todo: send bad request
      if (isEmpty(message) || isEmpty(room)) {
        return
      }
      const saved = await saveMessage(message, room, user)
      const u = await db.collections.users.findOne({
        _id: new ObjectID(user)
      })
      const send: SendMessage = {
        cmd: 'message:receive',
        message: {
          id: saved.insertedId.toHexString(),
          userId: user,
          userAccount: u.account,
          message: message,
          createdAt: new Date(Date.now())
        },
        room: room
      }
      return await sendMessageInRoom(send, room)
    } else if (parsed.cmd === 'messages:room') {
      const room = escape(trim(parsed.room))
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
      const messages = await getMessages(room)
      const send: SendMessage = {
        cmd: 'messages:room',
        messages: messages
      }
      return ws.send(JSON.stringify(send))
    } else if (parsed.cmd === 'rooms:get') {
      const rooms = await getRooms(user)
      const room: SendMessage = { cmd: 'rooms', rooms }
      return ws.send(JSON.stringify(room))
    }
  } catch (e) {
    logger.error('[message] parse error:', e, message)
  }
}

async function sendMessageInRoom(message: SendMessage, roomId: string) {
  const users = await getUsersInRoom(roomId)
  for (const [id, ws] of Object.entries(connectedUsers)) {
    const user = users[id]
    if (ws && user) {
      ws.send(JSON.stringify(message))
    }
  }
}
