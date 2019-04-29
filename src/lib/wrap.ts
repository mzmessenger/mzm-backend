import { Request, Response, NextFunction } from 'express'

interface WrapFn {
  (req: Request): Promise<any>
}

export default function wrap(fn: WrapFn) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req)
      .then(data => res.status(200).json(data))
      .catch(e => next(e))
  }
}
