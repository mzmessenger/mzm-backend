import bunyan from 'bunyan'

const logger = bunyan.createLogger({
  name: 'backend'
})

export default logger
