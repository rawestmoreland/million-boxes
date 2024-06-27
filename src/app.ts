import express from 'express';
import { Request, Response, Express } from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io'

const port = 3000;
const app: Express = express();
const server = http.createServer(app)
const io = new Server(server)

app.use(express.static('public'))

app.get('/', (req: Request, res: Response) => {
  res.sendFile('index.html', { root: path.join(__dirname, 'public') });
});

app.get('/hello', (req: Request, res: Response) => {
  res.send('Hello World!');
});

app.get('/handleCheckbox', (req: Request, res: Response) => {
  console.log(req.query)
})

io.on('connection', (socket) => {
  socket.on('checkbox-checked', (msg) => {
    console.log('message: ' + msg);
  });
});

server.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}`);
});

export default app