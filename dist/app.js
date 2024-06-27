"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const path_1 = __importDefault(require("path"));
const socket_io_1 = require("socket.io");
const port = 3000;
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server);
app.use(express_1.default.static('public'));
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: path_1.default.join(__dirname, 'public') });
});
app.get('/handleCheckbox', (req, res) => {
    console.log(req.query);
});
io.on('connection', (socket) => {
    socket.on('checkbox-checked', (msg) => {
        console.log('message: ' + msg);
    });
});
server.listen(port, () => {
    return console.log(`Express is listening at http://localhost:${port}`);
});
//# sourceMappingURL=app.js.map