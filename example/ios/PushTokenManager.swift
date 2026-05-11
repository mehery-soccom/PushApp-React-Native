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
