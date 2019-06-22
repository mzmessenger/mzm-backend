import { Request } from 'express'
import { ObjectID } from 'mongodb'
import { escape, trim, isEmpty } from 'validator'
import { BadRequest } from '../lib/errors'
import { getUserId, getAccountString } from '../lib/utils'
import { initUser, setAccount } from '../logic/users'
import * as db from '../lib/db'

export async function getUserInfo(req: Request) {
  const id = getUserId(req)
  const twitterUserName = req.headers['x-twitter-user-name'] as string
  const user = await db.collections.users.findOne({ _id: new ObjectID(id) })
  let account = user ? user.account : null
  if (!user) {
    await initUser(id, {
      twitterUserName: twitterUserName
    })
  } else if (!user.account) {
    await setAccount(new ObjectID(id), twitterUserName)
  }

  if (!account) {
    account = getAccountString({ twitterUserName })
  }
  return { id, account: account }
}

export async function updateAccount(req: Request) {
  const user = getUserId(req)
  const account = escape(trim(req.body.account))
  if (isEmpty(account)) {
    throw new BadRequest({ reason: 'account is empty' })
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
