// import "dotenv/config";
// import express from "express";
// import multer from "multer";
// import archiver from "archiver";
// import fs from "fs";
// import path from "path";
// import mongoose from "mongoose";
// import cors from "cors";
// import { v2 as cloudinary } from "cloudinary";

// const app = express();
// app.use(cors());
// app.use(express.json());

// // 📌 Cloudinary Configuration
// cloudinary.config({
//     cloud_name: process.env.CLOUD_NAME,
//     api_key: process.env.CLOUD_API_KEY,
//     api_secret: process.env.CLOUD_API_SECRET,
// });

// // 📌 MongoDB Connection
// mongoose.connect(process.env.MONGO_URI,
// ).then(() => console.log("MongoDB Connected")).catch(err => console.log(err));

// // 📌 Schema for File Storage
// const FileSchema = new mongoose.Schema({
//     folderName: String,
//     downloadUrl: String,
// });
// const FileModel = mongoose.model("File", FileSchema);

// // 📌 Multer Storage
// const uploadFolder = "uploads/";
// if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder);

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         const folderPath = path.join(uploadFolder, req.body.folderName || "default");
//         if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
//         cb(null, folderPath);
//     },
//     filename: function (req, file, cb) {
//         cb(null, file.originalname);
//     },
// });

// const upload = multer({ storage });

// // 📌 Route: Upload Files & Store in Cloudinary
// app.post("/upload", upload.array("files"), async (req, res) => {
//     try {
//         const folderName = req.body.folderName || "default";
//         const folderPath = path.join(uploadFolder, folderName);
//         const zipPath = `${folderPath}.zip`;

//         // 🗜 Creating ZIP File
//         const output = fs.createWriteStream(zipPath);
//         const archive = archiver("zip", { zlib: { level: 9 } });

//         output.on("close", async function () {
//             console.log(`ZIP File Created: ${zipPath}`);

//             // 📤 Upload to Cloudinary
//             cloudinary.uploader.upload(zipPath, { resource_type: "raw", folder: "components" }, async (error, result) => {
//                 if (error) {
//                     console.error("Cloudinary Upload Error:", error);
//                     return res.status(500).json({ message: "Error uploading to Cloudinary" });
//                 }

//                 // 🔹 Save URL to Database
//                 const newFile = new FileModel({ folderName, downloadUrl: result.secure_url });
//                 await newFile.save();

//                 // 📌 Send Response
//                 res.json({ message: "File Uploaded Successfully!", downloadUrl: result.secure_url });

//                 // 🗑 Delete Local ZIP File
//                 fs.unlinkSync(zipPath);
//             });
//         });

//         archive.pipe(output);
//         archive.directory(folderPath, false);
//         archive.finalize();
//     } catch (error) {
//         console.error("Error:", error);
//         res.status(500).json({ message: "Server Error" });
//     }
// });

// // 📌 Route: Fetch All Files from Database
// app.get("/files", async (req, res) => {
//     const files = await FileModel.find();
//     res.json(files);
// });

// // // 📌 Route: Download File via Cloudinary URL
// // app.get("/download/:id", async (req, res) => {
// //     const file = await FileModel.findById(req.params.id);
// //     if (!file) return res.status(404).json({ message: "File not found" });

// //     res.json({ downloadUrl: file.downloadUrl });
// // });

// app.get("/download/:id", async (req, res) => {
//     try {
//       // Find the file record in MongoDB
//       const file = await FileModel.findById(req.params.id);
//       if (!file) return res.status(404).json({ message: "File not found" });

//       const zipUrl = file.downloadUrl;

//       // Set headers to prompt a file download in the browser
//       res.setHeader("Content-Disposition", `attachment; filename="${file.folderName}.zip"`);
//       res.setHeader("Content-Type", "application/zip");

//       // Option 1: Using Axios with responseType 'arraybuffer'
//       const response = await axios.get(zipUrl, { responseType: "arraybuffer" });
//       res.send(response.data);

//       // ----------------------------------------------
//       // Option 2: Alternatively, using Node's https module:
//       //
//       // import https from "https";
//       // https.get(zipUrl, (cloudRes) => {
//       //   // Set the same headers as above (if not already set)
//       //   res.setHeader("Content-Disposition", `attachment; filename="${file.folderName}.zip"`);
//       //   res.setHeader("Content-Type", "application/zip");
//       //   cloudRes.pipe(res);
//       // }).on('error', (err) => {
//       //   console.error("Download Error:", err);
//       //   res.status(500).json({ message: "Error downloading file" });
//       // });
//       // ----------------------------------------------

//     } catch (error) {
//       console.error("Download Error:", error.response ? error.response.status : error);
//       res.status(500).json({ message: "Error downloading file" });
//     }
//   });


// // 📌 Server Start
// const PORT = 5000;
// app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));




import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { v2 as cloudinary } from "cloudinary";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Add this for parsing form data

// Cloudinary Config
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
});

console.log("Cloudinary Config:", process.env.CLOUD_NAME, process.env.CLOUD_API_KEY, process.env.CLOUD_API_SECRET);

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "template_uploads",
        format: async (req, file) => "rar",
        resource_type: "auto", // Changed from "raw" to "auto"
    },
});


const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Limit file size (10MB)
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== "application/x-rar-compressed" && file.mimetype !== "application/octet-stream") {
            return cb(new Error("Only .rar files are allowed!"), false);
        }
        cb(null, true);
    },
});

// MongoDB Connection
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch((err) => console.log(err));

// Template Schema
const TemplateSchema = new mongoose.Schema({
    title: String,
    description: String,
    fileUrl: String, // Cloudinary URL
    status: { type: String, default: "Pending" }, // "Pending" | "Approved"
});
const Template = mongoose.model("Template", TemplateSchema);

// Upload API
app.post("/upload", upload.single("templateFile"), async (req, res) => {
    try {
        console.log("Received request:", req.body);
        console.log("File received:", req.file);

        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        const { title, description } = req.body;
        const fileUrl = req.file.path; // Cloudinary URL

        const newTemplate = new Template({ title, description, fileUrl });
        await newTemplate.save();

        res.json({ success: true, message: "Template uploaded successfully!" });
    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// Get Templates (for admin)
app.get("/templates", async (req, res) => {
    const templates = await Template.find();
    res.json(templates);
});

// Approve Template
app.put("/approve/:id", async (req, res) => {
    await Template.findByIdAndUpdate(req.params.id, { status: "Approved" });
    res.json({ success: true, message: "Template Approved!" });
});

app.get("/download/:id", async (req, res) => {
    try {
        const template = await Template.findById(req.params.id);
        if (!template) {
            return res.status(404).json({ success: false, message: "File not found" });
        }

        const fileUrl = template.fileUrl;

        res.json({ success: true, downloadUrl: fileUrl });
    } catch (error) {
        console.error("Download Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// Delete Template
app.delete("/delete/:id", async (req, res) => {
    await Template.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Template Deleted!" });
});

// Start Server
app.listen(5000, () => console.log("Server running on port 5000"));
