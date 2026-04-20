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

        // Do not add `logo` as a UNNotificationAttachment. iOS uses the first
        // attachment as the large "hero" media slot; a small logo (or one that
        // does not decode well for that surface) renders as a tall black/empty
        // band above the real image. ImagePreviewExtension already reads `logo`
        // from userInfo / bundled assets and skips an attachment with id "logo".
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
        var imageUrls = extractImageUrls(from: userInfo)

        // 🔥 sanitize dashboard garbage ("", "   ")
        imageUrls = imageUrls
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        
        // post-clean guard
        guard !imageUrls.isEmpty else {
            contentHandler(content)
            return
        }

        // 🔥 IMPORTANT: persist full array for Content Extension
        persistMediaUrlsIfNeeded(
            originalUserInfo: userInfo,
            imageUrls: imageUrls,
            content: content
        )


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

    private func extractImageUrls(from userInfo: [AnyHashable: Any]) -> [String] {
        var imageUrls: [String] = []

        // FCM iOS payloads often carry image under fcm_options.image.
        if let fcmOptions = userInfo["fcm_options"] as? [AnyHashable: Any],
           let nestedImage = parseSingleString(fcmOptions["image"]),
           !nestedImage.isEmpty {
            imageUrls = [nestedImage]
        }

        // Prefer explicit lists first for carousel templates
        if imageUrls.isEmpty {
            for key in ["image_urls", "imageUrls", "carousel_images", "images", "media-url"] {
                if let values = parseStringList(userInfo[key]), !values.isEmpty {
                    imageUrls = values
                    break
                }
            }
        }

        // Fallback to single image aliases (Android + iOS)
        if imageUrls.isEmpty {
            for key in ["image_url", "imageUrl", "image", "media-url"] {
                if let value = parseSingleString(userInfo[key]), !value.isEmpty {
                    imageUrls = [value]
                    break
                }
            }
        }

        // Indexed fallback used by Android payloads (image1, image2, ...)
        if imageUrls.isEmpty {
            var index = 1
            while true {
                let key = "image\(index)"
                guard userInfo.keys.contains(where: { "\($0)" == key }) else { break }
                if let value = parseSingleString(userInfo[key]), !value.isEmpty {
                    imageUrls.append(value)
                }
                index += 1
            }
        }

        return imageUrls
    }

    private func parseSingleString(_ value: Any?) -> String? {
        if let str = value as? String {
            return str.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        if let str = value as? NSString {
            return str.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        return nil
    }

    private func parseStringList(_ value: Any?) -> [String]? {
        if let arr = value as? [String] {
            return arr
        }
        if let arr = value as? [Any] {
            return arr.compactMap { parseSingleString($0) }
        }
        if let str = parseSingleString(value), !str.isEmpty {
            if let data = str.data(using: .utf8),
               let parsed = try? JSONSerialization.jsonObject(with: data) as? [Any] {
                return parsed.compactMap { parseSingleString($0) }
            }
            return [str]
        }
        return nil
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
  
  private func persistMediaUrlsIfNeeded(
      originalUserInfo: [AnyHashable: Any],
      imageUrls: [String],
      content: UNMutableNotificationContent
  ) {
      var updatedUserInfo = content.userInfo

      // Always persist full array for Content Extension
      updatedUserInfo["media-url"] = imageUrls

      // Optional: normalize key for safety
      updatedUserInfo["images"] = imageUrls

      content.userInfo = updatedUserInfo

      print("✅ [NSE] Persisted media-url array:", imageUrls)
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
