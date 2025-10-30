import UserNotifications

class NotificationService: UNNotificationServiceExtension {
    override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
        let bestAttemptContent = (request.content.mutableCopy() as! UNMutableNotificationContent)
        
        if let mediaUrl = request.content.userInfo["media-url"] as? String,
           let url = URL(string: mediaUrl) {
            
            downloadAndAttachImage(url: url, content: bestAttemptContent, contentHandler: contentHandler)
        } else {
            contentHandler(bestAttemptContent)
        }
    }
    
    private func downloadAndAttachImage(
    url: URL,
    content: UNMutableNotificationContent,
    contentHandler: @escaping (UNNotificationContent) -> Void
) {
    let config = URLSessionConfiguration.ephemeral
    config.timeoutIntervalForRequest = 10
    config.timeoutIntervalForResource = 10

    let session = URLSession(configuration: config)
    let task = session.downloadTask(with: url) { location, _, error in
        if let error = error {
            print("❌ Error downloading image: \(error.localizedDescription)")
            contentHandler(content)
            return
        }

        guard let location = location else {
            print("⚠️ No file location found")
            contentHandler(content)
            return
        }

        let tmpDirectory = NSTemporaryDirectory()
        let tmpFile = "image_\(UUID().uuidString).jpg"
        let tmpUrl = URL(fileURLWithPath: tmpDirectory).appendingPathComponent(tmpFile)

        do {
            try FileManager.default.moveItem(at: location, to: tmpUrl)
            let attachment = try UNNotificationAttachment(identifier: "image", url: tmpUrl)
            content.attachments = [attachment]
            print("✅ Image attached successfully")
        } catch {
            print("⚠️ Error attaching image: \(error)")
        }

        contentHandler(content)
    }
    task.resume()
}

    
    override func serviceExtensionTimeWillExpire() {
        // Handle timeout
    }
}