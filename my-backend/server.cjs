require("dotenv").config();
// server.js (or your backend file)

const express = require("express");
const fetch = require("node-fetch"); // Or use another HTTP client
const app = express();
const cors = require("cors");

app.use(
  cors({
    origin: "https://suadacaphe.github.io", // Replace with your Vue app's origin
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" })); // or any other appropriate limit
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.json());

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
      size: "1024x1024", // Image size
      style: "natural",
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
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "I need prompt for another AI engine can create the same photo. Specialy the face should be described detail for another app can create the face can reconigze as the original photo. Just return the prompt. No yapping",
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
// function dataURLtoFile(dataurl, filename) {
//   var arr = dataurl.split(","),
//     mime = arr[0].match(/:(.*?);/)[1],
//     bstr = atob(arr[1]),
//     n = bstr.length,
//     u8arr = new Uint8Array(n);

//   while (n--) {
//     u8arr[n] = bstr.charCodeAt(n);
//   }

//   return new File([u8arr], filename, { type: mime });
// }

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// app.use((req, res, next) => {
//   res.header("Access-Control-Allow-Origin", "http://localhost:8080"); // Replace with your frontend's origin
//   res.header(
//     "Access-Control-Allow-Headers",
//     "Origin, X-Requested-With, Content-Type, Accept"
//   );
//   next();
// });
