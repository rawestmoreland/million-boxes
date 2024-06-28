import express from 'express';
import { Request, Response, Express } from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io'
import { Redis } from 'ioredis'
import dotenv from 'dotenv'
dotenv.config()


// const redis = new Redis(process.env.REDIS_URL)
const port = 3000;
const app: Express = express();
const server = http.createServer(app)
const io = new Server(server)

let checkedBoxes = new Set()

app.use(express.static('public'))

app.get('/', (req: Request, res: Response) => {
  res.sendFile('index.html', { root: path.join(__dirname, 'public') });
});

app.get('/flush', async (req: Request, res: Response) => {
  // await redis.flushall()
  res.json({ message: 'Cache flushed' });
});

app.get('/load', async (req: Request, res: Response) => {
  for (let i = 0; i < 500000; i++) {
    // await redis.zadd(`boxes`, 0, `cb:${i}`)
  }
  res.send('Hello World!');
});

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.emit("initialState", Array.from(checkedBoxes))

  socket.on('checkboxChange', (data) => {
    if (data.checked) {
      checkedBoxes.add(data.index)
    } else {
      checkedBoxes.delete(data.index)
    }

    io.emit('checkboxUpdate', data)
  })

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

server.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}`);
});

export default app