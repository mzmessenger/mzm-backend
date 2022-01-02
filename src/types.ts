import { type Readable } from 'stream'

export type Room = {
  id: string
  name: string
  iconUrl: string
  unread: number
  replied: number
  status: 'open' | 'close'
}

export type Message = {
  id: string
  userId: string
  message: string
  iine: number
  updated: boolean
  createdAt: Date
  updatedAt: Date | null
  userAccount: string
  icon: string
}

export type SendMessage =
  | {
      user: string
      cmd: 'rooms'
      rooms: Room[]
      roomOrder: string[]
    }
  | {
      user: string
      cmd: 'message:receive'
      message: Message
      room: string
    }
  | {
      user: string
      cmd: 'messages:room'
      messages: Message[]
      room: string
      existHistory: boolean
    }
  | {
      user: string
      cmd: 'rooms:enter:success'
      id: string
      name: string
      iconUrl: string
    }
  | {
      user: string
      cmd: 'rooms:enter:fail'
      id: string
      name: string
      reason: string
    }
  | {
      user: string
      cmd: 'message:modify'
      message: Message
      room: string
    }
  | {
      user: string
      cmd: 'rooms:read'
      room: string
    }
  | {
      cmd: 'message:iine'
      user?: string
      room: string
      id: string
      iine: number
    }
  | {
      user: string
      cmd: 'rooms:sort:success'
      roomOrder: string[]
    }

export type UnreadQueue = {
  roomId: string
  messageId: string
}

export type ReplyQueue = {
  roomId: string
  userId: string
}

export const RoomQueueType = {
  INIT: 'RoomQueueType:INIT',
  ROOM: 'RoomQueueType:ROOM'
} as const

export const JobType = {
  SEARCH_ROOM: 'job:SEARCH_ROOM'
} as const

export type StreamWrapResponse = Promise<{
  headers: { [key: string]: string | number | Date }
  stream: Readable
}>
