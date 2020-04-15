import { Request } from 'express'
import { ObjectID } from 'mongodb'
import { NotFound, BadRequest } from '../lib/errors'
import { getRequestUserId, popParam } from '../lib/utils'
import { isValidAccount, initUser } from '../logic/users'
import * as db from '../lib/db'
import { createIconPath } from '../lib/utils'

export const signUp = async (req: Request) => {
  const id = getRequestUserId(req)
  const account = popParam(req.body.account)
  if (!account) {
    throw new BadRequest('account is empty')
  }
  if (!isValidAccount(account)) {
    throw new BadRequest('account is not valid')
  }

  const user = await db.collections.users.findOne({ account: account })
  if (user) {
    throw new BadRequest('account is already created')
  }

  await initUser(new ObjectID(id), account)

  return { id: id, account: account }
}

export const getUserInfo = async (req: Request) => {
  const id = getRequestUserId(req)

  const user = await db.collections.users.findOne({ _id: new ObjectID(id) })

  const twitter: string = (req.headers['x-twitter-user-name'] as string) || null
  const github: string = (req.headers['x-github-user-name'] as string) || null

  if (!user || !user.account) {
    throw new NotFound({
      reason: 'account is not found',
      id,
      twitter,
      github
    })
  }

  return {
    id: user._id.toHexString(),
    account: user.account,
    icon: createIconPath(user.account, user.icon?.version),
    twitterUserName: twitter,
    githubUserName: github
  }
}

export const updateAccount = async (req: Request) => {
  const user = getRequestUserId(req)
  const account = popParam(req.body.account)
  if (!account) {
    throw new BadRequest('account is empty')
  }
  if (!isValidAccount(account)) {
    throw new BadRequest('account is not valid')
  }

  const userId = new ObjectID(user)
  const update: db.User = { _id: userId, account }
  const updated = await db.collections.users.findOneAndUpdate(
    { _id: userId },
    { $set: update },
    {
      upsert: true
    }
  )

  return updated.value
}
