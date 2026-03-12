import { createApp } from "./app.js";
import { env } from "./config/env.js";

createApp()
  .then((app) => {
    app.listen(env.port, () => {
      console.log(`EJC Connect backend running on port ${env.port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
  });
