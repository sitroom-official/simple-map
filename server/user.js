const routerFactory = require('koa-router')
const usersDatabase = require('./usersDatabase.json')

module.exports.User = routerFactory()
    .get('/:userId', function getUserDataById(ctx, next) {
        const userId = ctx?.params?.userId
        console.log('get user data', userId)
        if(typeof usersDatabase?.[userId] !== 'undefined') {
            ctx.status = 200
            ctx.body = {
                status: 'success',
                data: usersDatabase?.[userId],
            }
        } else {
            ctx.status = 404
            ctx.body = {
                status: 'error',
                error: `could not find info for user ${userId}`,
            }
        }

    })
