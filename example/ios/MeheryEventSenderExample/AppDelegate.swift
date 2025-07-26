import UIKit
import Firebase
import UserNotifications
import React

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {
  var window: UIWindow?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {

    FirebaseApp.configure()
    Messaging.messaging().delegate = self

    // iOS notification permission and delegate
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

    // Register custom notification categories
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

  // MARK: - Register custom notification categories
  func registerNotificationCategories() {
    let categoryMap: [(String, [(title: String, id: String)])] = [
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
      let actions = actionsInfo.map { info in
        UNNotificationAction(identifier: info.id, title: info.title, options: [.foreground])
      }

      let category = UNNotificationCategory(
        identifier: categoryId,
        actions: actions,
        intentIdentifiers: [],
        options: []
      )
      categories.insert(category)
    }

    UNUserNotificationCenter.current().setNotificationCategories(categories)
  }

  // MARK: - APNs registration
  func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    Messaging.messaging().apnsToken = deviceToken
    print("📲 APNs token: \(deviceToken.map { String(format: "%02.2hhx", $0) }.joined())")
  }

  func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
    print("❌ Failed to register for remote notifications: \(error)")
  }

  // MARK: - Firebase FCM token
  func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
    print("🔥 FCM token: \(fcmToken ?? "nil")")
    // Optionally send token to backend
  }

  // ✅ MARK: - Foreground display
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    print("📢 Notification received in foreground")
    completionHandler([.banner, .sound, .badge]) // ✅ Show banner even in foreground
  }

  // ✅ MARK: - Background tap action
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    let actionID = response.actionIdentifier
    let categoryID = response.notification.request.content.categoryIdentifier

    print("📩 User tapped action: \(actionID) in category: \(categoryID)")

    switch actionID {
      case "PUSHAPP_YES":
        print("✅ User tapped YES")
      case "PUSHAPP_NO":
        print("❌ User tapped NO")
      default:
        break
    }

    completionHandler()
  }

  // ✅ MARK: - Handle background data-only messages
  func application(_ application: UIApplication,
                   didReceiveRemoteNotification userInfo: [AnyHashable: Any],
                   fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
    print("📦 Background push received: \(userInfo)")
    completionHandler(.newData)
  }
}

// MARK: - React Native bridge
extension AppDelegate: RCTBridgeDelegate {
  func sourceURL(for bridge: RCTBridge!) -> URL! {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
