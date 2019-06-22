import { Request } from 'express'
import { ObjectID } from 'mongodb'
import { escape, trim, isEmpty } from 'validator'
import { NotFound, BadRequest } from '../lib/errors'
import { getUserId } from '../lib/utils'
import { initUser } from '../logic/users'
import * as db from '../lib/db'

export async function signUp(req: Request) {
  const id = getUserId(req)
  if (!req.body.account) {
    throw new BadRequest('account is empty')
  }
  const account = escape(trim(req.body.account))
  if (isEmpty(account, { ignore_whitespace: true })) {
    throw new BadRequest('account is empty')
  }

  const user = await db.collections.users.findOne({ _id: new ObjectID(id) })
  if (user) {
    throw new BadRequest('account is already created')
  }

  await initUser(new ObjectID(id), account)

  return { id: id, account: account }
}

export async function getUserInfo(req: Request) {
  const id = getUserId(req)

  const user = await db.collections.users.findOne({ _id: new ObjectID(id) })

  if (!user || !user.account) {
    const twitter: string = req.headers['x-twitter-user-name'] as string
    throw new NotFound({
      reason: 'account is not found',
      id,
      twitter
    })
  }

  return { id: user._id.toHexString(), account: user.account }
}

export async function updateAccount(req: Request) {
  const user = getUserId(req)
  if (!req.body.account) {
    throw new BadRequest('account is empty')
  }
  const account = escape(trim(req.body.account))
  if (isEmpty(account, { ignore_whitespace: true })) {
    throw new BadRequest('account is empty')
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
