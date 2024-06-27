import express from 'express';
import { Request, Response, Express } from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io'
import { Redis } from 'ioredis'
import dotenv from 'dotenv'
dotenv.config()


const redis = new Redis(process.env.REDIS_URL)
const port = 3000;
const app: Express = express();
const server = http.createServer(app)
const io = new Server(server)

const TOTAL_CHECKBOXES = 1000000;
const checkboxStates = Array(TOTAL_CHECKBOXES).fill(false);

app.use(express.static('public'))

app.get('/', (req: Request, res: Response) => {
  res.sendFile('index.html', { root: path.join(__dirname, 'public') });
});

app.get('/flush', async (req: Request, res: Response) => {
  await redis.flushall()
  res.json({ message: 'Cache flushed' });
});

app.get('/load', async (req: Request, res: Response) => {
  for (let i = 0; i < 500000; i++) {
    await redis.zadd(`boxes`, 0, `cb:${i}`)
  }
  res.send('Hello World!');
});

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('request-checkboxes', (startIndex, count) => {
    const checkboxes = [];
    for (let i = startIndex; i < startIndex + count; i++) {
      if (i < TOTAL_CHECKBOXES) {
        checkboxes.push({ id: i, checked: checkboxStates[i] });
      }
    }
    socket.emit('load-checkboxes', checkboxes);
  });

  socket.on('checkbox-checked', (data) => {
    // Update the state of the checkbox
    checkboxStates[data.id] = data.checked;
    // Broadcast the checkbox state to all other connected clients
    socket.broadcast.emit('update-checkbox', { boxData: data, totalChecked: checkboxStates.filter(Boolean).length });
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

server.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}`);
});

export default app