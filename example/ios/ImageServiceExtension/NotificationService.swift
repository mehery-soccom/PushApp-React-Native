import UserNotifications

class NotificationService: UNNotificationServiceExtension {

    private var contentHandler: ((UNNotificationContent) -> Void)?
    private var bestAttemptContent: UNMutableNotificationContent?

    override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
        
        self.contentHandler = contentHandler
        self.bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)

        guard let bestAttemptContent else {
            contentHandler(request.content)
            return
        }

        print("📥 Notification received in Service Extension")

        // MARK: Extract all media URLs (media1, media2, media3...)
        let userInfo = request.content.userInfo
        let mediaKeys = userInfo.keys.filter { ($0 as? String)?.hasPrefix("media") == true }

        let urls: [URL] = mediaKeys.compactMap { key in
            if let urlStr = userInfo[key] as? String,
               let url = URL(string: urlStr) {
                return url
            }
            return nil
        }

        if urls.isEmpty {
            print("⚠️ No media URLs found")
            contentHandler(bestAttemptContent)
            return
        }

        print("🔗 Found \(urls.count) media URLs")

        downloadAllImages(urls: urls, content: bestAttemptContent)
    }

    // MARK: Download multiple images
    private func downloadAllImages(urls: [URL], content: UNMutableNotificationContent) {
        let group = DispatchGroup()
        var attachments: [UNNotificationAttachment] = []

        for (index, url) in urls.enumerated() {
            group.enter()

            downloadImage(url: url, index: index) { attachment in
                if let attachment {
                    attachments.append(attachment)
                }
                group.leave()
            }
        }

        group.notify(queue: .main) {
            print("📦 Download complete: \(attachments.count) attachments")

            content.attachments = attachments
            self.contentHandler?(content)
        }
    }

    // MARK: Download a single image
    private func downloadImage(url: URL, index: Int, completion: @escaping (UNNotificationAttachment?) -> Void) {

        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = 10
        config.timeoutIntervalForResource = 10

        let task = URLSession(configuration: config).downloadTask(with: url) { location, _, error in

            if let error = error {
                print("❌ Failed to download \(url): \(error.localizedDescription)")
                completion(nil)
                return
            }

            guard let location else {
                print("⚠️ No file for URL: \(url)")
                completion(nil)
                return
            }

            let tmpUrl = URL(fileURLWithPath: NSTemporaryDirectory())
                .appendingPathComponent("image_\(index)_\(UUID().uuidString).jpg")

            do {
                try FileManager.default.moveItem(at: location, to: tmpUrl)
                let attachment = try UNNotificationAttachment(identifier: "image_\(index)", url: tmpUrl)
                print("✅ Attached image \(index)")
                completion(attachment)
            } catch {
                print("⚠️ Error attaching image \(index): \(error)")
                completion(nil)
            }
        }
        task.resume()
    }

    override func serviceExtensionTimeWillExpire() {
        print("⏳ Service extension time expired")
        if let contentHandler, let bestAttemptContent {
            contentHandler(bestAttemptContent)
        }
    }
}
