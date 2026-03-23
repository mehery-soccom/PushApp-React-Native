import UIKit
import Firebase
import UserNotifications
import React
import ActivityKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {
  var window: UIWindow?

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

    if #available(iOS 16.1, *) {
      startLiveActivity(userInfo: userInfo)
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

  private func urlForAction(_ actionId: String, userInfo: [AnyHashable: Any]) -> URL? {
    // Skip default/dismiss actions
    if actionId == UNNotificationDefaultActionIdentifier || actionId == UNNotificationDismissActionIdentifier {
      return nil
    }

    // Helper to extract string from userInfo (FCM sends all data as strings)
    func str(_ key: String) -> String? {
      (userInfo[key] as? String) ?? (userInfo[key] as? NSString) as String?
    }

    // 1. action_urls - dict or JSON string (FCM sends as string)
    if let urlsRaw = userInfo["action_urls"] {
      var urls: [String: String]?
      if let dict = urlsRaw as? [String: String] { urls = dict }
      else if let s = urlsRaw as? String, let data = s.data(using: .utf8),
              let dict = try? JSONSerialization.jsonObject(with: data) as? [String: String] { urls = dict }
      if let urls = urls, let urlString = urls[actionId], let url = URL(string: urlString) { return url }
    }

    // 2. Category-specific keys
    if actionId == "PUSHAPP_OPT_IN", let urlString = str("url_opt_in"), let url = URL(string: urlString) { return url }
    if actionId == "PUSHAPP_NOT_INTERESTED", let urlString = str("url_not_interested"), let url = URL(string: urlString) { return url }
    if actionId == "PUSHAPP_YES", let urlString = str("url_yes") ?? str("url_opt_in"), let url = URL(string: urlString) { return url }
    if actionId == "PUSHAPP_NO", let urlString = str("url_no") ?? str("url_not_interested"), let url = URL(string: urlString) { return url }
    if actionId.hasSuffix("_MID"), let urlString = str("url_mid") ?? str("url_maybe") ?? str("url_action_3"), let url = URL(string: urlString) { return url }

    // 3. cta_buttons - array or JSON string
    if let buttonsRaw = userInfo["cta_buttons"] {
      var buttons: [[String: Any]]?
      if let arr = buttonsRaw as? [[String: Any]] { buttons = arr }
      else if let s = buttonsRaw as? String, let data = s.data(using: .utf8),
              let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] { buttons = arr }
      if let buttons = buttons {
        for btn in buttons {
          if (btn["id"] as? String) == actionId,
             let urlString = (btn["url"] as? String) ?? (btn["url"] as? NSString) as String?,
             let url = URL(string: urlString) { return url }
        }
      }
    }

    // 4. Fallback: single cta_url, url, link, click_action
    for key in ["cta_url", "url", "link", "click_action"] {
      if let urlString = str(key), let url = URL(string: urlString) { return url }
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
  @available(iOS 16.1, *)
  func startLiveActivity(userInfo: [AnyHashable: Any]) {
    let progressPercent = parseDouble(userInfo["progressPercent"]) ?? 0
    let imageFileName = saveLiveActivityImage(userInfo: userInfo)

    let state = buildLiveActivityState(userInfo: userInfo, progressPercent: progressPercent, imageFileName: imageFileName)

    // Update existing activity if one is running
    if #available(iOS 16.2, *) {
      if let activity = Activity<DeliveryActivityAttributes>.activities.first {
        Task {
          await activity.update(ActivityContent(state: state, staleDate: nil))
          print("🟢 Updated Live Activity: \(activity.id)")
        }
        return
      }
    }

    // No existing activity — create new one
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

  @available(iOS 16.1, *)
  private func buildLiveActivityState(
    userInfo: [AnyHashable: Any],
    progressPercent: Double,
    imageFileName: String?
  ) -> DeliveryActivityAttributes.ContentState {
    DeliveryActivityAttributes.ContentState(
      message1: (userInfo["message1"] as? String) ?? "",
      message2: (userInfo["message2"] as? String) ?? "",
      message3: (userInfo["message3"] as? String) ?? "",
      message1FontSize: parseDouble(userInfo["message1FontSize"]) ?? 14,
      message1FontColorHex: (userInfo["message1FontColorHex"] as? String) ?? "#000000",
      line1_font_text_styles: parseStringArray(userInfo["line1_font_text_styles"]) ?? [],
      message2FontSize: parseDouble(userInfo["message2FontSize"]) ?? 14,
      message2FontColorHex: (userInfo["message2FontColorHex"] as? String) ?? "#000000",
      line2_font_text_styles: parseStringArray(userInfo["line2_font_text_styles"]) ?? [],
      message3FontSize: parseDouble(userInfo["message3FontSize"]) ?? 14,
      message3FontColorHex: (userInfo["message3FontColorHex"] as? String) ?? "#000000",
      line3_font_text_styles: parseStringArray(userInfo["line3_font_text_styles"]) ?? [],
      backgroundColorHex: (userInfo["backgroundColorHex"] as? String) ?? "#FFFFFF",
      fontColorHex: (userInfo["fontColorHex"] as? String) ?? "#000000",
      progressColorHex: (userInfo["progressColorHex"] as? String) ?? "#0000FF",
      fontSize: parseDouble(userInfo["fontSize"]) ?? 14,
      progressPercent: progressPercent,
      align: (userInfo["align"] as? String) ?? "left",
      bg_color_gradient: (userInfo["bg_color_gradient"] as? String) ?? "",
      bg_color_gradient_dir: (userInfo["bg_color_gradient_dir"] as? String) ?? "",
      imageFileName: imageFileName
    )
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

  private func saveLiveActivityImage(userInfo: [AnyHashable: Any]) -> String? {
    let imageUrl = (userInfo["imageUrl"] as? String) ?? (userInfo["image_url"] as? String) ?? ""
    guard let url = URL(string: imageUrl), !imageUrl.isEmpty else { return nil }

    guard let containerURL = FileManager.default.containerURL(
      forSecurityApplicationGroupIdentifier: "group.meheryeventsender.example.NotificationLiveActivity"
    ) else { return nil }

    let ext = url.pathExtension.isEmpty ? "png" : url.pathExtension
    let fileName = "live_activity_\(UUID().uuidString).\(ext)"
    let fileURL = containerURL.appendingPathComponent(fileName)

    var result: String?
    let semaphore = DispatchSemaphore(value: 0)
    URLSession.shared.dataTask(with: url) { data, _, _ in
      defer { semaphore.signal() }
      guard let data = data else { return }
      try? data.write(to: fileURL)
      result = fileName
    }.resume()
    _ = semaphore.wait(timeout: .now() + 10)
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
