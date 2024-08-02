<template>
  <div class="loading-overlay" v-if="isLoading">
    <img src="@/assets/loading.gif" alt="Loading..." />
  </div>
  <div class="container-fluid h-100">
    <h1 class="text-center mb-4">AI Convert Tool</h1>
    <div class="row justify-content-center align-items-center h-100">
      <!-- Upload Section -->
      <div class="col-md-6">
        <div class="card shadow-sm mb-0">
          <div class="card-body text-center">
            <file-pond
              v-show="showFileInput"
              ref="pond"
              :allow-multiple="false"
              :accepted-file-types="acceptedFileTypes"
              @updatefiles="handleFileUpdate"
              class="mb-4"
            />
            <div v-if="uploadedImage" class="uploaded-photo mb-0">
              <img
                :src="uploadedImage"
                alt="Uploaded Photo"
                ref="image"
                class="img-fluid rounded shadow-sm"
                @load="initializeCropper"
              />
            </div>
            <div class="form-check form-switch mb-4">
              <input
                class="form-check-input"
                type="checkbox"
                role="switch"
                id="aiConvertToggle"
                v-model="useAIConvert"
              />
              <label class="form-check-label text-white" for="aiConvertToggle"
                >Use AI Conversion</label
              >
            </div>
            <button
              @click="
                isLoading = true;
                cropImage();
              "
              :disabled="!uploadedImage || isLoading"
              class="btn btn-primary"
            >
              Apply
            </button>
            <button
              @click="cancelCropping"
              :disabled="!uploadedImage"
              class="btn btn-danger ml-2"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <!-- Preview Section -->
      <div class="col-md-6">
        <div class="card shadow-sm text-center">
          <div class="card-body">
            <div class="frame-preview position-relative mb-4">
              <img
                v-if="!framedImage"
                :src="frameImageSrc"
                alt="Cropped Photo"
                class="img-fluid rounded shadow-sm"
              />
              <img
                v-if="framedImage"
                :src="framedImage"
                alt="Frame"
                class="position-absolute top-0 start-0 w-100 h-100"
              />
            </div>
            <button
              @click="downloadFramedImage"
              :disabled="!framedImage"
              class="btn btn-success"
            >
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import vueFilePond from "vue-filepond";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import "filepond/dist/filepond.min.css";
import Cropper from "cropperjs";
import "cropperjs/dist/cropper.min.css";
import axios from "axios";

export default {
  components: {
    FilePond: vueFilePond(FilePondPluginFileValidateType),
  },
  data() {
    return {
      uploadedImage: null,
      croppedImage: null,
      framedImage: null,
      editedImage: null,
      frameImageSrc: require("@/assets/frame.png"),
      acceptedFileTypes: ["image/jpeg", "image/png"],
      cropper: null,
      showFileInput: true, // Control this flag to show/hide the file input
      isLoading: false,
      faceDetected: true,
      isPrompt: false,
      useAIConvert: false,
    };
  },
  methods: {
    async handleFileUpdate(files) {
      this.isLoading = true;
      if (files.length > 0) {
        const file = files[0].file;
        this.uploadedImage = await URL.createObjectURL(file);
        this.showFileInput = false; // Control this flag to show/hide the file input
      } else {
        this.resetImages();
      }
      this.isLoading = false;
    },
    cancelCropping() {
      this.uploadedImage = null;
      this.croppedImage = null;
      if (this.cropper) {
        this.cropper.destroy();
        this.cropper = null;
      }
      const pond = this.$refs.pond;
      if (pond) {
        pond.removeFiles();
      }
      this.resetImages();
      this.isLoading = false;
    },
    async initializeCropper() {
      this.loading = true;

      this.$refs.image.onload;
      if (this.$refs.image) {
        this.cropper = await new Cropper(this.$refs.image, {
          aspectRatio: 1,
          viewMode: 1,
          ready: () => {
            console.log("Cropper ready!");
          },
        });
      }
      this.loading = false;
    },

    async cropImage() {
      if (!this.cropper) {
        await this.initializeCropper();
      } else {
        this.isLoading = true;
        const canvas = await this.cropper.getCroppedCanvas();

        this.croppedImage = canvas.toDataURL("image/png");
      }
      if (!this.useAIConvert) {
        this.editedImage = this.croppedImage;
        await this.createFramedPhoto();
        this.loading = false;
        return;
      }

      const resizedImageDataUrl = await this.resizeImage(
        this.uploadedImage,
        4 * 1024 * 1024
      );

      try {
        await this.createPrompt(resizedImageDataUrl);
      } catch (error) {
        console.error("Error applying edit:", error);
        // Handle the error, e.g., show an error message to the user
      } finally {
        this.loading = false;
      }

      this.isLoading = false;
    },

    async resizeImage(imageDataUrl, maxBytes) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = imageDataUrl;
        img.onload = async () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          // Calculate aspect ratio and new dimensions
          const aspectRatio = img.width / img.height;
          let newWidth = img.width;
          let newHeight = img.height;

          // If image is too large, resize it while maintaining aspect ratio
          if (imageDataUrl.length > maxBytes) {
            const targetBytes = maxBytes * 0.9; // Give a little buffer to account for encoding overhead
            const scaleFactor = Math.sqrt(targetBytes / imageDataUrl.length);
            newWidth = Math.round(img.width * scaleFactor);
            newHeight = Math.round(newWidth / aspectRatio);
          }

          canvas.width = newWidth;
          canvas.height = newHeight;
          ctx.drawImage(img, 0, 0, newWidth, newHeight);

          // Try resizing with different image quality if result is still too large
          let resizedImageDataUrl = canvas.toDataURL("image/jpeg", 0.92); // Start with high quality
          while (
            resizedImageDataUrl.length > maxBytes &&
            newWidth > 100 &&
            newHeight > 100
          ) {
            // Minimum size to prevent infinite loop
            newWidth = Math.round(newWidth * 0.95);
            newHeight = Math.round(newWidth / aspectRatio);
            canvas.width = newWidth;
            canvas.height = newHeight;
            ctx.drawImage(img, 0, 0, newWidth, newHeight);
            resizedImageDataUrl = canvas.toDataURL(
              "image/jpeg",
              0.92 - (resizedImageDataUrl.length - maxBytes) / (10 * maxBytes)
            ); // Adjust quality dynamically
          }

          resolve(resizedImageDataUrl);
        };

        img.onerror = (err) => {
          reject(new Error("Failed to load image: " + err));
        };
      });
    },

    async applyYoungerEdit(prompt) {
      this.loading = true; // Show loading indicator
      var promptAdjust =
        prompt + "make persons in picture look like 18 years old";
      try {
        const response = await axios.post(
          "https://photo-frame-app.onrender.com/edit-image", // Replace with your actual backend URL
          {
            prompt: promptAdjust,
          }
        );

        const data = await response.data;
        console.log("Response from API:", data);

        // Extract editedImage from data.data[0].URL
        if (data && data.data && data.data.length > 0 && data.data[0].URL) {
          this.editedImage = data.data[0].URL;
          await this.createFramedPhoto();
        } else {
          console.error("Error: No editedImage found in the response.");
          this.loading = false;
        }
      } catch (error) {
        console.error("Error applying edit:", error);
        this.loading = false;
      }
    },

    async createPrompt(imageData) {
      this.loading = true; // Show loading indicator

      try {
        const blob = await fetch(imageData).then((res) => res.blob());
        const bfile = new File([blob], "image.png", { type: "image/png" });
        const file = await this.toBase64(bfile); // Convert to base64

        const response = await axios.post(
          "https://photo-frame-app.onrender.com/analyze-image", // Replace with your actual backend URL
          {
            image: file,
          }
        );

        const data = await response.data;
        console.log("Response from API:", response);

        // Extract editedImage from data.data[0].URL
        if (data.content) {
          await this.applyYoungerEdit(data.content);
        } else {
          console.error("Error: No editedImage found in the response.");
          this.loading = false;
        }
      } catch (error) {
        console.error("Error applying edit:", error);
        this.loading = false;
      }
    },

    async toBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(",")[1]);
        // Extract base64 data
        reader.onerror = (error) => reject(error);
      });
    },
    dataURLtoFile(dataurl, filename) {
      var arr = dataurl.split(","),
        mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]),
        n = bstr.length,
        u8arr = new Uint8Array(n);

      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }

      return new File([u8arr], filename, { type: mime });
    },

    async createFramedPhoto() {
      const image = new Image();
      image.crossOrigin = "anonymous"; // Allow loading from a different origin (OpenAI's server)
      if (!this.faceDetected || !this.useAIConvert) {
        image.src = this.editedImage;
      } else {
        image.src = `data:image/png;base64,${this.editedImage}`; // Use the edited image URL directly
      }

      const frame = new Image();
      frame.src = this.frameImageSrc;

      await Promise.all([
        new Promise((resolve) => (image.onload = resolve)),
        new Promise((resolve) => (frame.onload = resolve)),
      ]); // Wait for both images to load

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = frame.width;
      canvas.height = frame.height;

      // Draw the edited image scaled to the frame size
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      // Draw the frame on top
      ctx.drawImage(frame, 0, 0);

      this.framedImage = canvas.toDataURL("image/png");
      this.isLoading = false;
    },

    downloadFramedImage() {
      if (this.framedImage) {
        const link = document.createElement("a");
        link.href = this.framedImage;
        link.download = "framed-image.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    },
    resetImages() {
      this.uploadedImage = null;
      this.croppedImage = null;
      this.framedImage = null;
      if (this.cropper) {
        this.cropper.destroy();
        this.cropper = null;
      }
      this.showFileInput = true;
    },
  },
};
</script>

<style scoped>
body {
}
.card {
  background-color: #181818; /* Darker card background */
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.5); /* Subtle neon glow */
  border: 1px solid #c3248e; /* Neon green border */
}

h1 {
  font-family: "Orbitron", sans-serif; /* Futuristic font */
  text-shadow: 0 0 5px #fbfafc; /* Subtle purple text shadow */
}
.card {
  width: 100%; /* Ensure cards use up the full space available in the column */
  margin: 0 auto;
}

.container-fluid {
  padding-right: 0;
  padding-left: 0;
  margin-right: auto;
  margin-left: auto;
}
.frame-preview {
  min-height: 400px; /* Minimum height for the image preview area */
}
.container {
  @apply mx-auto px-4 py-6;
}

h1 {
  @apply text-3xl font-bold text-center mb-6;
}

.upload-section,
.preview-section {
  @apply bg-white p-6 shadow-lg rounded-lg mb-4;
}

.uploaded-photo img,
.frame-preview img {
  @apply max-w-full h-auto rounded shadow-lg;
}

.frame-preview {
  @apply relative mb-4;
  height: auto; /* Ensure the container fits the content */
}

.frame-preview img:first-child {
  @apply absolute inset-0 w-full h-full object-cover rounded;
  z-index: 10; /* Ensure the frame overlays the image */
}

.frame-preview img:last-child {
  @apply relative z-20; /* Make the image come above the frame */
}

button {
  @apply mt-4 px-4 py-2 bg-purple-500 text-white font-semibold rounded hover:bg-blue-500 disabled:bg-gray-300 transition-colors duration-300 ease-in-out;
}

button:hover {
  @apply bg-blue-500; /* Changed to blue-500 for hover */
}

button:disabled {
  @apply bg-gray-300 text-black cursor-not-allowed;
}
.loading-overlay {
  @apply absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10; /* Adjust as needed */
}

@media (min-width: 768px) {
  /* TailwindCSS breakpoint for medium screens */
  .card {
    width: calc(
      50% - 1rem
    ); /* Responsive: two cards side by side on wider screens */
  }
}

@media (max-width: 767px) {
  /* Adjustments for smaller screens */
  .card {
    width: 100%; /* Full width on smaller screens */
  }
}
</style>
