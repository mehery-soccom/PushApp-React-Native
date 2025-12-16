import UserNotifications

class NotificationService: UNNotificationServiceExtension {

    private var contentHandler: ((UNNotificationContent) -> Void)?
    private var bestAttemptContent: UNMutableNotificationContent?

    // ---------------------------------------------------------
    // MARK: - didReceive
    // ---------------------------------------------------------
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

        // ---------------------------------------------------------
        // 📌 LOGO DOWNLOAD (must be processed before images)
        // ---------------------------------------------------------
        if let logoUrlString = userInfo["logo"] as? String,
           let logoUrl = URL(string: logoUrlString) {

            downloadTempFile(url: logoUrl) { tempUrl in
                if let tempUrl = tempUrl,
                   let attachment = try? UNNotificationAttachment(
                       identifier: "logo",
                       url: tempUrl
                   ) {
                    print("🟦 Logo downloaded & attached")
                    content.attachments.insert(attachment, at: 0)
                }

                // Continue once logo is handled
                self.processImages(
                    userInfo: userInfo,
                    content: content,
                    contentHandler: contentHandler
                )
            }

            return
        }

        // No logo → directly process images
        processImages(userInfo: userInfo, content: content, contentHandler: contentHandler)
    }

    // ---------------------------------------------------------
    // MARK: - Image Processing Logic
    // ---------------------------------------------------------
    private func processImages (
    userInfo: [AnyHashable: Any],
    content: UNMutableNotificationContent,
    contentHandler: @escaping (UNNotificationContent) -> Void
) {

    var imageUrls: [String] = []

    // ---------------------------------------------------------
    // image_url → string OR array
    // ---------------------------------------------------------
    if let single = userInfo["image_url"] as? String {
        imageUrls = [single]
    } else if let multiple = userInfo["image_url"] as? [String] {
        imageUrls = multiple
    }

    // ---------------------------------------------------------
    // fallback: images (array)
    // ---------------------------------------------------------
    if imageUrls.isEmpty,
       let images = userInfo["images"] as? [String] {
        imageUrls = images
    }

    // ---------------------------------------------------------
    // fallback: media-url (single)
    // ---------------------------------------------------------
    if imageUrls.isEmpty,
       let media = userInfo["media-url"] as? String {
        imageUrls = [media]
    }

    guard !imageUrls.isEmpty else {
        contentHandler(content)
        return
    }

    // ---------------------------------------------------------
    // single vs multiple handling
    // ---------------------------------------------------------
    if imageUrls.count == 1,
       let url = URL(string: imageUrls[0]) {
        downloadAndAttachSingleImage(
            url: url,
            content: content,
            contentHandler: contentHandler
        )
    } else {
        downloadMultipleImages(
            urlStrings: imageUrls,
            content: content,
            completion: contentHandler
        )
    }
}


    // ---------------------------------------------------------
    // MARK: - MULTIPLE IMAGE DOWNLOAD
    // ---------------------------------------------------------
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
                if let tempUrl = tempUrl,
                   let attachment = try? UNNotificationAttachment(
                       identifier: "image_\(index)",
                       url: tempUrl
                   ) {
                    attachments.append(attachment)
                }
                group.leave()
            }
        }

        group.notify(queue: .main) {
            print("📸 Downloaded \(attachments.count) images.")
            content.attachments.append(contentsOf: attachments)
            completion(content)
        }
    }

    // ---------------------------------------------------------
    // MARK: - SINGLE IMAGE DOWNLOAD
    // ---------------------------------------------------------
    private func downloadAndAttachSingleImage(
        url: URL,
        content: UNMutableNotificationContent,
        contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        downloadTempFile(url: url) { tempUrl in
            if let tempUrl = tempUrl,
               let attachment = try? UNNotificationAttachment(
                   identifier: "image",
                   url: tempUrl
               ) {
                content.attachments = [attachment]
                print("✅ Single image attached")
            }
            contentHandler(content)
        }
    }

    // ---------------------------------------------------------
    // MARK: - TEMP FILE DOWNLOAD
    // ---------------------------------------------------------
    private func downloadTempFile(url: URL, completion: @escaping (URL?) -> Void) {
        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = 12
        config.timeoutIntervalForResource = 12

        let session = URLSession(configuration: config)
        let task = session.downloadTask(with: url) { location, _, error in

            if let error = error {
                print("❌ Error downloading file: \(error.localizedDescription)")
                completion(nil)
                return
            }

            guard let location = location else {
                print("⚠️ Missing temp file location")
                completion(nil)
                return
            }

            let tmpDirectory = NSTemporaryDirectory()
            let filename = "img_\(UUID().uuidString).jpg"
            let tempUrl = URL(fileURLWithPath: tmpDirectory).appendingPathComponent(filename)

            do {
                try FileManager.default.moveItem(at: location, to: tempUrl)
                completion(tempUrl)
            } catch {
                print("⚠️ File move error: \(error.localizedDescription)")
                completion(nil)
            }
        }

        task.resume()
    }

    // ---------------------------------------------------------
    // MARK: - Fallback
    // ---------------------------------------------------------
    override func serviceExtensionTimeWillExpire() {
        if let handler = contentHandler, let content = bestAttemptContent {
            handler(content)
        }
    }
}
