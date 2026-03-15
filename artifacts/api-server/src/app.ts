import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";
import generateRouter from "./routes/generate";

const app: Express = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api", router);
app.use("/api/models", generateRouter);

export default app;
