import { Request } from 'express'
import escape from 'validator/lib/escape'
import axios from 'axios'
import { NotFound } from '../lib/errors'

export const userIcon = async (req: Request) => {
  const userid = escape(req.params.userid)
  if (!userid) {
    throw new NotFound('not found')
  }

  const res = await axios({
    method: 'GET',
    url: `https://identicon.mzm.dev/api/identicon/${userid}`,
    responseType: 'stream'
  })
  return { headers: res.headers, stream: res.data }
}
