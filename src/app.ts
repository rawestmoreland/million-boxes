import express from 'express';
import { Request, Response, Express } from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io'
import { Redis } from 'ioredis'
import dotenv from 'dotenv'
dotenv.config()


const redis = new Redis(process.env.VERCEL_REDIS_URL)
const REDIS_KEY = 'boxes'
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

  const initialState = await getCheckboxStates(0, 999999)
  socket.emit("initialState", initialState)

  socket.on('checkboxChange', async (data) => {
    await updateCheckboxState(data.index, data.checked)

    io.emit('checkboxUpdate', data)
  })

  socket.on('requestRange', async (range) => {
    const states = await getCheckboxStates(range.start, range.end)
    socket.emit('rangeUpdate', states)
  })

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

async function updateCheckboxState(index: number, checked: boolean) {
  const score = checked ? index : -index - 1;
  await redis.zadd(REDIS_KEY, score, index.toString());
}

async function getCheckboxStates(start: number, end: number) {
  try {
    const [checkedBoxes, uncheckedBoxes] = await Promise.all([
      redis.zrangebyscore(REDIS_KEY, start, end),
      redis.zrangebyscore(REDIS_KEY, -end - 1, -start - 1)
    ]);

    return {
      checked: checkedBoxes.map(Number),
      unchecked: uncheckedBoxes.map(x => -Number(x) - 1)
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