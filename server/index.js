import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());
app.use(express.static(join(__dirname, '..')));

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Directory running at http://localhost:${PORT}`);
});
