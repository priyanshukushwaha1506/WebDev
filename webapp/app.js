/* global PDFLib */
"use strict";

const { PDFDocument } = PDFLib;
const MAX_PREVIEW_SIDE = 1200;
const MAX_A4_IMAGE_SIDE = 3508;
const IMAGE_FORMATS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const fileInput = document.querySelector("#file-input");
const browseButton = document.querySelector("#browse-files");
const dropZone = document.querySelector("#drop-zone");
const autoCropInput = document.querySelector("#auto-crop");
const imagePageSize = document.querySelector("#image-page-size");
const fileList = document.querySelector("#file-list");
const fileCount = document.querySelector("#file-count");
const statusMessage = document.querySelector("#status");
const makePdfButton = document.querySelector("#make-pdf");
const clearButton = document.querySelector("#clear-files");
const shareButton = document.querySelector("#share-pdf");
const shareAppButton = document.querySelector("#share-app");
const installButton = document.querySelector("#install-app");
const installDialog = document.querySelector("#install-dialog");
const installIntro = document.querySelector("#install-intro");
const installSteps = document.querySelector("#install-steps");
const cropDialog = document.querySelector("#crop-dialog");
const cropCanvas = document.querySelector("#crop-canvas");
const pdfPreviewDialog = document.querySelector("#pdf-preview-dialog");
const pdfPreviewPages = document.querySelector("#pdf-preview-pages");
const pdfPreviewLoading = document.querySelector("#pdf-preview-loading");
const pdfPreviewCount = document.querySelector("#pdf-preview-count");
const downloadPdfButton = document.querySelector("#download-pdf");
const backToEditButton = document.querySelector("#back-to-edit");
const toast = document.querySelector("#toast");
const items = [];

let lastPdf = null;
let cropTargetId = null;
let cropImage = null;
let cropSelection = null;
let cropPointerStart = null;
let deferredInstallPrompt = null;
let toastTimeout = null;
let previewObserver = null;
let previewDocument = null;
let isAssembling = false;
const previewRenderTasks = new Set();
let previewGeneration = 0;

function showStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => {
    toast.hidden = true;
  }, 3600);
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(file) {
  const extension = `.${file.name.split(".").pop().toLowerCase()}`;
  const imageType = file.type.toLowerCase();
  return IMAGE_FORMATS.has(extension)
    && (!imageType || ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(imageType));
}

function isPdf(file) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

function updateControls() {
  const hasFiles = items.length > 0;
  fileCount.textContent = hasFiles
    ? `${items.length} file${items.length === 1 ? "" : "s"} in merge order`
    : "No files added yet";
  makePdfButton.disabled = !hasFiles || isAssembling;
  clearButton.disabled = !hasFiles || isAssembling;
  fileInput.disabled = isAssembling;
  browseButton.disabled = isAssembling;
  autoCropInput.disabled = isAssembling;
  imagePageSize.disabled = isAssembling;
}

function renderList() {
  fileList.replaceChildren();
  items.forEach((item, index) => {
    const row = document.createElement("li");
    row.className = "file-item";
    row.dataset.id = item.id;
    const preview = document.createElement("div");
    preview.className = item.previewUrl ? "file-preview" : "file-type";
    preview.setAttribute("aria-hidden", "true");
    if (item.previewUrl) {
      const image = document.createElement("img");
      image.src = item.previewUrl;
      image.alt = "";
      preview.append(image);
    } else {
      preview.textContent = "PDF";
    }

    const info = document.createElement("div");
    info.className = "file-info";
    const name = document.createElement("div");
    name.className = "file-name";
    name.textContent = item.file.name;
    const detail = document.createElement("div");
    detail.className = "file-detail";
    detail.textContent = `${item.isPdf ? "PDF document" : "Image"} · ${formatSize(item.file.size)}${item.crop ? " · cropped" : ""}`;
    info.append(name, detail);

    const controls = document.createElement("div");
    controls.className = "file-controls";
    if (item.isImage) {
      const crop = document.createElement("button");
      crop.className = "icon-button crop-control";
      crop.type = "button";
      crop.textContent = item.crop ? "Edit crop" : "Crop";
      crop.setAttribute("aria-label", `${item.crop ? "Edit crop for" : "Crop"} ${item.file.name}`);
      crop.disabled = isAssembling;
      crop.addEventListener("click", () => {
        if (!isAssembling) openCrop(item.id);
      });
      controls.append(crop);
    }
    controls.append(
      createIconButton("↑", `Move ${item.file.name} up`, isAssembling || index === 0, () => moveItem(index, -1)),
      createIconButton("↓", `Move ${item.file.name} down`, isAssembling || index === items.length - 1, () => moveItem(index, 1)),
      createIconButton("×", `Remove ${item.file.name}`, isAssembling, () => removeItem(item.id)),
    );
    row.append(preview, info, controls);
    fileList.append(row);
  });
  updateControls();
}

function createIconButton(label, ariaLabel, disabled, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "icon-button";
  button.textContent = label;
  button.setAttribute("aria-label", ariaLabel);
  button.disabled = disabled;
  button.addEventListener("click", action);
  return button;
}

function moveItem(index, direction) {
  if (isAssembling) return;
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= items.length) return;
  [items[index], items[newIndex]] = [items[newIndex], items[index]];
  renderList();
}

function removeItem(id) {
  if (isAssembling) return;
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return;
  const [removed] = items.splice(index, 1);
  if (removed.previewUrl) URL.revokeObjectURL(removed.previewUrl);
  discardPdfPreview();
  renderList();
  showStatus(items.length ? "Files are ready to combine." : "Choose files to get started.");
}

function addFiles(fileCollection) {
  if (isAssembling) return;
  const existing = new Set(items.map((item) => `${item.file.name}:${item.file.size}:${item.file.lastModified}`));
  let added = 0;
  let rejected = 0;
  for (const file of fileCollection) {
    if (!isPdf(file) && !isImage(file)) {
      rejected += 1;
      continue;
    }
    const key = `${file.name}:${file.size}:${file.lastModified}`;
    if (existing.has(key)) continue;
    existing.add(key);
    const image = isImage(file);
    items.push({
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      file,
      isPdf: !image,
      isImage: image,
      crop: null,
      previewUrl: image ? URL.createObjectURL(file) : null,
    });
    added += 1;
  }
  renderList();
  if (rejected) showStatus(`${rejected} unsupported file(s) skipped.`, true);
  else if (added) showStatus(`${added} file${added === 1 ? "" : "s"} added. Arrange the order if needed.`);
  if (!added && !rejected) showStatus("Those files have already been added.");
  fileInput.value = "";
}

function pointerPosition(event) {
  const rect = cropCanvas.getBoundingClientRect();
  const scaleX = cropCanvas.width / rect.width;
  const scaleY = cropCanvas.height / rect.height;
  return {
    x: Math.max(0, Math.min(cropCanvas.width, (event.clientX - rect.left) * scaleX)),
    y: Math.max(0, Math.min(cropCanvas.height, (event.clientY - rect.top) * scaleY)),
  };
}

function drawCropPreview() {
  const context = cropCanvas.getContext("2d");
  context.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
  context.drawImage(cropImage, 0, 0, cropCanvas.width, cropCanvas.height);
  if (!cropSelection) return;
  const left = Math.min(cropSelection.x1, cropSelection.x2);
  const top = Math.min(cropSelection.y1, cropSelection.y2);
  const width = Math.abs(cropSelection.x2 - cropSelection.x1);
  const height = Math.abs(cropSelection.y2 - cropSelection.y1);
  context.fillStyle = "rgb(0 0 0 / 46%)";
  context.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
  context.clearRect(left, top, width, height);
  context.drawImage(cropImage, left, top, width, height, left, top, width, height);
  context.strokeStyle = "#ffffff";
  context.lineWidth = 2;
  context.setLineDash([7, 4]);
  context.strokeRect(left, top, width, height);
}

async function openCrop(id) {
  const item = items.find((entry) => entry.id === id);
  if (!item) return;
  try {
    cropImage = await createImageBitmap(item.file);
  } catch (error) {
    showStatus(`This image could not be opened: ${error.message}`, true);
    return;
  }
  cropTargetId = id;
  const scale = Math.min(1, MAX_PREVIEW_SIDE / Math.max(cropImage.width, cropImage.height));
  cropCanvas.width = Math.max(1, Math.round(cropImage.width * scale));
  cropCanvas.height = Math.max(1, Math.round(cropImage.height * scale));
  cropSelection = item.crop
    ? {
        x1: item.crop.left * cropCanvas.width,
        y1: item.crop.top * cropCanvas.height,
        x2: item.crop.right * cropCanvas.width,
        y2: item.crop.bottom * cropCanvas.height,
      }
    : null;
  drawCropPreview();
  cropDialog.showModal();
}

cropCanvas.addEventListener("pointerdown", (event) => {
  if (!cropImage) return;
  cropCanvas.setPointerCapture(event.pointerId);
  cropPointerStart = pointerPosition(event);
  cropSelection = { x1: cropPointerStart.x, y1: cropPointerStart.y, x2: cropPointerStart.x, y2: cropPointerStart.y };
  drawCropPreview();
});

cropCanvas.addEventListener("pointermove", (event) => {
  if (!cropPointerStart) return;
  const point = pointerPosition(event);
  cropSelection.x2 = point.x;
  cropSelection.y2 = point.y;
  drawCropPreview();
});

function finishCropSelection() {
  cropPointerStart = null;
}
cropCanvas.addEventListener("pointerup", finishCropSelection);
cropCanvas.addEventListener("pointercancel", finishCropSelection);

document.querySelector("#apply-crop").addEventListener("click", () => {
  if (!cropSelection || Math.abs(cropSelection.x2 - cropSelection.x1) < 5 || Math.abs(cropSelection.y2 - cropSelection.y1) < 5) {
    showToast("Drag over the image to choose an area to keep.");
    return;
  }
  const target = items.find((item) => item.id === cropTargetId);
  if (target) {
    target.crop = {
      left: Math.min(cropSelection.x1, cropSelection.x2) / cropCanvas.width,
      top: Math.min(cropSelection.y1, cropSelection.y2) / cropCanvas.height,
      right: Math.max(cropSelection.x1, cropSelection.x2) / cropCanvas.width,
      bottom: Math.max(cropSelection.y1, cropSelection.y2) / cropCanvas.height,
    };
    discardPdfPreview();
    renderList();
  }
  cropDialog.close();
});

document.querySelector("#reset-crop").addEventListener("click", () => {
  const target = items.find((item) => item.id === cropTargetId);
  if (target) {
    target.crop = null;
    discardPdfPreview();
    renderList();
  }
  cropDialog.close();
});

cropDialog.addEventListener("close", () => {
  if (cropImage) cropImage.close();
  cropImage = null;
  cropTargetId = null;
  cropSelection = null;
});

function bytesFromBlob(blob) {
  return blob.arrayBuffer();
}

async function imageBytesForPdf(item) {
  const image = await createImageBitmap(item.file);
  const left = item.crop ? item.crop.left : 0;
  const top = item.crop ? item.crop.top : 0;
  const right = item.crop ? item.crop.right : 1;
  const bottom = item.crop ? item.crop.bottom : 1;
  const sourceX = Math.round(left * image.width);
  const sourceY = Math.round(top * image.height);
  const sourceWidth = Math.max(1, Math.round(right * image.width) - sourceX);
  const sourceHeight = Math.max(1, Math.round(bottom * image.height) - sourceY);
  const canvas = document.createElement("canvas");
  canvas.width = sourceWidth;
  canvas.height = sourceHeight;
  const context = canvas.getContext("2d", { willReadFrequently: autoCropInput.checked });
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
  image.close();
  const contentBounds = autoCropInput.checked ? detectContentBounds(canvas) : null;
  const finalBounds = contentBounds || { left: 0, top: 0, right: 1, bottom: 1 };
  const isJpeg = item.file.type === "image/jpeg" || /\.jpe?g$/i.test(item.file.name);
  const imageType = isJpeg ? "image/jpeg" : "image/png";
  const sourceLeft = Math.round(finalBounds.left * sourceWidth);
  const sourceTop = Math.round(finalBounds.top * sourceHeight);
  const sourceRight = Math.round(finalBounds.right * sourceWidth);
  const sourceBottom = Math.round(finalBounds.bottom * sourceHeight);
  const croppedWidth = Math.max(1, sourceRight - sourceLeft);
  const croppedHeight = Math.max(1, sourceBottom - sourceTop);
  const resolutionScale = imagePageSize.value === "a4"
    ? Math.min(1, MAX_A4_IMAGE_SIDE / Math.max(croppedWidth, croppedHeight))
    : 1;
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = Math.max(1, Math.round(croppedWidth * resolutionScale));
  outputCanvas.height = Math.max(1, Math.round(croppedHeight * resolutionScale));
  const outputContext = outputCanvas.getContext("2d", { alpha: !isJpeg });
  if (isJpeg) {
    outputContext.fillStyle = "#fff";
    outputContext.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
  }
  outputContext.drawImage(
    canvas,
    sourceLeft,
    sourceTop,
    croppedWidth,
    croppedHeight,
    0,
    0,
    outputCanvas.width,
    outputCanvas.height,
  );
  const blob = await new Promise((resolve, reject) => {
    outputCanvas.toBlob(
      (result) => result ? resolve(result) : reject(new Error("Could not prepare an image for the PDF.")),
      imageType,
      isJpeg ? 0.94 : undefined,
    );
  });
  return { bytes: await bytesFromBlob(blob), width: outputCanvas.width, height: outputCanvas.height, imageType };
}

function detectContentBounds(canvas) {
  const preview = document.createElement("canvas");
  const scale = Math.min(1, 240 / Math.max(canvas.width, canvas.height));
  preview.width = Math.max(1, Math.round(canvas.width * scale));
  preview.height = Math.max(1, Math.round(canvas.height * scale));
  const context = preview.getContext("2d", { willReadFrequently: true });
  context.drawImage(canvas, 0, 0, preview.width, preview.height);
  const { data } = context.getImageData(0, 0, preview.width, preview.height);
  const width = preview.width;
  const height = preview.height;
  const patchSize = Math.max(2, Math.min(8, Math.floor(Math.min(width, height) / 12)));
  const cornerColors = [
    [patchSize, patchSize],
    [width - patchSize * 2, patchSize],
    [patchSize, height - patchSize * 2],
    [width - patchSize * 2, height - patchSize * 2],
  ].map(([startX, startY]) => {
    const total = [0, 0, 0];
    for (let y = startY; y < startY + patchSize; y += 1) {
      for (let x = startX; x < startX + patchSize; x += 1) {
        const offset = (y * width + x) * 4;
        total[0] += data[offset];
        total[1] += data[offset + 1];
        total[2] += data[offset + 2];
      }
    }
    const count = patchSize * patchSize;
    return total.map((channel) => channel / count);
  });

  let closestPair = null;
  let closestDistance = Infinity;
  for (let first = 0; first < cornerColors.length; first += 1) {
    for (let second = first + 1; second < cornerColors.length; second += 1) {
      const distance = Math.sqrt(cornerColors[first].reduce(
        (sum, channel, index) => sum + (channel - cornerColors[second][index]) ** 2,
        0,
      ));
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPair = [cornerColors[first], cornerColors[second]];
      }
    }
  }
  if (!closestPair || closestDistance > 52) return null;
  const background = closestPair[0].map((channel, index) => (channel + closestPair[1][index]) / 2);
  const isContentPixel = (x, y) => {
    const offset = (y * width + x) * 4;
    const distance = Math.sqrt(
      (data[offset] - background[0]) ** 2
      + (data[offset + 1] - background[1]) ** 2
      + (data[offset + 2] - background[2]) ** 2,
    );
    return distance > 56;
  };
  const rowHasContent = (y) => {
    let contentPixels = 0;
    for (let x = 0; x < width; x += 1) {
      if (isContentPixel(x, y)) contentPixels += 1;
    }
    return contentPixels / width > 0.006;
  };
  const columnHasContent = (x) => {
    let contentPixels = 0;
    for (let y = 0; y < height; y += 1) {
      if (isContentPixel(x, y)) contentPixels += 1;
    }
    return contentPixels / height > 0.006;
  };

  let top = 0;
  while (top < height && !rowHasContent(top)) top += 1;
  let bottom = height - 1;
  while (bottom >= top && !rowHasContent(bottom)) bottom -= 1;
  let left = 0;
  while (left < width && !columnHasContent(left)) left += 1;
  let right = width - 1;
  while (right >= left && !columnHasContent(right)) right -= 1;
  if (left >= right || top >= bottom) return null;

  const padX = Math.ceil(width * 0.015);
  const padY = Math.ceil(height * 0.015);
  left = Math.max(0, left - padX);
  top = Math.max(0, top - padY);
  right = Math.min(width - 1, right + padX);
  bottom = Math.min(height - 1, bottom + padY);
  if (left > width * 0.2 || top > height * 0.2
    || width - right - 1 > width * 0.2 || height - bottom - 1 > height * 0.2) return null;
  if ((right - left) / width < 0.65 || (bottom - top) / height < 0.65) return null;
  if (left <= padX && top <= padY && right >= width - padX - 1 && bottom >= height - padY - 1) return null;

  return {
    left: left / width,
    top: top / height,
    right: (right + 1) / width,
    bottom: (bottom + 1) / height,
  };
}

function safePdfName(value) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").replace(/\.pdf$/i, "").trim() || "assembled-document";
}

async function assemblePdf(onProgress) {
  if (items.length === 0) throw new Error("Add at least one PDF or photo first.");
  const result = await PDFDocument.create();
  const itemCount = items.length;
  for (const [index, item] of items.entries()) {
    onProgress(index, itemCount, item);
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    if (item.isPdf) {
      const source = await PDFDocument.load(await bytesFromBlob(item.file));
      const pages = await result.copyPages(source, source.getPageIndices());
      for (const page of pages) result.addPage(page);
      continue;
    }
    const imageData = await imageBytesForPdf(item);
    const embedded = imageData.imageType === "image/jpeg"
      ? await result.embedJpg(imageData.bytes)
      : await result.embedPng(imageData.bytes);
    if (imagePageSize.value === "a4") {
      const isLandscape = imageData.width > imageData.height;
      const pageWidth = isLandscape ? 841.89 : 595.28;
      const pageHeight = isLandscape ? 595.28 : 841.89;
      const padding = 24;
      const scale = Math.min(
        (pageWidth - padding * 2) / imageData.width,
        (pageHeight - padding * 2) / imageData.height,
      );
      const width = imageData.width * scale;
      const height = imageData.height * scale;
      const page = result.addPage([pageWidth, pageHeight]);
      page.drawImage(embedded, {
        x: (pageWidth - width) / 2,
        y: (pageHeight - height) / 2,
        width,
        height,
      });
    } else {
      const page = result.addPage([imageData.width * 0.75, imageData.height * 0.75]);
      page.drawImage(embedded, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
    }
  }
  return result.save();
}

function downloadPdf(file) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function destroyPreviewDocument() {
  const documentProxy = previewDocument;
  previewDocument = null;
  if (documentProxy) {
    documentProxy.destroy().catch((error) => {
      console.error("Could not release PDF preview resources:", error);
    });
  }
}

function discardPdfPreview() {
  lastPdf = null;
  downloadPdfButton.disabled = true;
  shareButton.disabled = true;
  if (pdfPreviewDialog.open) closePdfPreview();
}

async function renderPdfPage(pageNumber, loadingTask, generation) {
  const container = pdfPreviewPages.querySelector(`[data-page-number="${pageNumber}"]`);
  if (!container || generation !== previewGeneration) return false;
  if (container.dataset.rendered === "true") return Boolean(container.querySelector("canvas"));
  if (container.dataset.rendering === "true") return false;
  container.dataset.rendering = "true";
  let renderTask = null;
  let pdfPage = null;
  try {
    pdfPage = await loadingTask.getPage(pageNumber);
    if (generation !== previewGeneration) return false;
    const availableWidth = Math.min(800, Math.max(240, pdfPreviewPages.clientWidth - 36));
    const baseViewport = pdfPage.getViewport({ scale: 1 });
    const scale = Math.min(1.5, availableWidth / baseViewport.width);
    const viewport = pdfPage.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: false });
    const outputScale = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.ceil(viewport.width * outputScale);
    canvas.height = Math.ceil(viewport.height * outputScale);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    container.replaceChildren(container.querySelector(".pdf-page-number"), canvas);
    renderTask = pdfPage.render({
      canvasContext: context,
      viewport,
      transform: outputScale === 1 ? null : [outputScale, 0, 0, outputScale, 0, 0],
    });
    previewRenderTasks.add(renderTask);
    await renderTask.promise;
    if (generation !== previewGeneration) return false;
    container.dataset.rendered = "true";
    return true;
  } catch (error) {
    if (generation !== previewGeneration || error.name === "RenderingCancelledException") return false;
    container.querySelector(".pdf-page-placeholder")?.remove();
    const message = document.createElement("span");
    message.className = "pdf-page-error";
    message.textContent = "This page preview could not be rendered.";
    container.append(message);
    console.error(`Could not render PDF page ${pageNumber}:`, error);
    return false;
  } finally {
    if (renderTask) previewRenderTasks.delete(renderTask);
    if (pdfPage) pdfPage.cleanup();
    container.dataset.rendering = "false";
  }
}

function releasePdfPage(container) {
  if (container.dataset.rendered !== "true" || container.dataset.rendering === "true") return;
  const canvas = container.querySelector("canvas");
  const pageNumber = container.dataset.pageNumber;
  if (!canvas || pageNumber === "1") return;
  canvas.width = 0;
  canvas.height = 0;
  const badge = container.querySelector(".pdf-page-number");
  const placeholder = document.createElement("span");
  placeholder.className = "pdf-page-placeholder";
  placeholder.textContent = `Page ${pageNumber} preview loads as you scroll`;
  container.replaceChildren(placeholder, badge);
  container.dataset.rendered = "false";
}

async function openPdfPreview(file) {
  previewGeneration += 1;
  const generation = previewGeneration;
  if (previewObserver) previewObserver.disconnect();
  for (const renderTask of previewRenderTasks) renderTask.cancel();
  previewRenderTasks.clear();
  destroyPreviewDocument();
  pdfPreviewPages.replaceChildren(pdfPreviewLoading);
  pdfPreviewLoading.hidden = false;
  pdfPreviewLoading.textContent = "Preparing your PDF preview…";
  pdfPreviewCount.textContent = "Loading pages";
  downloadPdfButton.disabled = true;
  shareButton.disabled = true;
  pdfPreviewDialog.classList.add("is-loading");
  if (!pdfPreviewDialog.open) pdfPreviewDialog.showModal();

  try {
    const pdfjs = await import("./vendor/pdf-preview.js");
    pdfjs.GlobalWorkerOptions.workerSrc = "./vendor/pdf-preview-worker.js";
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    const documentProxy = await loadingTask.promise;
    if (generation !== previewGeneration) {
      await documentProxy.destroy();
      return;
    }
    previewDocument = documentProxy;
    pdfPreviewLoading.hidden = true;
    pdfPreviewCount.textContent = `${documentProxy.numPages} page${documentProxy.numPages === 1 ? "" : "s"} · Scroll to review`;

    const pageBatchSize = 8;
    for (let firstPage = 1; firstPage <= documentProxy.numPages; firstPage += pageBatchSize) {
      const pageNumbers = Array.from(
        { length: Math.min(pageBatchSize, documentProxy.numPages - firstPage + 1) },
        (_, offset) => firstPage + offset,
      );
      const pageDimensions = await Promise.all(pageNumbers.map(async (pageNumber) => {
        const pageProxy = await documentProxy.getPage(pageNumber);
        const viewport = pageProxy.getViewport({ scale: 1 });
        pageProxy.cleanup();
        return { pageNumber, width: viewport.width, height: viewport.height };
      }));
      if (generation !== previewGeneration) {
        await documentProxy.destroy();
        if (previewDocument === documentProxy) previewDocument = null;
        return;
      }
      for (const { pageNumber, width, height } of pageDimensions) {
        const pageContainer = document.createElement("div");
        pageContainer.className = "pdf-page-preview";
        pageContainer.dataset.pageNumber = String(pageNumber);
        pageContainer.dataset.rendered = "false";
        pageContainer.dataset.rendering = "false";
        pageContainer.setAttribute("aria-label", `PDF page ${pageNumber}`);
        pageContainer.style.aspectRatio = `${width} / ${height}`;
        const placeholder = document.createElement("span");
        placeholder.className = "pdf-page-placeholder";
        placeholder.textContent = `Page ${pageNumber} preview loads as you scroll`;
        const badge = document.createElement("span");
        badge.className = "pdf-page-number";
        badge.textContent = `Page ${pageNumber}`;
        pageContainer.append(placeholder, badge);
        pdfPreviewPages.append(pageContainer);
      }
    }

    const firstPageRendered = await renderPdfPage(1, documentProxy, generation);
    if (!firstPageRendered || generation !== previewGeneration) {
      throw new Error("The first page could not be displayed for review.");
    }
    previewObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          renderPdfPage(Number(entry.target.dataset.pageNumber), documentProxy, generation);
        } else {
          releasePdfPage(entry.target);
        }
      }
    }, { root: pdfPreviewPages, rootMargin: "500px 0px" });
    for (const pageContainer of pdfPreviewPages.querySelectorAll(".pdf-page-preview")) {
      previewObserver.observe(pageContainer);
    }
    pdfPreviewDialog.classList.remove("is-loading");
    downloadPdfButton.disabled = false;
    shareButton.disabled = false;
  } catch (error) {
    if (generation !== previewGeneration) return;
    destroyPreviewDocument();
    pdfPreviewLoading.hidden = false;
    pdfPreviewLoading.textContent = `Could not prepare the preview: ${error.message}`;
    pdfPreviewLoading.classList.add("status", "error");
    pdfPreviewCount.textContent = "Preview failed";
    pdfPreviewDialog.classList.remove("is-loading");
    console.error("Could not create PDF preview:", error);
  }
}

async function makePdf() {
  if (isAssembling) return;
  isAssembling = true;
  updateControls();
  statusMessage.setAttribute("aria-busy", "true");
  makePdfButton.disabled = true;
  showStatus("Preparing your PDF on this device…");
  try {
    const bytes = await assemblePdf((index, count, item) => {
      showStatus(`Preparing file ${index + 1} of ${count}: ${item.file.name}`);
    });
    const firstName = items[0].file.name;
    const filename = `${safePdfName(firstName)}-combined.pdf`;
    lastPdf = new File([bytes], filename, { type: "application/pdf" });
    showStatus("Review every page before downloading or sharing.");
    await openPdfPreview(lastPdf);
  } catch (error) {
    const hint = /encrypted|password/i.test(error.message)
      ? " This PDF may be password-protected; remove its password before adding it."
      : "";
    showStatus(`Could not create the PDF: ${error.message}.${hint}`, true);
  } finally {
    isAssembling = false;
    statusMessage.removeAttribute("aria-busy");
    updateControls();
  }
}

async function sharePdf() {
  if (!lastPdf) {
    showToast("Create the PDF first.");
    return;
  }
  if (navigator.canShare && navigator.canShare({ files: [lastPdf] }) && navigator.share) {
    try {
      await navigator.share({ files: [lastPdf], title: "PDF document", text: "PDF created with PDF Assembler" });
    } catch (error) {
      if (error.name !== "AbortError") showToast(`Sharing was not available: ${error.message}`);
    }
    return;
  }
  showToast("This device cannot share files directly. Download the reviewed PDF first.");
}

function closePdfPreview() {
  previewGeneration += 1;
  if (previewObserver) {
    previewObserver.disconnect();
    previewObserver = null;
  }
  for (const renderTask of previewRenderTasks) renderTask.cancel();
  previewRenderTasks.clear();
  destroyPreviewDocument();
  pdfPreviewDialog.close();
  pdfPreviewPages.replaceChildren(pdfPreviewLoading);
  pdfPreviewLoading.hidden = false;
  pdfPreviewLoading.classList.remove("status", "error");
  pdfPreviewCount.textContent = "";
  pdfPreviewDialog.classList.remove("is-loading");
}

async function shareApp() {
  const shareData = {
    title: "PDF Assembler",
    text: "Combine PDFs and photos privately in your browser:",
    url: window.location.href,
  };

  if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
    try {
      await navigator.share(shareData);
    } catch (error) {
      if (error.name !== "AbortError") showToast(`Could not open the share menu: ${error.message}`);
    }
    return;
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareData.text} ${shareData.url}`)}`;
  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  showToast("WhatsApp opened with the app link. Choose a contact to send it.");
}

function clearFiles() {
  for (const item of items) {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
  }
  items.splice(0, items.length);
  discardPdfPreview();
  renderList();
  showStatus("Choose files to get started.");
}

fileInput.addEventListener("change", () => addFiles(fileInput.files));
browseButton.addEventListener("click", () => fileInput.click());
document.querySelector("#step-add").addEventListener("click", () => fileInput.click());
document.querySelector("#step-arrange").addEventListener("click", () => {
  if (items.length === 0) {
    showToast("Add a PDF or photo first, then arrange the file order here.");
    fileInput.click();
    return;
  }
  fileList.scrollIntoView({ behavior: "smooth", block: "center" });
  fileList.focus({ preventScroll: true });
  showStatus("Use the up and down arrows beside each file to choose the PDF order.");
});
document.querySelector("#step-save").addEventListener("click", () => {
  if (items.length === 0) {
    showToast("Add a PDF or photo before creating a preview.");
    fileInput.click();
    return;
  }
  makePdf();
});
dropZone.addEventListener("click", (event) => {
  if (event.target.closest("button")) return;
  fileInput.click();
});
dropZone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    fileInput.click();
  }
});
for (const eventName of ["dragenter", "dragover"]) {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("drag-over");
  });
}
for (const eventName of ["dragleave", "drop"]) {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("drag-over");
  });
}
dropZone.addEventListener("drop", (event) => addFiles(event.dataTransfer.files));
clearButton.addEventListener("click", clearFiles);
makePdfButton.addEventListener("click", makePdf);
shareButton.addEventListener("click", sharePdf);
downloadPdfButton.addEventListener("click", () => {
  if (!lastPdf || downloadPdfButton.disabled) return;
  downloadPdf(lastPdf);
  showStatus("Reviewed PDF downloaded.");
  showToast("Your reviewed PDF has been downloaded.");
});
document.querySelector("#close-pdf-preview").addEventListener("click", closePdfPreview);
backToEditButton.addEventListener("click", closePdfPreview);
pdfPreviewDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closePdfPreview();
});
shareAppButton.addEventListener("click", shareApp);

function showInstallGuide() {
  const platform = navigator.userAgentData?.platform || navigator.platform || "";
  const userAgent = navigator.userAgent;
  let steps;
  if (/iPhone|iPad|iPod/i.test(userAgent) || (/Mac/i.test(platform) && navigator.maxTouchPoints > 1)) {
    installIntro.textContent = "On your iPhone or iPad, add this website to your Home Screen from Safari.";
    steps = [
      "Open this page in Safari.",
      "Tap the Share button.",
      "Scroll down and tap Add to Home Screen, then tap Add.",
    ];
  } else if (/Android/i.test(userAgent)) {
    installIntro.textContent = "Add PDF Assembler to your Android Home Screen for quick access.";
    steps = [
      "Open this page in Chrome.",
      "Tap the three-dot menu in the top corner.",
      "Tap Install app or Add to Home screen, then confirm.",
    ];
  } else {
    installIntro.textContent = "Install PDF Assembler from your desktop browser for quick access.";
    steps = [
      "In Chrome or Edge, select the install icon in the address bar, if shown.",
      "Alternatively, open the browser menu and choose Install PDF Assembler or Apps > Install this site as an app.",
      "Confirm the prompt to add the app to your device.",
    ];
  }
  installSteps.replaceChildren(...steps.map((step) => {
    const item = document.createElement("li");
    item.textContent = step;
    return item;
  }));
  installDialog.showModal();
}

async function promptInstall() {
  if (!deferredInstallPrompt) {
    showInstallGuide();
    return;
  }
  const promptEvent = deferredInstallPrompt;
  deferredInstallPrompt = null;
  await promptEvent.prompt();
  const { outcome } = await promptEvent.userChoice;
  if (outcome === "dismissed") showInstallGuide();
}

installButton.addEventListener("click", promptInstall);
document.querySelector("#install-help").addEventListener("click", promptInstall);

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
});

window.addEventListener("appinstalled", () => {
  installButton.textContent = "App installed";
  installButton.disabled = true;
  showToast("PDF Assembler was added to your home screen.");
});

if ("serviceWorker" in navigator && window.isSecureContext) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" })
      .then((registration) => {
        registration.update().catch((error) => {
          console.error("Could not check for app updates:", error);
        });
      })
      .catch((error) => {
        console.error("Could not enable offline support:", error);
      });
  });
}

renderList();
