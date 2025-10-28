import UserNotifications
import MobileCoreServices
import os.log

class NotificationService: UNNotificationServiceExtension {
  var contentHandler: ((UNNotificationContent) -> Void)?
  var bestAttemptContent: UNMutableNotificationContent?

  override func didReceive(_ request: UNNotificationRequest,
                           withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
    self.contentHandler = contentHandler
    bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)

    os_log("Service: didReceive userInfo: %{public}@", log: .default, type: .info, request.content.userInfo.description)

    guard let bestAttemptContent = bestAttemptContent else {
      os_log("Service: bestAttemptContent nil", type: .error)
      contentHandler(request.content)
      return
    }

    guard let urlString = bestAttemptContent.userInfo["image-url"] as? String,
          let url = URL(string: urlString) else {
      os_log("Service: no image-url in payload", type: .error)
      contentHandler(bestAttemptContent)
      return
    }

    os_log("Service: will download from %{public}@", url.absoluteString)
    let task = URLSession.shared.downloadTask(with: url) { downloadedUrl, response, error in
      if let err = error {
        os_log("Service: download error: %{public}@", type: .error, err.localizedDescription)
        contentHandler(bestAttemptContent)
        return
      }
      guard let downloadedUrl = downloadedUrl else {
        os_log("Service: downloadedUrl nil", type: .error)
        contentHandler(bestAttemptContent)
        return
      }

      let tmpDir = URL(fileURLWithPath: NSTemporaryDirectory())
      let ext = url.pathExtension.isEmpty ? "jpg" : url.pathExtension
      let dest = tmpDir.appendingPathComponent(UUID().uuidString + "." + ext)

      do {
        try FileManager.default.moveItem(at: downloadedUrl, to: dest)
        os_log("Service: moved to %{public}@", dest.path)

        // Type hint based on extension
        let options = [
          UNNotificationAttachmentOptionsTypeHintKey:
            (ext.lowercased() == "png" ? kUTTypePNG : kUTTypeJPEG)
        ]

        let attachment = try UNNotificationAttachment(identifier: "image", url: dest, options: options)
        bestAttemptContent.attachments = [attachment]

        // ✅ Critical for linking to your NotificationViewController
        bestAttemptContent.categoryIdentifier = "imagePreviewCategory"

        os_log("Service: created attachment id=%{public}@", attachment.identifier)
      } catch {
        os_log("Service: attachment error: %{public}@", type: .error, String(describing: error))
      }

      contentHandler(bestAttemptContent)
    }
    task.resume()
  }

  override func serviceExtensionTimeWillExpire() {
    os_log("Service: timeWillExpire", type: .error)
    if let handler = contentHandler, let content = bestAttemptContent {
      handler(content)
    }
  }
}
