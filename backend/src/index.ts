import "dotenv/config";
import { httpServer } from "./app.js";

const port = Number(process.env.PORT) || 5000;

httpServer.listen(port, () => {
  console.log(`🚀 LawTalk API Server running on http://localhost:${port}`);
  console.log(`📡 Socket.io ready for real-time connections`);
});
