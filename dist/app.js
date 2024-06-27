"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const path_1 = __importDefault(require("path"));
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// const redis = new Redis(process.env.REDIS_URL)
const port = 3000;
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server);
const TOTAL_CHECKBOXES = 1000000;
const checkboxStates = Array(TOTAL_CHECKBOXES).fill(false);
app.use(express_1.default.static('public'));
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: path_1.default.join(__dirname, 'public') });
});
app.get('/hello', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.send('Hello World!');
}));
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
        socket.broadcast.emit('update-checkbox', data);
    });
    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});
server.listen(port, () => {
    return console.log(`Express is listening at http://localhost:${port}`);
});
exports.default = app;
//# sourceMappingURL=app.js.map