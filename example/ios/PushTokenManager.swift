import Foundation
import React

@objc(PushTokenManager)
class PushTokenManager: RCTEventEmitter {

  @objc static var shared: PushTokenManager?

  private var hasListeners = false
  private var lastToken: (type: String, token: String)?
  private var lastNotificationPayload: [String: Any]?

  override init() {
    super.init()
    PushTokenManager.shared = self
  }

  // ✅ ADD PushNotificationEvent
  override func supportedEvents() -> [String]! {
    return ["PushTokenEvent", "PushNotificationEvent"]
  }

  override static func requiresMainQueueSetup() -> Bool {
    return true
  }

  override func startObserving() {
    hasListeners = true

    // Send saved token
    if let saved = lastToken {
      sendEvent(withName: "PushTokenEvent", body: [
        "type": saved.type,
        "token": saved.token
      ])
    }

    // Send saved notification payload
    if let payload = lastNotificationPayload {
      sendEvent(withName: "PushNotificationEvent", body: payload)
    }
  }

  override func stopObserving() {
    hasListeners = false
  }

  // MARK: - Token Event
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
      }
    }
  }

  // MARK: - 🔔 Notification Payload Event (NEW)
  @objc static func sendNotificationEvent(_ payload: [AnyHashable: Any]) {
    DispatchQueue.main.async {
      guard let instance = PushTokenManager.shared else {
        print("⚠️ PushTokenManager.shared is nil")
        return
      }

      // Convert keys to String for RN
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

  // Optional: expose last token to JS
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
