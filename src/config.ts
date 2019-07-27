import { config } from 'dotenv'
config()

export const MONGODB_URI =
  process.env.NODE_ENV === 'test' ? null : process.env.MONGODB_URI

export const API_LISTEN = 3001

export const WORKER_NUM = 2

export const GENERAL_ROOM_NAME = 'general'

export const MESSAGE_LIMIT = 20

export const USER_LIMIT = 20

export const BANNED_CHARS_REGEXP_IN_ROOM_NAME = /\/|\\|\s/

// https://en.wikipedia.org/wiki/Whitespace_character

const unicode = [
  '\u0009',
  '\u000A',
  '\u000B',
  '\u000C',
  '\u0020',
  '\u0085',
  '\u00A0',
  '\u0323',
  '\u1680',
  '\u180E',
  '\u2000',
  '\u2001',
  '\u2002',
  '\u2003',
  '\u2004',
  '\u2005',
  '\u2006',
  '\u2007',
  '\u2008',
  '\u2009',
  '\u200A',
  '\u200B',
  '\u200C',
  '\u200D',
  '\u2028',
  '\u2029',
  '\u202A',
  '\u202F',
  '\u205F',
  '\u2060',
  '\u2061',
  '\u2062',
  '\u2063',
  '\u2064',
  '\u3000',
  '\u3164',
  '\uFEFF',
  '\uFFA0'
]

export const BANNED_UNICODE_REGEXP_IN_ROOM_NAME = new RegExp(unicode.join('|'))
