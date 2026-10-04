# PDF Assembler for Chrome and mobile

This is a static, installable web app. PDFs and photos are processed locally in the browser. Files are not sent to a server.

## Try it on this computer

Open `index.html` in Chrome to try basic file selection and merging. For app installation and offline support, serve the folder from a secure HTTPS website or from `localhost`.

## Publish it so your phone can open it

1. Extract the app package.
2. For Netlify, either import this project from a Git repository (Netlify uses the included `netlify.toml` and publishes `webapp`) or upload the contents of `webapp` to [Netlify Drop](https://app.netlify.com/drop). Keep the `vendor` and `icons` folders alongside `index.html`.
3. Open the resulting HTTPS address in Chrome on your phone.
4. In Chrome's menu, choose **Install app** or **Add to Home screen**.
5. Tap **Share app** in the header to send the app link to others. On a phone, choose WhatsApp or another app from the share menu.
6. Tap **Preview PDF** and review the generated pages. Use **Back to edit** to change the order, crop, or page settings. **Download PDF** and **Share PDF** are enabled only after the first page is rendered for review.
7. To send the reviewed PDF to WhatsApp, tap **Share PDF** and choose WhatsApp from the share sheet, then choose the recipient.

The **Add**, **Arrange**, and **Save or share** cards on the home screen are shortcuts to choose files, review file order, and open the PDF preview.

WhatsApp or the phone/browser may ask you to confirm the chat and sending. The app never sends a file without your action.

## Updating the deployed app

For ongoing changes, connect the Netlify site to a Git repository and commit/push edits to the `webapp` folder; Netlify can then publish each change automatically. The repository-level `netlify.toml` sets `webapp` as the publish directory and prevents stale deployment files from being held by browser caches. With manual deploys, upload the new `webapp` contents to the existing Netlify site, not a new Drop site.

Installed copies check the deployed files again when opened online and use their cached copy offline. After a deployment, close and reopen or refresh the installed app to load the latest version. A Netlify Drop site that has not been claimed is temporary and expires; claim it in Netlify before relying on its address for future updates.

## Install from Android or publish to Google Play

On Android, open the deployed HTTPS site in Chrome and choose **Install app** or **Add to Home screen**. This installs the PWA without a Play Store listing. Publishing there requires a separate Android Trusted Web Activity package, a stable verified HTTPS domain, Digital Asset Links signing configuration, and a Google Play developer account; a website deployment alone does not publish an Android app.

## Supported files and limitations

- Any number of unencrypted PDFs and JPEG, PNG, WebP, or GIF image files.
- All pages of each PDF are copied in their selected order.
- Photos are kept in full by default. **Auto-crop blank borders** is an optional setting; the automatic detector is conservative and leaves images unchanged when it cannot identify safe margins. You can also crop an individual photo by hand.
- **Image page size** can keep the photo's original page dimensions or fit the whole image onto portrait or landscape A4 without cutting it off. Both image settings apply to every photo and do not change existing PDF pages.
- Files are processed in browser memory. Large files may use substantial device memory.
- Phone JPEG photos are re-encoded at high quality to avoid a much larger intermediate PNG and reduce output size. PNG, WebP, and GIF inputs remain lossless in the generated PDF.
- Animated images are added as a single still image in the browser.
- PDF form fields, digital signatures, and unusual interactive features may not be retained by PDF page copying. Keep your original files.

## Offline and installable behavior

The app shell and PDF engine are cached by its service worker after the first visit. Installation requires an HTTPS address (or `localhost` during local development); opening the files directly from a downloaded ZIP does not enable install/offline features.
The app includes SVG, 192×192, and 512×512 install icons. When the app is online, its service worker checks the network first and refreshes its offline cache; when offline, it falls back to the last cached files. The service worker checks for updates on page load and its script is excluded from browser caching.

The included `vendor/pdf-lib.min.js` is pdf-lib 1.17.1. Its license is in `vendor/pdf-lib-LICENSE.md`.
PDF page previews are rendered locally using pdf.js 4.10.38. Its license is in `vendor/pdfjs-LICENSE`.
