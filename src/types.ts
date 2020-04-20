export type Room = {
  id: string
  name: string
  iconUrl: string
  unread: number
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

export type UnreadQueue = {
  roomId: string
}

export type StreamWrapResponse = Promise<{
  headers: { [key: string]: string | number | Date }
  stream: NodeJS.ReadableStream
}>
