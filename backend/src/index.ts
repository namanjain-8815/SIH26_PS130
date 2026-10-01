import 'dotenv/config';
import { app } from './app';

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`API server listening on http://localhost:${PORT}`);
  });
}

export default app;
export { app };
module.exports = app;
module.exports.default = app;
module.exports.app = app;
