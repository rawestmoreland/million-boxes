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
const ioredis_1 = require("ioredis");
const dotenv_1 = __importDefault(require("dotenv"));
const limiter_1 = require("limiter");
dotenv_1.default.config();
const limiters = new Map();
let totalChecked = 0;
const redis = new ioredis_1.Redis(process.env.REDIS_URL);
const REDIS_KEY = 'boxes';
const port = 3000;
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server);
console.log("ENV FILE", process.env);
app.use(express_1.default.static('public'));
function initializeTotalChecked() {
    return __awaiter(this, void 0, void 0, function* () {
        totalChecked = yield redis.zcount(REDIS_KEY, 0, 999999);
    });
}
initializeTotalChecked();
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: path_1.default.join(__dirname, 'public') });
});
app.get('/flush', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield redis.flushall();
    res.json({ message: 'Cache flushed' });
}));
app.get('/load', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    for (let i = 0; i < 5000; i++) {
        yield redis.zadd(`boxes`, 0, `cb:${i}`);
    }
    res.send('Hello World!');
}));
io.on('connection', (socket) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('A user connected');
    const limiter = new limiter_1.RateLimiter({ tokensPerInterval: 100, interval: 900000 });
    limiters.set(socket.id, limiter);
    const initialState = yield getCheckboxStates(0, 999999);
    socket.emit("initialState", Object.assign(Object.assign({}, initialState), { totalChecked }));
    socket.on('checkboxChange', (data) => __awaiter(void 0, void 0, void 0, function* () {
        console.log("box changed");
        const limiter = limiters.get(socket.id);
        totalChecked = yield updateCheckboxState(data.index, data.checked);
        try {
            yield limiter.removeTokens(1);
            io.emit('checkboxUpdate', Object.assign(Object.assign({}, data), { totalChecked }));
        }
        catch (error) {
            socket.emit('error', 'Rate limit exceeded');
        }
    }));
    socket.on('requestRange', (range) => __awaiter(void 0, void 0, void 0, function* () {
        const states = yield getCheckboxStates(range.start, range.end);
        socket.emit('rangeUpdate', states);
    }));
    socket.on('disconnect', () => {
        console.log('A user disconnected');
        limiters.delete(socket.id);
    });
}));
function updateCheckboxState(index, checked) {
    return __awaiter(this, void 0, void 0, function* () {
        const score = checked ? index : -index - 1;
        yield redis.zadd(REDIS_KEY, score, index.toString());
        totalChecked += checked ? 1 : -1;
        return totalChecked;
    });
}
function getCheckboxStates(start, end) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const [checkedBoxes, uncheckedBoxes] = yield Promise.all([
                redis.zrangebyscore(REDIS_KEY, start, end),
                redis.zrangebyscore(REDIS_KEY, -end - 1, -start - 1)
            ]);
            return {
                checked: checkedBoxes.map(Number),
                unchecked: uncheckedBoxes.map(x => -Number(x) - 1),
                totalChecked
            };
        }
        catch (error) {
            console.error('Error fetching checkbox states:', error);
            throw error;
        }
    });
}
server.listen(port, () => {
    return console.log(`Express server is running`);
});
exports.default = app;
//# sourceMappingURL=app.js.map