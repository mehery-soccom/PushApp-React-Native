import UserNotifications

class NotificationService: UNNotificationServiceExtension {

  var contentHandler: ((UNNotificationContent) -> Void)?
  var bestAttemptContent: UNMutableNotificationContent?

  override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
    self.contentHandler = contentHandler
    bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)

    guard let bestAttemptContent = bestAttemptContent else {
      return
    }

    if let attachmentURLString = request.content.userInfo["image-url"] as? String,
       let attachmentURL = URL(string: attachmentURLString) {
      downloadImageFrom(url: attachmentURL) { attachment in
        if let attachment = attachment {
          bestAttemptContent.attachments = [attachment]
        }
        contentHandler(bestAttemptContent)
      }
    } else {
      contentHandler(bestAttemptContent)
    }
  }

  override func serviceExtensionTimeWillExpire() {
    if let contentHandler = contentHandler, let bestAttemptContent = bestAttemptContent {
      contentHandler(bestAttemptContent)
    }
  }

  private func downloadImageFrom(url: URL, completion: @escaping (UNNotificationAttachment?) -> Void) {
    let task = URLSession.shared.downloadTask(with: url) { (downloadedUrl, _, error) in
      guard let downloadedUrl = downloadedUrl else {
        completion(nil)
        return
      }

      let tmpDir = URL(fileURLWithPath: NSTemporaryDirectory())
      let uniqueURL = tmpDir.appendingPathComponent(url.lastPathComponent)

      try? FileManager.default.moveItem(at: downloadedUrl, to: uniqueURL)

      do {
        let attachment = try UNNotificationAttachment(identifier: "image", url: uniqueURL, options: nil)
        completion(attachment)
      } catch {
        completion(nil)
      }
    }
    task.resume()
  }
}
