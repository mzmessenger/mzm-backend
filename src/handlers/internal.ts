import { Request } from 'express'
import { addQueueToSocket } from '../lib/provider'
import { getRooms } from '../logic/users'
import { SendMessage } from '../types'
import {
  ReceiveMessage,
  sendMessage,
  modifyMessage,
  getMessagesFromRoom,
  enterRoom
} from './internal/socket'

export async function socket(req: Request) {
  const user: string = req.headers['x-user-id'] as string
  const socket: string = req.headers['x-socket-id'] as string
  const data = req.body as ReceiveMessage
  if (data.cmd === 'message:send') {
    return await sendMessage(user, data)
  } else if (data.cmd === 'message:modify') {
    return await modifyMessage(user, data)
  } else if (data.cmd === 'messages:room') {
    return await getMessagesFromRoom(user, socket, data)
  } else if (data.cmd === 'rooms:get') {
    const rooms = await getRooms(user)
    const room: SendMessage = { user: user, cmd: 'rooms', rooms }
    return await addQueueToSocket(socket, room)
  } else if (data.cmd === 'rooms:enter') {
    return await enterRoom(user, socket, data)
  }
  return
}
