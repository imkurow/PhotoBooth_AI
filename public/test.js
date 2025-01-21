// Elements
const video = document.getElementById('video');
const canvas1 = document.getElementById('canvas1');
const canvas2 = document.getElementById('canvas2');
const canvas3 = document.getElementById('canvas3');
const canvas4 = document.getElementById('canvas4');
const startButton = document.getElementById('startButton');
const captureButton = document.getElementById('capture');
const swapButton = document.getElementById('swapBackground');
const photoTb = document.getElementById('photoTb');
const clearButton = document.getElementById('clearCanvas');
const downloadBtn = document.getElementById('downloadImage');
const syncPb = document.getElementById("syncMoodPb");
const overallMoodElement = document.getElementById("overallMoodElement");
const nowPlayingTb = document.getElementById('nowPlayingTb');
const emotionRanges = {
    happy: { energy: [0.7, 1], danceability: [0.7, 1]},
    sad: { energy: [0, 0.3], danceability: [0, 0.3]},
    angry: { energy: [0.7, 1], danceability: [0, 0.3]},
    neutral: { energy: [0.3, 0.7], danceability: [0.7, 1]},
    fearful: { energy: [0.7, 1], danceability: [0, 0.3]},
    surprised: { energy: [0.7, 1], danceability: [0.7, 1]},
    disgusted: { energy: [0.7, 1], danceability: [0, 0.3]},
};
let displayEmotions = true; // Initial state for emotion display
const emotionDisplay = document.getElementById('toggleDisplay');
emotionDisplay.addEventListener('click', () => {
  displayEmotions = !displayEmotions; // Toggle the state
  alert(`Emotion Display is now ${displayEmotions ? "ON" : "OFF"}`);
});

// Load CSV songs
async function loadTracks() {
    const response = await fetch('/src/filtered_songs.csv');
    const text = await response.text();
    const tracks = parseCSV(text); // You can use a CSV parser here, such as PapaParse
    return tracks;
}

// Filter tracks by emotion
function filterTracksByEmotion(tracks, emotion) {
    const range = emotionRanges[emotion];
    return tracks.filter(track => {
        return track.energy >= range.energy[0] && track.energy <= range.energy[1] &&
               track.danceability >= range.danceability[0] && track.danceability <= range.danceability[1];
    });
}

// Get a random track based on emotion
function getRandomTrack(filteredTracks) {
    const randomIndex = Math.floor(Math.random() * filteredTracks.length);
    return filteredTracks[randomIndex];
}

// Get a track based on emotion
async function getTrackBasedOnEmotion(emotion) {
    const tracks = await loadTracks();  // Load the tracks from CSV
    const filteredTracks = filterTracksByEmotion(tracks, emotion);  // Filter tracks by emotion
    if (filteredTracks.length > 0) {
        const randomTrack = getRandomTrack(filteredTracks);  // Get a random track from filtered list
        console.log('Random track for emotion ' + emotion + ': ', randomTrack);
        return randomTrack;  // This is your recommended track
    } else {
        console.log('No tracks found for this emotion.');
        return null;
    }
}

// Parse CSV with PapaParse
function parseCSV(csvText) {
    const parsed = Papa.parse(csvText, { header: true });
    return parsed.data;
}

let canvasArray = [canvas1, canvas2, canvas3, canvas4];
let currentCanvas = 0;
let allDetectedEmotions = [];

// Start camera
startButton.addEventListener('click', async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
});
captureButton.addEventListener('click', async () => {
  if (currentCanvas >= canvasArray.length) {
    alert("All canvases are filled!");
    return;
  }

  const canvas = canvasArray[currentCanvas];
  const ctx = canvas.getContext('2d');

  // Get video frame size
  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;

  // Set desired resolution for the canvas (e.g., 1280x720)
  const desiredWidth = 1280;
  const desiredHeight = 720;
  canvas.width = desiredWidth;
  canvas.height = desiredHeight;

  // Calculate cropping area
  let cropX = 0;
  let cropY = 0;
  let cropWidth = videoWidth;
  let cropHeight = videoHeight;

  if (videoWidth / videoHeight > desiredWidth / desiredHeight) {
    cropWidth = (videoHeight * desiredWidth) / desiredHeight;
    cropX = (videoWidth - cropWidth) / 2;
  } else {
    cropHeight = (videoWidth * desiredHeight) / desiredWidth;
    cropY = (videoHeight - cropHeight) / 2;
  }

  // Flip the image horizontally before drawing it
  ctx.save(); // Save the current state of the context
  ctx.scale(-1, 1); // Flip horizontally by scaling the x-axis by -1
  ctx.translate(-desiredWidth, 0); // Translate to maintain canvas position

  // Draw cropped and flipped video frame onto the canvas
  ctx.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, desiredWidth, desiredHeight);

  ctx.restore(); // Restore context to its original state

  // Detect emotions using Face API.js
  const detections = await faceapi.detectAllFaces(canvas).withFaceExpressions();

  // Store detected emotions
  allDetectedEmotions = [];
  const drawOptions = {
    lineWidth: 3,  // Line width of the box
    strokeStyle: '#F8CD43'  // Change the color of the bounding box to red (you can choose any color)
  };

  // Loop through each detected face and draw bounding boxes and emotions
  detections.forEach((detection, index) => {

    const box = detection.detection.box;
    const expressions = detection.expressions;

    // Draw bounding box
    faceapi.draw.drawDetections(canvas, [detection], drawOptions);

    // Get the emotion with the highest confidence
    const dominantEmotionKey = Object.keys(expressions).reduce((a, b) =>
      expressions[a] > expressions[b] ? a : b
    );

    // Store the dominant emotion for the current face
    allDetectedEmotions.push(dominantEmotionKey);

    // Draw the emotion label for each face
    ctx.font = '64px Arial';
    ctx.fillStyle = '#F8CD43';
    ctx.fillText(dominantEmotionKey, box.x, box.y > 30 ? box.y - 10 : box.y + 20);
  });

  currentCanvas++;
  if (currentCanvas === canvasArray.length) {
    calculateOverallEmotion();
  }
});


// Swap background
swapButton.addEventListener("click", function() {
  const canvasContainer = document.getElementById("canvasContainer");
  const currentColor = canvasContainer.style.backgroundColor;
  if (canvasContainer) {
      if(currentColor === "white") {
          canvasContainer.style.backgroundColor = "black";
          syncPb.src = "src/image/SYNCURMOODBLACK.png";
      } else {
          canvasContainer.style.backgroundColor = "white";
          syncPb.src = "src/image/SYNCURMOODWHITE.png";
      }
  }
});

// Clear canvas
clearButton.addEventListener('click', () => {
  canvasArray.forEach(canvas => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });
  currentCanvas = 0;
  allDetectedEmotions = [];
  overallMoodElement.textContent = '';
  nowPlayingTb.textContent = '';
  alert('All canvases have been cleared!');
});

// Calculate overall emotion
function calculateOverallEmotion() {
  const emotionCounts = {};
  
  allDetectedEmotions.forEach((emotion) => {
    emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
  });

  const overallEmotion = Object.keys(emotionCounts).reduce((a, b) =>
    emotionCounts[a] > emotionCounts[b] ? a : b
  );

  displayMoodAndTrack(overallEmotion);
  alert(`The overall dominant emotion is: ${overallEmotion}`);
}


// Display mood and track
async function displayMoodAndTrack(overallEmotion) {
  const track = await getTrackBasedOnEmotion(overallEmotion); // Get track based on the emotion

  overallMoodElement.textContent = `The overall mood: ${overallEmotion}`;

  if (track) {
      let artists = track.artists;
      artists = artists.replace(/[\[\]']/g, '').trim();

      if (Array.isArray(artists)) {
          artists = artists.filter(artist => artist.trim() !== '').join(', ');
      } else {
          artists = artists.trim();
      }

      nowPlayingTb.textContent = ` Now Playing: ${track.name} - ${artists}`;
  } else {
      nowPlayingTb.textContent = ' No track found for this mood.';
  }
}

// Download canvas as image
downloadBtn.addEventListener("click", function() {
  html2canvas(document.getElementById("canvasContainer"), {
      backgroundColor: null,
      scale: 3,
      logging: true,
      useCORS: true,
      scrollX: 0,
      scrollY: -window.scrollY,
  }).then(function(canvas) {
      const imageData = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = imageData;
      link.download = "SyncsationPhotobooth.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  }).catch(function(error) {
      console.error("Error capturing canvas:", error);
  });
});

// Load Face API.js models
async function loadModels() {
  await faceapi.nets.ssdMobilenetv1.loadFromUri('models');
  await faceapi.nets.faceExpressionNet.loadFromUri('models');
  console.log("Face API models loaded.");
}

// Initialize Face API.js
loadModels();
