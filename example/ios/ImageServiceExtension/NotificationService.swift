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
            contentHandler(request.content)
            return
        }

        let userInfo = request.content.userInfo

        // ---------------------------------------------------------
        // LOGO (process first)
        // ---------------------------------------------------------
        if let logoUrlString = userInfo["logo"] as? String,
           let logoUrl = URL(string: logoUrlString) {

            downloadTempFile(url: logoUrl) { tempUrl in
                if let tempUrl = tempUrl,
                   let attachment = try? UNNotificationAttachment(
                       identifier: "logo",
                       url: tempUrl
                   ) {
                    content.attachments.insert(attachment, at: 0)
                }

                self.processImages(
                    userInfo: userInfo,
                    content: content,
                    contentHandler: contentHandler
                )
            }
            return
        }

        // No logo
        processImages(
            userInfo: userInfo,
            content: content,
            contentHandler: contentHandler
        )
    }

    // ---------------------------------------------------------
    // MARK: - Image Processing
    // ---------------------------------------------------------
    private func processImages(
        userInfo: [AnyHashable: Any],
        content: UNMutableNotificationContent,
        contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        var imageUrls: [String] = []

        // image_url: string or array
        if let single = userInfo["image_url"] as? String {
            imageUrls = [single]
        } else if let multiple = userInfo["image_url"] as? [String] {
            imageUrls = multiple
        }

        // fallback: images
        if imageUrls.isEmpty,
           let images = userInfo["images"] as? [String] {
            imageUrls = images
        }

        // fallback: media-url
        if imageUrls.isEmpty,
           let media = userInfo["media-url"] as? String {
            imageUrls = [media]
        }

        // raw guard
        guard !imageUrls.isEmpty else {
            contentHandler(content)
            return
        }

        // 🔥 sanitize dashboard garbage ("", "   ")
        imageUrls = imageUrls
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }

        // post-clean guard
        guard !imageUrls.isEmpty else {
            contentHandler(content)
            return
        }

        // single vs multiple
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
    // MARK: - Multiple Images
    // ---------------------------------------------------------
    private func downloadMultipleImages(
        urlStrings: [String],
        content: UNMutableNotificationContent,
        completion: @escaping (UNNotificationContent) -> Void
    ) {
        var attachments = Array<UNNotificationAttachment?>(repeating: nil, count: urlStrings.count)
        let group = DispatchGroup()

        for (index, urlString) in urlStrings.enumerated() {
            guard let url = URL(string: urlString) else { continue }

            group.enter()
            downloadTempFile(url: url) { tempUrl in
                defer { group.leave() }

                guard let tempUrl = tempUrl,
                      let attachment = try? UNNotificationAttachment(
                          identifier: "image_\(index)",
                          url: tempUrl
                      ) else {
                    return
                }

                attachments[index] = attachment
            }
        }

        group.notify(queue: .main) {
            let validAttachments = attachments.compactMap { $0 }
            content.attachments.append(contentsOf: validAttachments)
            completion(content)
        }
    }

    // ---------------------------------------------------------
    // MARK: - Single Image
    // ---------------------------------------------------------
    private func downloadAndAttachSingleImage(
        url: URL,
        content: UNMutableNotificationContent,
        contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        downloadTempFile(url: url) { tempUrl in
            if let tempUrl = tempUrl,
               let attachment = try? UNNotificationAttachment(
                   identifier: "image_0",
                   url: tempUrl
               ) {
                content.attachments.append(attachment)
            }
            contentHandler(content)
        }
    }

    // ---------------------------------------------------------
    // MARK: - Temp File Download
    // ---------------------------------------------------------
    private func downloadTempFile(
        url: URL,
        completion: @escaping (URL?) -> Void
    ) {
        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = 12
        config.timeoutIntervalForResource = 12

        let task = URLSession(configuration: config)
            .downloadTask(with: url) { location, _, error in

                guard error == nil, let location = location else {
                    completion(nil)
                    return
                }

                let tempDir = NSTemporaryDirectory()
                let fileUrl = URL(fileURLWithPath: tempDir)
                    .appendingPathComponent("img_\(UUID().uuidString).jpg")

                do {
                    try FileManager.default.moveItem(at: location, to: fileUrl)
                    completion(fileUrl)
                } catch {
                    completion(nil)
                }
            }

        task.resume()
    }

    // ---------------------------------------------------------
    // MARK: - Timeout Fallback
    // ---------------------------------------------------------
    override func serviceExtensionTimeWillExpire() {
        if let handler = contentHandler,
           let content = bestAttemptContent {
            handler(content)
        }
    }
}
