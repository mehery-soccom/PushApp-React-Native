import UserNotifications

class NotificationService: UNNotificationServiceExtension {

    private var contentHandler: ((UNNotificationContent) -> Void)?
    private var bestAttemptContent: UNMutableNotificationContent?

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        self.contentHandler = contentHandler
        self.bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)

        guard let content = bestAttemptContent else {
            return contentHandler(request.content)
        }

        let userInfo = request.content.userInfo

        // -------------------------------
        // 📌 1. MULTIPLE IMAGE SUPPORT
        // -------------------------------
        if let imageUrls = userInfo["images"] as? [String], !imageUrls.isEmpty {
            downloadMultipleImages(urlStrings: imageUrls, content: content, completion: contentHandler)
            return
        }

        // -------------------------------
        // 📌 2. Single image fallback
        // -------------------------------
        if let mediaUrl = userInfo["media-url"] as? String,
           let url = URL(string: mediaUrl) {
            downloadAndAttachSingleImage(url: url, content: content, contentHandler: contentHandler)
            return
        }

        // No images
        contentHandler(content)
    }

    // ============================================================
    // MARK: - MULTIPLE IMAGE DOWNLOAD
    // ============================================================
    private func downloadMultipleImages(
        urlStrings: [String],
        content: UNMutableNotificationContent,
        completion: @escaping (UNNotificationContent) -> Void
    ) {
        var attachments: [UNNotificationAttachment] = []
        let group = DispatchGroup()

        for (index, urlString) in urlStrings.enumerated() {
            guard let url = URL(string: urlString) else { continue }

            group.enter()
            downloadTempFile(url: url) { tempUrl in
                if let tempUrl = tempUrl {
                    if let attachment = try? UNNotificationAttachment(
                        identifier: "image_\(index)",
                        url: tempUrl
                    ) {
                        attachments.append(attachment)
                    }
                }
                group.leave()
            }
        }

        group.notify(queue: .main) {
            print("📸 Downloaded \(attachments.count) images.")

            content.attachments = attachments
            completion(content)
        }
    }

    // ============================================================
    // MARK: - SINGLE IMAGE DOWNLOAD
    // ============================================================
    private func downloadAndAttachSingleImage(
        url: URL,
        content: UNMutableNotificationContent,
        contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        downloadTempFile(url: url) { tempUrl in
            if let tempUrl = tempUrl,
               let attachment = try? UNNotificationAttachment(identifier: "image", url: tempUrl) {
                content.attachments = [attachment]
                print("✅ Single image attached")
            }
            contentHandler(content)
        }
    }

    // ============================================================
    // MARK: - TEMP FILE DOWNLOAD HANDLER
    // ============================================================
    private func downloadTempFile(url: URL, completion: @escaping (URL?) -> Void) {
        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = 10
        config.timeoutIntervalForResource = 10

        let session = URLSession(configuration: config)
        let task = session.downloadTask(with: url) { location, _, error in
            if let error = error {
                print("❌ Error downloading file: \(error.localizedDescription)")
                completion(nil)
                return
            }

            guard let location = location else {
                print("⚠️ Download location missing")
                completion(nil)
                return
            }

            let tmpDirectory = NSTemporaryDirectory()
            let filename = "img_\(UUID().uuidString).jpg"
            let tmpUrl = URL(fileURLWithPath: tmpDirectory).appendingPathComponent(filename)

            do {
                try FileManager.default.moveItem(at: location, to: tmpUrl)
                completion(tmpUrl)
            } catch {
                print("⚠️ File move error: \(error)")
                completion(nil)
            }
        }

        task.resume()
    }

    override func serviceExtensionTimeWillExpire() {
        // Called just before the extension times out
        if let contentHandler = contentHandler, let bestAttemptContent = bestAttemptContent {
            contentHandler(bestAttemptContent)
        }
    }
}
