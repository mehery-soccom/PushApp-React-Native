import UIKit
import Firebase
import UserNotifications
import React
import ActivityKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {
  var window: UIWindow?

  /// Ephemeral session with explicit timeouts so background pushes (TestFlight) finish before the system suspends the app.
  private static let liveActivityImageURLSession: URLSession = {
    let c = URLSessionConfiguration.ephemeral
    c.timeoutIntervalForRequest = 22
    c.timeoutIntervalForResource = 30
    c.waitsForConnectivity = true
    c.httpCookieStorage = nil
    c.urlCache = nil
    c.requestCachePolicy = .reloadIgnoringLocalCacheData
    return URLSession(configuration: c)
  }()

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    FirebaseApp.configure()
    Messaging.messaging().delegate = self

    // Notification permissions
    UNUserNotificationCenter.current().delegate = self
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
      print("🔐 Notification permission granted: \(granted)")
      if let error = error {
        print("⚠️ Authorization error: \(error.localizedDescription)")
      }
      // if granted {
      //   DispatchQueue.main.async {
      //     application.registerForRemoteNotifications()
      //   }
      // }
      if granted {
      DispatchQueue.main.async {
        application.registerForRemoteNotifications()
      }
      }

    }

    // Register categories
    registerNotificationCategories()

    // React Native setup
    let bridge = RCTBridge(delegate: self, launchOptions: launchOptions)
    let rootView = RCTRootView(bridge: bridge!, moduleName: "MeheryEventSenderExample", initialProperties: nil)

    window = UIWindow(frame: UIScreen.main.bounds)
    let rootVC = UIViewController()
    rootVC.view = rootView
    window?.rootViewController = rootVC
    window?.makeKeyAndVisible()

    return true
  }

  // MARK: - Silent Push / Background Data Message
  func application(_ application: UIApplication,
                   didReceiveRemoteNotification userInfo: [AnyHashable: Any],
                   fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
    print("📦 Background push received: \(userInfo)")

    // ✅ Detect silent daily ping
  if let type = userInfo["type"] as? String,
     type == "silent_daily_ping" {

    PushTokenManager.sendNotificationEvent(userInfo)

    // 🚫 DO NOT start Live Activity
    completionHandler(.newData)
    return
  }
    PushTokenManager.sendNotificationEvent(userInfo)

    // Live Activity + image download must finish before background completion, or iOS suspends
    // the app (especially TestFlight / production) and the file never reaches the app group.
    if #available(iOS 16.1, *) {
      let merged = mergedNotificationFields(userInfo)
      if merged["activity_id"] != nil {
        startLiveActivity(userInfo: userInfo) {
          completionHandler(.newData)
        }
        return
      }
    }

    completionHandler(.newData)
  }

  // MARK: - Foreground Push Display
  func userNotificationCenter(_ center: UNUserNotificationCenter,
                              willPresent notification: UNNotification,
                              withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
    let userInfo = notification.request.content.userInfo
    print("📢 Notification received in foreground")

    if let type = userInfo["type"] as? String,
     type == "silent_daily_ping" {

    // ✅ Silent = no UI
    PushTokenManager.sendNotificationEvent(userInfo)
    completionHandler([])
    return
  }

    PushTokenManager.sendNotificationEvent(userInfo)

    completionHandler([.banner, .sound, .badge, .list])
  }

  // MARK: - Background Notification Tap Handling
  func userNotificationCenter(_ center: UNUserNotificationCenter,
                              didReceive response: UNNotificationResponse,
                              withCompletionHandler completionHandler: @escaping () -> Void) {
    let actionID = response.actionIdentifier
    let categoryID = response.notification.request.content.categoryIdentifier
    let userInfo = response.notification.request.content.userInfo

    print("📩 User tapped action: \(actionID) in category: \(categoryID)")
    print("📦 Payload on tap: \(userInfo)")

    // ✅ SEND TO JS (include action info)
    var payload = userInfo
    payload["actionIdentifier"] = actionID
    payload["categoryIdentifier"] = categoryID

    PushTokenManager.sendNotificationEvent(payload)

    // ✅ Open URL when action has one (carousel buttons, 3-button, etc.)
    if let url = urlForAction(actionID, userInfo: userInfo) {
      DispatchQueue.main.async {
        UIApplication.shared.open(url, options: [:]) { success in
          print(success ? "✅ Opened URL" : "❌ Failed to open URL")
        }
      }
    }

    switch actionID {
    case "PUSHAPP_YES":
      print("✅ User tapped YES")
    case "PUSHAPP_NO":
      print("❌ User tapped NO")
    case "PUSHAPP_NEXT":
      print("➡️ NEXT image requested")
    case "PUSHAPP_PREVIOUS":
      print("⬅️ PREVIOUS image requested")
    case "PUSHAPP_ACTION_1":
      print("✅ User tapped Action 1")
    case "PUSHAPP_ACTION_2":
      print("✅ User tapped Action 2")
    case "PUSHAPP_ACTION_3":
      print("✅ User tapped Action 3")
    case let id where id.hasSuffix("_MID"):
      print("✅ User tapped middle action: \(id)")
    default:
      break
    }

    completionHandler()
  }

  /// Flatten `userInfo` plus optional nested `data` (string JSON or dict) so CTAs match Android / `Fb.ts`.
  private func mergedNotificationFields(_ userInfo: [AnyHashable: Any]) -> [String: Any] {
    var merged: [String: Any] = [:]
    for (k, v) in userInfo {
      merged[String(describing: k)] = v
    }
    if let dataDict = userInfo["data"] as? [AnyHashable: Any] {
      for (k, v) in dataDict {
        merged[String(describing: k)] = v
      }
    } else if let dataStr = userInfo["data"] as? String,
              let d = dataStr.data(using: .utf8),
              let obj = try? JSONSerialization.jsonObject(with: d) as? [String: Any] {
      for (k, v) in obj { merged[k] = v }
    }
    return merged
  }

  private func stringFromAny(_ value: Any?) -> String? {
    guard let value else { return nil }
    if let s = value as? String { return s }
    if let s = value as? NSString { return s as String }
    if let n = value as? NSNumber { return n.stringValue }
    return nil
  }

  /// Same URL keys as `parseCtaButtonsJson` in `Fb.ts`.
  private func urlStringFromButtonDict(_ button: [String: Any]) -> String? {
    let urlKeys = [
      "url", "link", "href", "deepLink", "deeplink",
      "targetUrl", "target_url", "action_url", "cta_url"
    ]
    for key in urlKeys {
      if let s = stringFromAny(button[key])?.trimmingCharacters(in: .whitespacesAndNewlines), !s.isEmpty {
        return s
      }
    }
    return nil
  }

  private func parseCtaButtonsArray(_ raw: Any?) -> [[String: Any]]? {
    guard let raw else { return nil }
    if let arr = raw as? [[String: Any]] { return arr }
    if let arr = raw as? [Any] {
      return arr.compactMap { item -> [String: Any]? in
        if let d = item as? [String: Any] { return d }
        if let d = item as? [AnyHashable: Any] {
          var out: [String: Any] = [:]
          for (k, v) in d {
            out[String(describing: k)] = v
          }
          return out
        }
        return nil
      }
    }
    if let s = raw as? String, let data = s.data(using: .utf8),
       let json = try? JSONSerialization.jsonObject(with: data) {
      return parseCtaButtonsArray(json)
    }
    return nil
  }

  private func parseActionUrlsMap(_ raw: Any?) -> [String: String]? {
    guard let raw else { return nil }
    if let dict = raw as? [String: String] { return dict }
    if let dict = raw as? [String: Any] {
      var out: [String: String] = [:]
      for (k, v) in dict {
        if let s = stringFromAny(v) { out[k] = s }
      }
      return out
    }
    if let s = raw as? String, let data = s.data(using: .utf8),
       let obj = try? JSONSerialization.jsonObject(with: data) {
      return parseActionUrlsMap(obj)
    }
    return nil
  }

  private func urlForAction(_ actionId: String, userInfo: [AnyHashable: Any]) -> URL? {
    // Skip default/dismiss actions
    if actionId == UNNotificationDefaultActionIdentifier || actionId == UNNotificationDismissActionIdentifier {
      return nil
    }

    let merged = mergedNotificationFields(userInfo)

    func str(_ key: String) -> String? {
      stringFromAny(merged[key])
    }

    func validUrl(_ raw: String?) -> URL? {
      guard let raw else { return nil }
      let cleaned = raw.trimmingCharacters(in: .whitespacesAndNewlines)
      guard !cleaned.isEmpty else { return nil }
      guard let url = URL(string: cleaned),
            let scheme = url.scheme?.lowercased(),
            ["http", "https"].contains(scheme) || cleaned.contains("://") else {
        return nil
      }
      return url
    }

    func actionIndex(_ id: String) -> Int? {
      if id == "PUSHAPP_ACTION_1" || id == "PUSHAPP_OPT_IN" || id == "PUSHAPP_YES" { return 0 }
      if id == "PUSHAPP_ACTION_2" || id.hasSuffix("_MID") { return 1 }
      if id == "PUSHAPP_ACTION_3" || id == "PUSHAPP_NOT_INTERESTED" || id == "PUSHAPP_NO" { return 2 }
      if let number = Int(id.split(separator: "_").last ?? "") {
        return max(0, number - 1)
      }
      return nil
    }

    // 0. __actionMap — same idea as foreground local notifications in `Fb.ts`
    if let mapObj = merged["__actionMap"] {
      if let map = mapObj as? [String: Any], let url = validUrl(stringFromAny(map[actionId])) {
        return url
      }
      if let mapStr = stringFromAny(mapObj),
         let data = mapStr.data(using: .utf8),
         let map = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
         let url = validUrl(stringFromAny(map[actionId])) {
        return url
      }
    }

    // 1. action_urls - dict or JSON string (values may be non-String after JSONSerialization)
    if let urls = parseActionUrlsMap(merged["action_urls"]),
       let url = validUrl(urls[actionId]) {
      return url
    }

    // 2. Category-specific keys
    if actionId == "PUSHAPP_OPT_IN", let url = validUrl(str("url_opt_in")) { return url }
    if actionId == "PUSHAPP_NOT_INTERESTED", let url = validUrl(str("url_not_interested")) { return url }
    if actionId == "PUSHAPP_YES", let url = validUrl(str("url_yes") ?? str("url_opt_in")) { return url }
    if actionId == "PUSHAPP_NO", let url = validUrl(str("url_no") ?? str("url_not_interested")) { return url }
    if actionId.hasSuffix("_MID"),
       let url = validUrl(str("url_mid") ?? str("url_maybe") ?? str("url_action_2")) { return url }

    // 3. cta_buttons — match `Fb.ts` url key variants (link, href, …), not only `url`
    let rawButtons = merged["cta_buttons"] ?? merged["buttons"]
    if let buttons = parseCtaButtonsArray(rawButtons) {
      if let index = actionIndex(actionId), buttons.indices.contains(index) {
        if let s = urlStringFromButtonDict(buttons[index]), let url = validUrl(s) { return url }
      }
      for btn in buttons {
        let bid = stringFromAny(btn["id"])
        if bid == actionId, let s = urlStringFromButtonDict(btn), let url = validUrl(s) { return url }
      }
    }

    // 3b. Indexed url1/url2… (templates used with `resolveForegroundCtaUrl` on JS)
    if let index = actionIndex(actionId) {
      let keysByIndex = [
        ["url1", "cta1_url", "button1_url"],
        ["url2", "cta2_url", "button2_url"],
        ["url3", "cta3_url", "button3_url"]
      ]
      if keysByIndex.indices.contains(index) {
        for key in keysByIndex[index] {
          if let url = validUrl(str(key)) { return url }
        }
      }
    }

    // 4. Action-specific fallback keys frequently used in templates
    let actionSpecificKeys = [
      "url_\(actionId.lowercased())",
      "cta_url_\(actionId.lowercased())",
      "url_action_1", "url_action_2", "url_action_3"
    ]
    for key in actionSpecificKeys {
      if let url = validUrl(str(key)) { return url }
    }

    // 5. Last-resort fallback when payload has only one deep link
    for key in ["cta_url", "url", "link", "click_action"] {
      if let url = validUrl(str(key)) { return url }
    }
    return nil
  }

  // MARK: - APNs registration
  func application(_ application: UIApplication,
                   didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    let apnsToken = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
    print("📲 APNs token: \(apnsToken)")
    Messaging.messaging().apnsToken = deviceToken

    PushTokenManager.sendTokenEvent("apns", token: apnsToken)
  }

  func application(_ application: UIApplication,
                   didFailToRegisterForRemoteNotificationsWithError error: Error) {
    print("❌ Failed to register for remote notifications: \(error)")
  }

  // // MARK: - Firebase FCM token
  // func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
  //   let token = fcmToken ?? ""
  //   print("🔥 FCM token: \(token)")

  //   PushTokenManager.sendTokenEvent("fcm", token: token)
  // }

  // MARK: - Live Activity
  /// - Parameter completion: Called on an arbitrary queue after the activity is updated/created (or on failure).
  ///   Use this from background pushes so `completionHandler(.newData)` runs only after work completes.
  @available(iOS 16.1, *)
  func startLiveActivity(userInfo: [AnyHashable: Any], completion: (() -> Void)? = nil) {
    let merged = mergedNotificationFields(userInfo)
    let progressPercent = parseDouble(merged["progressPercent"]) ?? 0

    DispatchQueue.global(qos: .userInitiated).async { [self] in
      let imageFileName = saveLiveActivityImage(merged: merged)
      let state = buildLiveActivityState(
        userInfo: userInfo,
        progressPercent: progressPercent,
        imageFileName: imageFileName
      )

      Task { @MainActor in
        defer { completion?() }

        if #available(iOS 16.2, *) {
          if let activity = Activity<DeliveryActivityAttributes>.activities.first {
            await activity.update(ActivityContent(state: state, staleDate: nil))
            print("🟢 Updated Live Activity: \(activity.id)")
            return
          }
        }

        do {
          let activity = try Activity<DeliveryActivityAttributes>.request(
            attributes: DeliveryActivityAttributes(),
            contentState: state,
            pushType: .token
          )
          print("🟢 Started Live Activity: \(activity.id)")

          Task {
            for await tokenData in activity.pushTokenUpdates {
              let pushToken = tokenData.map { String(format: "%02x", $0) }.joined()
              print("📡 Live Activity Push Token: \(pushToken)")
            }
          }
        } catch {
          print("❌ Live Activity start error: \(error)")
        }
      }
    }
  }

  @available(iOS 16.1, *)
  private func buildLiveActivityState(
    userInfo: [AnyHashable: Any],
    progressPercent: Double,
    imageFileName: String?
  ) -> DeliveryActivityAttributes.ContentState {
    let merged = mergedNotificationFields(userInfo)
    let imageUrlString = firstPushImageUrlString(fromMerged: merged)
    return DeliveryActivityAttributes.ContentState(
      message1: stringFromAny(merged["message1"]) ?? "",
      message2: stringFromAny(merged["message2"]) ?? "",
      message3: stringFromAny(merged["message3"]) ?? "",
      message1FontSize: parseDouble(merged["message1FontSize"]) ?? 14,
      message1FontColorHex: stringFromAny(merged["message1FontColorHex"]) ?? "#000000",
      line1_font_text_styles: parseStringArray(merged["line1_text_styles"])
        ?? parseStringArray(merged["line1_font_text_styles"]) ?? [],
      message2FontSize: parseDouble(merged["message2FontSize"]) ?? 14,
      message2FontColorHex: stringFromAny(merged["message2FontColorHex"]) ?? "#000000",
      line2_font_text_styles: parseStringArray(merged["line2_text_styles"])
        ?? parseStringArray(merged["line2_font_text_styles"]) ?? [],
      message3FontSize: parseDouble(merged["message3FontSize"]) ?? 14,
      message3FontColorHex: stringFromAny(merged["message3FontColorHex"]) ?? "#000000",
      line3_font_text_styles: parseStringArray(merged["line3_text_styles"])
        ?? parseStringArray(merged["line3_font_text_styles"]) ?? [],
      backgroundColorHex: stringFromAny(merged["backgroundColorHex"]) ?? "#FFFFFF",
      fontColorHex: stringFromAny(merged["fontColorHex"]) ?? "#000000",
      progressColorHex: stringFromAny(merged["progressColorHex"]) ?? "#0000FF",
      fontSize: parseDouble(merged["fontSize"]) ?? 14,
      progressPercent: progressPercent,
      align: stringFromAny(merged["align"]) ?? "left",
      bg_color_gradient: stringFromAny(merged["bg_color_gradient"]) ?? "",
      bg_color_gradient_dir: stringFromAny(merged["bg_color_gradient_dir"]) ?? "",
      imageFileName: imageFileName,
      imageUrl: imageUrlString
    )
  }

  /// Prefer explicit `imageUrl` / `image_url`, then `logoUrl` / `logo_url` (matches RN live template).
  /// Parses `templateData` JSON when URLs are nested. Only after that uses `fcm_options` / lists / `image1`…
  private func firstPushImageUrlString(fromMerged merged: [String: Any]) -> String? {
    if let u = imageUrlFromLiveTemplatePayloads(merged) { return u }
    let urls = extractPushImageUrlStrings(fromMerged: merged)
    return urls.first
  }

  /// RN often sends `imageUrl` + `logoUrl` at root, or URLs inside `templateData` / `style`.
  private func imageUrlFromLiveTemplatePayloads(_ merged: [String: Any]) -> String? {
    func trimmed(_ value: Any?) -> String? {
      if let s = value as? String {
        let t = s.trimmingCharacters(in: .whitespacesAndNewlines)
        return t.isEmpty ? nil : t
      }
      if let s = value as? NSString {
        let t = s.trimmingCharacters(in: .whitespacesAndNewlines)
        return t.isEmpty ? nil : (t as String)
      }
      return nil
    }
    func firstKey(in dict: [String: Any], keys: [String]) -> String? {
      for k in keys {
        if let v = trimmed(dict[k]) { return v }
      }
      return nil
    }

    let heroKeys = ["imageUrl", "image_url", "image", "styled_image", "styledImage", "media-url"]
    let logoKeys = ["logoUrl", "logo_url", "logo", "iconUrl", "icon_url", "icon"]

    if let u = firstKey(in: merged, keys: heroKeys) { return u }
    if let u = firstKey(in: merged, keys: logoKeys) { return u }

    if let td = merged["templateData"] as? String,
       let data = td.data(using: .utf8),
       let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
      if let u = firstKey(in: obj, keys: heroKeys) { return u }
      if let u = firstKey(in: obj, keys: logoKeys) { return u }
      if let style = obj["style"] as? [String: Any] {
        if let u = firstKey(in: style, keys: heroKeys) { return u }
        if let u = firstKey(in: style, keys: logoKeys) { return u }
      }
    }

    if let tmpl = merged["template"] as? [String: Any],
       let data = tmpl["data"] as? [String: Any] {
      if let u = firstKey(in: data, keys: heroKeys) { return u }
      if let u = firstKey(in: data, keys: logoKeys) { return u }
    }

    return nil
  }

  private func extractPushImageUrlStrings(fromMerged merged: [String: Any]) -> [String] {
    func parseSingleString(_ value: Any?) -> String? {
      if let s = value as? String { return s.trimmingCharacters(in: .whitespacesAndNewlines) }
      if let s = value as? NSString { return s.trimmingCharacters(in: .whitespacesAndNewlines) }
      return nil
    }
    func parseStringList(_ value: Any?) -> [String]? {
      if let arr = value as? [String] { return arr }
      if let arr = value as? [Any] { return arr.compactMap { parseSingleString($0) } }
      if let s = parseSingleString(value), !s.isEmpty {
        if let data = s.data(using: .utf8),
           let parsed = try? JSONSerialization.jsonObject(with: data) as? [Any] {
          return parsed.compactMap { parseSingleString($0) }
        }
        return [s]
      }
      return nil
    }

    var imageUrls: [String] = []

    func dictionaryAny(_ value: Any?) -> [String: Any]? {
      if let d = value as? [String: Any] { return d }
      if let d = value as? [AnyHashable: Any] {
        var out: [String: Any] = [:]
        for (k, v) in d { out[String(describing: k)] = v }
        return out
      }
      return nil
    }

    let heroKeys = ["imageUrl", "image_url", "image", "styled_image", "styledImage", "media-url"]
    let logoKeys = ["logoUrl", "logo_url", "logo", "iconUrl", "icon_url", "icon"]

    // 1) Explicit hero image, then logo — must run BEFORE fcm_options so RN `imageUrl` / `logoUrl` win.
    if imageUrls.isEmpty {
      for key in heroKeys {
        if let value = parseSingleString(merged[key]), !value.isEmpty {
          imageUrls = [value]
          break
        }
      }
    }
    if imageUrls.isEmpty {
      for key in logoKeys {
        if let value = parseSingleString(merged[key]), !value.isEmpty {
          imageUrls = [value]
          break
        }
      }
    }

    // 2) FCM dashboard / legacy
    if imageUrls.isEmpty,
       let fcmOptions = dictionaryAny(merged["fcm_options"]),
       let nested = parseSingleString(fcmOptions["image"]), !nested.isEmpty {
      imageUrls = [nested]
    }

    // 3) Lists (carousel)
    if imageUrls.isEmpty {
      for key in ["image_urls", "imageUrls", "carousel_images", "images", "media-url"] {
        if let values = parseStringList(merged[key]), !values.isEmpty {
          imageUrls = values
          break
        }
      }
    }

    if imageUrls.isEmpty {
      var index = 1
      while index <= 32 {
        let key = "image\(index)"
        if let value = parseSingleString(merged[key]), !value.isEmpty {
          imageUrls.append(value)
        }
        index += 1
      }
    }

    return imageUrls
      .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
      .filter { !$0.isEmpty }
  }

  // MARK: - Live Activity Helpers
  private func parseDouble(_ value: Any?) -> Double? {
    if let d = value as? Double { return d }
    if let i = value as? Int { return Double(i) }
    if let s = value as? String, let d = Double(s) { return d }
    return nil
  }

  private func parseStringArray(_ value: Any?) -> [String]? {
    if let arr = value as? [String] { return arr }
    if let arr = value as? [Any] {
      return arr.compactMap { $0 as? String }
    }
    if let s = value as? String, !s.isEmpty {
      if let data = s.data(using: .utf8),
         let parsed = try? JSONSerialization.jsonObject(with: data) as? [String] {
        return parsed
      }
      return s.split(separator: ",").map { String($0.trimmingCharacters(in: .whitespaces)) }
    }
    return nil
  }

  private static func isRenderableImageData(_ data: Data) -> Bool {
    !data.isEmpty && UIImage(data: data) != nil
  }

  private func saveLiveActivityImage(merged: [String: Any]) -> String? {
    guard let imageUrl = firstPushImageUrlString(fromMerged: merged), !imageUrl.isEmpty,
          let url = URL(string: imageUrl) else {
      print("📷 Live Activity: no image URL in merged payload")
      return nil
    }

    // Release / TestFlight: ATS blocks plain HTTP unless you add exceptions (avoid HTTP image URLs).
    if url.scheme?.lowercased() != "https" {
      print("📷 Live Activity: image URL must use https (scheme was \(url.scheme ?? "nil"))")
      return nil
    }

    guard let containerURL = FileManager.default.containerURL(
      forSecurityApplicationGroupIdentifier: "group.meheryeventsender.example.NotificationLiveActivity"
    ) else {
      print("📷 Live Activity: app group container missing — enable App Groups on the main app target + matching group in Apple Developer")
      return nil
    }

    let ext: String = {
      let p = url.pathExtension.lowercased()
      if !p.isEmpty, p.count <= 5 { return p }
      return "jpg"
    }()
    let fileName = "live_activity_\(UUID().uuidString).\(ext)"
    let fileURL = containerURL.appendingPathComponent(fileName)

    var result: String?
    let semaphore = DispatchSemaphore(value: 0)
    Self.liveActivityImageURLSession.dataTask(with: url) { data, _, error in
      defer { semaphore.signal() }
      if let error = error {
        print("📷 Live Activity image download failed: \(error.localizedDescription)")
        return
      }
      guard let data = data, !data.isEmpty else {
        print("📷 Live Activity image download: empty data")
        return
      }
      guard Self.isRenderableImageData(data) else {
        print("📷 Live Activity image: response is not a decodable image (wrong URL or HTML error page)")
        return
      }
      do {
        try data.write(to: fileURL, options: [.atomic])
        result = fileName
        print("📷 Live Activity image saved: \(fileName) (\(data.count) bytes)")
      } catch {
        print("📷 Live Activity image write failed: \(error.localizedDescription)")
      }
    }.resume()
    _ = semaphore.wait(timeout: .now() + 35)
    if result == nil {
      print("📷 Live Activity image: timed out or failed for URL \(imageUrl)")
    }
    return result
  }

  // MARK: - Register Notification Categories
  func registerNotificationCategories() {
    let categoryMap: [(String, [(title: String, id: String)])] = [
      ("THREE_BUTTON_CATEGORY", [("Action 1", "PUSHAPP_ACTION_1"), ("Action 2", "PUSHAPP_ACTION_2"), ("Action 3", "PUSHAPP_ACTION_3")]),
      
      ("THREE_CAROUSEL_CATEGORY", [("Opt In", "PUSHAPP_OPT_IN"), ("Opt MID", "PUSHAPP_OPT_MID"), ("Not Interested", "PUSHAPP_NOT_INTERESTED")]),
      ("THREE_CONFIRMATION_CATEGORY", [("Yes", "PUSHAPP_YES"), ("Maybe", "PUSHAPP_CONFIRM_MID"), ("No", "PUSHAPP_NO")]),
      ("THREE_RESPONSE_CATEGORY", [("Accept", "PUSHAPP_ACCEPT"), ("Later", "PUSHAPP_RESPONSE_MID"), ("Reject", "PUSHAPP_REJECT")]),
      ("THREE_SUBSCRIPTION_CATEGORY", [("Subscribe", "PUSHAPP_SUB"), ("Remind Me", "PUSHAPP_SUB_MID"), ("Unsubscribe", "PUSHAPP_UNSUB")]),
      ("THREE_TRANSACTION_CATEGORY", [("Buy", "PUSHAPP_BUY"), ("Details", "PUSHAPP_TRANSACTION_MID"), ("Sell", "PUSHAPP_SELL")]),
      ("THREE_CONTENT_CATEGORY", [("View", "PUSHAPP_VIEW"), ("Share", "PUSHAPP_CONTENT_MID"), ("Add", "PUSHAPP_ADD")]),
      ("THREE_CHECKOUT_CATEGORY", [("Cart", "PUSHAPP_CART"), ("Save For Later", "PUSHAPP_CHECKOUT_MID"), ("Pay", "PUSHAPP_PAY")]),
      ("THREE_FORM_ACTION_CATEGORY", [("Save", "PUSHAPP_SAVE"), ("Preview", "PUSHAPP_FORM_MID"), ("Submit", "PUSHAPP_SUBMIT")]),
      ("THREE_DESTRUCTIVE_ACTION_CATEGORY", [("Cancel", "PUSHAPP_CANCEL"), ("Archive", "PUSHAPP_DESTRUCTIVE_MID"), ("Delete", "PUSHAPP_DELETE")]),
      ("THREE_CONTACT_CATEGORY", [("Call", "PUSHAPP_CALL"), ("Chat", "PUSHAPP_CONTACT_MID"), ("Email", "PUSHAPP_EMAIL")]),

      ("CAROUSEL_CATEGORY", [("Opt In", "PUSHAPP_OPT_IN"), ("Not Interested", "PUSHAPP_NOT_INTERESTED")]),
      ("CONFIRMATION_CATEGORY", [("Yes", "PUSHAPP_YES"), ("No", "PUSHAPP_NO")]),
      ("RESPONSE_CATEGORY", [("Accept", "PUSHAPP_ACCEPT"), ("Reject", "PUSHAPP_REJECT")]),
      ("SUBSCRIPTION_CATEGORY", [("Subscribe", "PUSHAPP_SUB"), ("Unsubscribe", "PUSHAPP_UNSUB")]),
      ("TRANSACTION_CATEGORY", [("Buy", "PUSHAPP_BUY"), ("Sell", "PUSHAPP_SELL")]),
      ("CONTENT_CATEGORY", [("View", "PUSHAPP_VIEW"), ("Add", "PUSHAPP_ADD")]),
      ("CHECKOUT_CATEGORY", [("Cart", "PUSHAPP_CART"), ("Pay", "PUSHAPP_PAY")]),
      ("FORM_ACTION_CATEGORY", [("Save", "PUSHAPP_SAVE"), ("Submit", "PUSHAPP_SUBMIT")]),
      ("DESTRUCTIVE_ACTION_CATEGORY", [("Cancel", "PUSHAPP_CANCEL"), ("Delete", "PUSHAPP_DELETE")]),
      ("CONTACT_CATEGORY", [("Call", "PUSHAPP_CALL"), ("Email", "PUSHAPP_EMAIL")])
    ]

    var categories: Set<UNNotificationCategory> = []

    for (categoryId, actionsInfo) in categoryMap {
      let actions = actionsInfo.map {
        UNNotificationAction(identifier: $0.id, title: $0.title, options: [.foreground])
      }

      let category = UNNotificationCategory(identifier: categoryId, actions: actions, intentIdentifiers: [], options: [])
      categories.insert(category)
    }

    UNUserNotificationCenter.current().setNotificationCategories(categories)
  }
}

// MARK: - React Native Bridge
extension AppDelegate: RCTBridgeDelegate {
  func sourceURL(for bridge: RCTBridge!) -> URL! {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
