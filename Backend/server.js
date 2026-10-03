import express from "express";
import "dotenv/config";
import cors from "cors";
import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";
import chatRoutes from "./routes/chat.js";

const app = express();
const PORT = process.env.PORT || 8081;
const frontendDistPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../frontend/dist"
);

app.use(express.json());
app.use(cors());
app.set("trust proxy", 1);

app.use("/api", chatRoutes);
app.use(express.static(frontendDistPath));
app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith("/api/")) {
        return next();
    }

    res.sendFile(path.join(frontendDistPath, "index.html"));
});

app.listen(PORT, () => {
    console.log(`server running on ${PORT}`);
    connectDB();
});

const connectDB = async() => {
    try {
        if (!process.env.MONGODB_URI) {
            console.warn("MONGODB_URI is not set; chats will be stored in memory.");
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000
        });
        console.log("Connected with Database!");
    } catch(err) {
        console.log("Failed to connect with Db", err);
    }
}


// app.post("/test", async (req, res) => {
//     const options = {
//         method: "POST",
//         headers: {
//             "Content-Type": "application/json",
//             "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
//         },
//         body: JSON.stringify({
//             model: "gpt-4o-mini",
//             messages: [{
//                 role: "user",
//                 content: req.body.message
//             }]
//         })
//     };

//     try {
//         const response = await fetch("https://api.openai.com/v1/chat/completions", options);
//         const data = await response.json();
//         //console.log(data.choices[0].message.content); //reply
//         res.send(data.choices[0].message.content);
//     } catch(err) {
//         console.log(err);
//     }
// });
