import express from 'express';
import { Request, Response, Express } from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io'
import { Redis } from 'ioredis'
import dotenv from 'dotenv'
import { RateLimiter } from 'limiter'

dotenv.config()

const limiters = new Map()

let totalChecked = 0

const redis = new Redis(process.env.VERCEL_REDIS_URL)
const REDIS_KEY = 'boxes'
const port = 3000;
const app: Express = express();
const server = http.createServer(app)
const io = new Server(server)


app.use(express.static('public'))

async function initializeTotalChecked() {
  totalChecked = await redis.zcount(REDIS_KEY, 0, 999999)
}
initializeTotalChecked()

app.get('/', (req: Request, res: Response) => {
  res.sendFile('index.html', { root: path.join(__dirname, 'public') });
});

app.get('/flush', async (req: Request, res: Response) => {
  await redis.flushall()
  res.json({ message: 'Cache flushed' });
});

app.get('/load', async (req: Request, res: Response) => {
  for (let i = 0; i < 5000; i++) {
    await redis.zadd(`boxes`, 0, `cb:${i}`)
  }
  res.send('Hello World!');
});

io.on('connection', async (socket) => {
  console.log('A user connected');

  const limiter = new RateLimiter({ tokensPerInterval: 100, interval: 900000 })
  limiters.set(socket.id, limiter)

  const initialState = await getCheckboxStates(0, 999999)
  socket.emit("initialState", { ...initialState, totalChecked })

  socket.on('checkboxChange', async (data) => {
    console.log("box changed")
    const limiter = limiters.get(socket.id)
    totalChecked = await updateCheckboxState(data.index, data.checked)

    try {
      await limiter.removeTokens(1)
      io.emit('checkboxUpdate', { ...data, totalChecked })
    } catch (error) {
      socket.emit('error', 'Rate limit exceeded')
    }

  })

  socket.on('requestRange', async (range) => {
    const states = await getCheckboxStates(range.start, range.end)
    socket.emit('rangeUpdate', states)
  })

  socket.on('disconnect', () => {
    console.log('A user disconnected');
    limiters.delete(socket.id)
  });
});

async function updateCheckboxState(index: number, checked: boolean) {
  const score = checked ? index : -index - 1;
  await redis.zadd(REDIS_KEY, score, index.toString());
  totalChecked += checked ? 1 : -1;
  return totalChecked
}

async function getCheckboxStates(start: number, end: number) {
  try {
    const [checkedBoxes, uncheckedBoxes] = await Promise.all([
      redis.zrangebyscore(REDIS_KEY, start, end),
      redis.zrangebyscore(REDIS_KEY, -end - 1, -start - 1)
    ]);

    return {
      checked: checkedBoxes.map(Number),
      unchecked: uncheckedBoxes.map(x => -Number(x) - 1),
      totalChecked
    };
  } catch (error) {
    console.error('Error fetching checkbox states:', error);
    throw error;
  }
}

server.listen(port, () => {
  return console.log(`Express server is running`);
});

export default app