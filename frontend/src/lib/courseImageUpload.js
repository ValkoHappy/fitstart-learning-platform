const MAX_COURSE_IMAGE_SIDE = 1600;
const MAX_COURSE_IMAGE_BYTES = 1800 * 1024;
function readImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image decode failed"));
    };
    image.src = url;
  });
}
function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}
export async function prepareCourseImageForUpload(file) {
  if (!file || !file.type?.startsWith("image/") || file.type === "image/gif") {
    return file;
  }
  if (file.size <= MAX_COURSE_IMAGE_BYTES) {
    return file;
  }
  const image = await readImage(file);
  const scale = Math.min(
    1,
    MAX_COURSE_IMAGE_SIDE / Math.max(image.width, image.height),
  );
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, width, height);
  const blob = await canvasToBlob(canvas, "image/jpeg", 0.86);
  if (!blob) {
    return file;
  }
  const name = file.name.replace(/\.[^.]+$/, "") || "course-cover";
  return new File([blob], `${name}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
