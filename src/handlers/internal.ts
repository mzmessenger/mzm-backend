import { Request } from 'express'
import logger from '../lib/logger'

export async function socket(req: Request) {
  logger.info(req.body)
  return
}
