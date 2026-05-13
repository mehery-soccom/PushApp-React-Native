import Foundation
import React

@objc(PushTokenManager)
class PushTokenManager: RCTEventEmitter {

  @objc static var shared: PushTokenManager?

  private static let pendingNotificationKey = "mehery_pending_notification_event_json"

  private var hasListeners = false
  private var lastToken: (type: String, token: String)?
  private var lastNotificationPayload: [String: Any]?

  override init() {
    super.init()
    PushTokenManager.shared = self
    DispatchQueue.main.async {
      PushTokenManager.flushPendingNotificationFromColdStartIfNeeded()
    }
  }

  override func supportedEvents() -> [String]! {
    return ["PushTokenEvent", "PushNotificationEvent"]
  }

  override static func requiresMainQueueSetup() -> Bool {
    return true
  }

  override func startObserving() {
    hasListeners = true

    if let saved = lastToken {
      sendEvent(withName: "PushTokenEvent", body: [
        "type": saved.type,
        "token": saved.token
      ])
    }

    if let payload = lastNotificationPayload {
      sendEvent(withName: "PushNotificationEvent", body: payload)
    }
  }

  override func stopObserving() {
    hasListeners = false
  }

  @objc static func sendTokenEvent(_ type: String, token: String) {
    DispatchQueue.main.async {
      guard let instance = PushTokenManager.shared else {
        print("⚠️ PushTokenManager.shared is nil")
        return
      }

      instance.lastToken = (type, token)

      if instance.hasListeners {
        instance.sendEvent(withName: "PushTokenEvent", body: [
          "type": type,
          "token": token
        ])
      } else {
        print("⚠️ No JS listeners for PushTokenEvent yet — saved for later.")
      }
    }
  }

  private static func persistPendingNotification(_ payload: [AnyHashable: Any]) {
    var clean: [String: Any] = [:]
    payload.forEach { clean[String(describing: $0.key)] = $0.value }
    guard JSONSerialization.isValidJSONObject(clean),
          let data = try? JSONSerialization.data(withJSONObject: clean, options: []) else {
      print("⚠️ Mehery: could not serialize pending notification for cold start")
      return
    }
    UserDefaults.standard.set(data, forKey: pendingNotificationKey)
    print("📦 Mehery: buffered push notification for JS (bridge not ready)")
  }

  /// When the app opens from a killed state, `shared` may still be nil — queue until RN inits the module.
  @objc static func sendNotificationEventOrQueue(_ payload: [AnyHashable: Any]) {
    DispatchQueue.main.async {
      guard PushTokenManager.shared != nil else {
        persistPendingNotification(payload)
        return
      }
      sendNotificationEvent(payload)
    }
  }

  static func flushPendingNotificationFromColdStartIfNeeded() {
    guard let data = UserDefaults.standard.data(forKey: pendingNotificationKey) else { return }
    UserDefaults.standard.removeObject(forKey: pendingNotificationKey)
    guard !data.isEmpty,
          let obj = try? JSONSerialization.jsonObject(with: data) as? [AnyHashable: Any] else {
      return
    }
    print("📦 Mehery: delivering buffered push notification to JS")
    sendNotificationEvent(obj)
  }

  @objc static func sendNotificationEvent(_ payload: [AnyHashable: Any]) {
    DispatchQueue.main.async {
      guard let instance = PushTokenManager.shared else {
        print("⚠️ PushTokenManager.shared is nil — RN module not initialized yet.")
        return
      }

      var cleanPayload: [String: Any] = [:]
      payload.forEach { key, value in
        cleanPayload[String(describing: key)] = value
      }

      instance.lastNotificationPayload = cleanPayload

      if instance.hasListeners {
        instance.sendEvent(
          withName: "PushNotificationEvent",
          body: cleanPayload
        )
      }
    }
  }

  @objc func getLastToken(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    if let saved = lastToken {
      resolve([
        "type": saved.type,
        "token": saved.token
      ])
    } else {
      resolve(nil)
    }
  }
}
