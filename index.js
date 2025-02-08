import "dotenv/config";
import express from "express";
import multer from "multer";
import archiver from "archiver";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";

const app = express();
app.use(cors());
app.use(express.json());

// 📌 Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
});

// 📌 MongoDB Connection
mongoose.connect(process.env.MONGO_URI,
//      {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
// }
).then(() => console.log("MongoDB Connected")).catch(err => console.log(err));

// 📌 Schema for File Storage
const FileSchema = new mongoose.Schema({
    folderName: String,
    downloadUrl: String,
});
const FileModel = mongoose.model("File", FileSchema);

// 📌 Multer Storage
const uploadFolder = "uploads/";
if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const folderPath = path.join(uploadFolder, req.body.folderName || "default");
        if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
        cb(null, folderPath);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    },
});

const upload = multer({ storage });

// 📌 Route: Upload Files & Store in Cloudinary
app.post("/upload", upload.array("files"), async (req, res) => {
    try {
        const folderName = req.body.folderName || "default";
        const folderPath = path.join(uploadFolder, folderName);
        const zipPath = `${folderPath}.zip`;

        // 🗜 Creating ZIP File
        const output = fs.createWriteStream(zipPath);
        const archive = archiver("zip", { zlib: { level: 9 } });

        output.on("close", async function () {
            console.log(`ZIP File Created: ${zipPath}`);

            // 📤 Upload to Cloudinary
            cloudinary.uploader.upload(zipPath, { resource_type: "raw", folder: "components" }, async (error, result) => {
                if (error) {
                    console.error("Cloudinary Upload Error:", error);
                    return res.status(500).json({ message: "Error uploading to Cloudinary" });
                }

                // 🔹 Save URL to Database
                const newFile = new FileModel({ folderName, downloadUrl: result.secure_url });
                await newFile.save();

                // 📌 Send Response
                res.json({ message: "File Uploaded Successfully!", downloadUrl: result.secure_url });

                // 🗑 Delete Local ZIP File
                fs.unlinkSync(zipPath);
            });
        });

        archive.pipe(output);
        archive.directory(folderPath, false);
        archive.finalize();
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

// 📌 Route: Fetch All Files from Database
app.get("/files", async (req, res) => {
    const files = await FileModel.find();
    res.json(files);
});

// // 📌 Route: Download File via Cloudinary URL
// app.get("/download/:id", async (req, res) => {
//     const file = await FileModel.findById(req.params.id);
//     if (!file) return res.status(404).json({ message: "File not found" });

//     res.json({ downloadUrl: file.downloadUrl });
// });

app.get("/download/:id", async (req, res) => {
    try {
        const file = await FileModel.findById(req.params.id);
        if (!file) return res.status(404).json({ message: "File not found" });

        res.redirect(file.downloadUrl); // Redirects user directly to the Cloudinary link
    } catch (error) {
        console.error("Download Error:", error);
        res.status(500).json({ message: "Error downloading file" });
    }
});


// 📌 Server Start
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
