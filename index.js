require('env2')('./config.env')
const Hapi = require('hapi')
const qs = require('querystring')
const https = require('https')
const port = 8000

const queryParamsObj = {
  client_id: process.env.GITHUB_CLIENT_ID,
  redirect_uri: process.env.BASE_URL + '/welcome'
}

const request = (options, callback) => {
  return https.request(options, (res) => {
    console.log('status code', res.statusCode)
    let data = ''
    res.on('data', (chunk) => {
      data += chunk
    })
    res.on('end', () => {
      callback(data)
    })
  })
}

const server = new Hapi.Server()
server.connection({ port })

server.register(require('inert'), (err) => {
  if (err) throw err
  server.route([
    {
      method: 'GET',
      path: '/',
      handler: (req, reply) => {
        reply.file('./public/index.html')
      }
    },
    {
      method: 'GET',
      path: '/login',
      handler: (req, reply) => {
        const queryParams = qs.stringify(queryParamsObj)
        const authUrl = 'https://github.com/login/oauth/authorize?' + queryParams
        reply.redirect(authUrl)
      }
    },
    {
      method: 'GET',
      path: '/welcome',
      handler: (req, reply) => {
        const opts = {
          method: 'POST',
          hostname: 'github.com',
          path: '/login/oauth/access_token',
          headers: {
            'User-Agent': 'oauth',
            'Accept': 'application/json'
          }
        }

        const body = {
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code: req.query.code
        }

        const blah = request(opts, (response) => {
          const parsedResponse = JSON.parse(response)
          if (parsedResponse.access_token)
            reply.redirect('/profile')
          else
            reply.redirect('/login')
          server.app.access_token = parsedResponse.access_token
        })
        console.log(qs.stringify(body))
        blah.write(qs.stringify(body))
        blah.end()

      }
    },
    {
      method: 'GET',
      path: '/profile',
      handler: (req, reply) => {
        reply('<h1>Profile</h1>')
      }
    }
  ])
})

server.start((err) => {
  if (err) throw err
  console.log('server started at port ' + port)
})
