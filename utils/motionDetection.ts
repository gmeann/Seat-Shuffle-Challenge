export const calculateMotion = (
  currentImageData: ImageData,
  previousImageData: ImageData | null
): number => {
  if (!previousImageData) return 0;

  const data1 = currentImageData.data;
  const data2 = previousImageData.data;
  const length = data1.length;
  let diffSum = 0;
  let pixelCount = 0;

  // Skip pixels for performance (check every 4th pixel)
  for (let i = 0; i < length; i += 4 * 4) {
    const rDiff = Math.abs(data1[i] - data2[i]);
    const gDiff = Math.abs(data1[i + 1] - data2[i + 1]);
    const bDiff = Math.abs(data1[i + 2] - data2[i + 2]);
    
    // Threshold to ignore minor noise (Lowered from 30 to 20 for better detection)
    if (rDiff + gDiff + bDiff > 20) {
      diffSum += rDiff + gDiff + bDiff;
    }
    pixelCount++;
  }

  if (pixelCount === 0) return 0;
  
  // Normalize score roughly between 0 and 100
  const avgDiff = diffSum / pixelCount;
  return Math.min(100, (avgDiff / 30) * 100); // Adjusted normalization factor
};