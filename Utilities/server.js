// server.js
// created by GPT-4-0314

const express = require("express");
const cors = require("cors");
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.post("/save-data", (req, res) => {
    console.log("Data received: ", req.body);
    // 请于此处撰写“保存数据到数据库或其他存储系统”的业务逻辑
    res.send({ status: "success" });
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});