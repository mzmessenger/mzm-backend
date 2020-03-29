import { Request } from 'express'
import { ObjectID } from 'mongodb'
import { NotFound, BadRequest } from '../lib/errors'
import { getRequestUserId, popParam } from '../lib/utils'
import { isValidAccount, initUser } from '../logic/users'
import * as db from '../lib/db'
import { createIconPath } from '../lib/utils'

export async function signUp(req: Request) {
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

export async function getUserInfo(req: Request) {
  const id = getRequestUserId(req)

  const user = await db.collections.users.findOne({ _id: new ObjectID(id) })

  if (!user || !user.account) {
    const twitter: string = req.headers['x-twitter-user-name'] as string
    throw new NotFound({
      reason: 'account is not found',
      id,
      twitter
    })
  }

  return {
    id: user._id.toHexString(),
    account: user.account,
    icon: createIconPath(user.account, user.icon?.version)
  }
}

export async function updateAccount(req: Request) {
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
