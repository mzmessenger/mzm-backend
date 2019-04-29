import { IncomingMessage } from 'http'
import { Request } from 'express'

export function getUserId(req: IncomingMessage | Request): string {
  const user: string = req.headers['x-user-id'] as string
  return user
}
