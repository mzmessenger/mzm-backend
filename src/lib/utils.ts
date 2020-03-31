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

export const createIconPath = (account: string, version?: string): string => {
  if (!account) {
    return null
  }
  let icon = `/api/icon/user/${account}`
  if (version) {
    icon += `/${version}`
  }
  return icon
}
