import { IncomingMessage } from 'http'
import { Request } from 'express'
import escape from 'validator/lib/escape'
import trim from 'validator/lib/trim'

export function getRequestUserId(req: IncomingMessage | Request): string {
  const user: string = req.headers['x-user-id'] as string
  return user
}

export function popParam(param: string): string {
  if (!param) {
    return ''
  }
  return escape(trim(param))
}
