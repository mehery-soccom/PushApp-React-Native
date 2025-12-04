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

    if #available(iOS 16.1, *) {
      startLiveActivity(userInfo: userInfo)
    }

    completionHandler(.newData)
  }

  // MARK: - Foreground Push Display
  func userNotificationCenter(_ center: UNUserNotificationCenter,
                              willPresent notification: UNNotification,
                              withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
    print("📢 Notification received in foreground")
    completionHandler([.banner, .sound, .badge, .list])
  }

  // MARK: - Background Notification Tap Handling
  func userNotificationCenter(_ center: UNUserNotificationCenter,
                              didReceive response: UNNotificationResponse,
                              withCompletionHandler completionHandler: @escaping () -> Void) {
    let actionID = response.actionIdentifier
    let categoryID = response.notification.request.content.categoryIdentifier

    print("📩 User tapped action: \(actionID) in category: \(categoryID)")

    switch actionID {
    case "PUSHAPP_YES":
      print("✅ User tapped YES")
    case "PUSHAPP_NO":
      print("❌ User tapped NO")
    case "PUSHAPP_NEXT":
        print("➡️ NEXT image requested")
    case "PUSHAPP_PREVIOUS":
        print("⬅️ PREVIOUS image requested")
    default:
      break
    }

    completionHandler()
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
    let state = DeliveryActivityAttributes.ContentState(
      message1: userInfo["message1"] as? String ?? "",
      message2: userInfo["message2"] as? String ?? "",
      message3: userInfo["message3"] as? String ?? "",
      message1FontSize: userInfo["message1FontSize"] as? Double ?? 14,
      message1FontColorHex: userInfo["message1FontColorHex"] as? String ?? "#000000",
      line1_font_text_styles: userInfo["line1_font_text_styles"] as? [String] ?? [],
      message2FontSize: userInfo["message2FontSize"] as? Double ?? 14,
      message2FontColorHex: userInfo["message2FontColorHex"] as? String ?? "#000000",
      line2_font_text_styles: userInfo["line2_font_text_styles"] as? [String] ?? [],
      message3FontSize: userInfo["message3FontSize"] as? Double ?? 14,
      message3FontColorHex: userInfo["message3FontColorHex"] as? String ?? "#000000",
      line3_font_text_styles: userInfo["line3_font_text_styles"] as? [String] ?? [],
      backgroundColorHex: userInfo["backgroundColorHex"] as? String ?? "#FFFFFF",
      fontColorHex: userInfo["fontColorHex"] as? String ?? "#000000",
      progressColorHex: userInfo["progressColorHex"] as? String ?? "#0000FF",
      fontSize: userInfo["fontSize"] as? Double ?? 14,
      progressPercent: userInfo["progressPercent"] as? Double ?? 0,
      align: userInfo["align"] as? String ?? "left",
      bg_color_gradient: userInfo["bg_color_gradient"] as? String ?? "",
      bg_color_gradient_dir: userInfo["bg_color_gradient_dir"] as? String ?? ""
    )

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

  // MARK: - Register Notification Categories
  func registerNotificationCategories() {
    let categoryMap: [(String, [(title: String, id: String)])] = [
      ("CAROUSEL_CATEGORY", []),
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
