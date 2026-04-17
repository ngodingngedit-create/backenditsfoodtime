import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import checkout from './server/API/checkout.post.js'
import webhook from './server/API/webhook.post.js'



const app = express()
app.use(cors())
app.use(express.json())

app.post('/api/checkout', checkout)
app.post('/api/webhook', webhook)

app.listen(3000, () => {
    console.log('🚀 Server running on http://localhost:3000')
})