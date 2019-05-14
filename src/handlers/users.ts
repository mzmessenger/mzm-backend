import { Request } from 'express'
import { ObjectID } from 'mongodb'
import { escape, trim, isEmpty } from 'validator'
import { BadRequest } from '../lib/errors'
import { getUserId } from '../lib/utils'
import * as db from '../lib/db'

export async function getUserInfo(req: Request) {
  const id = getUserId(req)
  const user = await db.collections.users.findOne({ _id: new ObjectID(id) })
  return { id, account: user.account ? user.account : null }
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
