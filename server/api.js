const koa = require('koa')
const logger = require('koa-logger')
const routerFactory = require('koa-router')
const { User: userRouter } = require('./user')
const {createServer} = require("http");

const SERVER_PORT = 8080

const app = new koa({
    proxy: false,
})
const origin = 'http://localhost:9000'

app.use(logger())
app.use(async (ctx, next) => {
    ctx.set('Access-Control-Allow-Origin', origin)
    ctx.set(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, X-Request-Id, X-User-Id, X-Situ-Id, Authorization, Cookie, X-Accel-Buffering'
    )
    ctx.set(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, PATCH, OPTIONS'
    )
    ctx.set('Access-Control-Allow-Credentials', true)
    if (ctx.method === 'OPTIONS') {
        ctx.status = 200
        ctx.body = null
    } else {
        await next()
    }
})

const apiRouter = new routerFactory()
apiRouter.use('/user', userRouter.routes())
app.use(apiRouter.routes())

const server = createServer(app.callback())
server.listen(SERVER_PORT)