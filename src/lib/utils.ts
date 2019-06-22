import { IncomingMessage } from 'http'
import { Request } from 'express'
import { escape, trim } from 'validator'

export function getUserId(req: IncomingMessage | Request): string {
  const user: string = req.headers['x-user-id'] as string
  return user
}

export function getAccountString({
  twitterUserName
}: {
  twitterUserName?: string
}): string {
  let account = escape(trim(twitterUserName))
  if (!account) {
    account = null
  }
  return account
}
