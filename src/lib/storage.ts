import { Readable } from 'stream'
import AWS from 'aws-sdk'
import {
  AWS_BUCKET,
  AWS_REGION,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY
} from '../config'

const credentials = new AWS.Credentials({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY
})

AWS.config.update({
  credentials,
  region: AWS_REGION
})
const s3 = new AWS.S3({ apiVersion: '2006-03-01' })

export const putObject = async (params: {
  Key: string
  Body: Buffer | Readable
  ContentType?: string
  CacheControl?: string
}) => {
  const p = { ...params, Bucket: AWS_BUCKET }
  const data = await s3.putObject(p).promise()
  return data
}

export const headObject = async ({ Key }: { Key: string }) => {
  const params = {
    Bucket: AWS_BUCKET,
    Key: Key
  }
  return await s3.headObject(params).promise()
}

export const getObject = ({ Key }: { Key: string }) => {
  const params = {
    Bucket: AWS_BUCKET,
    Key: Key
  }
  return s3.getObject(params)
}
