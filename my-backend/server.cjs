require("dotenv").config();
// server.js (or your backend file)

const express = require("express");
const fetch = require("node-fetch"); // Or use another HTTP client
const app = express();
const cors = require("cors");
const vueOrigin = process.env.CORS_ORIGIN;
const multer = require("multer");
const axios = require("axios");

console.log(vueOrigin);

app.use(
  cors({
    origin: `${process.env.CORS_ORIGIN}`, // Replace with your Vue app's origin
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" })); // or any other appropriate limit
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.json());

const VANCEAI_API_KEY = process.env.VANCEAI_API_KEY;
const upload = multer({ storage: multer.memoryStorage() });

app.post("/upload-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      throw new Error("No file uploaded");
    }
    const fileBlob = new Blob([req.file.buffer], { type: req.file.mimetype });
    const formData = new FormData();
    formData.append("api_token", VANCEAI_API_KEY);
    formData.append("file", fileBlob, req.file.originalname); // Use file buffer directly with filename and
    console.log(formData);

    const response = await axios.post(
      "https://api-service.vanceai.com/web_api/v1/upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    console.log(response);

    if (response.data.code !== 200) {
      throw new Error(`VanceAI API upload error: ${response}`);
    }

    res.json({ uid: response.data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/process-image", async (req, res) => {
  try {
    const { uid } = req.body;

    const jconfig = {
      name: "img2anime",
      config: {
        module: "img2anime",
        module_params: {
          model_name: "style1",
          description: "around 20 years old",
          control_mode: 0,
          style_strength: 11,
        },
      },
    };

    const config = JSON.stringify(jconfig);

    const response = await axios.post(
      "https://api-service.vanceai.com/web_api/v1/transform",
      {
        api_token: VANCEAI_API_KEY,
        uid: uid,
        jconfig: config, // No need to stringify with axios
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log(response.data); // Handle the respons

    res.json({ transId: response.data.data.trans_id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/poll-status", async (req, res) => {
  try {
    const { transId } = req.query;

    const statusResponse = await fetch(
      `https://api-service.vanceai.com/web_api/v1/transform_status?api_token=${VANCEAI_API_KEY}&trans_id=${transId}`
    );
    const statusData = await statusResponse.json();

    if (statusData.code !== 200) {
      throw new Error(`VanceAI API status error: ${statusData.code}`);
    }

    res.json(statusData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Download Image
app.post("/download-image", async (req, res) => {
  try {
    const { transId } = req.body;

    const downloadResponse = await fetch(
      "https://api-service.vanceai.com/web_api/v1/download",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          api_token: VANCEAI_API_KEY,
          trans_id: transId,
        }),
      }
    );
    console.log(downloadResponse);
    const imageBuffer = await downloadResponse.arrayBuffer();

    res.json({ image: Buffer.from(imageBuffer).toString("base64") });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/edit-image", async (req, res) => {
  try {
    const { prompt } = req.body;
    const { OpenAI } = await import("openai"); // Dynamic import

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1, // Number of images to generate
      quality: "hd",
      size: "1024x1024", // Image size
      style: "vivid",
    });
    console.log(response);

    const editedImageUrl = response.data[0].url; // Extract the image URL

    // Fetch the edited image data and send it as a base64 string
    const imageResponse = await fetch(editedImageUrl);
    const respondBuffer = await imageResponse.arrayBuffer(); // Use arrayBuffer()
    const base64Image = Buffer.from(respondBuffer).toString("base64");

    res.json({ data: [{ URL: base64Image }] });
  } catch (error) {
    console.error(error); // Log the complete error object for debugging
    if (error.response) {
      // If the error has a response object
      console.error(
        "OpenAI API Error:",
        error.response.status,
        error.response.statusText,
        error.response.data
      );
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

app.post("/analyze-image", async (req, res) => {
  try {
    // Handle file upload (expecting 'image' field in form data)
    console.log(req.body);
    const base64Image = req.body.image; // Get the base64 string directly

    // Make API request (replace with node-fetch)
    const { OpenAI } = await import("openai"); // Dynamic import

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "I need to create a prompt show What is in the photo.reate a prompt follow the format: Create a realistic photo {number} of persons, {number} of female or men, {nation} of person (asian if unknow nation), Specialy detail the person, face shape, accessories of the person, detail photo layout. Just return prompt no yapping",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
    });

    // if (!response.ok) {
    //   // or response.status !== 200
    //   throw new Error(
    //     `OpenAI API error: ${response.status} ${response.statusText}`
    //   );
    // }
    console.log(response);
    // Parse and send the response back to the client
    const messageContent = response.choices[0].message;
    res.json(messageContent);
  } catch (error) {
    console.error("Error analyzing image:", error);
    res.status(500).json({ error: "Failed to analyze image" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
